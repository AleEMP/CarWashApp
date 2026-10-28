// Pruebas de la base de datos: ejecuta las migraciones y el seed en un Postgres embebido (PGlite + PostGIS)
// con roles y funciones de Supabase simulados en stubs.sql, y comprueba RLS, triggers y funciones.
// Uso: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { postgis } from '@electric-sql/pglite-postgis';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const stubs = fileURLToPath(new URL('./stubs.sql', import.meta.url));
const db = await PGlite.create({ extensions: { postgis, btree_gist } });
for (const f of [stubs, `${root}/migrations/20261027000001_schema.sql`, `${root}/migrations/20261027000002_security.sql`, `${root}/migrations/20261027000003_functions.sql`, `${root}/seed.sql`]) {
  await db.exec(readFileSync(f, 'utf8'));
}

let passed = 0;
let failed = 0;
const failures = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    failures.push(name);
    console.log(`FAIL  ${name}\n        -> ${e.message}`);
  }
}
function eq(actual, expected, label = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(actual)}`);
  }
}
async function rejects(fn, re) {
  let err;
  try { await fn(); } catch (e) { err = e; }
  if (!err) throw new Error(`se esperaba error ${re}`);
  if (!re.test(err.message)) throw new Error(`error distinto: ${err.message}`);
}
async function as(role, uid, fn) {
  await db.exec(`set role ${role}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
  try { return await fn(); } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}
const q = (sql, params) => db.query(sql, params);

const A = '00000000-0000-4000-a000-000000000001'; // admin
const O = '00000000-0000-4000-a000-000000000002'; // propietario
const D1 = '00000000-0000-4000-a000-000000000003'; // conductor
const D2 = '00000000-0000-4000-a000-000000000004'; // conductor
const SILLAR = 'c0000000-0000-4000-8000-000000000001';
const ESPUMA = 'c0000000-0000-4000-8000-000000000002';
const PENDING = 'c0000000-0000-4000-8000-000000000006';
const BBOX = [-71.6, -16.45, -71.5, -16.36];

// ---- usuarios ----
await q(`insert into auth.users (id, email, raw_user_meta_data) values
  ($1, 'admin@test.pe', '{"full_name":"Ana Admin"}'),
  ($2, 'owner@test.pe', '{"full_name":"Oscar Owner Perez"}'),
  ($3, 'd1@test.pe', '{"full_name":"Dana Lopez Ruiz"}'),
  ($4, 'd2@test.pe', '{"name":"Diego Vega"}')`, [A, O, D1, D2]);
await q(`update profiles set role = 'admin' where id = $1`, [A]);
await as('authenticated', A, () => q(`select admin_assign_owner($1, $2)`, [SILLAR, O]));

// ---- perfiles / roles ----
await test('handle_new_user crea perfil de conductor e ignora el rol en metadatos', async () => {
  await q(`insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-4000-a000-0000000000ff', 'evil@test.pe', '{"role":"admin","full_name":"Mal Actor"}')`);
  const r = await q(`select role, display_name from profiles where id = '00000000-0000-4000-a000-0000000000ff'`);
  eq(r.rows[0], { role: 'driver', display_name: 'Mal Actor' });
});
await test('admin_assign_owner promueve a propietario', async () => {
  eq((await q(`select role from profiles where id = $1`, [O])).rows[0].role, 'owner');
  eq((await q(`select owner_id from car_washes where id = $1`, [SILLAR])).rows[0].owner_id, O);
});
await test('conductor no puede subirse a admin', () =>
  rejects(() => as('authenticated', D1, () => q(`update profiles set role = 'admin' where id = $1`, [D1])), /permission denied/));
await test('conductor edita su nombre y solo ve su perfil', async () => {
  await as('authenticated', D1, async () => {
    eq((await q(`update profiles set display_name = 'Dana Lopez Ruiz' where id = $1 returning id`, [D1])).rows.length, 1);
    eq((await q(`select id from profiles`)).rows.length, 1);
  });
});
await test('admin ve todos los perfiles', async () => {
  const n = await as('authenticated', A, async () => (await q(`select id from profiles`)).rows.length);
  if (n < 5) throw new Error(`solo ${n}`);
});
await test('anon no puede leer perfiles', () => rejects(() => as('anon', null, () => q(`select * from profiles`)), /permission denied/));
await test('admin no puede quitarse su propio rol', () =>
  rejects(() => as('authenticated', A, () => q(`select admin_set_user_role($1, 'driver')`, [A])), /cannot remove their own admin role/));
