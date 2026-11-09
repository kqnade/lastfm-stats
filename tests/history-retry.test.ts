import assert from "node:assert/strict";
import { test } from "node:test";
import { getDailyScrobbles } from "../lib/lastfm/api";

test("a changed total retries the same window without retaining partial counts", async (t) => {
  const urls: URL[] = [];
  const uts = String(Date.parse("2026-11-09T01:00:00Z") / 1000);
  t.mock.method(globalThis, "fetch", async (input: string) => {
    urls.push(new URL(input));
    const changed = urls.length === 2;
    return Response.json({ recenttracks: {
      track: [{ date: { uts } }],
      "@attr": { totalPages: "2", total: changed ? "202" : "201" },
    } });
  });
  const result = await getDailyScrobbles("test", "2026-11-09", "2026-11-09", "UTC", new Date("2026-11-09T12:00:00Z"));
  assert.deepEqual(result, { "2026-11-09": 2 });
  assert.deepEqual(urls.map((url) => url.searchParams.get("page")), ["1", "2", "1", "2"]);
  assert.equal(new Set(urls.map((url) => url.searchParams.get("to"))).size, 1);
});

test("weekly windows count boundary timestamps once and retry only the changed window", async (t) => {
  const first = Date.parse("2026-10-31T00:00:00Z") / 1000;
  const boundary = first + 7 * 86400;
  const urls: URL[] = [];
  let secondWindowCalls = 0;
  t.mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    urls.push(url);
    const second = Number(url.searchParams.get("from")) + 1 === boundary;
    if (second) secondWindowCalls++;
    return Response.json({ recenttracks: {
      // Simulate an inclusive upper API bound: the client must exclude it.
      track: [{ date: { uts: String(boundary) } }],
      "@attr": { totalPages: second ? "2" : "1", total: second && secondWindowCalls === 2 ? "202" : "201" },
    } });
  });
  const result = await getDailyScrobbles("test", "2026-11-01", "2026-11-09", "UTC", new Date("2026-11-09T12:00:00Z"));
  assert.deepEqual(result, { "2026-11-07": 2 });
  assert.equal(urls.filter((url) => Number(url.searchParams.get("from")) + 1 === first).length, 1);
  assert.equal(secondWindowCalls, 4);
});
