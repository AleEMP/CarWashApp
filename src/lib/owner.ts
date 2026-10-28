import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { CarWashStatus, OpeningHour, Photo } from '@/lib/car-wash-detail';
import type { VehicleType } from '@/lib/car-washes';
import { supabase } from '@/lib/supabase';

type ErrorLike = { code?: string; message: string } | null;

/** Mensaje en español para un error de Supabase; null si no hubo error. */
function friendly(error: ErrorLike): string | null {
  if (!error) return null;
  if (error.message.includes('at most 10 photos')) return 'Ya tienes 10 fotos, que es el máximo.';
  switch (error.code) {
    case '42501':
      return 'No tienes permiso para cambiar este local.';
    case '23505':
      return 'Eso ya existe.';
    case '23514':
      return 'Revisa los datos: alguno no es válido.';
    case '23P01':
      return 'Ya hay un cambio de horario en esas fechas.';
    default:
      return 'No pudimos guardar los cambios. Revisa tu conexión e inténtalo de nuevo.';
  }
}

const NO_PERMISSION = 'No tienes permiso para cambiar este local.';

// --- Mis locales ---

export type OwnedCarWash = {
  id: string;
  name: string;
  address: string;
  district: string;
  status: CarWashStatus;
  rating_avg: number;
  rating_count: number;
  cover_path: string | null;
};

type RawOwned = Omit<OwnedCarWash, 'district' | 'cover_path'> & {
  districts: { name: string } | null;
  car_wash_photos: { storage_path: string; position: number }[];
};

export async function fetchOwnedCarWashes(userId: string): Promise<OwnedCarWash[]> {
  const { data, error } = await supabase
    .from('car_washes')
    .select('id, name, address, status, rating_avg, rating_count, districts(name), car_wash_photos(storage_path, position)')
    .eq('owner_id', userId)
    .order('created_at');
  if (error || !data) return [];

  return (data as unknown as RawOwned[]).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    district: row.districts?.name ?? '',
    status: row.status,
    rating_avg: Number(row.rating_avg),
    rating_count: row.rating_count,
    cover_path: [...row.car_wash_photos].sort((a, b) => a.position - b.position)[0]?.storage_path ?? null,
  }));
}

// --- Información general y comodidades ---

export type District = { id: number; name: string };
export type AmenityOption = { code: string; label: string };

export async function fetchDistricts(): Promise<District[]> {
  const { data } = await supabase.from('districts').select('id, name').order('id');
  return (data as District[] | null) ?? [];
}

export async function fetchAmenityOptions(): Promise<AmenityOption[]> {
  const { data } = await supabase.from('amenities').select('code, label').order('sort_order');
  return (data as AmenityOption[] | null) ?? [];
}

export type InfoInput = {
  name: string;
  address: string;
  districtId: number;
  reference: string | null;
  lat: number;
  lng: number;
};

export async function saveCarWashInfo(id: string, input: InfoInput): Promise<string | null> {
  const { data, error } = await supabase
    .from('car_washes')
    .update({
      name: input.name,
      address: input.address,
      district_id: input.districtId,
      reference: input.reference,
      lat: input.lat,
      lng: input.lng,
    })
    .eq('id', id)
    .select('id');
  if (error) return friendly(error);
  // Sin permiso, RLS no devuelve error: simplemente no encuentra la fila.
  return data && data.length > 0 ? null : NO_PERMISSION;
}

export async function saveAmenities(carWashId: string, current: string[], next: string[]): Promise<string | null> {
  const removed = current.filter((code) => !next.includes(code));
  const added = next.filter((code) => !current.includes(code));

  if (removed.length > 0) {
    const { error } = await supabase.from('car_wash_amenities').delete().eq('car_wash_id', carWashId).in('amenity_code', removed);
    if (error) return friendly(error);
  }
  if (added.length > 0) {
    const { error } = await supabase
      .from('car_wash_amenities')
      .insert(added.map((code) => ({ car_wash_id: carWashId, amenity_code: code })));
    if (error) return friendly(error);
  }
  return null;
}

// --- Fotos ---

export const MAX_PHOTOS = 10;
const PHOTO_MAX_WIDTH = 1600;
const BUCKET = 'car-wash-photos';

