-- CarWash AQP · esquema base
-- Tablas, datos de referencia, funciones auxiliares y triggers.
-- Seguridad (RLS y permisos) en 20261027000002_security.sql.
-- Funciones de la API en 20261027000003_functions.sql.

set search_path = public, extensions;

create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type app_role as enum ('driver', 'owner', 'admin');
create type car_wash_status as enum ('pending', 'verified', 'hidden');
create type review_status as enum ('visible', 'hidden');
create type report_reason as enum ('offensive', 'spam', 'off_topic', 'personal_data', 'other');
create type report_status as enum ('pending', 'resolved');
create type report_resolution as enum ('hidden', 'kept');
create type exception_kind as enum ('closed', 'special_hours');
create type sponsorship_status as enum ('requested', 'active', 'cancelled');
create type request_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Datos de referencia
-- ---------------------------------------------------------------------------

create table districts (
  id smallint generated always as identity primary key,
  name text not null unique
);

create table vehicle_types (
  code text primary key,
  label text not null,
  long_label text not null,
  sort_order smallint not null default 0
);

create table amenities (
  code text primary key,
  label text not null,
  sort_order smallint not null default 0
);

create table sponsorship_plans (
  code text primary key,
  label text not null,
  days smallint not null check (days > 0),
  price numeric(8, 2) check (price >= 0)
);

insert into districts (name) values ('Cayma'), ('Yanahuara'), ('Cercado'), ('Sachaca');

insert into vehicle_types (code, label, long_label, sort_order) values
  ('car', 'Auto', 'Automóvil', 1),
  ('suv', 'SUV', 'SUV', 2),
  ('pickup', 'Camioneta', 'Camioneta', 3),
  ('motorcycle', 'Moto', 'Motocicleta', 4);

insert into amenities (code, label, sort_order) values
  ('waiting_room', 'Sala de espera', 1),
  ('wifi', 'Wi‑Fi gratis', 2),
  ('yape', 'Pago con Yape', 3),
  ('card', 'Pago con tarjeta', 4),
  ('parking', 'Estacionamiento', 5),
  ('cafe', 'Cafetería', 6),
  ('restroom', 'Baño para clientes', 7);

-- El precio queda vacío hasta que se definan los planes.
insert into sponsorship_plans (code, label, days, price) values
  ('7_days', '7 días', 7, null),
  ('30_days', '30 días', 30, null);

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role app_role not null default 'driver',
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Locales
-- ---------------------------------------------------------------------------

create table car_washes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  address text not null check (char_length(btrim(address)) between 3 and 160),
  district_id smallint not null references districts (id),
  reference text check (char_length(reference) <= 160),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(Point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
  ) stored,
  status car_wash_status not null default 'pending',
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index car_washes_location_idx on car_washes using gist (location);
create index car_washes_owner_idx on car_washes (owner_id);
create index car_washes_status_idx on car_washes (status);

