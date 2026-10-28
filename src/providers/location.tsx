import * as Location from 'expo-location';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';
import 'expo-sqlite/localStorage/install';

import type { Coords } from '@/lib/car-washes';

type Permission = 'undetermined' | 'granted' | 'denied';

type LocationContextValue = {
  isLoading: boolean;
  permission: Permission;
  /** Última ubicación conocida; null sin permiso o mientras se obtiene. */
  coords: Coords | null;
  /** El usuario ya vio (y descartó) la pantalla de permiso. */
  promptDismissed: boolean;
  requestPermission: () => Promise<void>;
  dismissPrompt: () => void;
};

const DISMISSED_KEY = 'carwash:location-prompt-dismissed';

const LocationContext = createContext<LocationContextValue | null>(null);

export function useUserLocation() {
  const value = use(LocationContext);
  if (!value) {
    throw new Error('useUserLocation debe usarse dentro de <LocationProvider />');
  }
  return value;
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function toPermission(status: Location.PermissionStatus): Permission {
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export function LocationProvider({ children }: PropsWithChildren) {
  const [permission, setPermission] = useState<Permission>('undetermined');
  const [permissionReady, setPermissionReady] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(readDismissed);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then((response) => {
      setPermission(toPermission(response.status));
      setPermissionReady(true);
    });
  }, []);

  useEffect(() => {
    if (permission !== 'granted') return;

    let cancelled = false;
    const update = (position: Location.LocationObject | null) => {
      if (!cancelled && position) {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      }
    };

    // Primero la última posición conocida (rápida) y luego una lectura fresca.
    Location.getLastKnownPositionAsync().then(update).catch(() => {});
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(update).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [permission]);

  const requestPermission = async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    setPermission(response.granted ? 'granted' : 'denied');
  };

  const dismissPrompt = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Sin almacenamiento solo se vuelve a preguntar en el próximo inicio.
    }
    setPromptDismissed(true);
  };

  return (
    <LocationContext.Provider
      value={{ isLoading: !permissionReady, permission, coords, promptDismissed, requestPermission, dismissPrompt }}>
      {children}
    </LocationContext.Provider>
  );
}