/** Comprime la foto elegida, la sube a Storage y la registra en el local. */
export async function uploadPhoto(carWashId: string, pickedUri: string, pickedWidth: number, position: number): Promise<string | null> {
  try {
    const context = ImageManipulator.manipulate(pickedUri);
    if (!pickedWidth || pickedWidth > PHOTO_MAX_WIDTH) context.resize({ width: PHOTO_MAX_WIDTH });
    const rendered = await context.renderAsync();
    const compressed = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.72 });

    const bytes = await (await fetch(compressed.uri)).arrayBuffer();
    const path = `${carWashId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg' });
    if (uploadError) return friendly({ message: uploadError.message, code: '42501' });

    const { error: insertError } = await supabase
      .from('car_wash_photos')
      .insert({ car_wash_id: carWashId, storage_path: path, position });
    if (insertError) {
      await supabase.storage.from(BUCKET).remove([path]);
      return friendly(insertError);
    }
    return null;
  } catch {
    return 'No pudimos procesar la foto. Prueba con otra.';
  }
}

export async function deletePhoto(photo: Photo): Promise<string | null> {
  const { error } = await supabase.from('car_wash_photos').delete().eq('id', photo.id);
  if (error) return friendly(error);
  await supabase.storage.from(BUCKET).remove([photo.storage_path]);
  return null;
}

/** La foto elegida pasa a ser la primera (portada) y las demás conservan su orden. */
export async function makeCover(photos: Photo[], photoId: string): Promise<string | null> {
  const ordered = [photos.find((p) => p.id === photoId), ...photos.filter((p) => p.id !== photoId)].filter(
    (p): p is Photo => p !== undefined,
  );
  for (const [index, photo] of ordered.entries()) {
    if (photo.position === index) continue;
    const { error } = await supabase.from('car_wash_photos').update({ position: index }).eq('id', photo.id);
    if (error) return friendly(error);
  }
  return null;
}

// --- Servicios y precios ---

export type ServiceInput = {
  name: string;
  description: string | null;
  durationMinutes: number | null;
  prices: Partial<Record<VehicleType, number>>;
};

export async function saveService(
  carWashId: string,
  serviceId: string | null,
  input: ServiceInput,
  position: number,
): Promise<string | null> {
  let id = serviceId;
  if (id) {
    const { error } = await supabase
      .from('services')
      .update({ name: input.name, description: input.description, duration_minutes: input.durationMinutes })
      .eq('id', id);
    if (error) return friendly(error);
  } else {
    const { data, error } = await supabase
      .from('services')
      .insert({
        car_wash_id: carWashId,
        name: input.name,
        description: input.description,
        duration_minutes: input.durationMinutes,
        position,
      })
      .select('id')
      .single();
    if (error || !data) return friendly(error);
    id = (data as { id: string }).id;
  }

  // Un precio nuevo se inserta, uno existente se actualiza y el que se apaga se elimina.
  const { data: existing } = await supabase.from('service_prices').select('vehicle_type').eq('service_id', id);
  const existingTypes = ((existing as { vehicle_type: VehicleType }[] | null) ?? []).map((row) => row.vehicle_type);
  const wanted = Object.keys(input.prices) as VehicleType[];

  for (const type of wanted) {
    const price = input.prices[type]!;
    const { error } = existingTypes.includes(type)
      ? await supabase.from('service_prices').update({ price }).eq('service_id', id).eq('vehicle_type', type)
      : await supabase.from('service_prices').insert({ service_id: id, vehicle_type: type, price });
    if (error) return friendly(error);
  }
  const removed = existingTypes.filter((type) => !wanted.includes(type));
  if (removed.length > 0) {
    const { error } = await supabase.from('service_prices').delete().eq('service_id', id).in('vehicle_type', removed);
    if (error) return friendly(error);
  }
  return null;
}

export async function deleteService(serviceId: string): Promise<string | null> {
  const { error } = await supabase.from('services').delete().eq('id', serviceId);
  return friendly(error);
}

// --- Horarios y cierres ---

export type DayHours = { open: string; close: string };

/** `next[weekday]` es el horario del día (1 = lunes … 7 = domingo) o null si ese día no atiende. */
export async function saveWeeklyHours(
  carWashId: string,
  current: OpeningHour[],
  next: Record<number, DayHours | null>,
): Promise<string | null> {
  for (let weekday = 1; weekday <= 7; weekday++) {
    const before = current.find((row) => row.weekday === weekday);
    const after = next[weekday];

    if (after && !before) {
      const { error } = await supabase
        .from('opening_hours')
        .insert({ car_wash_id: carWashId, weekday, open_time: after.open, close_time: after.close });
      if (error) return friendly(error);
    } else if (after && before && (after.open !== before.open_time || after.close !== before.close_time)) {
      const { error } = await supabase
        .from('opening_hours')
        .update({ open_time: after.open, close_time: after.close })
        .eq('car_wash_id', carWashId)
        .eq('weekday', weekday);
      if (error) return friendly(error);
    } else if (!after && before) {
      const { error } = await supabase.from('opening_hours').delete().eq('car_wash_id', carWashId).eq('weekday', weekday);
      if (error) return friendly(error);
    }
  }
  return null;
}

export type ExceptionInput = {
  kind: 'closed' | 'special_hours';
  startDate: string;
  endDate: string;
  openTime: string | null;
  closeTime: string | null;
  reason: string | null;
};

export async function saveException(carWashId: string, id: string | null, input: ExceptionInput): Promise<string | null> {
  const fields = {
    kind: input.kind,
    start_date: input.startDate,
    end_date: input.endDate,
    open_time: input.kind === 'special_hours' ? input.openTime : null,
    close_time: input.kind === 'special_hours' ? input.closeTime : null,
    reason: input.reason,
  };
  const { error } = id
    ? await supabase.from('schedule_exceptions').update(fields).eq('id', id)
    : await supabase.from('schedule_exceptions').insert({ car_wash_id: carWashId, ...fields });
  return friendly(error);
}

export async function deleteException(id: string): Promise<string | null> {
  const { error } = await supabase.from('schedule_exceptions').delete().eq('id', id);
  return friendly(error);
}

// --- Promociones ---

export type PromotionInput = {
  title: string;
  description: string | null;
  serviceId: string | null;
  startDate: string;
  endDate: string;
};

export async function savePromotion(carWashId: string, id: string | null, input: PromotionInput): Promise<string | null> {
  const fields = {
    service_id: input.serviceId,
    title: input.title,
    description: input.description,
    start_date: input.startDate,
    end_date: input.endDate,
  };
  const { error } = id
    ? await supabase.from('promotions').update(fields).eq('id', id)
    : await supabase.from('promotions').insert({ car_wash_id: carWashId, ...fields });
  return friendly(error);
}

/** «Finalizar» una vigente: deja de mostrarse desde ya. */
export async function endPromotion(id: string): Promise<string | null> {
  const { error } = await supabase.from('promotions').update({ ended_at: new Date().toISOString() }).eq('id', id);
  return friendly(error);
}

/** «Cancelar» una programada: se elimina porque nunca llegó a mostrarse. */
export async function deletePromotion(id: string): Promise<string | null> {
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  return friendly(error);
}

// --- Patrocinio ---

export type SponsorshipPlan = { code: string; label: string; days: number; price: number | null };

export type SponsorshipRow = {
  id: string;
  plan_code: string;
  status: 'requested' | 'active' | 'cancelled';
  requested_at: string;
  starts_on: string | null;
  ends_on: string | null;
  show_on_map: boolean;
  show_in_list: boolean;
};

export async function fetchSponsorshipPlans(): Promise<SponsorshipPlan[]> {
  const { data } = await supabase.from('sponsorship_plans').select('code, label, days, price').order('days');
  return ((data as SponsorshipPlan[] | null) ?? []).map((plan) => ({ ...plan, price: plan.price === null ? null : Number(plan.price) }));
}

export async function fetchSponsorships(carWashId: string): Promise<SponsorshipRow[]> {
  const { data } = await supabase
    .from('sponsorships')
    .select('id, plan_code, status, requested_at, starts_on, ends_on, show_on_map, show_in_list')
    .eq('car_wash_id', carWashId)
    .order('requested_at', { ascending: false });
  return (data as SponsorshipRow[] | null) ?? [];
}

export async function requestSponsorship(carWashId: string, planCode: string, userId: string): Promise<string | null> {
  const { error } = await supabase
    .from('sponsorships')
    .insert({ car_wash_id: carWashId, plan_code: planCode, requested_by: userId });
  if (error?.code === '23505') return 'Ya tienes una solicitud en espera de pago.';
  return friendly(error);
}

export async function cancelSponsorshipRequest(id: string): Promise<string | null> {
  const { error } = await supabase.from('sponsorships').delete().eq('id', id);
  return friendly(error);
}
