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
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {
      if (attempt === retries - 1) return null;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}

export async function getArtistImageUrl(artistName: string): Promise<string> {
  if (!artistName) return "";

  const res = await fetchWithRetry(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=5`
  );
  if (!res) return "";

  const data = (await res.json()) as DeezerSearchResult;
  if (!data.data?.length) return "";

  // Exact name match first (case-insensitive)
  const exact = data.data.find(
    (a) => a.name.toLowerCase() === artistName.toLowerCase()
  );
  const artist = exact ?? data.data[0];

  return artist.picture_medium || artist.picture_small || "";
}
