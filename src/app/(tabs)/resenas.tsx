import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { useSession } from '@/providers/session';
import { fontSize, spacing } from '@/theme';

export default function MisResenas() {
  const { session, signOut } = useSession();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <AppText weight="display" size={28} style={styles.title}>
          Mis reseñas
        </AppText>
        {session ? (
          <AppText weight="medium" size={fontSize.body} color="textSecondary">
            Aún no has publicado reseñas. Cuando visites un local, podrás calificarlo desde su perfil.
          </AppText>
        ) : (
          <>
            <AppText weight="medium" size={fontSize.body} color="textSecondary">
              Ingresa para publicar reseñas y verlas aquí.
            </AppText>
            <View style={styles.action}>
              <Button label="Ingresar" onPress={signOut} />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: spacing.sm,
    padding: spacing.xl,
  },
  title: {
    letterSpacing: -0.56,
  },
  action: {
    marginTop: spacing.lg,
  },
});