await test('no-admin no puede ejecutar funciones de administración', async () => {
  await rejects(() => as('authenticated', D1, () => q(`select admin_set_user_role($1, 'admin')`, [D1])), /Admin role required/);
  await rejects(() => as('anon', null, () => q(`select * from admin_moderation_queue()`)), /permission denied/);
});

// ---- lectura pública ----
await test('anon ve solo locales verificados', async () => {
  const r = await as('anon', null, () => q(`select id from car_washes`));
  eq(r.rows.length, 5);
});
await test('car_washes_in_bounds: 5 locales, patrocinado primero, precio «desde»', async () => {
  const r = await as('anon', null, () => q(`select * from car_washes_in_bounds($1,$2,$3,$4,'car')`, BBOX));
  eq(r.rows.length, 5, 'filas');
  eq(r.rows[0].name, 'Espuma Express', 'primero');
  eq(r.rows[0].sponsored_in_list, true);
  eq(Number(r.rows[0].min_price), 12, 'precio auto Espuma');
  const sillar = r.rows.find((x) => x.name === 'Lavado Sillar');
  eq(Number(sillar.min_price), 15, 'precio auto Sillar');
  eq(sillar.promo_title !== null, true, 'promo');
  eq(['open', 'closing_soon', 'opens_later', 'closed', 'closed_today'].includes(sillar.open_state), true, 'estado');
});
await test('car_washes_in_bounds: moto muestra precio de moto y omite locales sin precio', async () => {
  const r = await as('anon', null, () => q(`select name, min_price from car_washes_in_bounds($1,$2,$3,$4,'motorcycle') order by name`, BBOX));
  eq(Number(r.rows.find((x) => x.name === 'Lavado Sillar').min_price), 10);
});
await test('car_washes_in_bounds: un área vacía no devuelve nada', async () => {
  const r = await as('anon', null, () => q(`select * from car_washes_in_bounds(-70.0,-15.0,-69.9,-14.9)`));
  eq(r.rows.length, 0);
});
await test('anon no puede leer patrocinios ni sus pagos', () =>
  rejects(() => as('anon', null, () => q(`select * from sponsorships`)), /permission denied/));
await test('car_wash_meta: patrocinado y local pendiente oculto para anon', async () => {
  const sp = await as('anon', null, () => q(`select * from car_wash_meta($1)`, [ESPUMA]));
  eq(sp.rows[0].is_sponsored, true);
  const hidden = await as('anon', null, () => q(`select * from car_wash_meta($1)`, [PENDING]));
  eq(hidden.rows.length, 0);
});
await test('promociones: anon ve 2 vigentes, el propietario ve las 3', async () => {
  eq((await as('anon', null, () => q(`select id from promotions where car_wash_id = $1`, [SILLAR]))).rows.length, 2);
  eq((await as('authenticated', O, () => q(`select id from promotions where car_wash_id = $1`, [SILLAR]))).rows.length, 3);
});
await test('excepciones de horario futuras visibles para anon', async () => {
  eq((await as('anon', null, () => q(`select id from schedule_exceptions where car_wash_id = $1`, [SILLAR]))).rows.length, 3);
});

// ---- reseñas ----
await test('reseña: nombre público, promedio y cantidad', async () => {
  await as('authenticated', D1, () => q(`insert into reviews (car_wash_id, user_id, rating, comment) values ($1,$2,5,'Muy bien')`, [SILLAR, D1]));
  await as('authenticated', D2, () => q(`insert into reviews (car_wash_id, user_id, rating, comment) values ($1,$2,3,null)`, [SILLAR, D2]));
  const c = (await q(`select rating_avg, rating_count from car_washes where id = $1`, [SILLAR])).rows[0];
  eq([Number(c.rating_avg), c.rating_count], [4, 2]);
  const names = (await q(`select author_name from reviews order by author_name`)).rows.map((r) => r.author_name);
  eq(names, ['Dana L.', 'Diego V.']);
});
await test('editar reseña recalcula el promedio', async () => {
  await as('authenticated', D1, () => q(`update reviews set rating = 4 where user_id = $1`, [D1]));
  eq(Number((await q(`select rating_avg from car_washes where id = $1`, [SILLAR])).rows[0].rating_avg), 3.5);
});
await test('una reseña por usuario por local', () =>
  rejects(() => as('authenticated', D1, () => q(`insert into reviews (car_wash_id, user_id, rating) values ($1,$2,2)`, [SILLAR, D1])), /duplicate key/));
