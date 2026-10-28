import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ExceptionSheet } from '@/components/owner/exception-sheet';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { CalendarOffIcon, ChevronDownIcon, ClockIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { Card, Section } from '@/components/ui/layout';
import { ScreenFrame } from '@/components/ui/screen-frame';
import { Toggle } from '@/components/ui/toggle';
import { useCarWashDetail } from '@/hooks/use-car-wash-detail';
import type { CarWashDetail, OpeningHour, ScheduleException } from '@/lib/car-wash-detail';
import { daysFromToday, formatClock, formatDateRange } from '@/lib/format';
import { saveWeeklyHours, type DayHours } from '@/lib/owner';
import { dateToTime, pickTime, timeToDate } from '@/lib/pick-datetime';
import { colors, fontSize, radius, spacing } from '@/theme';

type DayState = { enabled: boolean; open: string; close: string };
type WeekState = Record<number, DayState>;

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DEFAULT_OPEN = '08:00:00';
const DEFAULT_CLOSE = '18:00:00';

function toWeek(hours: OpeningHour[]): WeekState {
  const week: WeekState = {};
  for (let weekday = 1; weekday <= 7; weekday++) {
    const found = hours.find((row) => row.weekday === weekday);
    week[weekday] = found
      ? { enabled: true, open: found.open_time, close: found.close_time }
      : { enabled: false, open: DEFAULT_OPEN, close: DEFAULT_CLOSE };
  }
  return week;
}

function toRows(week: WeekState): OpeningHour[] {
  return Object.entries(week)
    .filter(([, day]) => day.enabled)
    .map(([weekday, day]) => ({ weekday: Number(weekday), open_time: day.open, close_time: day.close }));
}

export default function HorariosYCierres() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { detail, reload } = useCarWashDetail(id);

  if (detail === undefined) {
    return (
      <ScreenFrame title="Horarios y cierres">
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </ScreenFrame>
    );
  }
  if (detail === null) {
    return (
      <ScreenFrame title="Horarios y cierres">
        <AppText weight="medium" size={fontSize.body} color="textMuted" style={{ padding: spacing.xl }}>
          No encontramos este local.
        </AppText>
      </ScreenFrame>
    );
  }
  return <HoursForm key={detail.id} detail={detail} reload={reload} />;
}

