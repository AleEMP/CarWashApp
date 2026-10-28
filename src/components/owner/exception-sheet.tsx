import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TrashIcon } from '@/components/ui/icons';
import { PickField } from '@/components/ui/pick-field';
import { TextField } from '@/components/ui/text-field';
import type { ScheduleException } from '@/lib/car-wash-detail';
import { daysFromToday, formatClock, formatDayShort, limaTodayIso } from '@/lib/format';
import { deleteException, saveException } from '@/lib/owner';
import { dateToIso, dateToTime, isoToDate, pickDate, pickTime, timeToDate } from '@/lib/pick-datetime';
import { colors, fontSize, spacing } from '@/theme';

type ExceptionSheetProps = {
  carWashId: string;
  /** null = nueva excepción. */
  exception: ScheduleException | null;
  onClose: () => void;
  onSaved: () => void;
};

/** Hoja para agregar o editar un cierre temporal o un horario especial (mockup 13). */
export function ExceptionSheet({ carWashId, exception, onClose, onSaved }: ExceptionSheetProps) {
  const insets = useSafeAreaInsets();
  const today = limaTodayIso();

  const [kind, setKind] = useState<'closed' | 'special_hours'>(exception?.kind ?? 'closed');
  const [startDate, setStartDate] = useState(exception?.start_date ?? today);
  const [endDate, setEndDate] = useState(exception?.end_date ?? today);
  const [openTime, setOpenTime] = useState(exception?.open_time ?? '08:00:00');
  const [closeTime, setCloseTime] = useState(exception?.close_time ?? '13:00:00');
  const [reason, setReason] = useState(exception?.reason ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseStart = async () => {
    const picked = await pickDate(isoToDate(startDate), isoToDate(today));
    if (!picked) return;
    const iso = dateToIso(picked);
    setStartDate(iso);
    if (endDate < iso) setEndDate(iso);
  };

  const chooseEnd = async () => {
    const picked = await pickDate(isoToDate(endDate), isoToDate(startDate));
    if (picked) setEndDate(dateToIso(picked));
  };

  const chooseTime = async (current: string, apply: (value: string) => void) => {
    const picked = await pickTime(timeToDate(current));
    if (picked) apply(dateToTime(picked));
  };

  const save = async () => {
    setError(null);
    if (endDate < startDate) return setError('La fecha final no puede ser anterior a la inicial.');
    if (kind === 'special_hours' && openTime >= closeTime) return setError('La hora de cierre debe ser posterior a la de apertura.');

    setBusy(true);
    const failure = await saveException(carWashId, exception?.id ?? null, {
      kind,
      startDate,
      endDate,
      openTime: kind === 'special_hours' ? openTime : null,
      closeTime: kind === 'special_hours' ? closeTime : null,
      reason: reason.trim() || null,
    });
    setBusy(false);
    if (failure) return setError(failure);
    onSaved();
  };

  const remove = async () => {
    if (!exception) return;
    setBusy(true);
    const failure = await deleteException(exception.id);
    setBusy(false);
    if (failure) return setError(failure);
    onSaved();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <KeyboardAvoidingView behavior="padding" style={styles.keyboard} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}>
          <View style={styles.handle} />
          <AppText weight="display" size={22} style={styles.title}>
            {exception ? 'Editar excepción' : 'Nueva excepción'}
          </AppText>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }} contentContainerStyle={styles.form}>
            <View style={styles.chips}>
              <Chip label="Cerrado" selected={kind === 'closed'} onPress={() => setKind('closed')} />
              <Chip label="Horario especial" selected={kind === 'special_hours'} onPress={() => setKind('special_hours')} />
            </View>

            <View style={styles.pair}>
              <PickField flex label="Desde" value={formatDayShort(startDate)} onPress={chooseStart} />
              <PickField flex label="Hasta" value={formatDayShort(endDate)} onPress={chooseEnd} />
            </View>
            {daysFromToday(startDate) < 0 ? (
              <AppText weight="medium" size={fontSize.small} color="textMuted">
                Esta fecha ya pasó.
              </AppText>
            ) : null}

            {kind === 'special_hours' ? (
              <View style={styles.pair}>
                <PickField flex label="Abre" value={formatClock(openTime)} onPress={() => chooseTime(openTime, setOpenTime)} />
                <PickField flex label="Cierra" value={formatClock(closeTime)} onPress={() => chooseTime(closeTime, setCloseTime)} />
              </View>
            ) : null}

            <TextField
              label="Motivo (opcional)"
              value={reason}
              onChangeText={setReason}
              maxLength={160}
              placeholder="Mantenimiento, feriado, vacaciones…"
            />
          </ScrollView>

          {error ? (
            <AppText weight="semibold" size={fontSize.small} color="danger" style={styles.error}>
              {error}
            </AppText>
          ) : null}

          <View style={styles.actions}>
            {exception ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Eliminar excepción" onPress={remove} style={styles.trash}>
                <TrashIcon size={20} />
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }}>
              <Button label="Cancelar" variant="secondary" height={48} onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Guardar" height={48} loading={busy} onPress={save} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  keyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
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
    marginBottom: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  title: {
    letterSpacing: -0.44,
    lineHeight: 26,
  },
  form: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pair: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  error: {
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trash: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.dangerSoft,
  },
});
