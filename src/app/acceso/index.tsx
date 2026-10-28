import { router } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccessScene } from '@/components/illustrations/access-scene';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { MailIcon } from '@/components/ui/icons';
import { useSession } from '@/providers/session';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function Acceso() {
  const { enterAsGuest } = useSession();
  const { height } = useWindowDimensions();
  const sceneHeight = Math.min(340, Math.round(height * 0.4));

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.scene, { height: sceneHeight }]}>
          <AccessScene />
        </View>

        <View style={styles.brand}>
          <AppText weight="display" size={fontSize.display} style={styles.brandName}>
            CarWash
          </AppText>
          <View style={styles.badge}>
            <AppText weight="extrabold" size={14} color="primaryPressed" style={{ lineHeight: 18 }}>
              AQP
            </AppText>
          </View>
        </View>

        <AppText weight="medium" size={fontSize.lead} color="textSecondary" style={styles.tagline}>
          Encuentra, compara y elige dónde lavar tu vehículo en Arequipa.
        </AppText>

        <View style={styles.actions}>
          <Button
            label="Continuar con correo"
            icon={<MailIcon />}
            onPress={() => router.push('/acceso/correo')}
          />
          <Button label="Explorar sin cuenta" variant="ghost" height={48} onPress={enterAsGuest} />
        </View>

        <AppText weight="medium" size={fontSize.small} color="textMuted" style={styles.note}>
          Solo necesitas una cuenta para publicar reseñas.
        </AppText>

        <View style={styles.footer}>
          <AppText weight="medium" size={fontSize.small} color="textMuted">
            ¿Tienes un centro de lavado?
          </AppText>
          <Button
            label="Solicita acceso"
            variant="ghost"
            height={44}
            fontSize={fontSize.small}
            onPress={() => router.push('/acceso/solicitud')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 20,
    paddingBottom: spacing.md,
  },
  scene: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.xxl,
  },
  brandName: {
    lineHeight: fontSize.display,
    letterSpacing: -1.33,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  tagline: {
    marginTop: spacing.md,
    lineHeight: 25,
  },
  actions: {
    gap: 10,
    marginTop: 28,
  },
  note: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
