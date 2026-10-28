import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fontSize, fonts, radius } from '@/theme';

import { AppText } from './app-text';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  /** Texto fijo antes de lo que se escribe, por ejemplo «S/». */
  prefix?: string;
};

export function TextField({ label, error, prefix, multiline, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  const input = (
    <TextInput
      {...rest}
      multiline={multiline}
      placeholderTextColor={colors.textMuted}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={
        prefix
          ? [styles.bare, style]
          : [styles.input, multiline && styles.multiline, focused && styles.focused, error ? styles.errored : null, style]
      }
    />
  );

  return (
    <View style={styles.wrapper}>
      <AppText weight="bold" size={fontSize.small} color="textSecondary">
        {label}
      </AppText>
      {prefix ? (
        <View style={[styles.input, styles.prefixed, focused && styles.focused, error ? styles.errored : null]}>
          <AppText weight="bold" size={fontSize.body} color="textMuted">
            {prefix}
          </AppText>
          {input}
        </View>
      ) : (
        input
      )}
      {error ? (
        <AppText weight="medium" size={fontSize.small} color="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    fontFamily: fonts.medium,
    fontSize: fontSize.body,
    color: colors.text,
  },
  prefixed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bare: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    padding: 0,
    fontFamily: fonts.medium,
    fontSize: fontSize.body,
    color: colors.text,
  },
  multiline: {
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  focused: {
    borderColor: colors.primary,
  },
  errored: {
    borderColor: colors.danger,
  },
});
