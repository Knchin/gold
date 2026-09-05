const NYSE_HOLIDAYS_2026 = new Set<string>([
  '2026-01-01',
  '2026-01-19',
  '2026-02-16',
  '2026-04-03',
  '2026-05-25',
  '2026-06-19',
  '2026-07-03',
  '2026-09-07',
  '2026-11-26',
  '2026-12-25',
]);

const MARKET_OPEN_MINUTES = 9 * 60 + 30;
const MARKET_CLOSE_MINUTES = 16 * 60;

function getETDateString(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function getETTimeString(date: Date): string {
  return date.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false });
}

function getETDayName(date: Date): string {
  return date.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short' });
}

export function isHoliday(date: Date): boolean {
  return NYSE_HOLIDAYS_2026.has(getETDateString(date));
}

export function isMarketOpen(date: Date = new Date()): boolean {
  const day = getETDayName(date);
  if (day === 'Sat' || day === 'Sun') return false;
  if (isHoliday(date)) return false;
  const time = getETTimeString(date);
  const [h, m] = time.split(':').map(Number);
  const mins = h * 60 + m;
  return mins >= MARKET_OPEN_MINUTES && mins < MARKET_CLOSE_MINUTES;
}

export function msUntilNextOpen(date: Date = new Date()): number {
  const base = new Date(date);
  while (true) {
    base.setDate(base.getDate() + 1);
    const day = getETDayName(base);
    if (day === 'Sat' || day === 'Sun') continue;
    if (isHoliday(base)) continue;
    base.setHours(13, 30, 0, 0);
    return base.getTime() - date.getTime();
  }
}