import type { OpenState, VehicleType } from '@/lib/car-washes';
import { supabase } from '@/lib/supabase';

export type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  position: number;
  service_prices: { vehicle_type: VehicleType; price: number }[];
};

export type Promotion = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  service_id: string | null;
  ended_at: string | null;
};

export type ScheduleException = {
  id: string;
  kind: 'closed' | 'special_hours';
  start_date: string;
  end_date: string;
  open_time: string | null;
  close_time: string | null;
  reason: string | null;
};

export type OpeningHour = { weekday: number; open_time: string; close_time: string };
export type Photo = { id: string; storage_path: string; position: number };
export type Amenity = { code: string; label: string; sort_order: number };

export type CarWashStatus = 'pending' | 'verified' | 'hidden';

export type CarWashDetail = {
  id: string;
  owner_id: string | null;
  status: CarWashStatus;
  district_id: number;
  name: string;
  address: string;
  reference: string | null;
  lat: number;
  lng: number;
  rating_avg: number;
  rating_count: number;
  district: string;
  photos: Photo[];
  amenities: Amenity[];
  services: Service[];
  hours: OpeningHour[];
  exceptions: ScheduleException[];
  promotions: Promotion[];
};

export type CarWashMeta = {
  is_sponsored: boolean;
  open_state: OpenState;
  today_open: string | null;
  today_close: string | null;
  next_open_date: string | null;
  next_open_time: string | null;
};

export type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  author_name: string;
  status: 'visible' | 'hidden';
  created_at: string;
};

export const REVIEWS_PAGE_SIZE = 10;

type RawDetail = Omit<CarWashDetail, 'district' | 'photos' | 'amenities' | 'services' | 'hours' | 'exceptions' | 'promotions'> & {
  districts: { name: string } | null;
  car_wash_photos: Photo[];
  car_wash_amenities: { amenity_code: string; amenities: { label: string; sort_order: number } | null }[];
  services: Service[];
  opening_hours: OpeningHour[];
  schedule_exceptions: ScheduleException[];
  promotions: Promotion[];
};

/** Todo el perfil del local en una sola consulta; RLS ya deja solo lo visible para cada usuario. */
export async function fetchCarWashDetail(id: string): Promise<CarWashDetail | null> {
  const { data, error } = await supabase
    .from('car_washes')
    .select(
      `id, owner_id, status, district_id, name, address, reference, lat, lng, rating_avg, rating_count,
       districts(name),
       car_wash_photos(id, storage_path, position),
       car_wash_amenities(amenity_code, amenities(label, sort_order)),
       services(id, name, description, duration_minutes, position, service_prices(vehicle_type, price)),
       opening_hours(weekday, open_time, close_time),
       schedule_exceptions(id, kind, start_date, end_date, open_time, close_time, reason),
       promotions(id, title, description, start_date, end_date, service_id, ended_at)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  const raw = data as unknown as RawDetail;

  return {
    id: raw.id,
    owner_id: raw.owner_id,
    status: raw.status,
    district_id: raw.district_id,
    name: raw.name,
    address: raw.address,
    reference: raw.reference,
    lat: raw.lat,
    lng: raw.lng,
    rating_avg: Number(raw.rating_avg),
    rating_count: raw.rating_count,
    district: raw.districts?.name ?? '',
    photos: [...raw.car_wash_photos].sort((a, b) => a.position - b.position),
    amenities: raw.car_wash_amenities
      .filter((row) => row.amenities)
      .map((row) => ({ code: row.amenity_code, label: row.amenities!.label, sort_order: row.amenities!.sort_order }))
      .sort((a, b) => a.sort_order - b.sort_order),
    services: [...raw.services]
      .sort((a, b) => a.position - b.position)
      .map((service) => ({
        ...service,
        service_prices: service.service_prices.map((p) => ({ ...p, price: Number(p.price) })),
      })),
    hours: [...raw.opening_hours].sort((a, b) => a.weekday - b.weekday),
    exceptions: [...raw.schedule_exceptions].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    promotions: [...raw.promotions].sort((a, b) => a.end_date.localeCompare(b.end_date)),
  };
}

export async function fetchCarWashMeta(id: string): Promise<CarWashMeta | null> {
  const { data, error } = await supabase.rpc('car_wash_meta', { p_id: id });
  if (error || !data || data.length === 0) return null;
  return data[0] as CarWashMeta;
}

/** Cantidad de reseñas por estrellas, de 5 a 1. */
export async function fetchRatingDistribution(id: string): Promise<{ stars: number; total: number }[]> {
  const { data, error } = await supabase.rpc('review_distribution', { p_car_wash_id: id });
  if (error || !data) return [];
  return data as { stars: number; total: number }[];
}

/** Reseñas visibles de otras personas, de la más reciente a la más antigua. */
export async function fetchReviews(
  carWashId: string,
  excludeUserId: string | null,
  offset: number,
): Promise<Review[]> {
  let query = supabase
    .from('reviews')
    .select('id, user_id, rating, comment, author_name, status, created_at')
    .eq('car_wash_id', carWashId)
    .eq('status', 'visible')
    .order('created_at', { ascending: false })
    .range(offset, offset + REVIEWS_PAGE_SIZE - 1);
  if (excludeUserId) query = query.neq('user_id', excludeUserId);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Review[];
}

/** La reseña propia del usuario en este local, aunque un administrador la haya ocultado. */
export async function fetchMyReview(carWashId: string, userId: string): Promise<Review | null> {
  const { data } = await supabase
    .from('reviews')
    .select('id, user_id, rating, comment, author_name, status, created_at')
    .eq('car_wash_id', carWashId)
    .eq('user_id', userId)
    .maybeSingle();
  return (data as Review | null) ?? null;
}

export const REPORT_REASONS = [
  { code: 'offensive', label: 'Lenguaje ofensivo o insultos' },
  { code: 'spam', label: 'Spam o publicidad' },
  { code: 'off_topic', label: 'No trata sobre este local' },
  { code: 'personal_data', label: 'Contiene datos personales' },
  { code: 'other', label: 'Otro motivo' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['code'];
