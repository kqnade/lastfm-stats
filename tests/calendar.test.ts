import assert from "node:assert/strict";
import { test } from "node:test";
import { calendarRange, dateKey, shiftDate } from "../lib/lastfm/calendar";
import { getDailyScrobbles } from "../lib/lastfm/api";
import { generateCalendarCard } from "../lib/svg/calendar";

test("calendar days use the selected timezone, including leap days and DST", () => {
  assert.equal(dateKey(new Date("2026-11-08T15:00:00Z"), "Asia/Tokyo"), "2026-11-09");
  assert.equal(dateKey(new Date("2026-11-08T14:59:59Z"), "Asia/Tokyo"), "2026-11-08");
  assert.equal(shiftDate("2024-03-01", -1), "2024-02-29");
  const range = calendarRange(new Date("2024-03-11T04:00:00Z"), "America/New_York");
  assert.equal(range.end, "2024-03-11");
  assert.equal((Date.parse(range.end) - Date.parse(range.start)) / 86400000, 364);
});

test("SVG has 365 date cells, escapes text, and omits future dates", () => {
  const range = calendarRange(new Date("2026-11-09T12:00:00Z"), "Asia/Tokyo");
  for (const theme of ["dark", "light", "transparent"]) {
    const svg = generateCalendarCard({
      username: '<user & "name">', counts: { "2026-11-09": 10, "2026-11-10": 99 },
      ...range, timeZone: "Asia/Tokyo", theme,
    });
    assert.equal((svg.match(/<title>\d{4}-/g) ?? []).length, 365);
    assert.match(svg, /10 scrobbles from/);
    assert.match(svg, /&lt;user &amp; &quot;name&quot;&gt;/);
    assert.doesNotMatch(svg, /2026-11-10/);
    assert.doesNotMatch(svg, /NaN|undefined/);
  }
});

test("New York midnight boundaries work in daylight and standard time", () => {
  for (const [before, midnight, previous, current] of [
    ["2026-07-01T03:59:59Z", "2026-07-01T04:00:00Z", "2026-06-30", "2026-07-01"],
    ["2026-12-01T04:59:59Z", "2026-12-01T05:00:00Z", "2026-11-30", "2026-12-01"],
  ]) {
    for (const [instant, expected] of [[before, previous], [midnight, current]]) {
      const date = new Date(instant);
      assert.equal(dateKey(date, "America/New_York"), expected);
      const range = calendarRange(date, "America/New_York");
      assert.equal(range.end, expected);
      assert.equal(range.start, shiftDate(expected, -364));
    }
  }
});

test("history total changes are rejected even when page count stays the same", async (t) => {
  let page = 0;
  t.mock.method(globalThis, "fetch", async () => Response.json({
    recenttracks: { track: [{ date: { uts: "0" } }],
      "@attr": { totalPages: "2", total: String(++page === 1 ? 201 : 202) } },
  }));
  await assert.rejects(getDailyScrobbles("test", "2026-01-01", "2026-01-01", "UTC"), /changed during pagination/);
});

test("multipage history rejects empty first, last, and now-playing-only pages", async (t) => {
  const mock = t.mock.method(globalThis, "fetch");
  for (const emptyPage of [1, 2]) {
    for (const emptyTracks of [[], [{ "@attr": { nowplaying: "true" } }]]) {
      let page = 0;
      mock.mock.mockImplementation(async () => Response.json({
        recenttracks: {
          track: ++page === emptyPage ? emptyTracks : [{ date: { uts: "0" } }],
          "@attr": { totalPages: "2", total: "201" },
        },
      }));
      await assert.rejects(getDailyScrobbles("test", "2026-01-01", "2026-01-01", "UTC"), /Empty Last.fm history page/);
    }
  }
});

test("empty history renders all days without invalid intensities", () => {
  const svg = generateCalendarCard({
    username: "empty", counts: {}, start: "2026-01-01", end: "2026-12-31",
    timeZone: "UTC",
  });
  assert.equal((svg.match(/: 0 scrobbles<\/title>/g) ?? []).length, 365);
  assert.doesNotMatch(svg, /NaN|undefined/);
});

test("fetches all pages with fixed bounds, counts duplicates, and excludes now-playing", async (t) => {
  const urls: URL[] = [];
  const ts = (value: string) => String(Date.parse(value) / 1000);
  const track = { date: { uts: ts("2026-11-08T15:00:00Z") } };
  t.mock.method(globalThis, "fetch", async (input: string) => {
    urls.push(new URL(input));
    const tracks = urls.length === 1
      ? [track, track, { "@attr": { nowplaying: "true" } }]
      : [{ date: { uts: ts("2026-11-08T14:59:59Z") } }];
    const from = Number(urls.at(-1)!.searchParams.get("from"));
    const filtered = tracks.filter((track) => !("date" in track) || Number(track.date.uts) > from);
    return Response.json({ recenttracks: { track: filtered, "@attr": { totalPages: "2", total: "3" } } });
  });
  const counts = await getDailyScrobbles("test", "2026-11-09", "2026-11-09", "Asia/Tokyo", new Date("2026-11-09T12:00:00Z"));
  assert.deepEqual(counts, { "2026-11-09": 2 });
  assert.equal(urls.length, 2);
  assert.equal(urls[1].searchParams.get("page"), "2");
  assert.equal(urls[0].searchParams.get("to"), urls[1].searchParams.get("to"));
  assert.equal(urls[0].searchParams.get("from"), urls[1].searchParams.get("from"));
  assert.ok(Number(urls[0].searchParams.get("from")) < Number(track.date.uts));
  assert.equal(urls[0].protocol, "https:");
});

test("empty API history is valid; malformed pagination fails", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json({
    recenttracks: { track: [], "@attr": { totalPages: "0", total: "0" } },
  }));
  assert.deepEqual(await getDailyScrobbles("test", "2026-01-01", "2026-01-01", "UTC"), {});
  mock.mock.mockImplementation(async () => Response.json({ recenttracks: { track: [] } }));
  await assert.rejects(getDailyScrobbles("test", "2026-01-01", "2026-01-01", "UTC"), /Invalid/);
});

test("changing page totals fail instead of publishing partial history", async (t) => {
  let page = 0;
  t.mock.method(globalThis, "fetch", async () => Response.json({
    recenttracks: { track: [{ date: { uts: "0" } }], "@attr": { totalPages: String(++page === 1 ? 2 : 3), total: "3" } },
  }));
  await assert.rejects(getDailyScrobbles("test", "2026-01-01", "2026-01-01", "UTC"), /changed during pagination/);
});
