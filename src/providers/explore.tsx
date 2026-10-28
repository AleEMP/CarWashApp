import { createContext, use, useCallback, useRef, useState, type PropsWithChildren } from 'react';

import {
  fetchCarWashesInBounds,
  type Bounds,
  type CarWashPin,
  type Coords,
  type VehicleType,
} from '@/lib/car-washes';
import { useUserLocation } from '@/providers/location';

/** Zona a la que pasar si la búsqueda no encuentra ningún local. */
export type SearchFallback = { center: Coords; bounds: Bounds };

type ExploreContextValue = {
  vehicle: VehicleType;
  setVehicle: (vehicle: VehicleType) => void;
  /** Locales del área buscada que atienden el tipo de vehículo elegido; null antes de la primera búsqueda. */
  results: CarWashPin[] | null;
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  select: (id: string | null) => void;
  /** Locales publicados en el área buscada, atiendan o no el vehículo elegido; 0 = aún no llegamos a esa zona. */
  areaCount: number | null;
  /** Bounds de la última búsqueda, para saber si el mapa se movió. */
  searchedBounds: Bounds | null;
  /** Punto al que se redirigió porque la zona pedida no tenía locales; null si no hubo redirección. */
  redirect: Coords | null;
  /** Da por buscada un área sin consultar de nuevo (el mapa se encuadró solo a los resultados). */
  markSearched: (bounds: Bounds) => void;
  /** Busca en el área; con `fallback`, si no hay ningún local pasa a esa otra zona y lo deja en `redirect`. */
  search: (bounds: Bounds, fallback?: SearchFallback) => void;
};

const ExploreContext = createContext<ExploreContextValue | null>(null);

export function useExplore() {
  const value = use(ExploreContext);
  if (!value) {
    throw new Error('useExplore debe usarse dentro de <ExploreProvider />');
  }
  return value;
}

function nearest(pins: CarWashPin[]): CarWashPin | null {
  let best: CarWashPin | null = null;
  for (const pin of pins) {
    if (best === null || (pin.distance_m ?? Infinity) < (best.distance_m ?? Infinity)) best = pin;
  }
  return best;
}

export function ExploreProvider({ children }: PropsWithChildren) {
  const { coords } = useUserLocation();
  const [vehicle, setVehicleState] = useState<VehicleType>('car');
  const [searchedBounds, setSearchedBounds] = useState<Bounds | null>(null);
  const [results, setResults] = useState<CarWashPin[] | null>(null);
  const [areaCount, setAreaCount] = useState<number | null>(null);
  const [redirect, setRedirect] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const run = useCallback(
    async (bounds: Bounds, vehicleType: VehicleType, fallback?: SearchFallback) => {
      const request = ++latestRequest.current;
      setLoading(true);
      setError(null);

      let { data, error: failed } = await fetchCarWashesInBounds(bounds, vehicleType, coords);
      if (request !== latestRequest.current) return;

      // Sin ningún local en la zona pedida: se prueba con la zona alternativa y se avisa de la redirección.
      if (!failed && data?.length === 0 && fallback) {
        setRedirect(fallback.center);
        setSearchedBounds(fallback.bounds);
        ({ data, error: failed } = await fetchCarWashesInBounds(fallback.bounds, vehicleType, coords));
        if (request !== latestRequest.current) return;
      }

      if (failed || data === null) {
        setLoading(false);
        setError('No pudimos cargar los lavados. Revisa tu conexión e inténtalo de nuevo.');
        return;
      }

      // Un local sin precio para este tipo de vehículo no lo atiende: no se muestra.
      const visible = data.filter((pin) => pin.min_price !== null);
      setLoading(false);
      setAreaCount(data.length);
      setResults(visible);
      setSelectedId((current) =>
        visible.some((pin) => pin.id === current) ? current : (nearest(visible)?.id ?? null),
      );
    },
    [coords],
  );

  const search = useCallback(
    (bounds: Bounds, fallback?: SearchFallback) => {
      setSearchedBounds(bounds);
      if (!fallback) setRedirect(null);
      void run(bounds, vehicle, fallback);
    },
    [run, vehicle],
  );

  const setVehicle = useCallback(
    (next: VehicleType) => {
      setVehicleState(next);
      if (searchedBounds) void run(searchedBounds, next);
    },
    [run, searchedBounds],
  );

  return (
    <ExploreContext.Provider
      value={{
        vehicle,
        setVehicle,
        results,
        loading,
        error,
        selectedId,
        select: setSelectedId,
        areaCount,
        searchedBounds,
        redirect,
        markSearched: setSearchedBounds,
        search,
      }}>
      {children}
    </ExploreContext.Provider>
  );
}
