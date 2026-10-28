import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

type ToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
};

/** Interruptor con el diseño del mockup (48 × 28). */
export function Toggle({ value, onChange, label }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.touch}>
      <View style={[styles.track, { backgroundColor: value ? colors.primary : '#C9C0B2' }]}>
        <View style={[styles.thumb, { left: value ? 23 : 3 }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    width: 52,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
  },
  thumb: {
    position: 'absolute',
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
});
