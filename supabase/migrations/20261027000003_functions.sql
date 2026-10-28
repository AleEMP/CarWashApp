-- CarWash AQP · funciones de la API (RPC)
-- Lectura para conductores (mapa, lista, estado del local) y acciones de administración.
-- Las funciones de administración validan el rol dentro de la función.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Conductores
-- ---------------------------------------------------------------------------

-- Locales verificados dentro del área visible del mapa.
-- p_vehicle_type define el precio «desde» de cada pin. La distancia se mide desde
-- (p_ref_lng, p_ref_lat), normalmente la ubicación del usuario; si faltan, desde el centro del área.
-- Orden: patrocinados en lista primero, luego por cercanía.
create function car_washes_in_bounds(
  p_min_lng double precision,
  p_min_lat double precision,
  p_max_lng double precision,
  p_max_lat double precision,
  p_vehicle_type text default 'car',
  p_ref_lng double precision default null,
  p_ref_lat double precision default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  name text,
  address text,
  district text,
  lat double precision,
  lng double precision,
  rating_avg numeric,
  rating_count integer,
  cover_path text,
  min_price numeric,
  promo_title text,
  sponsored_on_map boolean,
  sponsored_in_list boolean,
  distance_m double precision,
  open_state text,
  today_open time,
  today_close time,
  next_open_date date,
  next_open_time time
)
language sql stable security definer
set search_path = public, extensions
as $$
  with ref as (
    select extensions.st_setsrid(
      extensions.st_makepoint(
        coalesce(p_ref_lng, (p_min_lng + p_max_lng) / 2),
        coalesce(p_ref_lat, (p_min_lat + p_max_lat) / 2)
      ),
      4326
    )::extensions.geography as point
  )
  select
    cw.id,
    cw.name,
    cw.address,
    d.name,
    cw.lat,
    cw.lng,
    cw.rating_avg,
    cw.rating_count,
    (
      select ph.storage_path from public.car_wash_photos ph
      where ph.car_wash_id = cw.id
      order by ph.position, ph.created_at
      limit 1
    ),
    price.min_price,
    promo.title,
    coalesce(sp.on_map, false),
    coalesce(sp.in_list, false),
    extensions.st_distance(cw.location, ref.point),
    os.state,
    os.today_open,
    os.today_close,
    os.next_open_date,
    os.next_open_time
  from public.car_washes cw
  cross join ref
  join public.districts d on d.id = cw.district_id
  left join lateral (
    select min(spr.price) as min_price
    from public.services s
    join public.service_prices spr on spr.service_id = s.id
    where s.car_wash_id = cw.id and spr.vehicle_type = p_vehicle_type
  ) price on true
  left join lateral (
    select p.title
    from public.promotions p
    where p.car_wash_id = cw.id
      and p.ended_at is null
      and public.lima_today() between p.start_date and p.end_date
    order by p.end_date, p.created_at
    limit 1
  ) promo on true
  left join lateral (
    select bool_or(s.show_on_map) as on_map, bool_or(s.show_in_list) as in_list
    from public.sponsorships s
    where s.car_wash_id = cw.id
      and s.status = 'active'
      and public.lima_today() between s.starts_on and s.ends_on
  ) sp on true
  cross join lateral public.open_status(cw.id) os
  where cw.status = 'verified'
    and cw.location && extensions.st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)::extensions.geography
  order by coalesce(sp.in_list, false) desc, extensions.st_distance(cw.location, ref.point), cw.name
  limit least(greatest(p_limit, 1), 200)
$$;

-- Patrocinio vigente y estado de apertura de un local (perfil del local).
create function car_wash_meta(p_id uuid)
returns table (
  is_sponsored boolean,
  open_state text,
  today_open time,
  today_close time,
  next_open_date date,
  next_open_time time
)
language sql stable security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.sponsorships s
      where s.car_wash_id = c.id
        and s.status = 'active'
        and public.lima_today() between s.starts_on and s.ends_on
    ),
    os.state,
    os.today_open,
    os.today_close,
    os.next_open_date,
    os.next_open_time
  from public.car_washes c
  cross join lateral public.open_status(c.id) os
  where c.id = p_id
    and (c.status = 'verified' or public.can_manage_car_wash(c.id))
$$;

-- Cantidad de reseñas visibles por estrellas (5 a 1), para el resumen de reseñas.
create function review_distribution(p_car_wash_id uuid)
returns table (stars smallint, total integer)
language sql stable security definer
set search_path = public
as $$
  select s.stars::smallint, count(r.id)::int
  from generate_series(5, 1, -1) as s(stars)
  left join public.reviews r
    on r.car_wash_id = p_car_wash_id and r.rating = s.stars and r.status = 'visible'
  where exists (
    select 1 from public.car_washes c
    where c.id = p_car_wash_id and (c.status = 'verified' or public.can_manage_car_wash(c.id))
  )
  group by s.stars
  order by s.stars desc
$$;

-- ---------------------------------------------------------------------------
-- Administración
-- ---------------------------------------------------------------------------

create function assert_admin() returns void
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin role required' using errcode = 'insufficient_privilege';
  end if;
end
$$;

create function admin_set_car_wash_status(p_id uuid, p_status car_wash_status) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  update public.car_washes set status = p_status where id = p_id;
  if not found then
    raise exception 'Car wash not found' using errcode = 'no_data_found';
  end if;
end
$$;

