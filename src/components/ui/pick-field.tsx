import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ChevronDownIcon } from '@/components/ui/icons';
import { colors, fontSize, radius, spacing } from '@/theme';

type PickFieldProps = {
  label: string;
  value: string;
  onPress: () => void;
  flex?: boolean;
};

/** Campo que no se escribe: muestra un valor y abre un selector (fecha, hora, lista…). */
export function PickField({ label, value, onPress, flex = false }: PickFieldProps) {
  return (
    <View style={[{ gap: 6 }, flex && { flex: 1 }]}>
      <AppText weight="extrabold" size={fontSize.small} color="textSecondary">
        {label}
      </AppText>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={styles.field}>
        <AppText weight="semibold" size={fontSize.body} style={{ flex: 1 }} numberOfLines={1}>
          {value}
        </AppText>
        <ChevronDownIcon />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
});
