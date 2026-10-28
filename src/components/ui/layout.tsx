import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, fontSize, radius, spacing } from '@/theme';

/** Bloque con título (y subtítulo o acción opcionales), como en las pantallas del propietario. */
export function Section({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={{ gap: 4 }}>
        <View style={styles.sectionHead}>
          <AppText weight="display" size={19} style={styles.sectionTitle}>
            {title}
          </AppText>
          {right}
        </View>
        {subtitle ? (
          <AppText weight="medium" size={14} color="textMuted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Tarjeta blanca con borde. `padded = false` para listas que llevan sus propios márgenes. */
export function Card({ children, padded = true, style }: { children: ReactNode; padded?: boolean; style?: ViewStyle }) {
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

export function FieldHint({ children }: { children: ReactNode }) {
  return (
    <AppText weight="medium" size={fontSize.small} color="textMuted" style={{ lineHeight: 18 }}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    letterSpacing: -0.38,
    lineHeight: 22,
  },
  card: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  padded: {
    gap: 14,
    padding: spacing.lg,
  },
});
