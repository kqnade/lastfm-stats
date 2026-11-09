const DAY_MS = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

export function dateKey(date: Date, timeZone: string): string {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

// Calendar arithmetic uses UTC dates so DST cannot skip or repeat a day.
export function shiftDate(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function calendarRange(now: Date, timeZone: string) {
  const end = dateKey(now, timeZone);
  return { start: shiftDate(end, -364), end };
}
