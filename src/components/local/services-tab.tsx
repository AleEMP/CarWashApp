import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { VehicleChips } from '@/components/explore/vehicle-chips';
import { AppText } from '@/components/ui/app-text';
import { ClockIcon, InfoIcon, TagIcon } from '@/components/ui/icons';
import type { CarWashDetail } from '@/lib/car-wash-detail';
import { VEHICLE_TYPES, type VehicleType } from '@/lib/car-washes';
import { formatDuration, formatPrice, formatUntil } from '@/lib/format';
import { colors, fontSize, radius, spacing } from '@/theme';

export function ServicesTab({ detail, initialVehicle }: { detail: CarWashDetail; initialVehicle: VehicleType }) {
  const [vehicle, setVehicle] = useState<VehicleType>(initialVehicle);

  const rows = detail.services
    .map((service) => ({ service, price: service.service_prices.find((p) => p.vehicle_type === vehicle)?.price }))
    .filter((row): row is { service: (typeof detail.services)[number]; price: number } => row.price !== undefined);
  const vehicleLabel = VEHICLE_TYPES.find((type) => type.code === vehicle)?.priceLabel ?? '';

  return (
    <View>
      {detail.promotions.length > 0 ? (
        <View style={styles.section}>
          <AppText weight="display" size={19} style={styles.heading}>
            Promociones vigentes
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoRow}>
            {detail.promotions.map((promo) => (
              <View key={promo.id} style={styles.promo}>
                <View style={styles.promoTop}>
                  <View style={styles.promoIcon}>
                    <TagIcon size={16} />
                  </View>
                  <AppText weight="extrabold" size={12} color="warning">
                    {formatUntil(promo.end_date)}
                  </AppText>
                </View>
                <AppText weight="extrabold" size={16} style={{ lineHeight: 20 }}>
                  {promo.title}
                </AppText>
                {promo.description ? (
                  <AppText weight="medium" size={fontSize.small} color="textSecondary" style={{ lineHeight: 18 }}>
                    {promo.description}
                  </AppText>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText weight="display" size={19} style={styles.heading}>
          Servicios y precios
        </AppText>
        <View style={{ gap: spacing.sm }}>
          <AppText weight="extrabold" size={fontSize.small} color="textMuted">
            Precios para
          </AppText>
          <VehicleChips value={vehicle} onChange={setVehicle} />
        </View>

        {rows.length > 0 ? (
          <View style={styles.card}>
            {rows.map(({ service, price }, index) => {
              const promo = detail.promotions.find((p) => p.service_id === service.id);
              return (
                <View key={service.id} style={[styles.serviceRow, index > 0 && styles.divider]}>
                  <View style={styles.serviceInfo}>
                    <AppText weight="extrabold" size={fontSize.body}>
                      {service.name}
                    </AppText>
                    {service.description ? (
                      <AppText weight="medium" size={fontSize.small} color="textMuted" style={{ lineHeight: 18 }}>
                        {service.description}
                      </AppText>
                    ) : null}
                    {service.duration_minutes || promo ? (
                      <View style={styles.chips}>
                        {service.duration_minutes ? (
                          <View style={styles.chip}>
                            <ClockIcon size={13} color={colors.textSecondary} />
                            <AppText weight="extrabold" size={12} color="textSecondary" style={{ lineHeight: 16 }}>
                              {formatDuration(service.duration_minutes)}
                            </AppText>
                          </View>
                        ) : null}
                        {promo ? (
                          <View style={[styles.chip, styles.promoChip]}>
                            <TagIcon size={13} />
                            <AppText weight="extrabold" size={12} color="warning" style={{ lineHeight: 16 }}>
                              {promo.title}
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <AppText weight="display" size={20} style={styles.price}>
                    {formatPrice(price)}
                  </AppText>
                </View>
              );
            })}
          </View>
        ) : (
          <AppText weight="medium" size={fontSize.body} color="textMuted">
            Este local no publica servicios para {vehicleLabel}.
          </AppText>
        )}

        <View style={styles.note}>
          <InfoIcon size={16} />
          <AppText weight="medium" size={12} color="textMuted" style={{ flex: 1 }}>
            Precios publicados por el local. Pueden variar según el tamaño o el estado del vehículo.
          </AppText>
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
  promoRow: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  promo: {
    width: 272,
    gap: 6,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFCB8B',
    backgroundColor: colors.warningSoft,
  },
  promoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  promoIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  card: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  serviceInfo: {
    flex: 1,
    gap: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  promoChip: {
    backgroundColor: colors.warningSoft,
  },
  price: {
    letterSpacing: -0.2,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
});
