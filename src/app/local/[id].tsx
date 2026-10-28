import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OpenStatusLine } from '@/components/explore/place-info';
import { InfoTab } from '@/components/local/info-tab';
import { PhotoCarousel } from '@/components/local/photo-carousel';
import { ReviewsTab } from '@/components/local/reviews-tab';
import { ServicesTab } from '@/components/local/services-tab';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { CalendarOffIcon, ChevronLeftIcon, ClockIcon, NavigationIcon, PinIcon, ReviewIcon, StarIcon, VerifiedIcon } from '@/components/ui/icons';
import { useRequireAccount } from '@/hooks/use-require-account';
import {
  fetchCarWashDetail,
  fetchCarWashMeta,
  type CarWashDetail,
  type CarWashMeta,
  type ScheduleException,
} from '@/lib/car-wash-detail';
import { openDirections } from '@/lib/directions';
import { daysFromToday, formatDateRange, formatDay, formatDistance, plural } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { useExplore } from '@/providers/explore';
import { useSession } from '@/providers/session';
import { colors, fontSize, radius, spacing } from '@/theme';

type TabKey = 'services' | 'info' | 'reviews';

function isTabKey(value: string | undefined): value is TabKey {
  return value === 'services' || value === 'info' || value === 'reviews';
}

/** Próximo cierre u horario especial en las dos próximas semanas, para avisarlo arriba del todo. */
function upcomingNotice(exceptions: ScheduleException[]): ScheduleException | null {
  return exceptions.find((e) => daysFromToday(e.end_date) >= 0 && daysFromToday(e.start_date) <= 14) ?? null;
}