create table car_wash_photos (
  id uuid primary key default gen_random_uuid(),
  car_wash_id uuid not null references car_washes (id) on delete cascade,
  storage_path text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index car_wash_photos_car_wash_idx on car_wash_photos (car_wash_id, position);

create table car_wash_amenities (
  car_wash_id uuid not null references car_washes (id) on delete cascade,
  amenity_code text not null references amenities (code),
  primary key (car_wash_id, amenity_code)
);

-- ---------------------------------------------------------------------------
-- Servicios y precios
-- ---------------------------------------------------------------------------

create table services (
  id uuid primary key default gen_random_uuid(),
  car_wash_id uuid not null references car_washes (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text check (char_length(description) <= 240),
  duration_minutes integer check (duration_minutes > 0),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index services_car_wash_idx on services (car_wash_id, position);

-- Un servicio que no se ofrece para un tipo de vehículo simplemente no tiene fila.
create table service_prices (
  service_id uuid not null references services (id) on delete cascade,
  vehicle_type text not null references vehicle_types (code),
  price numeric(8, 2) not null check (price >= 0),
  primary key (service_id, vehicle_type)
);

-- ---------------------------------------------------------------------------
-- Horarios
-- ---------------------------------------------------------------------------

-- weekday sigue ISO 8601: 1 = lunes … 7 = domingo. Un día sin fila es día cerrado.
create table opening_hours (
  car_wash_id uuid not null references car_washes (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  open_time time not null,
  close_time time not null,
  primary key (car_wash_id, weekday),
  check (open_time < close_time)
);

create table schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  car_wash_id uuid not null references car_washes (id) on delete cascade,
  kind exception_kind not null,
  start_date date not null,
  end_date date not null,
  open_time time,
  close_time time,
  reason text check (char_length(reason) <= 160),
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (
    (kind = 'closed' and open_time is null and close_time is null)
    or (kind = 'special_hours' and open_time is not null and close_time is not null and open_time < close_time)
  ),
  exclude using gist (car_wash_id with =, daterange(start_date, end_date, '[]') with &&)
);

-- ---------------------------------------------------------------------------
-- Promociones
-- ---------------------------------------------------------------------------

create table promotions (
  id uuid primary key default gen_random_uuid(),
  car_wash_id uuid not null references car_washes (id) on delete cascade,
  service_id uuid references services (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 2 and 80),
  description text check (char_length(description) <= 240),
  start_date date not null,
  end_date date not null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index promotions_car_wash_idx on promotions (car_wash_id, start_date);

-- ---------------------------------------------------------------------------
-- Reseñas y reportes
-- ---------------------------------------------------------------------------

create table reviews (
  id uuid primary key default gen_random_uuid(),
  car_wash_id uuid not null references car_washes (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 500),
  author_name text not null default 'Usuario',
  status review_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (car_wash_id, user_id)
);

create index reviews_car_wash_idx on reviews (car_wash_id, created_at desc);
create index reviews_user_idx on reviews (user_id);

create table review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews (id) on delete cascade,
  reporter_id uuid not null references profiles (id) on delete cascade,
  reason report_reason not null,
  details text check (char_length(details) <= 300),
  status report_status not null default 'pending',
  resolution report_resolution,
  resolved_by uuid references profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id),
  check ((status = 'pending' and resolution is null) or (status = 'resolved' and resolution is not null))
);

create index review_reports_review_idx on review_reports (review_id);
create index review_reports_pending_idx on review_reports (created_at) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Patrocinio
-- ---------------------------------------------------------------------------

create table sponsorships (
  id uuid primary key default gen_random_uuid(),
  car_wash_id uuid not null references car_washes (id) on delete cascade,
  plan_code text not null references sponsorship_plans (code),
  status sponsorship_status not null default 'requested',
  requested_by uuid references profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  starts_on date,
  ends_on date,
  show_on_map boolean not null default true,
  show_in_list boolean not null default true,
  payment_method text,
  amount numeric(8, 2) check (amount >= 0),
  operation_number text,
  activated_by uuid references profiles (id) on delete set null,
  activated_at timestamptz,
  check (
    status <> 'active'
    or (starts_on is not null and ends_on is not null and ends_on >= starts_on and (show_on_map or show_in_list))
  )
);

create index sponsorships_car_wash_idx on sponsorships (car_wash_id);
create unique index sponsorships_one_open_request_idx on sponsorships (car_wash_id) where status = 'requested';

-- ---------------------------------------------------------------------------
-- Solicitudes de acceso de propietarios
-- ---------------------------------------------------------------------------

create table owner_access_requests (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(btrim(business_name)) between 2 and 80),
  contact_name text not null check (char_length(btrim(contact_name)) between 2 and 80),
  phone text not null check (char_length(btrim(phone)) between 6 and 20),
  email text check (char_length(email) <= 120),
  address text check (char_length(address) <= 160),
  message text check (char_length(message) <= 500),
  status request_status not null default 'pending',
  handled_by uuid references profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index owner_access_requests_status_idx on owner_access_requests (status, created_at);

-- ---------------------------------------------------------------------------
-- Funciones auxiliares
-- ---------------------------------------------------------------------------

create function lima_now() returns timestamp
language sql stable
as $$ select now() at time zone 'America/Lima' $$;

create function lima_today() returns date
language sql stable
as $$ select (now() at time zone 'America/Lima')::date $$;

-- "Carla Mendoza Ríos" -> "Carla M."
create function format_public_name(p_name text) returns text
language sql immutable
as $$
  select case
    when p_name is null or btrim(p_name) = '' then 'Usuario'
    when cardinality(regexp_split_to_array(btrim(p_name), '\s+')) = 1 then btrim(p_name)
    else (regexp_split_to_array(btrim(p_name), '\s+'))[1]
      || ' ' || upper(left((regexp_split_to_array(btrim(p_name), '\s+'))[2], 1)) || '.'
  end
$$;

create function is_admin() returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  )
$$;

-- Propietario del local (con rol de propietario) o administrador.
create function can_manage_car_wash(p_car_wash_id uuid) returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.car_washes c
    join public.profiles p on p.id = c.owner_id
    where c.id = p_car_wash_id
      and c.owner_id = (select auth.uid())
      and p.role = 'owner'
  )
$$;

-- Primer segmento de la ruta de Storage (<car_wash_id>/archivo.jpg) o null si no es un UUID.
create function storage_car_wash_id(p_name text) returns uuid
language sql immutable
as $$
  select case
    when (string_to_array(p_name, '/'))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((string_to_array(p_name, '/'))[1])::uuid
  end
$$;

