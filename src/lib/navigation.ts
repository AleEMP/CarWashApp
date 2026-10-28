import { router } from 'expo-router';

/** Vuelve a la pantalla anterior; si no hay ninguna, no hace nada en lugar de lanzar un aviso de navegación. */
export function goBack() {
  if (router.canGoBack()) {
    router.back();
  }
}

/** Abre el perfil del local; la distancia se pasa para no tener que recalcularla. */
export function openLocal(pin: { id: string; distance_m: number | null }) {
  router.push({
    pathname: '/local/[id]',
    params: { id: pin.id, distance: pin.distance_m === null ? '' : String(Math.round(pin.distance_m)) },
  });
}