await test('no se puede reseñar a nombre de otro', () =>
  rejects(() => as('authenticated', D1, () => q(`insert into reviews (car_wash_id, user_id, rating) values ($1,$2,2)`, [ESPUMA, D2])), /row-level security/));
await test('el autor no puede cambiar el estado de su reseña', () =>
  rejects(() => as('authenticated', D1, () => q(`update reviews set status = 'visible' where user_id = $1`, [D1])), /permission denied/));
await test('el propietario no puede reseñar su propio local', () =>
  rejects(() => as('authenticated', O, () => q(`insert into reviews (car_wash_id, user_id, rating) values ($1,$2,5)`, [SILLAR, O])), /Owners cannot review/));
await test('anon no puede reseñar', () =>
  rejects(() => as('anon', null, () => q(`insert into reviews (car_wash_id, user_id, rating) values ($1,$2,5)`, [SILLAR, D1])), /permission denied/));
await test('no se puede reseñar un local no verificado', () =>
  rejects(() => as('authenticated', D1, () => q(`insert into reviews (car_wash_id, user_id, rating) values ($1,$2,5)`, [PENDING, D1])), /row-level security/));
await test('review_distribution cuenta por estrellas', async () => {
  const r = await as('anon', null, () => q(`select stars, total from review_distribution($1)`, [SILLAR]));
  eq(r.rows.map((x) => [x.stars, x.total]), [[5, 0], [4, 1], [3, 1], [2, 0], [1, 0]]);
});

// ---- reportes y moderación ----
let reviewD1;
await test('reportar reseña ajena; no la propia ni dos veces; anon no puede', async () => {
  reviewD1 = (await q(`select id from reviews where user_id = $1`, [D1])).rows[0].id;
  await as('authenticated', D2, () => q(`insert into review_reports (review_id, reporter_id, reason) values ($1,$2,'offensive')`, [reviewD1, D2]));
  await as('authenticated', O, () => q(`insert into review_reports (review_id, reporter_id, reason, details) values ($1,$2,'spam','x')`, [reviewD1, O]));
  await rejects(() => as('authenticated', D1, () => q(`insert into review_reports (review_id, reporter_id, reason) values ($1,$2,'spam')`, [reviewD1, D1])), /row-level security/);
  await rejects(() => as('authenticated', D2, () => q(`insert into review_reports (review_id, reporter_id, reason) values ($1,$2,'spam')`, [reviewD1, D2])), /duplicate key/);
  await rejects(() => as('anon', null, () => q(`insert into review_reports (review_id, reporter_id, reason) values ($1,$2,'spam')`, [reviewD1, D2])), /permission denied/);
});
await test('el reportante solo ve sus propios reportes; el admin ve todos', async () => {
  eq((await as('authenticated', D2, () => q(`select id from review_reports`))).rows.length, 1);
  eq((await as('authenticated', A, () => q(`select id from review_reports`))).rows.length, 2);
});
await test('cola de moderación agrupa reportes por reseña', async () => {
  const r = await as('authenticated', A, () => q(`select * from admin_moderation_queue()`));
  eq(r.rows.length, 1);
  eq(r.rows[0].report_count, 2);
  eq(r.rows[0].car_wash_name, 'Lavado Sillar');
});
await test('moderación: un no-admin no puede resolver', () =>
  rejects(() => as('authenticated', D2, () => q(`select admin_resolve_review_reports($1, true)`, [reviewD1])), /Admin role required/));
