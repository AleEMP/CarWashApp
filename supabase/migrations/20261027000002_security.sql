-- CarWash AQP · seguridad
-- 1) Se quitan los permisos por defecto y se otorgan solo los necesarios, por columna.
-- 2) RLS decide qué filas puede tocar cada usuario según su rol.
-- Las acciones de administración que cambian columnas sensibles (estado del local,
-- propietario, rol, patrocinio, moderación) van por funciones en 20261027000003_functions.sql.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Permisos base
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Funciones que usan las políticas y las consultas del cliente.
grant execute on function lima_now(), lima_today(), format_public_name(text),
  is_admin(), can_manage_car_wash(uuid), storage_car_wash_id(text)
  to anon, authenticated;

-- Lectura pública (también sin cuenta: «Explorar sin cuenta»).
grant select on districts, vehicle_types, amenities, sponsorship_plans,
  car_washes, car_wash_photos, car_wash_amenities, services, service_prices,
  opening_hours, schedule_exceptions, promotions, reviews
  to anon, authenticated;

-- Perfiles: cada usuario lee el suyo (los administradores todos) y solo edita su nombre.
grant select on profiles to authenticated;
grant update (display_name) on profiles to authenticated;

-- Locales: owner_id, status y las calificaciones no se pueden editar desde el cliente.
grant insert (owner_id, name, address, district_id, reference, lat, lng, status),
      update (name, address, district_id, reference, lat, lng)
      on car_washes to authenticated;
grant delete on car_washes to authenticated;

grant insert (car_wash_id, storage_path, position), update (position) on car_wash_photos to authenticated;
grant delete on car_wash_photos to authenticated;
grant insert, delete on car_wash_amenities to authenticated;
grant insert (car_wash_id, name, description, duration_minutes, position),
      update (name, description, duration_minutes, position)
      on services to authenticated;
grant delete on services to authenticated;
grant insert, delete on service_prices to authenticated;
grant update (price) on service_prices to authenticated;
grant insert, delete on opening_hours to authenticated;
grant update (open_time, close_time) on opening_hours to authenticated;
grant insert (car_wash_id, kind, start_date, end_date, open_time, close_time, reason),
      update (kind, start_date, end_date, open_time, close_time, reason)
      on schedule_exceptions to authenticated;
grant delete on schedule_exceptions to authenticated;
grant insert (car_wash_id, service_id, title, description, start_date, end_date),
      update (service_id, title, description, start_date, end_date, ended_at)
      on promotions to authenticated;
grant delete on promotions to authenticated;

-- Reseñas: el estado, el nombre público y la fecha los controla el servidor.
grant insert (car_wash_id, user_id, rating, comment), update (rating, comment) on reviews to authenticated;
grant select on review_reports to authenticated;
grant insert (review_id, reporter_id, reason, details) on review_reports to authenticated;

-- Patrocinio: el propietario solo pide; las fechas, el monto y la activación los fija el administrador.
grant select on sponsorships to authenticated;
grant insert (car_wash_id, plan_code, requested_by) on sponsorships to authenticated;
grant delete on sponsorships to authenticated;

-- Solicitudes de acceso: las puede enviar cualquiera; solo los administradores las ven.
grant insert (business_name, contact_name, phone, email, address, message)
  on owner_access_requests to anon, authenticated;
grant select on owner_access_requests to authenticated;
grant update (status, handled_by, handled_at) on owner_access_requests to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table districts enable row level security;
alter table vehicle_types enable row level security;
alter table amenities enable row level security;
alter table sponsorship_plans enable row level security;
alter table profiles enable row level security;
alter table car_washes enable row level security;
alter table car_wash_photos enable row level security;
alter table car_wash_amenities enable row level security;
alter table services enable row level security;
alter table service_prices enable row level security;
alter table opening_hours enable row level security;
alter table schedule_exceptions enable row level security;
alter table promotions enable row level security;
alter table reviews enable row level security;
alter table review_reports enable row level security;
alter table sponsorships enable row level security;
alter table owner_access_requests enable row level security;

-- Datos de referencia
create policy "districts: public read" on districts for select to anon, authenticated using (true);
create policy "vehicle_types: public read" on vehicle_types for select to anon, authenticated using (true);
create policy "amenities: public read" on amenities for select to anon, authenticated using (true);
create policy "sponsorship_plans: public read" on sponsorship_plans for select to anon, authenticated using (true);

-- Perfiles
create policy "profiles: read own" on profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles: admin reads all" on profiles for select to authenticated
  using (is_admin());
create policy "profiles: update own" on profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Locales
create policy "car_washes: public reads verified" on car_washes for select to anon, authenticated
  using (status = 'verified');
create policy "car_washes: owner reads own" on car_washes for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "car_washes: admin reads all" on car_washes for select to authenticated
  using (is_admin());
create policy "car_washes: admin inserts" on car_washes for insert to authenticated
  with check (is_admin());
create policy "car_washes: managers update" on car_washes for update to authenticated
  using (can_manage_car_wash(id))
  with check (can_manage_car_wash(id));
create policy "car_washes: admin deletes" on car_washes for delete to authenticated
  using (is_admin());

-- Contenido del local: se ve si el local es visible para el usuario; lo edita quien lo gestiona.
create policy "car_wash_photos: read" on car_wash_photos for select to anon, authenticated
  using (exists (select 1 from car_washes c where c.id = car_wash_photos.car_wash_id));
