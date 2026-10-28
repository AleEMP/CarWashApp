import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoverImage } from '@/components/explore/cover-image';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import {
  BuildingIcon,
  CalendarOffIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  MegaphoneIcon,
  PhotosIcon,
  ReceiptIcon,
  SparkleIcon,
  StarIcon,
  StoreIcon,
  TagIcon,
  VerifiedIcon,
} from '@/components/ui/icons';
import { Card } from '@/components/ui/layout';
import { PickerSheet } from '@/components/ui/picker-sheet';
import { fetchCarWashDetail, type CarWashDetail } from '@/lib/car-wash-detail';
import { daysFromToday, formatDay, formatShortDay, plural } from '@/lib/format';
import { countVehicleTypes, nextScheduleChange, promotionState } from '@/lib/owner-utils';
import { fetchOwnedCarWashes, fetchSponsorships, type OwnedCarWash, type SponsorshipRow } from '@/lib/owner';
import { useSession } from '@/providers/session';
import { colors, fontSize, radius, spacing } from '@/theme';

type RowProps = {
  icon: ReactNode;
  title: string;
  summary: string;
  onPress: () => void;
  last?: boolean;
};

function Row({ icon, title, summary, onPress, last }: RowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && { backgroundColor: colors.background }]}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1, gap: 1 }}>
        <AppText weight="extrabold" size={fontSize.body}>
          {title}
        </AppText>
        <AppText weight="medium" size={fontSize.small} color="textMuted">
          {summary}
        </AppText>
      </View>
      <ChevronRightIcon />
    </Pressable>
  );
}

function StatusBadges({ status }: { status: OwnedCarWash['status'] }) {
  if (status === 'verified') {
    return (
      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: colors.successSoft }]}>
          <VerifiedIcon size={14} color={colors.success} />
          <AppText weight="extrabold" size={12} color="success" style={styles.badgeText}>
            Verificado
          </AppText>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
          <AppText weight="extrabold" size={12} color="primaryPressed" style={styles.badgeText}>
            Publicado
          </AppText>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.badges}>
      <View style={[styles.badge, { backgroundColor: status === 'pending' ? colors.warningSoft : colors.dangerSoft }]}>
        <AppText weight="extrabold" size={12} color={status === 'pending' ? 'warning' : 'danger'} style={styles.badgeText}>
          {status === 'pending' ? 'Por verificar' : 'Oculto'}
        </AppText>
      </View>
    </View>
  );
}