await test('ocultar reseña: deja de verse, se conserva, el promedio se recalcula', async () => {
  await as('authenticated', A, () => q(`select admin_resolve_review_reports($1, true)`, [reviewD1]));
  const c = (await q(`select rating_avg, rating_count from car_washes where id = $1`, [SILLAR])).rows[0];
  eq([Number(c.rating_avg), c.rating_count], [3, 1]);
  eq((await as('anon', null, () => q(`select id from reviews where car_wash_id = $1`, [SILLAR]))).rows.length, 1);
  eq((await as('authenticated', D1, () => q(`select id, status from reviews where user_id = $1`, [D1]))).rows[0].status, 'hidden');
  eq((await as('authenticated', A, () => q(`select * from admin_moderation_queue()`))).rows.length, 0);
  eq((await as('authenticated', A, () => q(`select * from admin_moderation_queue(true)`))).rows.length, 1);
  eq((await q(`select count(*)::int as n from reviews where id = $1`, [reviewD1])).rows[0].n, 1);
});
await test('resolver sin reportes pendientes falla', () =>
  rejects(() => as('authenticated', A, () => q(`select admin_resolve_review_reports($1, false)`, [reviewD1])), /No pending reports/));

// ---- gestión de locales ----
await test('conductor no puede editar locales ni crear locales', async () => {
  eq((await as('authenticated', D1, () => q(`update car_washes set name = 'X' where id = $1 returning id`, [SILLAR]))).rows.length, 0);
  await rejects(() => as('authenticated', D1, () => q(`update car_washes set rating_avg = 5 where id = $1`, [SILLAR])), /permission denied/);
  await rejects(() => as('authenticated', D1, () => q(`insert into car_washes (name, address, district_id, lat, lng) values ('Nuevo','Calle 1',1,-16.4,-71.5)`)), /row-level security/);
});
await test('propietario edita su local y la ubicación generada se actualiza', async () => {
  await as('authenticated', O, () => q(`update car_washes set name = 'Lavado Sillar Cayma', lat = -16.39 where id = $1`, [SILLAR]));
  const r = await q(`select name, extensions.st_y(location::extensions.geometry) as y from car_washes where id = $1`, [SILLAR]);
  eq([r.rows[0].name, r.rows[0].y], ['Lavado Sillar Cayma', -16.39]);
});
await test('propietario no puede cambiar estado, dueño ni tocar otro local', async () => {
  await rejects(() => as('authenticated', O, () => q(`update car_washes set status = 'hidden' where id = $1`, [SILLAR])), /permission denied/);
  await rejects(() => as('authenticated', O, () => q(`update car_washes set owner_id = $2 where id = $1`, [SILLAR, D1])), /permission denied/);
  eq((await as('authenticated', O, () => q(`update car_washes set name = 'X' where id = $1 returning id`, [ESPUMA]))).rows.length, 0);
});
await test('admin crea local y lo asigna; pendiente solo lo ve su dueño', async () => {
  const id = (await as('authenticated', A, () => q(`insert into car_washes (name, address, district_id, lat, lng) values ('Nuevo Lavado','Calle 1',1,-16.4,-71.5) returning id`))).rows[0].id;
  await as('authenticated', A, () => q(`select admin_assign_owner($1, $2)`, [id, D2]));
  eq((await q(`select role from profiles where id = $1`, [D2])).rows[0].role, 'owner');
  eq((await as('anon', null, () => q(`select id from car_washes where id = $1`, [id]))).rows.length, 0);
  eq((await as('authenticated', D2, () => q(`select id from car_washes where id = $1`, [id]))).rows.length, 1);
  eq((await as('authenticated', A, () => q(`select admin_set_car_wash_status($1, 'verified')`, [id]))).rows.length, 1);
  eq((await as('anon', null, () => q(`select id from car_washes where id = $1`, [id]))).rows.length, 1);
});
await test('servicios y precios: propietario sí; conductor y otro local no', async () => {
  const s = await as('authenticated', O, () => q(`insert into services (car_wash_id, name, duration_minutes) values ($1,'Pulido',60) returning id`, [SILLAR]));
  const sid = s.rows[0].id;
  await as('authenticated', O, () => q(`insert into service_prices (service_id, vehicle_type, price) values ($1,'car',50)`, [sid]));
  await rejects(() => as('authenticated', D1, () => q(`insert into services (car_wash_id, name) values ($1,'Hack')`, [SILLAR])), /row-level security/);
  await rejects(() => as('authenticated', O, () => q(`insert into services (car_wash_id, name) values ($1,'Hack')`, [ESPUMA])), /row-level security/);
  await rejects(() => as('authenticated', D1, () => q(`insert into service_prices (service_id, vehicle_type, price) values ($1,'suv',1)`, [sid])), /row-level security/);
  await rejects(() => as('authenticated', O, () => q(`insert into service_prices (service_id, vehicle_type, price) values ($1,'suv',-5)`, [sid])), /check constraint/);
});
await test('promoción no puede apuntar a un servicio de otro local', () =>
  rejects(() => as('authenticated', O, () => q(`insert into promotions (car_wash_id, service_id, title, start_date, end_date) values ($1,'e0000000-0000-4000-8000-000000000201','Hack',lima_today(),lima_today()+1)`, [SILLAR])), /row-level security/));