create policy "car_wash_photos: managers write" on car_wash_photos for all to authenticated
  using (can_manage_car_wash(car_wash_id))
  with check (can_manage_car_wash(car_wash_id));

create policy "car_wash_amenities: read" on car_wash_amenities for select to anon, authenticated
  using (exists (select 1 from car_washes c where c.id = car_wash_amenities.car_wash_id));
create policy "car_wash_amenities: managers write" on car_wash_amenities for all to authenticated
  using (can_manage_car_wash(car_wash_id))
  with check (can_manage_car_wash(car_wash_id));

create policy "services: read" on services for select to anon, authenticated
  using (exists (select 1 from car_washes c where c.id = services.car_wash_id));
create policy "services: managers write" on services for all to authenticated
  using (can_manage_car_wash(car_wash_id))
  with check (can_manage_car_wash(car_wash_id));

create policy "service_prices: read" on service_prices for select to anon, authenticated
  using (exists (select 1 from services s where s.id = service_prices.service_id));
create policy "service_prices: managers write" on service_prices for all to authenticated
  using (exists (select 1 from services s where s.id = service_prices.service_id and can_manage_car_wash(s.car_wash_id)))
  with check (exists (select 1 from services s where s.id = service_prices.service_id and can_manage_car_wash(s.car_wash_id)));

create policy "opening_hours: read" on opening_hours for select to anon, authenticated
  using (exists (select 1 from car_washes c where c.id = opening_hours.car_wash_id));
create policy "opening_hours: managers write" on opening_hours for all to authenticated
  using (can_manage_car_wash(car_wash_id))
  with check (can_manage_car_wash(car_wash_id));

-- Los clientes solo ven excepciones vigentes o futuras.
create policy "schedule_exceptions: public reads upcoming" on schedule_exceptions for select to anon, authenticated
  using (
    end_date >= lima_today()
    and exists (select 1 from car_washes c where c.id = schedule_exceptions.car_wash_id)
  );
create policy "schedule_exceptions: managers all" on schedule_exceptions for all to authenticated
  using (can_manage_car_wash(car_wash_id))
  with check (can_manage_car_wash(car_wash_id));

-- Los clientes solo ven promociones vigentes; la promoción solo puede apuntar a un servicio del mismo local.
create policy "promotions: public reads current" on promotions for select to anon, authenticated
  using (
    ended_at is null
    and lima_today() between start_date and end_date
    and exists (select 1 from car_washes c where c.id = promotions.car_wash_id)
  );
create policy "promotions: managers all" on promotions for all to authenticated
  using (can_manage_car_wash(car_wash_id))
  with check (
    can_manage_car_wash(car_wash_id)
    and (
      service_id is null
      or exists (select 1 from services s where s.id = promotions.service_id and s.car_wash_id = promotions.car_wash_id)
    )
  );

-- Reseñas
create policy "reviews: public reads visible" on reviews for select to anon, authenticated
  using (
    status = 'visible'
    and exists (select 1 from car_washes c where c.id = reviews.car_wash_id)
  );
create policy "reviews: author reads own" on reviews for select to authenticated
  using (user_id = (select auth.uid()));
create policy "reviews: admin reads all" on reviews for select to authenticated
  using (is_admin());
create policy "reviews: author inserts" on reviews for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from car_washes c where c.id = reviews.car_wash_id and c.status = 'verified')
  );
create policy "reviews: author edits own" on reviews for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Reportes: se pueden reportar reseñas visibles de otras personas.
create policy "review_reports: reporter reads own" on review_reports for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy "review_reports: admin reads all" on review_reports for select to authenticated
  using (is_admin());
create policy "review_reports: user reports" on review_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (
      select 1 from reviews r
      where r.id = review_reports.review_id
        and r.status = 'visible'
        and r.user_id <> (select auth.uid())
    )
  );

-- Patrocinio
create policy "sponsorships: managers read" on sponsorships for select to authenticated
  using (can_manage_car_wash(car_wash_id));
create policy "sponsorships: managers request" on sponsorships for insert to authenticated
  with check (can_manage_car_wash(car_wash_id) and requested_by = (select auth.uid()));
create policy "sponsorships: managers cancel request" on sponsorships for delete to authenticated
  using (can_manage_car_wash(car_wash_id) and status = 'requested');

-- Solicitudes de acceso
create policy "owner_access_requests: anyone submits" on owner_access_requests for insert to anon, authenticated
  with check (true);
create policy "owner_access_requests: admin reads" on owner_access_requests for select to authenticated
  using (is_admin());
create policy "owner_access_requests: admin updates" on owner_access_requests for update to authenticated
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------------
-- Storage: fotos de locales
-- Ruta de cada archivo: <car_wash_id>/<nombre>.jpg
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('car-wash-photos', 'car-wash-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "car-wash-photos: public read" on storage.objects for select
  using (bucket_id = 'car-wash-photos');
create policy "car-wash-photos: managers upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'car-wash-photos' and can_manage_car_wash(storage_car_wash_id(name)));
create policy "car-wash-photos: managers update" on storage.objects for update to authenticated
  using (bucket_id = 'car-wash-photos' and can_manage_car_wash(storage_car_wash_id(name)))
  with check (bucket_id = 'car-wash-photos' and can_manage_car_wash(storage_car_wash_id(name)));
create policy "car-wash-photos: managers delete" on storage.objects for delete to authenticated
  using (bucket_id = 'car-wash-photos' and can_manage_car_wash(storage_car_wash_id(name)));