/** Panel del propietario (mockup 10): su local, los avisos y el acceso a cada sección del perfil. */
export default function MiNegocio() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const [owned, setOwned] = useState<OwnedCarWash[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CarWashDetail | null>(null);
  const [sponsorships, setSponsorships] = useState<SponsorshipRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Se recarga al volver de cualquier pantalla de edición.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      (async () => {
        const list = await fetchOwnedCarWashes(userId);
        if (cancelled) return;
        setOwned(list);
        const current = list.find((item) => item.id === selectedId) ?? list[0] ?? null;
        setSelectedId(current?.id ?? null);
        if (!current) {
          setDetail(null);
          return;
        }
        const [loadedDetail, loadedSponsorships] = await Promise.all([
          fetchCarWashDetail(current.id),
          fetchSponsorships(current.id),
        ]);
        if (cancelled) return;
        setDetail(loadedDetail);
        setSponsorships(loadedSponsorships);
      })();
      return () => {
        cancelled = true;
      };
      // selectedId solo orienta la primera carga; cambiarlo vuelve a pedir con `chooseCarWash`.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]),
  );

  const chooseCarWash = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    const [loadedDetail, loadedSponsorships] = await Promise.all([fetchCarWashDetail(id), fetchSponsorships(id)]);
    setDetail(loadedDetail);
    setSponsorships(loadedSponsorships);
  };

  const current = owned?.find((item) => item.id === selectedId) ?? null;

  if (owned === null) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!current || !detail) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.titleBlock}>
          <View style={styles.modeRow}>
            <StoreIcon size={18} color={colors.primary} />
            <AppText weight="extrabold" size={fontSize.small} color="primary">
              Modo propietario
            </AppText>
          </View>
          <AppText weight="display" size={28} style={styles.title}>
            Mi negocio
          </AppText>
        </View>
        {owned.length === 0 ? (
          <View style={{ padding: spacing.lg }}>
            <Card>
              <AppText weight="extrabold" size={fontSize.lead}>
                Aún no tienes un local asignado
              </AppText>
              <AppText weight="medium" size={fontSize.body} color="textSecondary" style={{ lineHeight: 22 }}>
                Cuando un administrador verifique tu solicitud y te asigne tu local, lo verás aquí para administrarlo.
              </AppText>
            </Card>
          </View>
        ) : (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        )}
      </SafeAreaView>
    );
  }

  const promos = detail.promotions.map(promotionState);
  const activePromos = promos.filter((state) => state === 'active').length;
  const scheduledPromos = promos.filter((state) => state === 'scheduled').length;
  const upcomingChanges = detail.exceptions.filter((e) => daysFromToday(e.end_date) >= 0).length;
  const notice = nextScheduleChange(detail);
  const vehicleTypes = countVehicleTypes(detail);
  const openRequest = sponsorships.find((row) => row.status === 'requested');
  const activeSponsorship = sponsorships.find((row) => row.status === 'active' && row.ends_on !== null);

  const go = (pathname: '/gestion/info/[id]' | '/gestion/servicios/[id]' | '/gestion/horarios/[id]' | '/gestion/promociones/[id]' | '/gestion/destacar/[id]') =>
    router.push({ pathname, params: { id: detail.id } });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <View style={{ gap: 4 }}>
            <View style={styles.modeRow}>
              <StoreIcon size={18} color={colors.primary} />
              <AppText weight="extrabold" size={fontSize.small} color="primary">
                Modo propietario
              </AppText>
            </View>
            <AppText weight="display" size={28} style={styles.title}>
              Mi negocio
            </AppText>
          </View>
          <Button
            label="Ver como cliente"
            variant="outline"
            height={44}
            fontSize={14}
            onPress={() => router.push({ pathname: '/local/[id]', params: { id: detail.id } })}
          />
        </View>

        <View style={styles.body}>
          <Card padded={false}>
            <View style={styles.localTop}>
              <CoverImage path={current.cover_path} size={72} />
              <View style={{ flex: 1, gap: 3 }}>
                <AppText weight="display" size={18} numberOfLines={1} style={{ letterSpacing: -0.36 }}>
                  {current.name}
                </AppText>
                <AppText weight="medium" size={fontSize.small} color="textMuted" numberOfLines={1}>
                  {current.address}, {current.district}
                </AppText>
                <View style={styles.ratingRow}>
                  <StarIcon size={13} />
                  <AppText weight="extrabold" size={fontSize.small}>
                    {current.rating_count > 0 ? current.rating_avg.toFixed(1) : '–'}
                  </AppText>
                  <AppText weight="medium" size={fontSize.small} color="textMuted">
                    ({current.rating_count})
                  </AppText>
                </View>
                <StatusBadges status={current.status} />
              </View>
            </View>
            <View style={styles.switchRow}>
              <AppText weight="semibold" size={fontSize.small} color="textMuted">
                {owned.length === 1 ? 'Tienes 1 local' : `Tienes ${owned.length} locales`}
              </AppText>
              {owned.length > 1 ? (
                <Pressable accessibilityRole="button" onPress={() => setPickerOpen(true)} style={styles.switchButton}>
                  <AppText weight="bold" size={14} color="primary">
                    Cambiar de local
                  </AppText>
                  <ChevronDownIcon size={18} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
          </Card>

          {notice ? (
            <View style={styles.notice}>
              <View style={styles.noticeIcon}>
                {notice.kind === 'closed' ? (
                  <CalendarOffIcon size={20} color={colors.warning} />
                ) : (
                  <ClockIcon size={20} color={colors.warning} />
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText weight="extrabold" size={14} color="warning">
                  {notice.kind === 'closed' ? 'Próximo cierre' : 'Próximo horario especial'}: {formatDay(notice.start_date)}
                </AppText>
                <AppText weight="medium" size={fontSize.small} color="textSecondary">
                  Tus clientes ya ven este aviso en tu perfil.
                </AppText>
              </View>
            </View>
          ) : null}

          <AppText weight="display" size={19} style={styles.heading}>
            Tu perfil
          </AppText>
          <Card padded={false}>
            <Row
              icon={<BuildingIcon size={20} />}
              title="Información general"
              summary="Nombre, dirección y ubicación"
              onPress={() => go('/gestion/info/[id]')}
            />
            <Row
              icon={<PhotosIcon size={20} color={colors.primary} />}
              title="Fotos"
              summary={detail.photos.length === 0 ? 'Aún sin fotos' : plural(detail.photos.length, 'foto publicada', 'fotos publicadas')}
              onPress={() => go('/gestion/info/[id]')}
            />
            <Row
              icon={<ReceiptIcon size={20} />}
              title="Servicios y precios"
              summary={
                detail.services.length === 0
                  ? 'Aún sin servicios'
                  : `${plural(detail.services.length, 'servicio', 'servicios')} · ${plural(vehicleTypes, 'tipo de vehículo', 'tipos de vehículo')}`
              }
              onPress={() => go('/gestion/servicios/[id]')}
            />
            <Row
              icon={<ClockIcon size={20} color={colors.primary} />}
              title="Horarios y cierres"
              summary={
                detail.hours.length === 0
                  ? 'Aún sin horario'
                  : `${detail.hours.length === 7 ? 'Todos los días' : plural(detail.hours.length, 'día', 'días') + ' a la semana'} · ${plural(upcomingChanges, 'cambio programado', 'cambios programados')}`
              }
              onPress={() => go('/gestion/horarios/[id]')}
            />
            <Row
              icon={<SparkleIcon size={20} color={colors.primary} />}
              title="Comodidades"
              summary={detail.amenities.length === 0 ? 'Aún sin comodidades' : `${detail.amenities.length} disponibles`}
              onPress={() => go('/gestion/info/[id]')}
            />
            <Row
              icon={<TagIcon size={20} color={colors.primary} />}
              title="Promociones"
              summary={`${plural(activePromos, 'vigente', 'vigentes')} · ${plural(scheduledPromos, 'programada', 'programadas')}`}
              onPress={() => go('/gestion/promociones/[id]')}
              last
            />
          </Card>

          <Card>
            <View style={styles.sponsorHead}>
              <View style={styles.sponsorIcon}>
                <MegaphoneIcon size={22} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText weight="display" size={18} style={{ letterSpacing: -0.36 }}>
                  Destaca tu local
                </AppText>
                <AppText weight="extrabold" size={fontSize.small} color="warning">
                  {activeSponsorship
                    ? `Anuncio activo hasta el ${formatShortDay(activeSponsorship.ends_on!)}`
                    : openRequest
                      ? 'Solicitud en espera de pago'
                      : 'Visibilidad patrocinada'}
                </AppText>
              </View>
            </View>
            <AppText weight="medium" size={14} color="textSecondary" style={{ lineHeight: 20 }}>
              Aparece con un marcador destacado en el mapa y en los primeros lugares de la lista. Siempre se muestra con la etiqueta «Patrocinado».
            </AppText>
            <Button label={openRequest || activeSponsorship ? 'Ver estado' : 'Ver planes'} height={48} onPress={() => go('/gestion/destacar/[id]')} />
          </Card>
        </View>
      </ScrollView>

      <PickerSheet
        visible={pickerOpen}
        title="Cambiar de local"
        options={owned.map((item) => ({ value: item.id, label: `${item.name} · ${item.district}` }))}
        selected={selectedId}
        onSelect={(id) => void chooseCarWash(id)}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: spacing.xl,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: 20,
    paddingLeft: 20,
    paddingRight: spacing.lg,
    paddingBottom: 4,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    letterSpacing: -0.56,
  },
  body: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  localTop: {
    flexDirection: 'row',
    gap: 14,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: {
    lineHeight: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFCB8B',
    backgroundColor: colors.warningSoft,
  },
  noticeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  heading: {
    marginTop: spacing.sm,
    letterSpacing: -0.38,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  sponsorHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sponsorIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.warningSoft,
  },
});