await test('propietario finaliza una promoción', async () => {
  await as('authenticated', O, () => q(`update promotions set ended_at = now() where car_wash_id = $1 and title = 'Aspirado gratis con encerado'`, [SILLAR]));
  eq((await as('anon', null, () => q(`select id from promotions where car_wash_id = $1`, [SILLAR]))).rows.length, 1);
});
await test('máximo 10 fotos por local', async () => {
  for (let i = 0; i < 10; i++) {
    await as('authenticated', O, () => q(`insert into car_wash_photos (car_wash_id, storage_path, position) values ($1,$2,$3)`, [SILLAR, `${SILLAR}/f${i}.jpg`, i]));
  }
  await rejects(() => as('authenticated', O, () => q(`insert into car_wash_photos (car_wash_id, storage_path) values ($1,'x.jpg')`, [SILLAR])), /at most 10 photos/);
});
await test('horarios: una excepción no puede solaparse con otra', async () => {
  await rejects(() => as('authenticated', O, () => q(`insert into schedule_exceptions (car_wash_id, kind, start_date, end_date) values ($1,'closed',lima_today()+8,lima_today()+9)`, [SILLAR])), /exclusion constraint/);
  await rejects(() => as('authenticated', O, () => q(`insert into schedule_exceptions (car_wash_id, kind, start_date, end_date) values ($1,'special_hours',lima_today()+100,lima_today()+100)`, [SILLAR])), /check constraint/);
});

// ---- estado de apertura (hora de Lima) ----
const lima = (await q(`select lima_now()::time as t, extract(isodow from lima_today())::int as dow, lima_today()::text as today, (lima_today()+1)::text as tomorrow, extract(isodow from lima_today()+1)::int as dow1`)).rows[0];
const hour = Number(lima.t.slice(0, 2));
async function wash(name, hours, dow = lima.dow) {
  const id = (await q(`insert into car_washes (name, address, district_id, lat, lng, status) values ($1,'Calle Test 1',1,-16.4,-71.5,'verified') returning id`, [name])).rows[0].id;
  if (hours) await q(`insert into opening_hours (car_wash_id, weekday, open_time, close_time) values ($1,$2,$3,$4)`, [id, dow, hours[0], hours[1]]);
  return id;
}
const state = async (id) => (await q(`select state, today_open, today_close, next_open_date::text as next_open_date, next_open_time from open_status($1)`, [id])).rows[0];
await test('estado: sin horario = cerrado hoy y sin próxima apertura', async () => {
  const s = await state(await wash('Sin horario', null));
  eq([s.state, s.next_open_date], ['closed_today', null]);
});
await test('estado: abre solo mañana = cerrado hoy, próxima apertura mañana', async () => {
  const s = await state(await wash('Solo mañana', ['08:00', '18:00'], lima.dow1));
  eq([s.state, s.next_open_date, s.next_open_time], ['closed_today', lima.tomorrow, '08:00:00']);
});
await test('estado: abierto todo el día = abierto (o cierra pronto a última hora)', async () => {
  const s = await state(await wash('24h', ['00:00', '23:59']));
  eq(['open', 'closing_soon'].includes(s.state), true, s.state);
});
await test('estado: excepción de cierre hoy gana al horario semanal', async () => {
  const id = await wash('Cerrado hoy', ['00:00', '23:59']);
  await q(`insert into schedule_exceptions (car_wash_id, kind, start_date, end_date, reason) values ($1,'closed',lima_today(),lima_today(),'Feriado')`, [id]);
  const s = await state(id);
  eq([s.state, s.today_open], ['closed_today', null]);
});
if (hour < 21) {
  await test('estado: abre más tarde hoy', async () => {
    const id = await wash('Más tarde', [`${String(hour + 1).padStart(2, '0')}:30`, `${String(hour + 2).padStart(2, '0')}:30`]);
    eq((await state(id)).state, 'opens_later');
  });
}
if (hour < 23) {
  await test('estado: cierra pronto', async () => {
    const id = await wash('Cierra pronto', ['00:00', `${String(hour).padStart(2, '0')}:59`]);
    eq((await state(id)).state, 'closing_soon');
  });
}
if (hour >= 1) {
  await test('estado: ya cerró por hoy', async () => {
    const id = await wash('Ya cerró', ['00:00', '00:30']);
    const s = await state(id);
    eq(s.state, 'closed');
  });
}
await test('horario especial reemplaza al semanal', async () => {
  const id = await wash('Especial', ['00:00', '23:59']);
  await q(`insert into schedule_exceptions (car_wash_id, kind, start_date, end_date, open_time, close_time) values ($1,'special_hours',lima_today(),lima_today(),'00:00','00:01')`, [id]);
  eq((await state(id)).state, hour >= 0 && lima.t > '00:01:00' ? 'closed' : 'open');
});

