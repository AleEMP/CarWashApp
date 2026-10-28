import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { colors, fontSize, spacing } from '@/theme';

type Option<T extends string | number> = { value: T; label: string };

type PickerSheetProps<T extends string | number> = {
  visible: boolean;
  title: string;
  options: Option<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
};

/** Hoja inferior para elegir una opción de una lista corta (distrito, servicio, local…). */
export function PickerSheet<T extends string | number>({ visible, title, options, selected, onSelect, onClose }: PickerSheetProps<T>) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <View style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}>
        <View style={styles.handle} />
        <AppText weight="display" size={20} style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.sm }}>
          {title}
        </AppText>
        <ScrollView style={{ maxHeight: 360 }}>
          {options.map((option) => {
            const isSelected = option.value === selected;
            return (
              <Pressable
                key={String(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                style={styles.option}>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected ? <View style={styles.radioDot} /> : null}
                </View>
                <AppText weight={isSelected ? 'bold' : 'medium'} size={fontSize.body} style={{ flex: 1 }}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(19,32,46,0.52)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    marginBottom: spacing.md,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.xl,
  },
  radio: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
