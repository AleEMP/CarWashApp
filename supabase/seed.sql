-- CarWash AQP · datos de ejemplo para desarrollo
-- Son los locales que aparecen en los mockups, con direcciones y coordenadas aproximadas.
-- NO es información real: reemplázalos por los locales verificados antes de publicar.
-- No incluye usuarios ni reseñas porque dependen de cuentas reales de Supabase Auth.

set search_path = public, extensions;

-- Locales
insert into car_washes (id, name, address, district_id, reference, lat, lng, status) values
  ('c0000000-0000-4000-8000-000000000001', 'Lavado Sillar', 'Av. Ejército 1024', (select id from districts where name = 'Cayma'), 'A media cuadra del grifo, frente al parque.', -16.3871, -71.5462, 'verified'),
  ('c0000000-0000-4000-8000-000000000002', 'Espuma Express', 'Av. Cayma 305', (select id from districts where name = 'Cayma'), null, -16.3822, -71.5405, 'verified'),
  ('c0000000-0000-4000-8000-000000000003', 'AutoSpa Yanahuara', 'Av. Ejército 740', (select id from districts where name = 'Yanahuara'), null, -16.3924, -71.5438, 'verified'),
  ('c0000000-0000-4000-8000-000000000004', 'Lavadero Don Mateo', 'Calle Misti 118', (select id from districts where name = 'Yanahuara'), null, -16.3948, -71.5495, 'verified'),
  ('c0000000-0000-4000-8000-000000000005', 'Brillo Total', 'Av. Parra 420', (select id from districts where name = 'Cercado'), null, -16.4062, -71.5312, 'verified'),
  ('c0000000-0000-4000-8000-000000000006', 'Sillar Express', 'Calle Los Pinos 60', (select id from districts where name = 'Sachaca'), null, -16.4152, -71.5621, 'pending');

-- Comodidades
insert into car_wash_amenities (car_wash_id, amenity_code) values
  ('c0000000-0000-4000-8000-000000000001', 'waiting_room'),
  ('c0000000-0000-4000-8000-000000000001', 'wifi'),
  ('c0000000-0000-4000-8000-000000000001', 'yape'),
  ('c0000000-0000-4000-8000-000000000001', 'card'),
  ('c0000000-0000-4000-8000-000000000001', 'parking'),
  ('c0000000-0000-4000-8000-000000000002', 'yape'),
  ('c0000000-0000-4000-8000-000000000002', 'waiting_room'),
  ('c0000000-0000-4000-8000-000000000003', 'wifi'),
  ('c0000000-0000-4000-8000-000000000003', 'card'),
  ('c0000000-0000-4000-8000-000000000003', 'cafe'),
  ('c0000000-0000-4000-8000-000000000004', 'yape'),
  ('c0000000-0000-4000-8000-000000000005', 'yape'),
  ('c0000000-0000-4000-8000-000000000005', 'card'),
  ('c0000000-0000-4000-8000-000000000005', 'restroom');

-- Horarios semanales (1 = lunes … 7 = domingo)
insert into opening_hours (car_wash_id, weekday, open_time, close_time)
select v.car_wash_id, d, v.open_time, v.close_time
from (values
  ('c0000000-0000-4000-8000-000000000001'::uuid, 1, 5, '08:00'::time, '19:00'::time),
  ('c0000000-0000-4000-8000-000000000001', 6, 6, '08:00', '18:00'),
  ('c0000000-0000-4000-8000-000000000001', 7, 7, '09:00', '13:00'),
  ('c0000000-0000-4000-8000-000000000002', 1, 6, '08:00', '20:00'),
  ('c0000000-0000-4000-8000-000000000003', 1, 7, '08:00', '20:00'),
  ('c0000000-0000-4000-8000-000000000004', 1, 6, '08:00', '18:30'),
  ('c0000000-0000-4000-8000-000000000005', 1, 6, '08:00', '18:30')
) as v(car_wash_id, first_day, last_day, open_time, close_time)
cross join lateral generate_series(v.first_day, v.last_day) as d;

-- Excepciones de Lavado Sillar (fechas relativas a hoy para que siempre sean futuras)
insert into schedule_exceptions (car_wash_id, kind, start_date, end_date, open_time, close_time, reason) values
  ('c0000000-0000-4000-8000-000000000001', 'closed', lima_today() + 8, lima_today() + 8, null, null, 'Mantenimiento de equipos'),
  ('c0000000-0000-4000-8000-000000000001', 'special_hours', lima_today() + 24, lima_today() + 24, '08:00', '13:00', null),
  ('c0000000-0000-4000-8000-000000000001', 'closed', lima_today() + 60, lima_today() + 62, null, null, 'Vacaciones del personal');