// ---- patrocinio ----
let reqId;
await test('patrocinio: un solo pedido abierto por local; el propietario lo cancela y repite', async () => {
  reqId = (await q(`select id from sponsorships where car_wash_id = $1 and status = 'requested'`, [SILLAR])).rows[0].id;
  await rejects(() => as('authenticated', O, () => q(`insert into sponsorships (car_wash_id, plan_code, requested_by) values ($1,'7_days',$2)`, [SILLAR, O])), /duplicate key/);
  eq((await as('authenticated', O, () => q(`delete from sponsorships where id = $1 returning id`, [reqId]))).rows.length, 1);
  reqId = (await as('authenticated', O, () => q(`insert into sponsorships (car_wash_id, plan_code, requested_by) values ($1,'30_days',$2) returning id`, [SILLAR, O]))).rows[0].id;
});
await test('patrocinio: el propietario no puede fijar fechas ni activar; el conductor no ve nada', async () => {
  await rejects(() => as('authenticated', O, () => q(`update sponsorships set status = 'active' where id = $1`, [reqId])), /permission denied/);
  await rejects(() => as('authenticated', O, () => q(`insert into sponsorships (car_wash_id, plan_code, requested_by, status) values ($1,'7_days',$2,'active')`, [ESPUMA, O])), /permission denied|row-level security/);
  eq((await as('authenticated', D1, () => q(`select id from sponsorships`))).rows.length, 0);
  eq((await as('authenticated', O, () => q(`select id from sponsorships`))).rows.length, 1);
});
await test('patrocinio: solo el admin activa; valida fechas y ubicaciones', async () => {
  await rejects(() => as('authenticated', O, () => q(`select admin_activate_sponsorship($1, lima_today(), lima_today()+30, true, true, 60, 'OP1')`, [reqId])), /Admin role required/);
  await rejects(() => as('authenticated', A, () => q(`select admin_activate_sponsorship($1, lima_today()+5, lima_today(), true, true, 60, 'OP1')`, [reqId])), /check constraint/);
  await rejects(() => as('authenticated', A, () => q(`select admin_activate_sponsorship($1, lima_today(), lima_today()+30, false, false, 60, 'OP1')`, [reqId])), /check constraint/);
  await as('authenticated', A, () => q(`select admin_activate_sponsorship($1, lima_today(), lima_today()+30, true, false, 60, 'OP1')`, [reqId]));
  const m = await as('anon', null, () => q(`select is_sponsored from car_wash_meta($1)`, [SILLAR]));
  eq(m.rows[0].is_sponsored, true);
  const l = await as('anon', null, () => q(`select name, sponsored_on_map, sponsored_in_list from car_washes_in_bounds($1,$2,$3,$4,'car') where name = 'Lavado Sillar Cayma'`, BBOX));
  eq([l.rows[0].sponsored_on_map, l.rows[0].sponsored_in_list], [true, false]);
});
await test('patrocinio: no se puede activar dos veces; el admin lo desactiva', async () => {
  await rejects(() => as('authenticated', A, () => q(`select admin_activate_sponsorship($1, lima_today(), lima_today()+30, true, true, 60, 'OP1')`, [reqId])), /not found or already handled/);
  await as('authenticated', A, () => q(`select admin_deactivate_sponsorship($1)`, [reqId]));
  const m = await as('anon', null, () => q(`select is_sponsored from car_wash_meta($1)`, [SILLAR]));
  eq(m.rows[0].is_sponsored, false);
});
await test('patrocinio vencido deja de mostrarse sin tareas programadas', async () => {
  await q(`update sponsorships set starts_on = lima_today()-10, ends_on = lima_today()-1 where car_wash_id = $1 and status = 'active'`, [ESPUMA]);
  const m = await as('anon', null, () => q(`select is_sponsored from car_wash_meta($1)`, [ESPUMA]));
  eq(m.rows[0].is_sponsored, false);
});

