import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { AmenityIcon, CalendarOffIcon, ClockIcon, NavigationIcon, PinIcon } from '@/components/ui/icons';
import type { CarWashDetail, ScheduleException } from '@/lib/car-wash-detail';
import { openDirections } from '@/lib/directions';
import { daysFromToday, formatClock, formatDateRange, limaIsoWeekday, weekdayName } from '@/lib/format';
import { colors, fontSize, radius, spacing } from '@/theme';

function exceptionLines(exception: ScheduleException): { title: string; subtitle: string } {
  const isSingleDay = exception.start_date === exception.end_date;
  const title = formatDateRange(exception.start_date, exception.end_date);
  if (exception.kind === 'closed') {
    return { title, subtitle: isSingleDay ? 'Cerrado todo el día' : 'Cerrado' };
  }
  return { title, subtitle: 'Horario especial' };
}

export function InfoTab({ detail }: { detail: CarWashDetail }) {
  const today = limaIsoWeekday();
  const upcoming = detail.exceptions.filter((exception) => daysFromToday(exception.end_date) >= 0);

  return (
    <View>
      <View style={styles.section}>
        <AppText weight="display" size={19} style={styles.heading}>
          Horario de atención
        </AppText>
        {detail.hours.length === 0 ? (
          <AppText weight="medium" size={fontSize.body} color="textMuted">
            Este local aún no publica su horario.
          </AppText>
        ) : (
          <View style={styles.card}>
            {[1, 2, 3, 4, 5, 6, 7].map((weekday) => {
              const hours = detail.hours.find((row) => row.weekday === weekday);
              const isToday = weekday === today;
              return (
                <View
                  key={weekday}
                  style={[styles.hoursRow, weekday > 1 && styles.divider, isToday && styles.hoursToday]}>
                  <View style={styles.hoursDay}>
                    <AppText weight={isToday ? 'extrabold' : 'semibold'} size={14} color={isToday ? 'text' : 'textSecondary'}>
                      {weekdayName(weekday)}
                    </AppText>
                    {isToday ? (
                      <View style={styles.todayBadge}>
                        <AppText weight="extrabold" size={12} color="primaryPressed" style={{ lineHeight: 16 }}>
                          Hoy
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  <AppText weight={isToday ? 'extrabold' : 'medium'} size={14} color={isToday ? 'text' : 'textSecondary'}>
                    {hours ? `${formatClock(hours.open_time)} – ${formatClock(hours.close_time)}` : 'Cerrado'}
                  </AppText>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {upcoming.length > 0 ? (
        <View style={styles.section}>
          <View style={{ gap: 4 }}>
            <AppText weight="display" size={19} style={styles.heading}>
              Cambios de horario
            </AppText>
            <AppText weight="medium" size={14} color="textMuted">
              Cierres y horarios especiales publicados por el local.
            </AppText>
          </View>
          <View style={styles.card}>
            {upcoming.map((exception, index) => {
              const { title, subtitle } = exceptionLines(exception);
              const closed = exception.kind === 'closed';
              const detailLine =
                exception.kind === 'special_hours'
                  ? `${formatClock(exception.open_time)} – ${formatClock(exception.close_time)}`
                  : exception.reason;
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
                      {title}
                    </AppText>
                    <AppText weight="semibold" size={14} color="textSecondary">
                      {subtitle}
                    </AppText>
                    {detailLine ? (
                      <AppText weight="medium" size={fontSize.small} color="textMuted">
                        {detailLine}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {detail.amenities.length > 0 ? (
        <View style={styles.section}>
          <AppText weight="display" size={19} style={styles.heading}>
            Comodidades
          </AppText>
          <View style={[styles.card, styles.amenities]}>
            {detail.amenities.map((amenity) => (
              <View key={amenity.code} style={styles.amenity}>
                <View style={styles.amenityIcon}>
                  <AmenityIcon code={amenity.code} size={20} color={colors.primary} />
                </View>
                <AppText weight="bold" size={14} color="textSecondary" style={{ flex: 1, lineHeight: 18 }}>
                  {amenity.label}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText weight="display" size={19} style={styles.heading}>
          Ubicación
        </AppText>
        <View style={[styles.card, styles.location]}>
          <View style={styles.mapBox}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              liteMode
              scrollEnabled={false}
              zoomEnabled={false}
              toolbarEnabled={false}
              initialRegion={{ latitude: detail.lat, longitude: detail.lng, latitudeDelta: 0.006, longitudeDelta: 0.006 }}>
              <Marker coordinate={{ latitude: detail.lat, longitude: detail.lng }} />
            </MapView>
          </View>
          <View style={{ gap: 4 }}>
            <View style={styles.addressRow}>
              <PinIcon size={18} color={colors.primary} />
              <AppText weight="extrabold" size={fontSize.body} style={{ flex: 1 }}>
                {detail.address}, {detail.district}
              </AppText>
            </View>
            {detail.reference ? (
              <AppText weight="medium" size={fontSize.small} color="textMuted" style={{ lineHeight: 18 }}>
                Referencia: {detail.reference}
              </AppText>
            ) : null}
          </View>
          <Button
            label="Cómo llegar"
            variant="secondary"
            height={48}
            icon={<NavigationIcon size={20} color={colors.primary} />}
            onPress={() => openDirections(detail)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  heading: {
    letterSpacing: -0.38,
    lineHeight: 22,
  },
  card: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: spacing.lg,
  },
  hoursToday: {
    backgroundColor: colors.primarySoft,
  },
  hoursDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  exceptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  exceptionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
    padding: spacing.lg,
  },
  amenity: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: spacing.sm,
  },
  amenityIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  location: {
    gap: spacing.md,
    padding: spacing.md,
    overflow: 'visible',
  },
  mapBox: {
    height: 150,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#ECE5D8',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
