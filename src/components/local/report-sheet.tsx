import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FlagIcon } from '@/components/ui/icons';
import { Stars } from '@/components/ui/stars';
import { REPORT_REASONS, type ReportReason, type Review } from '@/lib/car-wash-detail';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';
import { colors, fontSize, radius, spacing } from '@/theme';

type ReportSheetProps = {
  review: Review | null;
  onClose: () => void;
  onReported: () => void;
};

/** Hoja inferior para reportar un comentario inapropiado (mockup 09). */
export function ReportSheet({ review, onClose, onReported }: ReportSheetProps) {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const [reason, setReason] = useState<ReportReason>('offensive');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    setReason('offensive');
    onClose();
  };

  const submit = async () => {
    if (!review || !session) return;
    setBusy(true);
    setError(null);
    const { error: failed } = await supabase
      .from('review_reports')
      .insert({ review_id: review.id, reporter_id: session.user.id, reason });
    setBusy(false);

    if (failed) {
      setError(
        failed.code === '23505'
          ? 'Ya reportaste este comentario. Un administrador lo revisará.'
          : 'No pudimos enviar el reporte. Inténtalo de nuevo.',
      );
      return;
    }
    close();
    onReported();
  };

  return (
    <Modal visible={review !== null} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Cerrar" />
      {review ? (
        <View style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }]}>
          <View style={styles.handle} />
          <AppText weight="display" size={22} style={styles.title}>
            Reportar comentario
          </AppText>
          <AppText weight="medium" size={14} color="textSecondary" style={{ lineHeight: 20 }}>
            ¿Qué problema tiene? Un administrador lo revisará y, si incumple las normas, lo ocultará.
          </AppText>

          <View style={styles.quote}>
            <View style={styles.quoteHead}>
              <Avatar name={review.author_name} size={28} />
              <AppText weight="extrabold" size={14}>
                {review.author_name}
              </AppText>
              <Stars value={review.rating} size={13} />
            </View>
            {review.comment ? (
              <AppText weight="medium" size={14} color="textSecondary" style={styles.quoteText} numberOfLines={4}>
                “{review.comment}”
              </AppText>
            ) : null}
          </View>

          <View accessibilityRole="radiogroup">
            {REPORT_REASONS.map((option) => {
              const selected = option.code === reason;
              return (
                <Pressable
                  key={option.code}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setReason(option.code)}
                  style={styles.option}>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <AppText weight={selected ? 'bold' : 'medium'} size={fontSize.body}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <AppText weight="semibold" size={fontSize.small} color="danger">
              {error}
            </AppText>
          ) : null}

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button label="Cancelar" variant="secondary" height={48} onPress={close} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Enviar reporte"
                height={48}
                loading={busy}
                icon={<FlagIcon size={18} color={colors.onPrimary} />}
                onPress={submit}
              />
            </View>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(19,32,46,0.52)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
    paddingTop: 8,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    marginBottom: 8,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  title: {
    letterSpacing: -0.44,
    lineHeight: 26,
  },
  quote: {
    gap: 6,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.background,
  },
  quoteHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quoteText: {
    fontStyle: 'italic',
    lineHeight: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
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
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    borderRadius: radius.lg,
  },
});