// ---- operaciones del modo propietario ----
const EXTERIOR = 'e0000000-0000-4000-8000-000000000101';

await test('propietario: horario semanal (insertar, actualizar, borrar) sin poder mover la clave', async () => {
  await as('authenticated', O, async () => {
    await q(`delete from opening_hours where car_wash_id = $1 and weekday = 7`, [SILLAR]);
    await q(`insert into opening_hours (car_wash_id, weekday, open_time, close_time) values ($1, 7, '10:00', '12:00')`, [SILLAR]);
    eq((await q(`update opening_hours set open_time = '09:00', close_time = '13:00' where car_wash_id = $1 and weekday = 7 returning weekday`, [SILLAR])).rows.length, 1);
  });
  await rejects(() => as('authenticated', O, () => q(`update opening_hours set weekday = 3 where car_wash_id = $1 and weekday = 7`, [SILLAR])), /permission denied/);
  eq((await as('authenticated', D1, () => q(`delete from opening_hours where car_wash_id = $1 returning weekday`, [SILLAR]))).rows.length, 0);
});

await test('propietario: precios por vehículo (actualizar precio, borrar e insertar) sin cambiar el tipo', async () => {
  await as('authenticated', O, async () => {
    eq((await q(`update service_prices set price = 16 where service_id = $1 and vehicle_type = 'car' returning price`, [EXTERIOR])).rows.length, 1);
    await q(`delete from service_prices where service_id = $1 and vehicle_type = 'motorcycle'`, [EXTERIOR]);
    await q(`insert into service_prices (service_id, vehicle_type, price) values ($1, 'motorcycle', 11)`, [EXTERIOR]);
  });
  await rejects(() => as('authenticated', O, () => q(`update service_prices set vehicle_type = 'suv' where service_id = $1 and vehicle_type = 'car'`, [EXTERIOR])), /permission denied/);
  eq((await as('authenticated', D1, () => q(`update service_prices set price = 1 where service_id = $1 returning price`, [EXTERIOR]))).rows.length, 0);
});

await test('propietario: reordenar y borrar fotos de su local; otros no pueden', async () => {
  const photos = (await q(`select id from car_wash_photos where car_wash_id = $1 order by position`, [SILLAR])).rows;
  eq(photos.length, 10, 'fotos previas');
  eq((await as('authenticated', D1, () => q(`delete from car_wash_photos where id = $1 returning id`, [photos[0].id]))).rows.length, 0);
  await rejects(() => as('authenticated', O, () => q(`update car_wash_photos set storage_path = 'otro/x.jpg' where id = $1`, [photos[0].id])), /permission denied/);
  eq((await as('authenticated', O, () => q(`update car_wash_photos set position = 99 where id = $1 returning id`, [photos[0].id]))).rows.length, 1);
  eq((await as('authenticated', O, () => q(`delete from car_wash_photos where id = $1 returning id`, [photos[0].id]))).rows.length, 1);
});

