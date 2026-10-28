import type { CarWashDetail, Promotion } from '@/lib/car-wash-detail';
import { daysFromToday, limaTodayIso } from '@/lib/format';

export type PromotionState = 'active' | 'scheduled' | 'ended';

/** Vigente = hoy está dentro de sus fechas; programada = empieza después; finalizada = cerrada a mano o ya vencida. */
export function promotionState(promotion: Pick<Promotion, 'start_date' | 'end_date' | 'ended_at'>): PromotionState {
  const today = limaTodayIso();
  if (promotion.ended_at || promotion.end_date < today) return 'ended';
  if (promotion.start_date > today) return 'scheduled';
  return 'active';
}

/** Tipos de vehículo para los que el local publica al menos un precio. */
export function countVehicleTypes(detail: CarWashDetail): number {
  const types = new Set<string>();
  for (const service of detail.services) {
    for (const price of service.service_prices) types.add(price.vehicle_type);
  }
  return types.size;
}

/** Primer cierre u horario especial en las próximas dos semanas, para avisarlo en el panel. */
export function nextScheduleChange(detail: CarWashDetail) {
  return detail.exceptions.find((e) => daysFromToday(e.end_date) >= 0 && daysFromToday(e.start_date) <= 14) ?? null;
}