export default function Local() {
  const { id, distance, tab: initialTab } = useLocalSearchParams<{ id: string; distance?: string; tab?: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { vehicle } = useExplore();
  const requireAccount = useRequireAccount();

  const [detail, setDetail] = useState<CarWashDetail | null | undefined>(undefined);
  const [meta, setMeta] = useState<CarWashMeta | null>(null);
  const [tab, setTab] = useState<TabKey>(isTabKey(initialTab) ? initialTab : 'services');

  // Se vuelve a cargar al regresar a esta pantalla, por ejemplo tras publicar una reseña.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [loadedDetail, loadedMeta] = await Promise.all([fetchCarWashDetail(id), fetchCarWashMeta(id)]);
        if (cancelled) return;
        setDetail(loadedDetail);
        setMeta(loadedMeta);
      })();
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  const back = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      onPress={goBack}
      style={[styles.back, { top: insets.top + 8 }]}>
      <ChevronLeftIcon color={colors.text} />
    </Pressable>
  );

  if (detail === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        {back}
      </View>
    );
  }

  if (detail === null) {
    return (
      <View style={styles.center}>
        <AppText weight="display" size={22}>
          No encontramos este local
        </AppText>
        <AppText weight="medium" size={fontSize.body} color="textSecondary" style={{ textAlign: 'center' }}>
          Puede que ya no esté publicado.
        </AppText>
        <Button label="Volver" variant="secondary" height={48} onPress={goBack} />
      </View>
    );
  }

  const distanceLabel = distance ? formatDistance(Number(distance)) : null;
  const isOwner = session !== null && detail.owner_id === session.user.id;
  const notice = upcomingNotice(detail.exceptions);
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'services', label: 'Servicios' },
    { key: 'info', label: 'Información' },
    { key: 'reviews', label: `Reseñas (${detail.rating_count})` },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}>
        <View>
          <PhotoCarousel photos={detail.photos} />
          <View style={styles.header}>
            <View style={{ gap: spacing.sm }}>
              {detail.status === 'verified' ? (
                <View style={styles.badge}>
                  <VerifiedIcon size={14} color={colors.primaryPressed} />
                  <AppText weight="extrabold" size={12} color="primaryPressed" style={{ lineHeight: 16 }}>
                    Verificado
                  </AppText>
                </View>
              ) : (
                // Solo el propietario y los administradores llegan a ver un local sin verificar u oculto.
                <View style={[styles.badge, { backgroundColor: detail.status === 'pending' ? colors.warningSoft : colors.dangerSoft }]}>
                  <AppText weight="extrabold" size={12} color={detail.status === 'pending' ? 'warning' : 'danger'} style={{ lineHeight: 16 }}>
                    {detail.status === 'pending' ? 'Por verificar · solo tú lo ves' : 'Oculto · solo tú lo ves'}
                  </AppText>
                </View>
              )}
              <AppText weight="display" size={30} style={styles.name}>
                {detail.name}
              </AppText>
              <View style={styles.row}>
                <StarIcon size={16} />
                {detail.rating_count > 0 ? (
                  <AppText weight="extrabold" size={fontSize.body}>
                    {detail.rating_avg.toFixed(1)}
                  </AppText>
                ) : null}
                <AppText weight="medium" size={14} color="textMuted" style={{ flexShrink: 1 }}>
                  {detail.rating_count > 0
                    ? `· ${plural(detail.rating_count, 'calificación', 'calificaciones')}`
                    : 'Aún sin calificaciones'}
                  {distanceLabel ? ` · ${distanceLabel}` : ''}
                </AppText>
              </View>
              {meta ? <OpenStatusLine pin={meta} /> : null}
              <View style={styles.row}>
                <PinIcon size={18} color={colors.textSecondary} />
                <AppText weight="medium" size={14} color="textSecondary" style={{ flex: 1 }}>
                  {detail.address}, {detail.district}
                </AppText>
              </View>
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cómo llegar"
                    height={48}
                    fontSize={14}
                    icon={<NavigationIcon size={20} color={colors.onPrimary} />}
                    onPress={() => openDirections(detail)}
                  />
                </View>
                {isOwner || detail.status !== 'verified' ? null : (
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Escribir reseña"
                      variant="outline"
                      height={48}
                      fontSize={14}
                      icon={<ReviewIcon size={20} color={colors.primary} />}
                      onPress={() =>
                        requireAccount(() => router.push({ pathname: '/resena/[id]', params: { id: detail.id } }))
                      }
                    />
                  </View>
                )}
              </View>
            </View>

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
                  <AppText weight="extrabold" size={14} color="warning" style={{ lineHeight: 18 }}>
                    {notice.kind === 'closed'
                      ? notice.start_date === notice.end_date
                        ? `Cerrado el ${formatDay(notice.start_date)}`
                        : `Cerrado ${formatDateRange(notice.start_date, notice.end_date).toLowerCase()}`
                      : `Horario especial el ${formatDay(notice.start_date)}`}
                  </AppText>
                  <AppText weight="medium" size={fontSize.small} color="textSecondary" style={{ lineHeight: 18 }}>
                    {notice.reason ? `${notice.reason}. ` : ''}
                    <AppText weight="extrabold" size={fontSize.small} color="primary" onPress={() => setTab('info')} style={{ textDecorationLine: 'underline' }}>
                      Ver horario
                    </AppText>
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* El contenedor externo es el que se vuelve «pegajoso»; React Native le impone su propio estilo. */}
        <View style={styles.stickyTabs}>
          <View style={styles.tabBar}>
            {tabs.map((item) => {
              const active = item.key === tab;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setTab(item.key)}
                  style={[styles.tab, active && styles.tabActive]}>
                  <AppText weight={active ? 'extrabold' : 'semibold'} size={fontSize.body} color={active ? 'primary' : 'textMuted'}>
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {tab === 'services' ? <ServicesTab detail={detail} initialVehicle={vehicle} /> : null}
        {tab === 'info' ? <InfoTab detail={detail} /> : null}
        {tab === 'reviews' ? <ReviewsTab detail={detail} /> : null}
      </ScrollView>
      {back}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  back: {
    position: 'absolute',
    left: spacing.lg,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.surface,
    elevation: 4,
    shadowColor: '#13202E',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  header: {
    marginTop: -24,
    gap: spacing.lg,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  name: {
    lineHeight: 32,
    letterSpacing: -0.75,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.sm,
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
  stickyTabs: {
    backgroundColor: colors.surface,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
});
