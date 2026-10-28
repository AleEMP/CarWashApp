import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { avatarColors, initials } from '@/lib/format';

/** Círculo con las iniciales del nombre público («Carla M.» -> CM). */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { background, color } = avatarColors(name);
  return (
    <View
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
      }}>
      <AppText weight="extrabold" size={size >= 40 ? 14 : 12} style={{ color, lineHeight: undefined, includeFontPadding: false }}>
        {initials(name)}
      </AppText>
    </View>
  );
}
