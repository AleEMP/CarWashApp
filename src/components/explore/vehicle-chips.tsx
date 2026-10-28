import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { VEHICLE_TYPES, type VehicleType } from '@/lib/car-washes';
import { colors, radius } from '@/theme';

type VehicleChipsProps = {
  value: VehicleType;
  onChange: (vehicle: VehicleType) => void;
  style?: ViewStyle;
};

export function VehicleChips({ value, onChange, style }: VehicleChipsProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de vehículo" style={[styles.container, style]}>
      {VEHICLE_TYPES.map((type) => {
        const active = type.code === value;
        return (
          <Pressable
            key={type.code}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(type.code)}
            style={[styles.chip, active && styles.chipActive]}>
            <AppText weight={active ? 'extrabold' : 'semibold'} size={14} color={active ? 'onPrimary' : 'textSecondary'}>
              {type.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
});
