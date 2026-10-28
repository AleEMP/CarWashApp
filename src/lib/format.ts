import type { CarWashPin } from '@/lib/car-washes';

export function formatDistance(meters: number | null): string | null {
  if (meters === null) return null;
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatPrice(price: number): string {
  return `S/ ${Number.isInteger(price) ? price : price.toFixed(2)}`;
}

/** "19:00:00" -> "7:00 p. m." */
export function formatClock(time: string | null): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'p. m.' : 'a. m.';
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/** 25 -> "25 min", 90 -> "1 h 30 min", 180 -> "3 h" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function plural(count: number, one: string, many: string): string {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

// --- Fechas: Arequipa no tiene horario de verano, siempre UTC-5 ---

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function limaTodayUtc(): number {
  const now = new Date(Date.now() - LIMA_OFFSET_MS);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function parseIsoDay(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Fecha de hoy en Lima como "2026-10-27". */
export function limaTodayIso(): string {
  return new Date(limaTodayUtc()).toISOString().slice(0, 10);
}

/** "2026-10-28" + 29 -> "2026-11-26" */
export function addDays(iso: string, days: number): string {
  return new Date(parseIsoDay(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Días desde hoy (Lima) hasta una fecha "YYYY-MM-DD"; negativo si ya pasó. */
export function daysFromToday(iso: string): number {
  return Math.round((parseIsoDay(iso) - limaTodayUtc()) / DAY_MS);
}

/** Día de la semana de hoy en Lima: 1 = lunes … 7 = domingo (como `opening_hours.weekday`). */
export function limaIsoWeekday(): number {
  const day = new Date(limaTodayUtc()).getUTCDay();
  return day === 0 ? 7 : day;
}

export function weekdayName(isoWeekday: number): string {
  const name = WEEKDAYS[isoWeekday % 7];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** "2026-10-08" -> "jueves 8 de octubre" */
export function formatDay(iso: string): string {
  const date = new Date(parseIsoDay(iso));
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} de ${MONTHS[date.getUTCMonth()]}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Un día -> "Jueves 8 de octubre"; varios -> "Del 24 al 26 de diciembre". */
export function formatDateRange(start: string, end: string): string {
  if (start === end) return capitalize(formatDay(start));
  const from = new Date(parseIsoDay(start));
  const to = new Date(parseIsoDay(end));
  if (from.getUTCMonth() === to.getUTCMonth()) {
    return `Del ${from.getUTCDate()} al ${to.getUTCDate()} de ${MONTHS[to.getUTCMonth()]}`;
  }
  return `Del ${from.getUTCDate()} de ${MONTHS[from.getUTCMonth()]} al ${to.getUTCDate()} de ${MONTHS[to.getUTCMonth()]}`;
}

/** "2026-10-31" -> "31 oct" */
export function formatShortDay(iso: string): string {
  const date = new Date(parseIsoDay(iso));
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()].slice(0, 3)}`;
}

/** "2026-10-28" -> "mié 28 oct" */
export function formatDayShort(iso: string): string {
  const weekday = WEEKDAYS[new Date(parseIsoDay(iso)).getUTCDay()].slice(0, 3);
  return `${weekday} ${formatShortDay(iso)}`;
}

/** "2026-10-01" -> "1 oct 2026" */
export function formatShortDayYear(iso: string): string {
  return `${formatShortDay(iso)} ${iso.slice(0, 4)}`;
}

/** Marca de tiempo -> "hoy, 10:24 a. m.", "ayer, 4:05 p. m." o "28 oct, 10:24 a. m." (hora de Lima). */
export function formatTimestamp(timestamp: string): string {
  const lima = new Date(new Date(timestamp).getTime() - LIMA_OFFSET_MS);
  const day = lima.toISOString().slice(0, 10);
  const clock = formatClock(`${lima.getUTCHours()}:${lima.getUTCMinutes()}`);
  const diff = daysFromToday(day);
  if (diff === 0) return `hoy, ${clock}`;
  if (diff === -1) return `ayer, ${clock}`;
  return `${formatShortDay(day)}, ${clock}`;
}

/** Misma fecha -> "31 oct"; mismo mes -> "1 – 31 oct"; si no -> "30 oct – 2 nov". */
export function formatShortRange(start: string, end: string): string {
  if (start === end) return formatShortDay(start);
  const from = new Date(parseIsoDay(start));
  const to = new Date(parseIsoDay(end));
  if (from.getUTCMonth() === to.getUTCMonth()) {
    return `${from.getUTCDate()} – ${formatShortDay(end)}`;
  }
  return `${formatShortDay(start)} – ${formatShortDay(end)}`;
}

/** "2026-10-31" -> "Hasta el 31 de octubre" */
export function formatUntil(iso: string): string {
  const date = new Date(parseIsoDay(iso));
  return `Hasta el ${date.getUTCDate()} de ${MONTHS[date.getUTCMonth()]}`;
}

/** "2026-10-30" -> "mañana" o "el viernes" */
function describeDay(iso: string): string {
  return daysFromToday(iso) === 1 ? 'mañana' : `el ${WEEKDAYS[new Date(parseIsoDay(iso)).getUTCDay()]}`;
}

/** Marca de tiempo -> "hace 2 días" */
export function relativeTime(timestamp: string): string {
  const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${plural(days, 'día', 'días')}`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `hace ${plural(weeks, 'semana', 'semanas')}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${plural(months, 'mes', 'meses')}`;
  return `hace ${plural(Math.floor(days / 365), 'año', 'años')}`;
}

/** ¿La marca de tiempo es de hoy (hora de Lima)? */
export function isToday(timestamp: string): boolean {
  return new Date(new Date(timestamp).getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 10) === limaTodayIso();
}

/** "Carla M." -> "CM" */
export function initials(name: string): string {
  const parts = name.replace(/\./g, '').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

const AVATAR_COLORS = [
  { background: '#F3D9C9', color: '#7A3E1F' },
  { background: '#E3E0EC', color: '#453C63' },
  { background: '#D9E8DD', color: '#1F5A36' },
  { background: '#F6E3BF', color: '#6A4500' },
  { background: '#D6E4F2', color: '#0B4A80' },
];

/** Cada nombre siempre recibe el mismo color de avatar. */
export function avatarColors(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// --- Estado de apertura ---

export type OpenTone = 'success' | 'warning' | 'danger';

export type OpenStatus = {
  label: string;
  detail: string | null;
  tone: OpenTone;
  /** El pin del mapa solo muestra el precio si el local atiende ahora. */
  isOpenNow: boolean;
};

export type OpenFields = Pick<
  CarWashPin,
  'open_state' | 'today_open' | 'today_close' | 'next_open_date' | 'next_open_time'
>;

export function openStatus(pin: OpenFields): OpenStatus {
  const nextOpening =
    pin.next_open_date && pin.next_open_time
      ? `abre ${describeDay(pin.next_open_date)} a las ${formatClock(pin.next_open_time)}`
      : null;

  switch (pin.open_state) {
    case 'open':
      return { label: 'Abierto', detail: `cierra a las ${formatClock(pin.today_close)}`, tone: 'success', isOpenNow: true };
    case 'closing_soon':
      return { label: 'Cierra pronto', detail: `a las ${formatClock(pin.today_close)}`, tone: 'warning', isOpenNow: true };
    case 'opens_later':
      return { label: 'Cerrado', detail: `abre hoy a las ${formatClock(pin.today_open)}`, tone: 'danger', isOpenNow: false };
    case 'closed':
      return { label: 'Cerrado', detail: nextOpening, tone: 'danger', isOpenNow: false };
    case 'closed_today':
      return { label: 'Cerrado hoy', detail: nextOpening, tone: 'danger', isOpenNow: false };
  }
}
