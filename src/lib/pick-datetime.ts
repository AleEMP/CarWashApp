import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

function open(mode: 'date' | 'time', value: Date, minimumDate?: Date): Promise<Date | null> {
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value,
      mode,
      minimumDate,
      is24Hour: false,
      onChange: (event, selected) => resolve(event.type === 'set' && selected ? selected : null),
    });
  });
}

/** Abre el calendario nativo; devuelve null si se cancela. */
export function pickDate(value: Date, minimumDate?: Date): Promise<Date | null> {
  return open('date', value, minimumDate);
}

/** Abre el reloj nativo; devuelve null si se cancela. */
export function pickTime(value: Date): Promise<Date | null> {
  return open('time', value);
}

const pad = (value: number) => String(value).padStart(2, '0');

/** "2026-10-31" -> Date (a mediodía, para que ninguna zona horaria cambie el día). */
export function isoToDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function dateToIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "19:00:00" -> Date de hoy con esa hora. */
export function timeToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function dateToTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}
