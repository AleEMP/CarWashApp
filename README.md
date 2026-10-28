# CarWash AQP

App Android para **encontrar y comparar centros de lavado de vehículos en Arequipa**. Muestra en un mapa los lavaderos de la zona con su precio según el tipo de vehículo, abre su perfil con servicios, horarios y reseñas, y permite a cada propietario administrar su propio local. Zona inicial: Cayma, Yanahuara y Cercado.

Es un MVP: sirve para validar la idea con un grupo pequeño de locales verificados y un primer modelo de monetización (visibilidad patrocinada).

## Qué hace

**Conductor** (con o sin cuenta)
- Mapa con pines de precio, filtrado por tipo de vehículo (auto, SUV, camioneta, moto), y una lista equivalente.
- Perfil del local: servicios y precios por vehículo, información y horario, cierres temporales, comodidades, promociones vigentes y reseñas.
- «Cómo llegar» con la app de mapas del teléfono.
- Reseñas de 1 a 5 estrellas con comentario (una por local, editable) y reporte de reseñas inapropiadas. Para reseñar se necesita cuenta; explorar no.
- Si la zona del usuario aún no tiene locales, la app lo avisa y le muestra el Cercado.

**Propietario** (pestaña «Mi negocio»)
- Información del local, ubicación (se fija moviendo el mapa bajo un pin), fotos (se comprimen antes de subirse; máximo 10) y comodidades.
- Servicios con un precio por tipo de vehículo.
- Horario semanal, cierres temporales y horarios especiales.
- Promociones con vigencia (informativas, no calculan descuentos).
- Solicitud de patrocinio: marcador destacado en el mapa y primeros lugares en la lista, siempre con la etiqueta «Patrocinado».

**Administrador** (pestaña «Admin»)
- Lista de locales con contadores, búsqueda y filtros; cambia el estado de un local (por verificar, verificado u oculto), le asigna propietario por correo y registra locales nuevos.
- Patrocinios: activa una solicitud tras recibir el pago por Yape (fechas, monto y n.º de operación) y puede desactivarla.
- Moderación: revisa las reseñas reportadas y decide ocultarlas o mantenerlas.

El pago del patrocinio se coordina fuera de la app: no hay pasarela de pago en esta etapa.

## Tecnología

- [Expo](https://expo.dev) SDK 58, React Native 0.88, React 19 y TypeScript.
- Navegación con [Expo Router](https://docs.expo.dev/router/introduction/) (rutas en `src/app`).
- [Supabase](https://supabase.com): Postgres con PostGIS, autenticación por correo, Storage para las fotos y políticas RLS por rol. No hay servidor propio ni Edge Functions.
- Mapa con `react-native-maps` (Google Maps), ubicación con `expo-location`.

## Estructura

```
src/
  app/         pantallas (cada archivo es una ruta)
    (tabs)/      Explorar, Mis reseñas, Mi negocio, Admin y Cuenta
    acceso/      ingreso y registro
    gestion/     pantallas del propietario
    administracion/   registro de locales (administrador)
    local/ resena/    perfil del local y escribir reseña
  components/  piezas de interfaz (ui, explore, local, owner, admin)
  lib/         acceso a datos y utilidades (Supabase, formatos, fechas)
  providers/   sesión, ubicación y búsqueda
  theme.ts     colores, tipografías y espaciados
supabase/
  migrations/  esquema, seguridad (RLS) y funciones de la API
  seed.sql     locales de ejemplo para desarrollo
  tests/       pruebas de la base de datos
```

## Puesta en marcha

Necesitas Node.js (LTS), un celular Android con [Expo Go](https://expo.dev/go) y un proyecto de Supabase.

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. **Base de datos.** En el SQL Editor de tu proyecto de Supabase ejecuta, en orden, los tres archivos de `supabase/migrations/`. Opcionalmente ejecuta `supabase/seed.sql` para tener locales de ejemplo. El detalle está en [supabase/README.md](supabase/README.md).

3. **Autenticación.** En Supabase, en *Authentication → Sign In / Providers*, comprueba que el proveedor **Email** esté activado. Para desarrollo conviene desactivar *Confirm email*: así las cuentas entran al instante, sin esperar un correo.

4. **Variables de entorno.** Copia `.env.example` como `.env` y completa la URL y la *publishable key* de tu proyecto (Supabase → botón *Connect*). Usa solo la clave que empieza con `sb_publishable_`: la protección de los datos la dan las políticas RLS, y la *secret key* nunca debe ir en la app ni en el repositorio.

5. Arranca la app y abre el código QR con Expo Go:

   ```bash
   npx expo start
   ```

   Si tu red no deja que el celular llegue al PC, conéctalo por cable USB. En Windows PowerShell:

   ```powershell
   $env:REACT_NATIVE_PACKAGER_HOSTNAME = 'localhost'
   npx expo start
   adb reverse tcp:8081 tcp:8081
   ```

   y abre `exp://localhost:8081` en Expo Go.

Expo Go muestra el mapa de Google sin configuración. Para una versión instalable (APK) hará falta una clave de Google Maps propia.

### Crear un administrador

Un administrador no se puede crear desde la app. Crea tu cuenta en la app y luego ejecuta en el SQL Editor:

```sql
update profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
```

Cierra sesión y vuelve a entrar: aparece la pestaña «Admin». Desde ahí se registran locales y se asignan propietarios.

## Calidad

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run test:db     # pruebas de la base de datos (RLS, triggers, funciones)
```

`test:db` corre las migraciones en un Postgres embebido (PGlite con PostGIS), sin necesitar tu proyecto de Supabase.

## Estado y pendientes

Implementado: los tres modos (conductor, propietario y administrador) con datos reales de Supabase.

Pendiente:
- Ingreso con Google y recuperación de contraseña (hoy se ingresa con correo y contraseña).
- La pestaña «Mis reseñas» es provisional.
- Precios de los planes de patrocinio (`sponsorship_plans.price` está vacío; se definen con un `update`).
- Versión instalable (APK) con su clave de Google Maps.

Fuera del alcance del MVP: panel web, pagos en línea, notificaciones push, iOS.
