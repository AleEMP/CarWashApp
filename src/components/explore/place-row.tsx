import { Pressable, StyleSheet, View } from 'react-native';

import { CoverImage } from '@/components/explore/cover-image';
import { OpenStatusLine, RatingLine } from '@/components/explore/place-info';
import { AppText } from '@/components/ui/app-text';
import { SparkleIcon, TagIcon, VerifiedIcon } from '@/components/ui/icons';
import type { CarWashPin } from '@/lib/car-washes';
import { formatPrice } from '@/lib/format';
import { openLocal } from '@/lib/navigation';
import { colors, fontSize } from '@/theme';

/** Fila de la lista de resultados. Los patrocinados llevan borde ámbar y etiqueta. */
export function PlaceRow({ pin }: { pin: CarWashPin }) {
  const sponsored = pin.sponsored_in_list;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pin.name}, ver local`}
      onPress={() => openLocal(pin)}
      style={({ pressed }) => [styles.row, sponsored && styles.rowSponsored, pressed && { opacity: 0.85 }]}>
      <CoverImage path={pin.cover_path} size={88} sponsored={sponsored} />
      <View style={styles.info}>
        {sponsored ? (
          <View style={styles.tag}>
            <SparkleIcon size={12} />
            <AppText weight="extrabold" size={12} color="onPrimary" style={{ lineHeight: 16 }}>
              Patrocinado
            </AppText>
          </View>
        ) : null}
        <View style={styles.nameRow}>
          <AppText weight="display" size={17} numberOfLines={1} style={styles.name}>
            {pin.name}
          </AppText>
          <VerifiedIcon size={15} />
        </View>
        <RatingLine pin={pin} />
        <OpenStatusLine pin={pin} />
        {pin.promo_title ? (
          <View style={styles.promo}>
            <TagIcon size={14} />
            <AppText weight="extrabold" size={12} color="warning" numberOfLines={1} style={{ flex: 1 }}>
              {pin.promo_title}
            </AppText>
          </View>
        ) : null}
        <View style={styles.priceRow}>
          <AppText weight="semibold" size={12} color="textMuted">
            Desde
          </AppText>
          <AppText weight="display" size={18}>
            {pin.min_price === null ? '' : formatPrice(pin.min_price)}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowSponsored: {
    borderWidth: 1.5,
    borderColor: '#E39B1B',
    backgroundColor: '#FFFCF5',
  },
  info: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#7A4300',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    flexShrink: 1,
    letterSpacing: -0.17,
  },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: fontSize.caption / 6,
  },
});