-- Horario efectivo de un día: una excepción reemplaza al horario semanal.
-- Sin filas = cerrado ese día.
create function effective_hours(p_car_wash_id uuid, p_date date)
returns table (open_time time, close_time time)
language sql stable
set search_path = public
as $$
  select o.open_time, o.close_time
  from (
    select e.open_time, e.close_time
    from public.schedule_exceptions e
    where e.car_wash_id = p_car_wash_id
      and e.kind = 'special_hours'
      and p_date between e.start_date and e.end_date
    union all
    select h.open_time, h.close_time
    from public.opening_hours h
    where h.car_wash_id = p_car_wash_id
      and h.weekday = extract(isodow from p_date)::smallint
      and not exists (
        select 1 from public.schedule_exceptions e2
        where e2.car_wash_id = p_car_wash_id
          and p_date between e2.start_date and e2.end_date
      )
  ) o
  limit 1
$$;

-- Próxima apertura después de p_after (busca hasta 14 días).
create function next_opening(p_car_wash_id uuid, p_after date)
returns table (open_date date, open_time time)
language sql stable
set search_path = public
as $$
  select p_after + n.i, h.open_time
  from generate_series(1, 14) as n(i)
  cross join lateral public.effective_hours(p_car_wash_id, p_after + n.i) h
  order by n.i
  limit 1
$$;

-- Estado de apertura con hora de Lima:
-- open | closing_soon (queda 1 h o menos) | opens_later (abre hoy más tarde) | closed (ya cerró) | closed_today
create function open_status(p_car_wash_id uuid)
returns table (state text, today_open time, today_close time, next_open_date date, next_open_time time)
language plpgsql stable
set search_path = public
as $$
declare
  v_now time := public.lima_now()::time;
  v_today date := public.lima_today();
  v_open time;
  v_close time;
begin
  select h.open_time, h.close_time into v_open, v_close
  from public.effective_hours(p_car_wash_id, v_today) h;

  if v_open is null then
    state := 'closed_today';
  elsif v_now < v_open then
    state := 'opens_later';
  elsif v_now >= v_close then
    state := 'closed';
  elsif v_close - v_now <= interval '1 hour' then
    state := 'closing_soon';
  else
    state := 'open';
  end if;

  today_open := v_open;
  today_close := v_close;

  if state in ('closed', 'closed_today') then
    select n.open_date, n.open_time into next_open_date, next_open_time
    from public.next_opening(p_car_wash_id, v_today) n;
  end if;

  return next;
end
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger car_washes_set_updated_at before update on car_washes
  for each row execute function set_updated_at();
create trigger services_set_updated_at before update on services
  for each row execute function set_updated_at();
create trigger promotions_set_updated_at before update on promotions
  for each row execute function set_updated_at();
create trigger reviews_set_updated_at before update on reviews
  for each row execute function set_updated_at();

-- Cada usuario nuevo de Auth recibe un perfil de conductor.
-- El rol nunca se lee de los metadatos porque el cliente puede escribirlos.
create function handle_new_user() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    )
  );
  return new;
end
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Máximo 10 fotos por local.
create function check_photo_limit() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if (select count(*) from public.car_wash_photos where car_wash_id = new.car_wash_id) >= 10 then
    raise exception 'A car wash can have at most 10 photos' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger car_wash_photos_limit before insert on car_wash_photos
  for each row execute function check_photo_limit();

-- Reseñas: el nombre público se fija en el servidor y el propietario no puede reseñar su local.
create function reviews_before_insert() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name text;
begin
  select owner_id into v_owner from public.car_washes where id = new.car_wash_id;
  if v_owner is not null and v_owner = new.user_id then
    raise exception 'Owners cannot review their own car wash' using errcode = 'insufficient_privilege';
  end if;

  select public.format_public_name(display_name) into v_name from public.profiles where id = new.user_id;
  new.author_name := coalesce(v_name, 'Usuario');
  return new;
end
$$;

create trigger reviews_before_insert before insert on reviews
  for each row execute function reviews_before_insert();

-- Promedio y cantidad de calificaciones: solo cuentan las reseñas visibles.
create function refresh_car_wash_rating(p_car_wash_id uuid) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update public.car_washes c
  set rating_count = s.total,
      rating_avg = s.average
  from (
    select count(*)::int as total, coalesce(round(avg(r.rating)::numeric, 2), 0) as average
    from public.reviews r
    where r.car_wash_id = p_car_wash_id and r.status = 'visible'
  ) s
  where c.id = p_car_wash_id;
end
$$;

create function reviews_after_change() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_car_wash_rating(old.car_wash_id);
    return old;
  end if;
  perform public.refresh_car_wash_rating(new.car_wash_id);
  return new;
end
$$;

create trigger reviews_after_change after insert or update of rating, status or delete on reviews
  for each row execute function reviews_after_change();
