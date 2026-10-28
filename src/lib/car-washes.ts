import type { Region } from 'react-native-maps';

import { supabase } from '@/lib/supabase';

export type VehicleType = 'car' | 'suv' | 'pickup' | 'motorcycle';

export const VEHICLE_TYPES: { code: VehicleType; label: string; priceLabel: string }[] = [
  { code: 'car', label: 'Auto', priceLabel: 'auto' },
  { code: 'suv', label: 'SUV', priceLabel: 'SUV' },
  { code: 'pickup', label: 'Camioneta', priceLabel: 'camioneta' },
  { code: 'motorcycle', label: 'Moto', priceLabel: 'moto' },
];

export type OpenState = 'open' | 'closing_soon' | 'opens_later' | 'closed' | 'closed_today';

/** Fila que devuelve la función `car_washes_in_bounds`. */
export type CarWashPin = {
  id: string;
  name: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
  rating_avg: number;
  rating_count: number;
  cover_path: string | null;
  min_price: number | null;
  promo_title: string | null;
  sponsored_on_map: boolean;
  sponsored_in_list: boolean;
  distance_m: number | null;
  open_state: OpenState;
  today_open: string | null;
  today_close: string | null;
  next_open_date: string | null;
  next_open_time: string | null;
};

export type Bounds = { minLng: number; minLat: number; maxLng: number; maxLat: number };
export type Coords = { latitude: number; longitude: number };

/** Plaza de Armas: punto de partida del mapa cuando no hay ubicación del usuario. */
export const CERCADO: Coords = { latitude: -16.3989, longitude: -71.5369 };

/** Zoom inicial del mapa, en grados (unos 4 km de lado). */
export const MAP_DELTA = 0.035;

export function regionToBounds(region: Region): Bounds {
  return {
    minLng: region.longitude - region.longitudeDelta / 2,
    minLat: region.latitude - region.latitudeDelta / 2,
    maxLng: region.longitude + region.longitudeDelta / 2,
    maxLat: region.latitude + region.latitudeDelta / 2,
  };
}

export async function fetchCarWashesInBounds(
  bounds: Bounds,
  vehicle: VehicleType,
  reference: Coords | null,
): Promise<{ data: CarWashPin[] | null; error: boolean }> {
  const { data, error } = await supabase.rpc('car_washes_in_bounds', {
    p_min_lng: bounds.minLng,
    p_min_lat: bounds.minLat,
    p_max_lng: bounds.maxLng,
    p_max_lat: bounds.maxLat,
    p_vehicle_type: vehicle,
    p_ref_lng: reference?.longitude ?? null,
    p_ref_lat: reference?.latitude ?? null,
  });
  if (error) return { data: null, error: true };
  return { data: data as CarWashPin[], error: false };
}

export function photoUrl(path: string): string {
  return supabase.storage.from('car-wash-photos').getPublicUrl(path).data.publicUrl;
}
