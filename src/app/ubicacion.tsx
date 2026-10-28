import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationScene } from '@/components/illustrations/location-scene';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { BigPinIcon, LocateIcon, PinIcon } from '@/components/ui/icons';
import { useUserLocation } from '@/providers/location';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function Ubicacion() {
  const { requestPermission, dismissPrompt } = useUserLocation();
  const [asking, setAsking] = useState(false);

  const allow = async () => {
    setAsking(true);
    await requestPermission();
    setAsking(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.circle}>
          <LocationScene />
          <View style={[styles.pulse, styles.pulseOuter]} />
          <View style={[styles.pulse, styles.pulseInner]} />
          <View style={styles.pin}>
            <BigPinIcon size={56} />
          </View>
        </View>

        <AppText weight="display" size={28} style={styles.title}>
          Encuentra lavados cerca de ti
        </AppText>
        <AppText weight="medium" size={16} color="textSecondary" style={styles.body}>
          Activa tu ubicación para centrar el mapa donde estás y ver a qué distancia queda cada local. Solo la usamos
          mientras usas la app.
        </AppText>

        <View style={styles.notice}>
          <View style={styles.noticeIcon}>
            <PinIcon size={20} color={colors.primary} />
          </View>
          <View style={styles.noticeText}>
            <AppText weight="extrabold" size={14} style={{ lineHeight: 18 }}>
              Por ahora estamos en Cayma, Yanahuara y Cercado
            </AppText>
            <AppText weight="medium" size={fontSize.small} color="textMuted">
              Pronto llegaremos a más distritos de Arequipa.
            </AppText>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label="Permitir ubicación"
            icon={<LocateIcon size={20} color={colors.onPrimary} />}
            loading={asking}
            onPress={allow}
          />
          <Button label="Ahora no" variant="ghost" height={48} onPress={dismissPrompt} />
          <AppText weight="medium" size={fontSize.small} color="textMuted" style={styles.note}>
            Sin ubicación, el mapa empieza en el Cercado.
          </AppText>
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
    paddingTop: spacing.md,
    paddingBottom: 20,
  },
  circle: {
    width: 264,
    height: 264,
    alignSelf: 'center',
    marginTop: spacing.xl,
    borderRadius: 132,
    borderWidth: 6,
    borderColor: colors.surface,
    overflow: 'hidden',
  },
  pulse: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
  pulseOuter: {
    width: 132,
    height: 132,
    marginTop: -66,
    marginLeft: -66,
    borderRadius: 66,
    backgroundColor: 'rgba(11,95,165,0.16)',
  },
  pulseInner: {
    width: 64,
    height: 64,
    marginTop: -32,
    marginLeft: -32,
    borderRadius: 32,
    backgroundColor: 'rgba(11,95,165,0.22)',
  },
  pin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -56,
    marginLeft: -28,
  },
  title: {
    marginTop: spacing.xxl,
    textAlign: 'center',
    letterSpacing: -0.56,
    lineHeight: 32,
  },
  body: {
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  noticeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  noticeText: {
    flex: 1,
    gap: 2,
  },
  actions: {
    gap: 6,
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
  note: {
    textAlign: 'center',
  },
});
