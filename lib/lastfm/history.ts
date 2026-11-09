import { BuildCache, WEEK_MS } from "../cache";
import { getDailyScrobbles } from "./api";
import { shiftDate } from "./calendar";

interface History {
  start: string;
  end: string;
  refreshed: number;
  counts: Record<string, number>;
}

/** Replace recent days, including deletions; rebuild all days weekly or on a cache miss. */
export async function getCachedDailyScrobbles(
  cache: BuildCache, username: string, start: string, end: string,
  timeZone: string, now: Date,
  fetchDays = getDailyScrobbles,
): Promise<Record<string, number>> {
  const key = JSON.stringify(["history-v1", username, timeZone]);
  const previous = cache.get<History>(key);
  const timestamp = now.getTime();
  const reusable = previous && typeof previous.start === "string" && typeof previous.end === "string"
    && previous.start <= start && previous.end <= end
    && Number.isFinite(previous.refreshed) && previous.refreshed <= timestamp
    && timestamp - previous.refreshed < WEEK_MS
    && previous.counts && Object.entries(previous.counts).every(([day, value]) =>
      /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isSafeInteger(value) && value >= 0);
  // Re-fetch an overlap to include delayed scrobbles, edits, and zeroed days.
  const from = reusable ? [start, shiftDate(previous.end, -6)].sort().at(-1)! : start;
  const fresh = await fetchDays(username, from, end, timeZone, now);
  const counts: Record<string, number> = {};
  if (reusable) {
    for (const [day, value] of Object.entries(previous.counts)) {
      if (day >= start && day < from) counts[day] = value;
    }
  }
  Object.assign(counts, fresh);
  cache.set<History>(key, {
    start, end, counts, refreshed: reusable ? previous.refreshed : timestamp,
  }, WEEK_MS + 86_400_000);
  return counts;
}
