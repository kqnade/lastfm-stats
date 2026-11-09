import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BuildCache, WEEK_MS } from "../lib/cache";
import { imageUrlToBase64 } from "../lib/svg/utils";
import { getArtistImageUrl } from "../lib/deezer/api";
import { getCachedDailyScrobbles } from "../lib/lastfm/history";

function fixture(t: { after: (fn: () => void) => void }, clock = Date.now) {
  const dir = mkdtempSync(join(tmpdir(), "lastfm-cache-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "cache.json");
  return { file, cache: new BuildCache(file, clock) };
}

test("images reuse concurrent downloads and persist across runs until expiry", async (t) => {
  let now = 1000;
  const { file, cache } = fixture(t, () => now);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response("image-bytes", { headers: { "Content-Type": "image/png" } });
  });
  const values = await Promise.all([
    imageUrlToBase64("https://images.test/a", cache),
    imageUrlToBase64("https://images.test/a", cache),
  ]);
  assert.equal(values[0], values[1]);
  assert.equal(calls, 1);
  cache.save();
  const restored = new BuildCache(file, () => now);
  assert.equal(await imageUrlToBase64("https://images.test/a", restored), values[0]);
  assert.equal(calls, 1);
  now += WEEK_MS;
  await imageUrlToBase64("https://images.test/a", restored);
  assert.equal(calls, 2);
});

test("bad image responses are not cached", async (t) => {
  const { cache } = fixture(t);
  const mock = t.mock.method(globalThis, "fetch", async () => new Response("<html>bad</html>", {
    headers: { "Content-Type": "text/html" },
  }));
  assert.equal(await imageUrlToBase64("https://images.test/b", cache), null);
  mock.mock.mockImplementation(async () => new Response("image", { headers: { "Content-Type": "image/jpeg" } }));
  assert.match((await imageUrlToBase64("https://images.test/b", cache))!, /^data:image\/jpeg;base64,/);
  assert.equal(mock.mock.callCount(), 2);
});

test("artist lookup uses a cached small exact-match portrait", async (t) => {
  const { cache } = fixture(t);
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ data: [
    { name: "Other", picture_small: "wrong" },
    { name: "Artist", picture_small: "small", picture_medium: "large" },
  ] }));
  assert.equal(await getArtistImageUrl("Artist", cache), "small");
  assert.equal(await getArtistImageUrl("ARTIST", cache), "small");
  assert.equal(mock.mock.callCount(), 1);
  assert.equal(await getArtistImageUrl("Unmatched", cache), "");
});

test("history replaces overlap including deleted scrobbles and refreshes weekly", async (t) => {
  let now = Date.parse("2026-11-09T12:00:00Z");
  const { cache } = fixture(t, () => now);
  const calls: string[] = [];
  let response: Record<string, number> = { "2026-02-01": 5, "2026-11-05": 3 };
  const fetchDays = async (_user: string, from: string) => { calls.push(from); return response; };
  const load = () => getCachedDailyScrobbles(cache, "user", "2025-11-10", "2026-11-09", "UTC", new Date(now), fetchDays);
  assert.deepEqual(await load(), response);
  response = { "2026-11-09": 4 };
  assert.deepEqual(await load(), { "2026-02-01": 5, "2026-11-09": 4 });
  assert.deepEqual(calls, ["2025-11-10", "2026-11-03"]);
  now += WEEK_MS;
  assert.deepEqual(await load(), response);
  assert.equal(calls[2], "2025-11-10");
});

test("history rolls forward, isolates timezone, and keeps cache on fetch failure", async (t) => {
  const { cache } = fixture(t);
  const now = new Date();
  const first = { "2025-11-10": 1, "2026-03-01": 2 };
  await getCachedDailyScrobbles(cache, "user", "2025-11-10", "2026-11-09", "UTC", now, async () => first);
  await assert.rejects(getCachedDailyScrobbles(cache, "user", "2025-11-10", "2026-11-09", "UTC", now, async () => { throw new Error("offline"); }));
  const result = await getCachedDailyScrobbles(cache, "user", "2025-11-11", "2026-11-10", "UTC", now, async () => ({}));
  assert.deepEqual(result, { "2026-03-01": 2 });
  let from = "";
  await getCachedDailyScrobbles(cache, "user", "2025-11-11", "2026-11-10", "Asia/Tokyo", now, async (_user, start) => { from = start; return {}; });
  assert.equal(from, "2025-11-11");
});

test("corrupt disk cache is ignored", (t) => {
  const { file } = fixture(t);
  writeFileSync(file, "{broken");
  assert.equal(new BuildCache(file).get("anything"), undefined);
});
