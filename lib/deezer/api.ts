import { BuildCache, WEEK_MS } from "../cache";

interface DeezerArtist {
  name: string;
  picture_small: string;
  picture_medium: string;
  picture_big: string;
}

interface DeezerSearchResult {
  data: DeezerArtist[];
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (res.ok) return res;
      if (res.status !== 429 && res.status < 500) return null;
    } catch {
      if (attempt === retries - 1) return null;
    }
    if (attempt < retries - 1) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  return null;
}

export async function getArtistImageUrl(artistName: string, cache?: BuildCache): Promise<string> {
  if (!artistName) return "";
  if (cache) {
    return cache.remember("deezer-small-v1:" + artistName.toLowerCase(), WEEK_MS, () => getArtistImageUrl(artistName));
  }

  const res = await fetchWithRetry(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=5`
  );
  if (!res) return "";

  let data: DeezerSearchResult;
  try { data = await res.json() as DeezerSearchResult; } catch { return ""; }
  if (!Array.isArray(data.data) || !data.data.length) return "";

  // Exact name match first (case-insensitive)
  const exact = data.data.find(
    (a) => typeof a.name === "string" && a.name.toLowerCase() === artistName.toLowerCase()
  );
  // Avoid unrelated portraits when search has no exact match.
  return exact?.picture_small || exact?.picture_medium || "";
}