function HoursForm({ detail, reload }: { detail: CarWashDetail; reload: () => void }) {
  const [week, setWeek] = useState<WeekState>(() => toWeek(detail.hours));
  // Lo último que quedó guardado: sirve para saber qué cambió y para no repetir filas al guardar dos veces.
  const [saved, setSaved] = useState<WeekState>(() => toWeek(detail.hours));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; exception: ScheduleException | null }>({ open: false, exception: null });

  const dirty = JSON.stringify(week) !== JSON.stringify(saved);
  const upcoming = detail.exceptions.filter((exception) => daysFromToday(exception.end_date) >= 0);

  const setDay = (weekday: number, patch: Partial<DayState>) =>
    setWeek((current) => ({ ...current, [weekday]: { ...current[weekday], ...patch } }));

  const editRange = async (weekday: number) => {
    const day = week[weekday];
    const open = await pickTime(timeToDate(day.open));
    if (!open) return;
    const close = await pickTime(timeToDate(day.close));
    if (!close) return;
    setDay(weekday, { open: dateToTime(open), close: dateToTime(close) });
  };

  const save = async () => {
    setError(null);
    for (let weekday = 1; weekday <= 7; weekday++) {
      const day = week[weekday];
      if (day.enabled && day.open >= day.close) {
        return setError(`El ${DAY_LABELS[weekday - 1]} cierra antes de abrir. Revisa las horas.`);
      }
    }

    setSaving(true);
    const next: Record<number, DayHours | null> = {};
    for (let weekday = 1; weekday <= 7; weekday++) {
      next[weekday] = week[weekday].enabled ? { open: week[weekday].open, close: week[weekday].close } : null;
    }
    const failure = await saveWeeklyHours(detail.id, toRows(saved), next);
    setSaving(false);
    if (failure) return setError(failure);
    setSaved(week);
    reload();
  };

  return (
    <ScreenFrame
      title="Horarios y cierres"
      footer={
        dirty ? (
          <>
            {error ? (
              <AppText weight="semibold" size={fontSize.small} color="danger">
                {error}
              </AppText>
            ) : null}
            <Button label="Guardar horario" loading={saving} onPress={save} />
          </>
        ) : undefined
      }>
      <Section title="Horario semanal" subtitle="Es el horario habitual que verán tus clientes.">
        <Card padded={false}>
          {DAY_LABELS.map((label, index) => {
            const weekday = index + 1;
            const day = week[weekday];
            return (
              <View key={label} style={[styles.dayRow, index > 0 && styles.divider]}>
                <AppText weight="extrabold" size={fontSize.body} style={{ width: 40 }}>
                  {label}
                </AppText>
                <Toggle value={day.enabled} onChange={(enabled) => setDay(weekday, { enabled })} label={`Abierto el ${label}`} />
                {day.enabled ? (
                  <Pressable accessibilityRole="button" onPress={() => editRange(weekday)} style={styles.range}>
                    <AppText weight="bold" size={14} style={{ flex: 1 }} numberOfLines={1}>
                      {formatClock(day.open)} – {formatClock(day.close)}
                    </AppText>
                    <ChevronDownIcon size={18} />
                  </Pressable>
                ) : (
                  <AppText weight="semibold" size={14} color="textMuted" style={{ flex: 1, paddingLeft: spacing.sm }}>
                    Cerrado
                  </AppText>
                )}
              </View>
            );
          })}
        </Card>
        {!dirty && error ? (
          <AppText weight="semibold" size={fontSize.small} color="danger">
            {error}
          </AppText>
        ) : null}
      </Section>

      <Section
        title="Excepciones y cierres temporales"
        subtitle="Avisa cuando no atenderás o cambiarás tu horario. Se mostrará en tu perfil.">
        {upcoming.length > 0 ? (
          <Card padded={false}>
            {upcoming.map((exception, index) => {
              const closed = exception.kind === 'closed';
              const single = exception.start_date === exception.end_date;
              return (
                <View key={exception.id} style={[styles.exceptionRow, index > 0 && styles.divider]}>
                  <View style={[styles.exceptionIcon, { backgroundColor: closed ? colors.warningSoft : colors.primarySoft }]}>
                    {closed ? (
                      <CalendarOffIcon size={20} color={colors.warning} />
                    ) : (
                      <ClockIcon size={20} color={colors.primaryPressed} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText weight="extrabold" size={14}>
                      {formatDateRange(exception.start_date, exception.end_date)}
                    </AppText>
                    <AppText weight="semibold" size={14} color="textSecondary">
                      {closed ? (single ? 'Cerrado todo el día' : 'Cerrado') : 'Horario especial'}
                    </AppText>
                    {closed ? (
                      exception.reason ? (
                        <AppText weight="medium" size={fontSize.small} color="textMuted">
                          {exception.reason}
                        </AppText>
                      ) : null
                    ) : (
                      <AppText weight="medium" size={fontSize.small} color="textMuted">
                        {formatClock(exception.open_time)} – {formatClock(exception.close_time)}
                      </AppText>
                    )}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${formatDateRange(exception.start_date, exception.end_date)}`}
                    onPress={() => setSheet({ open: true, exception })}
                    style={styles.edit}>
                    <EditIcon size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </Card>
        ) : (
          <AppText weight="medium" size={fontSize.body} color="textMuted">
            No tienes cierres ni horarios especiales programados.
          </AppText>
        )}
        <Button
          label="Agregar excepción"
          variant="outline"
          height={48}
          icon={<PlusIcon size={20} color={colors.primary} />}
          onPress={() => setSheet({ open: true, exception: null })}
        />
      </Section>

      {sheet.open ? (
        <ExceptionSheet
          key={sheet.exception?.id ?? 'nueva'}
          carWashId={detail.id}
          exception={sheet.exception}
          onClose={() => setSheet({ open: false, exception: null })}
          onSaved={() => {
            setSheet({ open: false, exception: null });
            reload();
          }}
        />
      ) : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  range: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  exceptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  exceptionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  edit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
});
