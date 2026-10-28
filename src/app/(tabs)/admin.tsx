import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalesSection } from '@/components/admin/locales-section';
import { ModerationSection } from '@/components/admin/moderation-section';
import { SponsorshipsSection } from '@/components/admin/sponsorships-section';
import { AppText } from '@/components/ui/app-text';
import { PlusIcon, ShieldIcon } from '@/components/ui/icons';
import { fetchModerationQueue } from '@/lib/admin';
import { colors, fontSize, spacing } from '@/theme';

type Section = 'locales' | 'patrocinios' | 'moderacion';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'locales', label: 'Locales' },
  { id: 'patrocinios', label: 'Patrocinios' },
  { id: 'moderacion', label: 'Moderación' },
];

/** Panel de administración (mockups 16 a 18): locales, patrocinios y reseñas reportadas. */
export default function Administracion() {
  const { seccion } = useLocalSearchParams<{ seccion?: string }>();
  const [section, setSection] = useState<Section>(seccion === 'patrocinios' || seccion === 'moderacion' ? seccion : 'locales');
  const [pendingReports, setPendingReports] = useState(0);

  const refreshPending = useCallback(() => {
    (async () => {
      const queue = await fetchModerationQueue(false);
      if (queue) setPendingReports(queue.length);
    })();
  }, []);

  useFocusEffect(refreshPending);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <ShieldIcon size={22} color="#FFFFFF" />
        </View>
        <View style={{ gap: 2, flex: 1 }}>
          <AppText weight="display" size={24} style={styles.title}>
            Administración
          </AppText>
          <AppText weight="medium" size={fontSize.small} color="textMuted">
            Locales, patrocinios y reseñas reportadas
          </AppText>
        </View>
      </View>

      <View accessibilityRole="tablist" style={styles.tabs}>
        {SECTIONS.map((item) => {
          const active = item.id === section;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSection(item.id)}
              style={[styles.tab, active && styles.tabActive]}>
              <AppText weight={active ? 'extrabold' : 'semibold'} size={fontSize.body} color={active ? 'primary' : 'textMuted'}>
                {item.label}
              </AppText>
              {item.id === 'moderacion' && pendingReports > 0 ? (
                <View style={styles.count}>
                  <AppText weight="extrabold" size={12} color="onPrimary" style={{ lineHeight: 16 }}>
                    {pendingReports}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.screen}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: section === 'locales' ? 96 : spacing.xxl }}>
          {section === 'locales' ? <LocalesSection /> : null}
          {section === 'patrocinios' ? <SponsorshipsSection /> : null}
          {section === 'moderacion' ? <ModerationSection onChanged={refreshPending} /> : null}
        </ScrollView>

        {section === 'locales' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/administracion/registrar')}
            style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.primaryPressed }]}>
            <PlusIcon size={20} />
            <AppText weight="bold" size={fontSize.body} color="onPrimary">
              Registrar local
            </AppText>
          </Pressable>
        ) : null}
      </View>
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
    gap: spacing.md,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  badge: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.text,
  },
  title: {
    letterSpacing: -0.48,
    lineHeight: 28,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  count: {
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.danger,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: colors.primary,
    elevation: 6,
  },
});
