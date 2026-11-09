const DAY_MS = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

/** Format a timestamp as a calendar date in an IANA timezone; reuse formatters. */
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

/** Shift an ISO calendar date using UTC arithmetic, avoiding DST gaps/repeats. */
export function shiftDate(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Return today and the preceding 364 calendar days in the selected timezone. */
export function calendarRange(now: Date, timeZone: string) {
  const end = dateKey(now, timeZone);
  return { start: shiftDate(end, -364), end };
}
