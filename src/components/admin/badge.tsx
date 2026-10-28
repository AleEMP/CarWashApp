import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius } from '@/theme';

type BadgeProps = {
  label: string;
  background: string;
  color: string;
  icon?: ReactNode;
};

/** Etiqueta pequeña de estado (Por verificar, Patrocinado, 3 reportes…). */
export function Badge({ label, background, color, icon }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      {icon}
      <AppText weight="extrabold" size={12} style={{ color, lineHeight: 16 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
});
