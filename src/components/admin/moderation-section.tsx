import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/admin/badge';
import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { CheckIcon, EyeOffIcon, FlagIcon, InfoIcon } from '@/components/ui/icons';
import { Card } from '@/components/ui/layout';
import { Stars } from '@/components/ui/stars';
import { fetchModerationQueue, resolveReports, type ModerationItem } from '@/lib/admin';
import { plural, relativeTime } from '@/lib/format';
import { colors, fontSize, spacing } from '@/theme';

const REASON_LABELS: Record<ModerationItem['top_reason'], string> = {
  offensive: 'Lenguaje ofensivo',
  spam: 'Spam o publicidad',
  off_topic: 'No trata sobre este local',
  personal_data: 'Datos personales',
  other: 'Otro motivo',
};

type Props = {
  /** Se avisa cuando cambian los pendientes, para actualizar el contador de la pestaña. */
  onChanged: () => void;
};

/** Reseñas reportadas (mockup 18): «Ocultar reseña» o «Mantener», y el historial de resueltas. */
export function ModerationSection({ onChanged }: Props) {
  const [resolved, setResolved] = useState(false);
  // undefined = cargando, null = no se pudo cargar
  const [items, setItems] = useState<ModerationItem[] | null | undefined>(undefined);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (showResolved: boolean) => {
      let cancelled = false;
      (async () => {
        const [list, pending] = await Promise.all([
          fetchModerationQueue(showResolved),
          showResolved ? fetchModerationQueue(false) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setItems(list);
        setPendingCount(showResolved ? (pending?.length ?? null) : (list?.length ?? null));
      })();
      return () => {
        cancelled = true;
      };
    },
    [],
  );

  useFocusEffect(useCallback(() => load(resolved), [load, resolved]));

  const switchTo = (next: boolean) => {
    if (next === resolved) return;
    setItems(undefined);
    setError(null);
    setResolved(next);
  };

  const resolve = async (item: ModerationItem, hide: boolean) => {
    setBusyId(item.review_id);
    setError(null);
    const failure = await resolveReports(item.review_id, hide);
    setBusyId(null);
    if (failure) setError(failure);
    load(resolved);
    onChanged();
  };

  const hide = (item: ModerationItem) =>
    Alert.alert('Ocultar reseña', `La reseña de ${item.author_name} dejará de verse en la app, pero se conserva para su revisión.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Ocultar', style: 'destructive', onPress: () => void resolve(item, true) },
    ]);

  return (
    <View style={styles.body}>
      <View style={styles.filters}>
        <Chip
          label={`Pendientes${pendingCount === null ? '' : ` · ${pendingCount}`}`}
          selected={!resolved}
          onPress={() => switchTo(false)}
          icon={!resolved ? <CheckIcon size={16} color={colors.primaryPressed} /> : undefined}
        />
        <Chip
          label="Resueltos"
          selected={resolved}
          onPress={() => switchTo(true)}
          icon={resolved ? <CheckIcon size={16} color={colors.primaryPressed} /> : undefined}
        />
      </View>

      {error ? (
        <AppText weight="semibold" size={fontSize.small} color="danger">
          {error}
        </AppText>
      ) : null}

      {items === undefined ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}

      {items === null ? (
        <Card>
          <AppText weight="extrabold" size={fontSize.lead}>
            No pudimos cargar los reportes
          </AppText>
          <Button
            label="Reintentar"
            variant="outline"
            height={44}
            onPress={() => {
              setItems(undefined);
              load(resolved);
            }}
          />
        </Card>
      ) : null}

      {items && items.length === 0 ? (
        <Card>
          <AppText weight="semibold" size={fontSize.body} color="textMuted" style={{ textAlign: 'center' }}>
            {resolved ? 'Todavía no has resuelto ningún reporte.' : 'No hay reseñas por revisar. ¡Todo en orden!'}
          </AppText>
        </Card>
      ) : null}

      {items?.map((item) => {
        return (
          <Card key={item.review_id}>
            <View style={styles.top}>
              <Badge
                label={plural(item.report_count, 'reporte', 'reportes')}
                background={colors.dangerSoft}
                color={colors.danger}
                icon={<FlagIcon size={13} color={colors.danger} />}
              />
              <AppText weight="extrabold" size={fontSize.small} color="textSecondary" style={{ flex: 1 }} numberOfLines={1}>
                {REASON_LABELS[item.top_reason]}
              </AppText>
              <AppText weight="semibold" size={12} color="textMuted">
                {relativeTime(item.last_reported_at)}
              </AppText>
            </View>

            <View style={styles.review}>
              <View style={styles.author}>
                <Avatar name={item.author_name} size={32} />
                <View style={{ gap: 1, flex: 1 }}>
                  <AppText weight="extrabold" size={14}>
                    {item.author_name}
                  </AppText>
                  <View style={styles.meta}>
                    <Stars value={item.rating} size={12} />
                    <AppText weight="semibold" size={12} color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
                      en {item.car_wash_name}
                    </AppText>
                  </View>
                </View>
              </View>
              <AppText weight="medium" size={14} color="textSecondary" style={{ lineHeight: 20 }}>
                {item.comment ? `“${item.comment}”` : 'Esta reseña no tiene comentario, solo calificación.'}
              </AppText>
            </View>

            {resolved ? (
              <AppText weight="extrabold" size={fontSize.small} color={item.review_status === 'hidden' ? 'danger' : 'success'}>
                {item.review_status === 'hidden' ? 'Reseña oculta' : 'Se mantuvo visible'}
              </AppText>
            ) : (
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <ActionButton
                    label="Ocultar reseña"
                    tone="danger"
                    busy={busyId === item.review_id}
                    onPress={() => hide(item)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ActionButton label="Mantener" tone="neutral" busy={busyId === item.review_id} onPress={() => void resolve(item, false)} />
                </View>
              </View>
            )}
          </Card>
        );
      })}

      <View style={styles.footnote}>
        <InfoIcon size={16} />
        <AppText weight="medium" size={fontSize.small} color="textMuted" style={{ flex: 1, lineHeight: 18 }}>
          Una reseña oculta deja de verse en la app, pero se conserva para su revisión.
        </AppText>
      </View>
    </View>
  );
}

function ActionButton({ label, tone, busy, onPress }: { label: string; tone: 'danger' | 'neutral'; busy: boolean; onPress: () => void }) {
  return (
    <Button
      label={label}
      variant={tone === 'danger' ? 'danger' : 'secondary'}
      height={44}
      fontSize={14}
      loading={busy}
      onPress={onPress}
      icon={tone === 'danger' ? <EyeOffIcon size={18} /> : <CheckIcon size={18} color={colors.text} />}
    />
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingTop: 14,
    paddingHorizontal: spacing.lg,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  review: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.background,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
});
