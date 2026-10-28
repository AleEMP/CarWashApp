import { Pressable, StyleSheet, View } from 'react-native';

import { goBack } from '@/lib/navigation';
import { colors, radius } from '@/theme';

import { AppText } from './app-text';
import { ChevronLeftIcon } from './icons';

export function ScreenHeader({ title }: { title?: string }) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={8}
        onPress={goBack}
        style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.surfaceMuted }]}>
        <ChevronLeftIcon color={colors.text} />
      </Pressable>
      {title ? (
        <AppText weight="extrabold" size={20}>
          {title}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
  },
  back: {
    width: 44,
    height: 44,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
});
