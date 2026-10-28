import { View } from 'react-native';

import { StarIcon } from '@/components/ui/icons';

const EMPTY = '#E6DFD2';
const FULL = '#E8A21A';

/** Cinco estrellas; `value` admite decimales (4.7 = cuatro llenas y la quinta casi llena). */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((index) => {
        const fill = Math.max(0, Math.min(1, value - (index - 1)));
        return (
          <View key={index} style={{ width: size, height: size }}>
            <StarIcon size={size} color={EMPTY} />
            {fill > 0 ? (
              <View style={{ position: 'absolute', left: 0, top: 0, width: size * fill, height: size, overflow: 'hidden' }}>
                <StarIcon size={size} color={FULL} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
