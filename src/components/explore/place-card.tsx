import { StyleSheet, View } from 'react-native';

import { CoverImage } from '@/components/explore/cover-image';
import { OpenStatusLine, RatingLine } from '@/components/explore/place-info';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { NavigationIcon, TagIcon, VerifiedIcon } from '@/components/ui/icons';
import type { CarWashPin } from '@/lib/car-washes';
import { openDirections } from '@/lib/directions';
import { formatPrice } from '@/lib/format';
import { openLocal } from '@/lib/navigation';
import { colors, fontSize, radius, spacing } from '@/theme';

/** Tarjeta del local seleccionado en el mapa. */
export function PlaceCard({ pin }: { pin: CarWashPin }) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <CoverImage path={pin.cover_path} size={80} sponsored={pin.sponsored_on_map} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <AppText weight="display" size={18} numberOfLines={1} style={styles.name}>
              {pin.name}
            </AppText>
            <VerifiedIcon size={16} />
          </View>
          <RatingLine pin={pin} />
          <OpenStatusLine pin={pin} />
          <View style={styles.priceRow}>
            <AppText weight="semibold" size={12} color="textMuted">
              Desde
            </AppText>
            <AppText weight="display" size={18}>
              {pin.min_price === null ? '' : formatPrice(pin.min_price)}
            </AppText>
          </View>
        </View>
      </View>

      {pin.promo_title ? (
        <View style={styles.promo}>
          <TagIcon size={16} />
          <AppText weight="extrabold" size={fontSize.small} color="warning" style={{ flex: 1 }}>
            {pin.promo_title}
          </AppText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button label="Ver local" height={44} onPress={() => openLocal(pin)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Cómo llegar"
            variant="outline"
            height={44}
            icon={<NavigationIcon size={20} color={colors.primary} />}
            onPress={() => openDirections(pin)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  top: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
    letterSpacing: -0.18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md - 2,
    backgroundColor: colors.warningSoft,
  },
});