-- Servicios
insert into services (id, car_wash_id, name, description, duration_minutes, position) values
  ('e0000000-0000-4000-8000-000000000101', 'c0000000-0000-4000-8000-000000000001', 'Lavado exterior', 'Carrocería, aros y secado a mano.', 25, 1),
  ('e0000000-0000-4000-8000-000000000102', 'c0000000-0000-4000-8000-000000000001', 'Lavado completo', 'Exterior, aspirado de interiores y limpieza de tablero.', 45, 2),
  ('e0000000-0000-4000-8000-000000000103', 'c0000000-0000-4000-8000-000000000001', 'Encerado a mano', 'Cera en pasta y pulido ligero de la carrocería.', 40, 3),
  ('e0000000-0000-4000-8000-000000000104', 'c0000000-0000-4000-8000-000000000001', 'Lavado de salón', 'Tapiz, alfombras y techo con máquina de inyección.', 180, 4),
  ('e0000000-0000-4000-8000-000000000105', 'c0000000-0000-4000-8000-000000000001', 'Lavado de motor', 'Desengrasado y secado del compartimiento del motor.', null, 5),
  ('e0000000-0000-4000-8000-000000000201', 'c0000000-0000-4000-8000-000000000002', 'Lavado exterior', null, 20, 1),
  ('e0000000-0000-4000-8000-000000000202', 'c0000000-0000-4000-8000-000000000002', 'Lavado completo', null, 40, 2),
  ('e0000000-0000-4000-8000-000000000301', 'c0000000-0000-4000-8000-000000000003', 'Lavado exterior', null, 30, 1),
  ('e0000000-0000-4000-8000-000000000302', 'c0000000-0000-4000-8000-000000000003', 'Lavado completo', null, 60, 2),
  ('e0000000-0000-4000-8000-000000000303', 'c0000000-0000-4000-8000-000000000003', 'Encerado', 'Cera y brillo.', 50, 3),
  ('e0000000-0000-4000-8000-000000000401', 'c0000000-0000-4000-8000-000000000004', 'Lavado exterior', null, 25, 1),
  ('e0000000-0000-4000-8000-000000000402', 'c0000000-0000-4000-8000-000000000004', 'Lavado completo', null, 45, 2),
  ('e0000000-0000-4000-8000-000000000501', 'c0000000-0000-4000-8000-000000000005', 'Lavado exterior', null, 25, 1),
  ('e0000000-0000-4000-8000-000000000502', 'c0000000-0000-4000-8000-000000000005', 'Lavado completo', null, 50, 2);

-- Precios en soles por tipo de vehículo (null = el local no lo ofrece)
insert into service_prices (service_id, vehicle_type, price)
select v.service_id, t.vehicle_type, t.price
from (values
  ('e0000000-0000-4000-8000-000000000101'::uuid, 15, 20, 25, 10),
  ('e0000000-0000-4000-8000-000000000102', 25, 30, 35, 18),
  ('e0000000-0000-4000-8000-000000000103', 35, 40, 45, null),
  ('e0000000-0000-4000-8000-000000000104', 90, 110, 120, null),
  ('e0000000-0000-4000-8000-000000000105', 20, 25, 30, null),
  ('e0000000-0000-4000-8000-000000000201', 12, 16, 20, 8),
  ('e0000000-0000-4000-8000-000000000202', 22, 28, 32, null),
  ('e0000000-0000-4000-8000-000000000301', 20, 25, 30, 12),
  ('e0000000-0000-4000-8000-000000000302', 35, 42, 48, null),
  ('e0000000-0000-4000-8000-000000000303', 55, 65, 75, null),
  ('e0000000-0000-4000-8000-000000000401', 10, 14, 18, 6),
  ('e0000000-0000-4000-8000-000000000402', 20, 26, 30, null),
  ('e0000000-0000-4000-8000-000000000501', 14, 18, 22, 9),
  ('e0000000-0000-4000-8000-000000000502', 28, 34, 40, null)
) as v(service_id, car, suv, pickup, motorcycle)
cross join lateral (values
  ('car', v.car),
  ('suv', v.suv),
  ('pickup', v.pickup),
  ('motorcycle', v.motorcycle)
) as t(vehicle_type, price)
where t.price is not null;

-- Promociones de Lavado Sillar: dos vigentes y una programada
insert into promotions (car_wash_id, service_id, title, description, start_date, end_date) values
  ('c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000102', '20% en lavado completo', 'Martes y miércoles, para todos los vehículos.', lima_today() - 6, lima_today() + 24),
  ('c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000103', 'Aspirado gratis con encerado', 'Todos los días, al contratar el encerado a mano.', lima_today() - 3, lima_today() + 11),
  ('c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000103', 'Encerado a mitad de precio', 'Solo los sábados del mes.', lima_today() + 10, lima_today() + 31);

-- Patrocinio: Espuma Express activo y una solicitud de Lavado Sillar esperando pago
insert into sponsorships (car_wash_id, plan_code, status, starts_on, ends_on, show_on_map, show_in_list, payment_method, amount, operation_number, activated_at) values
  ('c0000000-0000-4000-8000-000000000002', '7_days', 'active', lima_today() - 2, lima_today() + 5, true, true, 'yape', 0, 'DEMO-0001', now());
insert into sponsorships (car_wash_id, plan_code) values
  ('c0000000-0000-4000-8000-000000000001', '30_days');
