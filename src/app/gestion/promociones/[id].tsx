import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon, EditIcon, PlusIcon, TagIcon } from '@/components/ui/icons';
import { ScreenFrame } from '@/components/ui/screen-frame';
import { useCarWashDetail } from '@/hooks/use-car-wash-detail';
import type { CarWashDetail, Promotion } from '@/lib/car-wash-detail';
import { formatShortDay, formatShortRange } from '@/lib/format';
import { deletePromotion, endPromotion } from '@/lib/owner';
import { promotionState, type PromotionState } from '@/lib/owner-utils';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function Promociones() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { detail, reload } = useCarWashDetail(id);

  const create = () => router.push({ pathname: '/gestion/promocion/[id]', params: { id: 'nueva', carWashId: id } });

  return (
    <ScreenFrame
      title="Promociones"
      footer={<Button label="Nueva promoción" icon={<PlusIcon size={20} />} onPress={create} />}>
      {detail === undefined ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : detail === null ? (
        <AppText weight="medium" size={fontSize.body} color="textMuted" style={{ padding: spacing.xl }}>
          No encontramos este local.
        </AppText>
      ) : (
        <PromotionList detail={detail} carWashId={id} reload={reload} />
      )}
    </ScreenFrame>
  );
}

function PromotionList({ detail, carWashId, reload }: { detail: CarWashDetail; carWashId: string; reload: () => void }) {
  const [showEnded, setShowEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byState = (state: PromotionState) => detail.promotions.filter((promotion) => promotionState(promotion) === state);
  const active = byState('active');
  const scheduled = byState('scheduled');
  const ended = byState('ended');

  const serviceName = (promotion: Promotion) =>
    promotion.service_id ? (detail.services.find((s) => s.id === promotion.service_id)?.name ?? 'Un servicio') : 'Todos los servicios';

  const edit = (promotion: Promotion) =>
    router.push({ pathname: '/gestion/promocion/[id]', params: { id: promotion.id, carWashId } });

  const confirm = (title: string, message: string, action: string, run: () => Promise<string | null>) =>
    Alert.alert(title, message, [
      { text: 'Volver', style: 'cancel' },
      {
        text: action,
        style: 'destructive',
        onPress: async () => {
          const failure = await run();
          if (failure) setError(failure);
          else reload();
        },
      },
    ]);

  const card = (promotion: Promotion, state: PromotionState) => (
    <View key={promotion.id} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.badge, { backgroundColor: state === 'active' ? colors.successSoft : colors.primarySoft }]}>
          <AppText weight="extrabold" size={12} color={state === 'active' ? 'success' : 'primaryPressed'} style={{ lineHeight: 16 }}>
            {state === 'active' ? 'Vigente' : 'Programada'}
          </AppText>
        </View>
        <AppText weight="bold" size={fontSize.small} color="textMuted">
          {state === 'active' ? `Hasta el ${formatShortDay(promotion.end_date)}` : formatShortRange(promotion.start_date, promotion.end_date)}
        </AppText>
      </View>
      <View style={{ gap: 4 }}>
        <AppText weight="display" size={17} style={{ letterSpacing: -0.17 }}>
          {promotion.title}
        </AppText>
        {promotion.description ? (
          <AppText weight="medium" size={14} color="textSecondary" style={{ lineHeight: 20 }}>
            {promotion.description}
          </AppText>
        ) : null}
        <View style={styles.appliesTo}>
          <TagIcon size={16} color={colors.textMuted} />
          <AppText weight="semibold" size={fontSize.small} color="textMuted">
            Aplica a: {serviceName(promotion)}
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => edit(promotion)} style={styles.editButton}>
          <EditIcon size={18} />
          <AppText weight="bold" size={14} color="primaryPressed">
            Editar
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            state === 'active'
              ? confirm('Finalizar promoción', 'Dejará de mostrarse en tu perfil y en la lista desde ahora.', 'Finalizar', () => endPromotion(promotion.id))
              : confirm('Cancelar promoción', 'Se eliminará porque todavía no empezó.', 'Cancelar promoción', () => deletePromotion(promotion.id))
          }
          style={styles.endButton}>
          <AppText weight="bold" size={14} color="danger">
            {state === 'active' ? 'Finalizar' : 'Cancelar'}
          </AppText>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.list}>
      <AppText weight="medium" size={14} color="textMuted" style={{ lineHeight: 20 }}>
        Las promociones vigentes aparecen en tu perfil y en la lista de resultados.
      </AppText>

      {detail.promotions.length === 0 ? (
        <AppText weight="medium" size={fontSize.body} color="textSecondary" style={{ marginTop: spacing.md }}>
          Todavía no tienes promociones. Crea una para atraer más clientes.
        </AppText>
      ) : null}

      {active.length > 0 ? (
        <>
          <AppText weight="display" size={17} style={styles.groupTitle}>
            Vigentes · {active.length}
          </AppText>
          {active.map((promotion) => card(promotion, 'active'))}
        </>
      ) : null}

      {scheduled.length > 0 ? (
        <>
          <AppText weight="display" size={17} style={styles.groupTitle}>
            Programadas · {scheduled.length}
          </AppText>
          {scheduled.map((promotion) => card(promotion, 'scheduled'))}
        </>
      ) : null}

      {ended.length > 0 ? (
        <>
          <Pressable accessibilityRole="button" onPress={() => setShowEnded((current) => !current)} style={styles.endedToggle}>
            <AppText weight="bold" size={fontSize.body} style={{ flex: 1 }}>
              Finalizadas · {ended.length}
            </AppText>
            <View style={showEnded ? { transform: [{ rotate: '180deg' }] } : undefined}>
              <ChevronDownIcon />
            </View>
          </Pressable>
          {showEnded
            ? ended.map((promotion) => (
                <View key={promotion.id} style={[styles.card, { gap: 4 }]}>
                  <AppText weight="extrabold" size={fontSize.body}>
                    {promotion.title}
                  </AppText>
                  <AppText weight="medium" size={fontSize.small} color="textMuted">
                    {formatShortRange(promotion.start_date, promotion.end_date)} · {serviceName(promotion)}
                  </AppText>
                </View>
              ))
            : null}
        </>
      ) : null}

      {error ? (
        <AppText weight="semibold" size={fontSize.small} color="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    paddingTop: 4,
    paddingHorizontal: spacing.lg,
  },
  groupTitle: {
    marginTop: 4,
    letterSpacing: -0.34,
  },
  card: {
    gap: 10,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  appliesTo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  endButton: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  endedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
