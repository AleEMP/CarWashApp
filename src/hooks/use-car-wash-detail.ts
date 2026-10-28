import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { fetchCarWashDetail, type CarWashDetail } from '@/lib/car-wash-detail';

/**
 * Perfil completo de un local. `detail` es undefined mientras carga y null si no existe o no se puede ver.
 * Se vuelve a pedir al regresar a la pantalla y con `reload()`.
 */
export function useCarWashDetail(id: string) {
  const [detail, setDetail] = useState<CarWashDetail | null | undefined>(undefined);
  const [version, setVersion] = useState(0);

  const load = useCallback(() => {
    let cancelled = false;
    fetchCarWashDetail(id).then((loaded) => {
      if (!cancelled) setDetail(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useFocusEffect(load);

  // `reload()` solo sube el contador; la primera carga ya la hace el foco de la pantalla.
  useEffect(() => {
    if (version > 0) return load();
  }, [version, load]);

  return { detail, reload: () => setVersion((current) => current + 1) };
}