await test('propietario: edita y borra excepciones de horario de su local; otros no', async () => {
  const exceptionId = (await q(`select id from schedule_exceptions where car_wash_id = $1 order by start_date limit 1`, [SILLAR])).rows[0].id;
  eq((await as('authenticated', D1, () => q(`update schedule_exceptions set reason = 'x' where id = $1 returning id`, [exceptionId]))).rows.length, 0);
  eq((await as('authenticated', O, () => q(`update schedule_exceptions set reason = 'Nuevo motivo' where id = $1 returning id`, [exceptionId]))).rows.length, 1);
  eq((await as('authenticated', O, () => q(`delete from schedule_exceptions where id = $1 returning id`, [exceptionId]))).rows.length, 1);
});

await test('propietario: crea, edita y finaliza una promoción; las finalizadas ya no son públicas', async () => {
  const promo = (await as('authenticated', O, () => q(`insert into promotions (car_wash_id, title, start_date, end_date) values ($1, 'Prueba', lima_today(), lima_today() + 3) returning id`, [SILLAR]))).rows[0].id;
  eq((await as('anon', null, () => q(`select id from promotions where id = $1`, [promo]))).rows.length, 1);
  eq((await as('authenticated', O, () => q(`update promotions set title = 'Prueba 2' where id = $1 returning id`, [promo]))).rows.length, 1);
  await as('authenticated', O, () => q(`update promotions set ended_at = now() where id = $1`, [promo]));
  eq((await as('anon', null, () => q(`select id from promotions where id = $1`, [promo]))).rows.length, 0);
  eq((await as('authenticated', O, () => q(`select id from promotions where id = $1`, [promo]))).rows.length, 1);
});

// ---- Storage ----
await test('storage: el propietario sube a la carpeta de su local; no a otras ni a rutas raras', async () => {
  await as('authenticated', O, () => q(`insert into storage.objects (bucket_id, name) values ('car-wash-photos', $1)`, [`${SILLAR}/a.jpg`]));
  await rejects(() => as('authenticated', O, () => q(`insert into storage.objects (bucket_id, name) values ('car-wash-photos', $1)`, [`${ESPUMA}/a.jpg`])), /row-level security/);
  await rejects(() => as('authenticated', O, () => q(`insert into storage.objects (bucket_id, name) values ('car-wash-photos', 'cualquiera/a.jpg')`)), /row-level security/);
  await rejects(() => as('authenticated', D1, () => q(`insert into storage.objects (bucket_id, name) values ('car-wash-photos', $1)`, [`${SILLAR}/b.jpg`])), /row-level security/);
  eq((await as('anon', null, () => q(`select id from storage.objects`))).rows.length, 1);
});

// ---- solicitudes de acceso ----
await test('solicitud de acceso: cualquiera envía, solo el admin lee', async () => {
  await as('anon', null, () => q(`insert into owner_access_requests (business_name, contact_name, phone) values ('Lavado Nuevo','Rosa Huaman','987654321')`));
  await rejects(() => as('anon', null, () => q(`insert into owner_access_requests (business_name, contact_name, phone) values ('X','Y','1')`)), /check constraint/);
  await rejects(() => as('anon', null, () => q(`select * from owner_access_requests`)), /permission denied/);
  eq((await as('authenticated', D1, () => q(`select id from owner_access_requests`))).rows.length, 0);
  eq((await as('authenticated', A, () => q(`select id from owner_access_requests`))).rows.length, 1);
  eq((await as('authenticated', A, () => q(`update owner_access_requests set status = 'approved', handled_by = $1, handled_at = now() returning id`, [A]))).rows.length, 1);
  eq((await as('authenticated', D1, () => q(`update owner_access_requests set status = 'approved' returning id`))).rows.length, 0);
});

// ---- utilidades ----
await test('format_public_name', async () => {
  const r = await q(`select format_public_name('Carla Mendoza Ríos') a, format_public_name('  pedro  ') b, format_public_name(null) c, format_public_name('juan perez') d, format_public_name('') e`);
  eq(Object.values(r.rows[0]), ['Carla M.', 'pedro', 'Usuario', 'juan P.', 'Usuario']);
});

console.log(`\n${passed} pasaron, ${failed} fallaron`);
if (failed) { console.log('Fallidas:\n - ' + failures.join('\n - ')); process.exit(1); }
