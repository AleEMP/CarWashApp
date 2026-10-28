import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { StarIcon } from '@/components/ui/icons';
import type { CarWashPin } from '@/lib/car-washes';
import { formatDistance, openStatus, type OpenFields } from '@/lib/format';
import { fontSize } from '@/theme';

/** ★ 4.7 (213) · 650 m */
export function RatingLine({ pin }: { pin: CarWashPin }) {
  const distance = formatDistance(pin.distance_m);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <StarIcon size={13} />
      {pin.rating_count > 0 ? (
        <>
          <AppText weight="extrabold" size={fontSize.small}>
            {pin.rating_avg.toFixed(1)}
          </AppText>
          <AppText weight="medium" size={fontSize.small} color="textMuted">
            ({pin.rating_count})
          </AppText>
        </>
      ) : (
        <AppText weight="medium" size={fontSize.small} color="textMuted">
          Aún sin reseñas
        </AppText>
      )}
      {distance ? (
        <AppText weight="medium" size={fontSize.small} color="textMuted">
          · {distance}
        </AppText>
      ) : null}
    </View>
  );
}

/** Abierto · cierra a las 7:00 p. m. */
export function OpenStatusLine({ pin }: { pin: OpenFields }) {
  const status = openStatus(pin);
  return (
    <AppText weight="medium" size={fontSize.small} color="textSecondary">
      <AppText weight="extrabold" size={fontSize.small} color={status.tone}>
        {status.label}
      </AppText>
      {status.detail ? ` · ${status.detail}` : ''}
    </AppText>
  );
}
