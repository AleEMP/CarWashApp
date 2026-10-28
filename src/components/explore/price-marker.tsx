import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { AppText } from '@/components/ui/app-text';
import { CarGlyph, SparkleIcon, StarIcon } from '@/components/ui/icons';
import type { CarWashPin } from '@/lib/car-washes';
import { formatPrice, openStatus } from '@/lib/format';
import { colors } from '@/theme';

const AMBER = '#E39B1B';
const AMBER_DARK = '#7A4300';
const CLOSED_BG = '#EEEAE3';

type PriceMarkerProps = {
  pin: CarWashPin;
  selected: boolean;
  onPress: () => void;
};

/**
 * Pin del mapa: precio «desde» del local, «Cerrado» si no atiende ahora, o tarjeta
 * destacada con etiqueta «Patrocinado». Conviene remontarlo (key) al cambiar `selected`:
 * en Android el marcador se dibuja como imagen y solo se actualiza mientras `tracksViewChanges` es true.
 */
export function PriceMarker({ pin, selected, onPress }: PriceMarkerProps) {
  const [tracking, setTracking] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracking(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const isOpen = openStatus(pin).isOpenNow;
  const price = pin.min_price === null ? '' : formatPrice(pin.min_price);

  return (
    <Marker
      coordinate={{ latitude: pin.lat, longitude: pin.lng }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracking}
      zIndex={selected ? 3 : pin.sponsored_on_map ? 2 : 1}
      onPress={onPress}>
      {pin.sponsored_on_map ? (
        <SponsoredPin pin={pin} price={price} selected={selected} />
      ) : (
        <PricePill price={price} isOpen={isOpen} selected={selected} />
      )}
    </Marker>
  );
}

export function PricePill({ price, isOpen, selected }: { price: string; isOpen: boolean; selected: boolean }) {
  const tone = selected ? colors.primary : isOpen ? colors.surface : CLOSED_BG;
  const textColor = selected ? 'onPrimary' : isOpen ? 'text' : 'textMuted';

  return (
    <View style={styles.pinWrap}>
      <View style={selected ? styles.ring : undefined}>
        <View
          style={[
            styles.pill,
            { backgroundColor: tone, borderColor: selected ? colors.primary : colors.borderStrong },
            selected && styles.pillSelected,
            !isOpen && styles.pillClosed,
          ]}>
          <AppText weight="extrabold" size={selected ? 15 : isOpen ? 14 : 13} color={textColor} style={styles.noLineHeight}>
            {isOpen ? price : 'Cerrado'}
          </AppText>
        </View>
      </View>
      <View style={[styles.pointer, { borderTopColor: tone }]} />
    </View>
  );
}

export function SponsoredPin({
  pin,
  price,
  selected,
}: {
  pin: Pick<CarWashPin, 'name' | 'rating_avg' | 'rating_count'>;
  price: string;
  selected: boolean;
}) {
  return (
    <View style={styles.pinWrap}>
      <View style={[styles.sponsoredCard, selected && styles.sponsoredSelected]}>
        <View style={styles.sponsoredTag}>
          <SparkleIcon size={12} />
          <AppText weight="extrabold" size={12} color="onPrimary" style={styles.noLineHeight}>
            Patrocinado
          </AppText>
        </View>
        <View style={styles.avatar}>
          <CarGlyph size={26} color={colors.primary} />
        </View>
        <View style={{ gap: 1 }}>
          <AppText weight="extrabold" size={14} style={styles.noLineHeight}>
            {pin.name}
          </AppText>
          <View style={styles.sponsoredMeta}>
            <AppText weight="extrabold" size={13} color="textSecondary" style={styles.noLineHeight}>
              {price}
            </AppText>
            {pin.rating_count > 0 ? (
              <>
                <AppText weight="bold" size={13} color="textMuted" style={styles.noLineHeight}>
                  ·
                </AppText>
                <StarIcon size={13} />
                <AppText weight="extrabold" size={13} color="textSecondary" style={styles.noLineHeight}>
                  {pin.rating_avg.toFixed(1)}
                </AppText>
              </>
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.sponsoredPointer} />
    </View>
  );
}

const styles = StyleSheet.create({
  pinWrap: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  noLineHeight: {
    lineHeight: undefined,
    includeFontPadding: false,
  },
  ring: {
    padding: 3,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  pill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    height: 38,
    borderRadius: 19,
  },
  pillClosed: {
    height: 32,
    borderRadius: 16,
  },
  pointer: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  sponsoredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: AMBER,
    backgroundColor: colors.surface,
  },
  sponsoredSelected: {
    backgroundColor: '#FFFCF5',
  },
  sponsoredTag: {
    position: 'absolute',
    left: 10,
    top: -13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: AMBER_DARK,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  sponsoredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sponsoredPointer: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: AMBER,
  },
});
