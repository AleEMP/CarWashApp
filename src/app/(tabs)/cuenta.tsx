import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { useSession, type Role } from '@/providers/session';
import { colors, fontSize, radius, spacing } from '@/theme';

const roleLabels: Record<Role, string> = {
  driver: 'Conductor',
  owner: 'Propietario',
  admin: 'Administrador',
};

export default function Cuenta() {
  const { session, profile, signOut } = useSession();
  const name = profile?.display_name ?? session?.user.email?.split('@')[0] ?? null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <AppText weight="display" size={28} style={styles.title}>
          Cuenta
        </AppText>

        <View style={styles.card}>
          {session ? (
            <>
              <AppText weight="extrabold" size={fontSize.lead}>
                {name}
              </AppText>
              <AppText weight="medium" size={fontSize.small} color="textMuted">
                {session.user.email}
              </AppText>
              <View style={styles.rolePill}>
                <AppText weight="bold" size={fontSize.small} color="primaryPressed">
                  {roleLabels[profile?.role ?? 'driver']}
                </AppText>
              </View>
            </>
          ) : (
            <AppText weight="extrabold" size={fontSize.lead}>
              Explorando sin cuenta
            </AppText>
          )}
          <Button label={session ? 'Cerrar sesión' : 'Ingresar'} variant="secondary" height={44} onPress={signOut} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  title: {
    letterSpacing: -0.56,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rolePill: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
});
