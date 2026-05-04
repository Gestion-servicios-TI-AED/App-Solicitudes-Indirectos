// Festivos Colombia calculados dinámicamente
// Ley Emiliani: algunos festivos se mueven al lunes siguiente

const TIMEZONE = "America/Bogota";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Calcula Semana Santa (Domingo de Pascua) con algoritmo de Butcher
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Traslado al lunes siguiente (Ley Emiliani)
function nextMonday(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay(); // 0=sun, 1=mon
  if (dow === 1) return d;
  const diff = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getHolidaysCO(year: number): Set<string> {
  const holidays = new Set<string>();
  const add = (d: Date) => holidays.add(toKey(d));

  // Festivos fijos
  add(new Date(year, 0, 1));   // Año Nuevo
  add(new Date(year, 4, 1));   // Día del Trabajo
  add(new Date(year, 6, 20));  // Independencia
  add(new Date(year, 7, 7));   // Batalla de Boyacá
  add(new Date(year, 11, 8));  // Inmaculada Concepción
  add(new Date(year, 11, 25)); // Navidad

  // Festivos Ley Emiliani (traslado a lunes)
  add(nextMonday(new Date(year, 0, 6)));   // Reyes Magos
  add(nextMonday(new Date(year, 2, 19)));  // San José
  add(nextMonday(new Date(year, 5, 29)));  // San Pedro y San Pablo
  add(nextMonday(new Date(year, 7, 15)));  // Asunción de la Virgen
  add(nextMonday(new Date(year, 9, 12)));  // Día de la Raza
  add(nextMonday(new Date(year, 10, 1)));  // Todos los Santos
  add(nextMonday(new Date(year, 10, 11))); // Independencia de Cartagena

  // Semana Santa
  const easter = easterSunday(year);
  add(addDays(easter, -3)); // Jueves Santo
  add(addDays(easter, -2)); // Viernes Santo

  // Festivos relativos a Pascua (Ley Emiliani)
  add(nextMonday(addDays(easter, 39)));  // Ascensión del Señor
  add(nextMonday(addDays(easter, 60)));  // Corpus Christi
  add(nextMonday(addDays(easter, 68)));  // Sagrado Corazón

  return holidays;
}

export function isBusinessDay(date: Date, holidays: Set<string>): boolean {
  const dow = date.getDay();
  if (dow === 0) return false; // domingo
  const key = toKey(date);
  return !holidays.has(key);
}

/**
 * Calcula la fecha mínima de inicio sumando N días hábiles desde hoy.
 * Excluye domingos y festivos de Colombia.
 */
export function addBusinessDays(from: Date, days: number): Date {
  const years = new Set<number>();
  years.add(from.getFullYear());

  const result = new Date(from);
  let added = 0;
  const holidays13 = getHolidaysCO(from.getFullYear());

  while (added < days) {
    result.setDate(result.getDate() + 1);
    const yr = result.getFullYear();
    if (!years.has(yr)) {
      years.add(yr);
      getHolidaysCO(yr).forEach((h) => holidays13.add(h));
    }
    if (isBusinessDay(result, holidays13)) added++;
  }
  return result;
}

export function countBusinessDays(start: Date, end: Date): number {
  const holidays = new Set<string>();
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    getHolidaysCO(y).forEach((h) => holidays.add(h));
  }
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (isBusinessDay(cur, holidays)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Fecha mínima para iniciar un contrato: 13 días hábiles desde hoy */
export function getMinStartDate(): Date {
  return addBusinessDays(new Date(), 13);
}
