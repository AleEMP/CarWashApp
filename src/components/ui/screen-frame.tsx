import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { ChevronLeftIcon } from '@/components/ui/icons';
import { goBack } from '@/lib/navigation';
import { colors, radius, spacing } from '@/theme';

type ScreenFrameProps = {
  title: string;
  /** Acción a la derecha del encabezado (por ejemplo «Guardar»). */
  right?: ReactNode;
  /** Barra fija inferior con el botón principal. */
  footer?: ReactNode;
  /** false mientras un mapa dentro de la pantalla necesita recibir el arrastre. */
  scrollEnabled?: boolean;
  children: ReactNode;
};

/** Marco común de las pantallas de gestión: encabezado con «atrás», contenido que se desplaza y barra inferior. */
export function ScreenFrame({ title, right, footer, scrollEnabled = true, children }: ScreenFrameProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={goBack} style={styles.back}>
          <ChevronLeftIcon color={colors.text} />
        </Pressable>
        <AppText weight="display" size={20} style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </AppText>
        {right}
      </View>

      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <ScrollView
          scrollEnabled={scrollEnabled}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: footer ? spacing.xl : spacing.xxl + insets.bottom }}>
          {children}
        </ScrollView>
        {footer ? <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 64,
    paddingHorizontal: spacing.sm,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  footer: {
    gap: 10,
    paddingTop: spacing.md,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
