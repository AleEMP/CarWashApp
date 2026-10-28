# Base de datos (Supabase)

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `migrations/20261027000001_schema.sql` | Tablas, datos de referencia (distritos, tipos de vehículo, comodidades, planes), funciones de horario y triggers |
| `migrations/20261027000002_security.sql` | Permisos por columna, políticas RLS y bucket de fotos |
| `migrations/20261027000003_functions.sql` | Funciones de la API: mapa por área visible, metadatos del local y acciones de administración |
| `seed.sql` | Locales de ejemplo de los mockups. Solo para desarrollo |
| `tests/` | Pruebas de RLS, triggers y funciones (`npm run test:db`) |

## Aplicarlo en un proyecto de Supabase

1. En el panel de Supabase abre **SQL Editor**.
2. Pega y ejecuta, **en este orden**, los tres archivos de `migrations/`.
3. Opcional, solo en desarrollo: ejecuta `seed.sql` para tener locales de prueba.

PostGIS y `btree_gist` se activan dentro de la migración 1; no hace falta hacerlo a mano.

## Crear el primer administrador

Un administrador no se puede crear desde la app. Primero inicia sesión una vez en la app (o crea el usuario en **Authentication → Users**) y luego ejecuta en el SQL Editor:

```sql
update profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
```

A partir de ahí, el administrador asigna propietarios desde la app con `admin_assign_owner(local, usuario)`, que también convierte a ese usuario en propietario.

## Probar el modo propietario sin administrador

`admin_assign_owner` exige una sesión de administrador, así que para probar a mano desde el SQL Editor (que corre como superusuario) asígnate un local directamente:

```sql
update profiles set role = 'owner' where email = 'tu-correo@ejemplo.com';
update car_washes set owner_id = (select id from profiles where email = 'tu-correo@ejemplo.com')
where id = 'c0000000-0000-4000-8000-000000000001'; -- Lavado Sillar (seed)
```

Después cierra la sesión y vuelve a entrar en la app para que aparezca la pestaña «Mi negocio».

## Modelo en breve

- **Roles:** `driver` (conductor), `owner` (propietario), `admin` (administrador). El rol vive en `profiles.role` y solo lo cambian las funciones de administración.
- **Locales:** `car_washes`. Solo se ven al público si `status = 'verified'`. Los clientes escriben `lat` y `lng`; `location` (PostGIS) se calcula sola.
- **Calificación:** `rating_avg` y `rating_count` se recalculan con un trigger y solo cuentan reseñas visibles.
- **Reseñas:** una por usuario y local. El nombre público («Carla M.») se fija en el servidor. Ocultar una reseña la conserva, pero deja de verse.
- **Horarios:** semanal (`opening_hours`, 1 = lunes … 7 = domingo) más excepciones (`schedule_exceptions`). Todo se evalúa con hora de Lima.
- **Patrocinio:** el propietario solicita (`sponsorships`), el administrador activa con las fechas y el pago. Un patrocinio vencido deja de mostrarse solo, sin tareas programadas. Los datos de pago nunca son visibles al público.
- **Precios de los planes:** `sponsorship_plans.price` está vacío; defínelos con `update sponsorship_plans set price = … where code = '7_days'`.

## Funciones que usará la app

| Función | Uso |
| --- | --- |
| `car_washes_in_bounds(min_lng, min_lat, max_lng, max_lat, vehículo, ref_lng, ref_lat, límite)` | Mapa y lista: locales del área visible con precio «desde», promoción, patrocinio y estado de apertura |
| `car_wash_meta(id)` | Patrocinio y estado de apertura en el perfil del local |
| `review_distribution(id)` | Barras de 5 a 1 estrellas |
| `admin_*` | Estado del local, propietario, rol, patrocinios y moderación |

Lo demás (servicios, precios, fotos, horarios, promociones, reseñas) se lee y escribe con las tablas directamente; las políticas RLS deciden quién puede qué.

## Pruebas

```bash
npm run test:db
```

Ejecuta las migraciones y el seed en un Postgres embebido (PGlite con PostGIS) y comprueba 60 casos: permisos por rol, RLS, escalada de privilegios, triggers, horarios, patrocinio y Storage. Simula `auth` y `storage` de Supabase, así que es una buena red de seguridad, pero no reemplaza probar contra el proyecto real.
