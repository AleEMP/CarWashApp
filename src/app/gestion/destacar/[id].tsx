import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { PricePill, SponsoredPin } from '@/components/explore/price-marker';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { CheckIcon, InfoIcon } from '@/components/ui/icons';
import { Card, Section } from '@/components/ui/layout';
import { ScreenFrame } from '@/components/ui/screen-frame';
import { useRequireAccount } from '@/hooks/use-require-account';
import { fetchCarWashDetail, type CarWashDetail } from '@/lib/car-wash-detail';
import { formatDay, formatPrice } from '@/lib/format';
import {
  cancelSponsorshipRequest,
  fetchSponsorshipPlans,
  fetchSponsorships,
  requestSponsorship,
  type SponsorshipPlan,
  type SponsorshipRow,
} from '@/lib/owner';
import { useSession } from '@/providers/session';
import { colors, fontSize, radius, spacing } from '@/theme';

const INCLUDES = [
  'Marcador destacado en el mapa de tu zona.',
  'Primeros lugares en la lista de resultados.',
  'Siempre con la etiqueta «Patrocinado», para que tus clientes sepan que es un anuncio.',
];

const STEPS = [
  'Envía tu solicitud desde aquí.',
  'Te enviaremos los datos para pagar por Yape.',
  'Un administrador confirma el pago y activa tu anuncio.',
];

