import type { CarWashStatus } from '@/lib/car-wash-detail';
import { limaTodayIso } from '@/lib/format';
import { supabase } from '@/lib/supabase';

type ErrorLike = { code?: string; message: string } | null;

/** Mensaje en español para un error de Supabase; null si no hubo error. */
function adminError(error: ErrorLike): string | null {
  if (!error) return null;
  switch (error.code) {
    case '42501':
      return 'Solo un administrador puede hacer esto.';
    case 'P0002':
      return 'Ya no existe o alguien más ya lo atendió. Actualiza la lista.';
    case '23514':
      return 'Revisa los datos: alguno no es válido.';
    default:
      return 'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.';
  }
}

type Owner = { display_name: string | null; email: string | null } | null;

/** Nombre para mostrar de una persona: su nombre, o la parte del correo antes de la arroba. */
function personName(person: Owner): string | null {
  if (!person) return null;
  return person.display_name?.trim() || person.email?.split('@')[0] || null;
}

function coverOf(photos: { storage_path: string; position: number }[]): string | null {
  return [...photos].sort((a, b) => a.position - b.position)[0]?.storage_path ?? null;
}

// --- Locales ---

export type AdminCarWash = {
  id: string;
  name: string;
  address: string;
  district: string;
  district_id: number;
  status: CarWashStatus;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  cover_path: string | null;
  /** Tiene un patrocinio activo hoy. */
  sponsored: boolean;
};

type RawCarWash = {
  id: string;
  name: string;
  address: string;
  district_id: number;
  status: CarWashStatus;
  owner_id: string | null;
  districts: { name: string } | null;
  owner: Owner;
  car_wash_photos: { storage_path: string; position: number }[];
};

/** Todos los locales (el administrador ve también los pendientes y ocultos); null si no se pudo cargar. */
export async function fetchAdminCarWashes(): Promise<AdminCarWash[] | null> {
  const today = limaTodayIso();
  const [washes, sponsorships] = await Promise.all([
    supabase
      .from('car_washes')
      .select(
        'id, name, address, district_id, status, owner_id, districts(name), owner:profiles!owner_id(display_name, email), car_wash_photos(storage_path, position)',
      ),
    supabase.from('sponsorships').select('car_wash_id').eq('status', 'active').lte('starts_on', today).gte('ends_on', today),
  ]);
  if (washes.error || !washes.data) return null;

  const sponsored = new Set(((sponsorships.data as { car_wash_id: string }[] | null) ?? []).map((row) => row.car_wash_id));

  return (washes.data as unknown as RawCarWash[])
    .map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      district: row.districts?.name ?? '',
      district_id: row.district_id,
      status: row.status,
      owner_id: row.owner_id,
      owner_name: personName(row.owner),
      owner_email: row.owner?.email ?? null,
      cover_path: coverOf(row.car_wash_photos),
      sponsored: sponsored.has(row.id),
    }))
    .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || a.name.localeCompare(b.name, 'es'));
}

export async function setCarWashStatus(id: string, status: CarWashStatus): Promise<string | null> {
  const { error } = await supabase.rpc('admin_set_car_wash_status', { p_id: id, p_status: status });
  return adminError(error);
}

const NO_ACCOUNT = 'No hay ninguna cuenta con ese correo. La persona debe crear su cuenta primero.';

async function findProfileId(email: string): Promise<string | null | 'error'> {
  const { data, error } = await supabase.from('profiles').select('id').eq('email', email.trim().toLowerCase()).maybeSingle();
  if (error) return 'error';
  return (data as { id: string } | null)?.id ?? null;
}

/** Asigna el local a la cuenta con ese correo (la convierte en propietaria) o, con null, lo deja sin propietario. */
export async function assignOwner(carWashId: string, email: string | null): Promise<string | null> {
  let ownerId: string | null = null;
  if (email !== null) {
    const found = await findProfileId(email);
    if (found === 'error') return adminError({ message: 'lookup failed' });
    if (found === null) return NO_ACCOUNT;
    ownerId = found;
  }
  const { error } = await supabase.rpc('admin_assign_owner', { p_car_wash_id: carWashId, p_owner_id: ownerId });
  return adminError(error);
}

export type NewCarWashInput = {
  name: string;
  address: string;
  districtId: number;
  reference: string | null;
  lat: number;
  lng: number;
  status: CarWashStatus;
  ownerEmail: string | null;
};

/** Registra un local nuevo; si se indica propietario, se le asigna al final. */
export async function createCarWash(input: NewCarWashInput): Promise<{ id: string; warning: string | null } | { error: string }> {
  // Se comprueba el correo antes de crear nada, para no dejar un local a medias.
  if (input.ownerEmail) {
    const found = await findProfileId(input.ownerEmail);
    if (found === 'error') return { error: adminError({ message: 'lookup failed' })! };
    if (found === null) return { error: NO_ACCOUNT };
  }

  const { data, error } = await supabase
    .from('car_washes')
    .insert({
      name: input.name,
      address: input.address,
      district_id: input.districtId,
      reference: input.reference,
      lat: input.lat,
      lng: input.lng,
      status: input.status,
    })
    .select('id')
    .single();
  if (error || !data) return { error: adminError(error ?? { message: 'no data' })! };

  const id = (data as { id: string }).id;
  if (!input.ownerEmail) return { id, warning: null };

  const failure = await assignOwner(id, input.ownerEmail);
  return { id, warning: failure ? `El local se registró, pero no pudimos asignar al propietario. ${failure}` : null };
}

