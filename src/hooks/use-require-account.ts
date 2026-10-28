import { Alert } from 'react-native';

import { useSession } from '@/providers/session';

/**
 * Ejecuta `action` si hay una sesión iniciada; si el usuario explora sin cuenta,
 * le ofrece ingresar (publicar o reportar reseñas exige cuenta).
 */
export function useRequireAccount() {
  const { session, signOut } = useSession();

  return (action: () => void) => {
    if (session) {
      action();
      return;
    }
    Alert.alert('Necesitas una cuenta', 'Ingresa o crea una cuenta para publicar y reportar reseñas.', [
      { text: 'Ahora no', style: 'cancel' },
      { text: 'Ingresar', onPress: () => void signOut() },
    ]);
  };
}
