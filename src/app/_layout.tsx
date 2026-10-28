import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ExploreProvider } from '@/providers/explore';
import { LocationProvider, useUserLocation } from '@/providers/location';
import { SessionProvider, useSession } from '@/providers/session';
import { colors } from '@/theme';

// Un enlace directo (por ejemplo al perfil de un local) se apila sobre las pestañas, así «atrás» vuelve al mapa.
export const unstable_settings = { anchor: '(tabs)' };

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });

  return (
    <SessionProvider>
      <LocationProvider>
        <ExploreProvider>
          <RootNavigator fontsReady={fontsLoaded || fontError !== null} />
        </ExploreProvider>
      </LocationProvider>
    </SessionProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { session, profile, guest, isLoading } = useSession();
  const location = useUserLocation();
  const ready = fontsReady && !isLoading && !location.isLoading;

  useEffect(() => {
    if (ready) {
      SplashScreen.hide();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  // Se entra a la app con cuenta o explorando sin cuenta; si no, solo se ven las pantallas de acceso.
  const canEnter = session !== null || guest;
  // El permiso de ubicación se ofrece una vez: hasta que el usuario lo concede, lo niega o pulsa «Ahora no».
  const locationDecided = location.permission !== 'undetermined' || location.promptDismissed;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={canEnter && locationDecided}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="local/[id]" />
          <Stack.Screen name="resena/[id]" />
          <Stack.Screen name="gestion" />
        </Stack.Protected>
        <Stack.Protected guard={canEnter && locationDecided && profile?.role === 'admin'}>
          <Stack.Screen name="administracion" />
        </Stack.Protected>
        <Stack.Protected guard={canEnter && !locationDecided}>
          <Stack.Screen name="ubicacion" />
        </Stack.Protected>
        <Stack.Protected guard={!canEnter}>
          <Stack.Screen name="acceso" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