// --- Patrocinios ---

export type AdminSponsorship = {
  id: string;
  car_wash_id: string;
  car_wash_name: string;
  owner_name: string | null;
  cover_path: string | null;
  plan_label: string;
  plan_days: number;
  status: 'requested' | 'active';
  requested_at: string;
  starts_on: string | null;
  ends_on: string | null;
  show_on_map: boolean;
  show_in_list: boolean;
};

type RawSponsorship = {
  id: string;
  car_wash_id: string;
  status: 'requested' | 'active';
  requested_at: string;
  starts_on: string | null;
  ends_on: string | null;
  show_on_map: boolean;
  show_in_list: boolean;
  sponsorship_plans: { label: string; days: number } | null;
  car_washes: {
    name: string;
    owner: Owner;
    car_wash_photos: { storage_path: string; position: number }[];
  } | null;
};

/** Solicitudes en espera de pago (las más antiguas primero) y anuncios activos que aún no vencen. */
export async function fetchAdminSponsorships(): Promise<{ requests: AdminSponsorship[]; active: AdminSponsorship[] } | null> {
  const { data, error } = await supabase
    .from('sponsorships')
    .select(
      'id, car_wash_id, status, requested_at, starts_on, ends_on, show_on_map, show_in_list, sponsorship_plans(label, days), car_washes(name, owner:profiles!owner_id(display_name, email), car_wash_photos(storage_path, position))',
    )
    .in('status', ['requested', 'active']);
  if (error || !data) return null;

  const today = limaTodayIso();
  const rows = (data as unknown as RawSponsorship[]).map(
    (row): AdminSponsorship => ({
      id: row.id,
      car_wash_id: row.car_wash_id,
      car_wash_name: row.car_washes?.name ?? '',
      owner_name: personName(row.car_washes?.owner ?? null),
      cover_path: coverOf(row.car_washes?.car_wash_photos ?? []),
      plan_label: row.sponsorship_plans?.label ?? '',
      plan_days: row.sponsorship_plans?.days ?? 30,
      status: row.status,
      requested_at: row.requested_at,
      starts_on: row.starts_on,
      ends_on: row.ends_on,
      show_on_map: row.show_on_map,
      show_in_list: row.show_in_list,
    }),
  );

  return {
    requests: rows.filter((row) => row.status === 'requested').sort((a, b) => a.requested_at.localeCompare(b.requested_at)),
    active: rows
      .filter((row) => row.status === 'active' && row.ends_on !== null && row.ends_on >= today)
      .sort((a, b) => a.ends_on!.localeCompare(b.ends_on!)),
  };
}

export type ActivationInput = {
  startsOn: string;
  endsOn: string;
  showOnMap: boolean;
  showInList: boolean;
  amount: number;
  operationNumber: string;
};

export async function activateSponsorship(id: string, input: ActivationInput): Promise<string | null> {
  const { error } = await supabase.rpc('admin_activate_sponsorship', {
    p_id: id,
    p_starts_on: input.startsOn,
    p_ends_on: input.endsOn,
    p_show_on_map: input.showOnMap,
    p_show_in_list: input.showInList,
    p_amount: input.amount,
    p_operation_number: input.operationNumber,
  });
  return adminError(error);
}

export async function deactivateSponsorship(id: string): Promise<string | null> {
  const { error } = await supabase.rpc('admin_deactivate_sponsorship', { p_id: id });
  return adminError(error);
}

// --- Moderación ---

export type ModerationItem = {
  review_id: string;
  car_wash_id: string;
  car_wash_name: string;
  author_name: string;
  comment: string | null;
  rating: number;
  review_status: 'visible' | 'hidden';
  report_count: number;
  top_reason: 'offensive' | 'spam' | 'off_topic' | 'personal_data' | 'other';
  last_reported_at: string;
};

/** Reseñas reportadas: las pendientes de revisar (`resolved = false`) o las ya resueltas. */
export async function fetchModerationQueue(resolved: boolean): Promise<ModerationItem[] | null> {
  const { data, error } = await supabase.rpc('admin_moderation_queue', { p_resolved: resolved });
  if (error || !data) return null;
  return data as ModerationItem[];
}

/** «Ocultar reseña» (`hide = true`) o «Mantener»; en ambos casos se cierran todos sus reportes. */
export async function resolveReports(reviewId: string, hide: boolean): Promise<string | null> {
  const { error } = await supabase.rpc('admin_resolve_review_reports', { p_review_id: reviewId, p_hide: hide });
  return adminError(error);
}
