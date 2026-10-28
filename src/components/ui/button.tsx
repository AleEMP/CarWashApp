import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { colors, radius } from '@/theme';

import { AppText } from './app-text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  height?: number;
  fontSize?: number;
};

const palette = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary, border: 'transparent' },
  secondary: { bg: colors.surface, pressed: colors.surfaceMuted, fg: colors.text, border: colors.borderStrong },
  outline: { bg: colors.surface, pressed: colors.primarySoft, fg: colors.primary, border: '#C4D8EE' },
  ghost: { bg: 'transparent', pressed: colors.primarySoft, fg: colors.primary, border: 'transparent' },
  danger: { bg: colors.dangerSoft, pressed: '#F6D5D1', fg: colors.danger, border: 'transparent' },
} as const;

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, icon, height = 52, fontSize = 15 }: ButtonProps) {
  const p = palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { height, backgroundColor: pressed ? p.pressed : p.bg, borderColor: p.border, opacity: disabled ? 0.5 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon}
          <AppText weight="bold" size={fontSize} style={{ color: p.fg }}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
});