-- Asigna (o quita con null) el propietario de un local. Quien reciba un local pasa de conductor a propietario.
create function admin_assign_owner(p_car_wash_id uuid, p_owner_id uuid) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  if p_owner_id is not null then
    update public.profiles set role = 'owner' where id = p_owner_id and role = 'driver';
    if not exists (select 1 from public.profiles where id = p_owner_id) then
      raise exception 'User not found' using errcode = 'no_data_found';
    end if;
  end if;

  update public.car_washes set owner_id = p_owner_id where id = p_car_wash_id;
  if not found then
    raise exception 'Car wash not found' using errcode = 'no_data_found';
  end if;
end
$$;

create function admin_set_user_role(p_user_id uuid, p_role app_role) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'Admins cannot remove their own admin role' using errcode = 'insufficient_privilege';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  if not found then
    raise exception 'User not found' using errcode = 'no_data_found';
  end if;
end
$$;

-- Activa una solicitud de patrocinio con el pago ya recibido (Yape).
create function admin_activate_sponsorship(
  p_id uuid,
  p_starts_on date,
  p_ends_on date,
  p_show_on_map boolean,
  p_show_in_list boolean,
  p_amount numeric,
  p_operation_number text
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  update public.sponsorships
  set status = 'active',
      starts_on = p_starts_on,
      ends_on = p_ends_on,
      show_on_map = p_show_on_map,
      show_in_list = p_show_in_list,
      payment_method = 'yape',
      amount = p_amount,
      operation_number = nullif(btrim(p_operation_number), ''),
      activated_by = (select auth.uid()),
      activated_at = now()
  where id = p_id and status = 'requested';
  if not found then
    raise exception 'Sponsorship request not found or already handled' using errcode = 'no_data_found';
  end if;
end
$$;

create function admin_deactivate_sponsorship(p_id uuid) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  update public.sponsorships set status = 'cancelled' where id = p_id and status = 'active';
  if not found then
    raise exception 'Active sponsorship not found' using errcode = 'no_data_found';
  end if;
end
$$;

-- Reseñas con reportes: pendientes (p_resolved = false) o ya resueltas (true).
create function admin_moderation_queue(p_resolved boolean default false)
returns table (
  review_id uuid,
  car_wash_id uuid,
  car_wash_name text,
  author_name text,
  comment text,
  rating smallint,
  review_status review_status,
  report_count integer,
  top_reason report_reason,
  last_reported_at timestamptz
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return query
  select
    r.id,
    r.car_wash_id,
    c.name,
    r.author_name,
    r.comment,
    r.rating,
    r.status,
    count(rr.id)::int,
    mode() within group (order by rr.reason),
    max(rr.created_at)
  from public.reviews r
  join public.review_reports rr on rr.review_id = r.id
  join public.car_washes c on c.id = r.car_wash_id
  where (rr.status = 'pending') <> p_resolved
  group by r.id, c.id
  order by max(rr.created_at) desc;
end
$$;

-- «Ocultar reseña» (p_hide = true) o «Mantener» (false). Cierra todos los reportes pendientes de esa reseña.
-- La reseña oculta se conserva para su revisión.
create function admin_resolve_review_reports(p_review_id uuid, p_hide boolean) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  if not exists (
    select 1 from public.review_reports where review_id = p_review_id and status = 'pending'
  ) then
    raise exception 'No pending reports for this review' using errcode = 'no_data_found';
  end if;

  if p_hide then
    update public.reviews set status = 'hidden' where id = p_review_id;
  end if;

  update public.review_reports
  set status = 'resolved',
      resolution = case when p_hide then 'hidden'::public.report_resolution else 'kept'::public.report_resolution end,
      resolved_by = (select auth.uid()),
      resolved_at = now()
  where review_id = p_review_id and status = 'pending';
end
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------------

revoke all on function
  car_washes_in_bounds(double precision, double precision, double precision, double precision, text, double precision, double precision, integer),
  car_wash_meta(uuid),
  review_distribution(uuid),
  assert_admin(),
  admin_set_car_wash_status(uuid, car_wash_status),
  admin_assign_owner(uuid, uuid),
  admin_set_user_role(uuid, app_role),
  admin_activate_sponsorship(uuid, date, date, boolean, boolean, numeric, text),
  admin_deactivate_sponsorship(uuid),
  admin_moderation_queue(boolean),
  admin_resolve_review_reports(uuid, boolean)
  from public, anon, authenticated;

grant execute on function
  car_washes_in_bounds(double precision, double precision, double precision, double precision, text, double precision, double precision, integer),
  car_wash_meta(uuid),
  review_distribution(uuid)
  to anon, authenticated;

grant execute on function
  admin_set_car_wash_status(uuid, car_wash_status),
  admin_assign_owner(uuid, uuid),
  admin_set_user_role(uuid, app_role),
  admin_activate_sponsorship(uuid, date, date, boolean, boolean, numeric, text),
  admin_deactivate_sponsorship(uuid),
  admin_moderation_queue(boolean),
  admin_resolve_review_reports(uuid, boolean)
  to authenticated;

-- Funciones internas: solo las ejecutan triggers y otras funciones.
revoke all on function
  effective_hours(uuid, date),
  next_opening(uuid, date),
  open_status(uuid),
  refresh_car_wash_rating(uuid),
  handle_new_user(),
  check_photo_limit(),
  reviews_before_insert(),
  reviews_after_change(),
  set_updated_at()
  from public, anon, authenticated;