export default function DestacarMiLocal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const requireAccount = useRequireAccount();

  const [detail, setDetail] = useState<CarWashDetail | null | undefined>(undefined);
  const [plans, setPlans] = useState<SponsorshipPlan[]>([]);
  const [rows, setRows] = useState<SponsorshipRow[]>([]);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    (async () => {
      const [loadedDetail, loadedPlans, loadedRows] = await Promise.all([
        fetchCarWashDetail(id),
        fetchSponsorshipPlans(),
        fetchSponsorships(id),
      ]);
      if (cancelled) return;
      setDetail(loadedDetail);
      setPlans(loadedPlans);
      setRows(loadedRows);
      setPlanCode((current) => current ?? loadedPlans[loadedPlans.length - 1]?.code ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useFocusEffect(load);

  const openRequest = rows.find((row) => row.status === 'requested');
  const active = rows.find((row) => row.status === 'active' && row.ends_on !== null);

  const send = () =>
    requireAccount(async () => {
      if (!planCode || !session) return;
      setBusy(true);
      setError(null);
      const failure = await requestSponsorship(id, planCode, session.user.id);
      setBusy(false);
      if (failure) return setError(failure);
      setSent(true);
      load();
    });

  const cancelRequest = async () => {
    if (!openRequest) return;
    setBusy(true);
    const failure = await cancelSponsorshipRequest(openRequest.id);
    setBusy(false);
    if (failure) return setError(failure);
    setSent(false);
    load();
  };

  if (detail === undefined) {
    return (
      <ScreenFrame title="Destacar mi local">
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </ScreenFrame>
    );
  }
  if (detail === null) {
    return (
      <ScreenFrame title="Destacar mi local">
        <AppText weight="medium" size={fontSize.body} color="textMuted" style={{ padding: spacing.xl }}>
          No encontramos este local.
        </AppText>
      </ScreenFrame>
    );
  }

  const prices = detail.services.flatMap((service) => service.service_prices.map((p) => p.price));
  const minPrice = prices.length > 0 ? formatPrice(Math.min(...prices)) : 'Sin precio';
  const locked = Boolean(openRequest || active);

  return (
    <ScreenFrame
      title="Destacar mi local"
      footer={
        locked ? undefined : (
          <>
            {error ? (
              <AppText weight="semibold" size={fontSize.small} color="danger">
                {error}
              </AppText>
            ) : null}
            <Button label="Enviar solicitud" loading={busy} disabled={!planCode} onPress={send} />
          </>
        )
      }>
      {active ? (
        <View style={styles.bannerWrap}>
          <View style={[styles.banner, { backgroundColor: colors.successSoft }]}>
            <CheckIcon size={20} color={colors.success} />
            <AppText weight="extrabold" size={14} color="success" style={{ flex: 1 }}>
              Tu anuncio está activo hasta el {formatDay(active.ends_on!)}.
            </AppText>
          </View>
        </View>
      ) : null}

      {openRequest ? (
        <View style={styles.bannerWrap}>
          <View style={[styles.banner, { backgroundColor: colors.warningSoft, flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
            <AppText weight="extrabold" size={14} color="warning">
              {sent ? 'Solicitud enviada.' : 'Tu solicitud está en espera de pago.'}
            </AppText>
            <AppText weight="medium" size={fontSize.small} color="textSecondary" style={{ lineHeight: 18 }}>
              Un administrador te contactará para coordinar el pago por Yape y activar tu anuncio.
            </AppText>
            <Button label="Cancelar solicitud" variant="secondary" height={44} loading={busy} onPress={cancelRequest} />
          </View>
        </View>
      ) : null}

      <Section title="Así se verá">
        <Card style={{ gap: 10, padding: spacing.md }}>
          <View style={styles.preview}>
            <View style={{ position: 'absolute', right: 24, top: 18 }}>
              <PricePill price="S/ 20" isOpen selected={false} />
            </View>
            <View style={{ position: 'absolute', right: 70, top: 118 }}>
              <PricePill price="S/ 18" isOpen selected={false} />
            </View>
            <View style={{ position: 'absolute', left: 16, top: 52 }}>
              <SponsoredPin pin={{ name: detail.name, rating_avg: detail.rating_avg, rating_count: detail.rating_count }} price={minPrice} selected={false} />
            </View>
          </View>
          <AppText weight="semibold" size={fontSize.small} color="textMuted" style={{ textAlign: 'center' }}>
            Así se verá tu local en el mapa de tu zona.
          </AppText>
        </Card>
      </Section>

      <Section title="Qué incluye">
        <Card>
          {INCLUDES.map((text) => (
            <View key={text} style={styles.includeRow}>
              <View style={styles.includeIcon}>
                <CheckIcon size={16} color={colors.success} />
              </View>
              <AppText weight="semibold" size={14} color="textSecondary" style={{ flex: 1, lineHeight: 20 }}>
                {text}
              </AppText>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Elige un plan">
        <View style={{ gap: 10 }}>
          {plans.map((plan) => {
            const selected = plan.code === planCode;
            return (
              <Pressable
                key={plan.code}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: locked }}
                disabled={locked}
                onPress={() => setPlanCode(plan.code)}
                style={[styles.plan, selected && styles.planSelected, locked && { opacity: 0.6 }]}>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <AppText weight="extrabold" size={16}>
                    {plan.label}
                  </AppText>
                  <AppText weight="medium" size={fontSize.small} color="textMuted">
                    {plan.days === 7 ? 'Una semana' : plan.days === 30 ? 'Un mes completo' : `${plan.days} días`}
                  </AppText>
                </View>
                <AppText weight="display" size={17}>
                  {plan.price === null ? 'Precio por confirmar' : formatPrice(plan.price)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Cómo funciona">
        <Card>
          <View style={{ gap: 12 }}>
            {STEPS.map((text, index) => (
              <View key={text} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <AppText weight="extrabold" size={fontSize.small} color="onPrimary" style={{ lineHeight: 18 }}>
                    {index + 1}
                  </AppText>
                </View>
                <AppText weight="semibold" size={14} color="textSecondary" style={{ flex: 1, lineHeight: 20 }}>
                  {text}
                </AppText>
              </View>
            ))}
          </View>
          <View style={styles.note}>
            <InfoIcon size={16} />
            <AppText weight="medium" size={fontSize.small} color="textMuted" style={{ flex: 1, lineHeight: 18 }}>
              Durante esta etapa el pago se coordina fuera de la app.
            </AppText>
          </View>
        </Card>
      </Section>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
  },
  preview: {
    height: 190,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#ECE5D8',
  },
  includeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  includeIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.successSoft,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  planSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  radio: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.text,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderRadius: radius.sm,
  },
});
