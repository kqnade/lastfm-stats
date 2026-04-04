import type {
  Period,
  LastfmImage,
  LastfmTrack,
  LastfmArtist,
  LastfmUserInfo,
  LastfmWeeklyTrackChart,
} from "./types";

const BASE_URL = "http://ws.audioscrobbler.com/2.0/";
const API_KEY = process.env.LASTFM_API_KEY!;

async function fetchLastfm<T>(params: Record<string, string>, retries = 3): Promise<T> {
  const url = new URL(BASE_URL);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Last.fm API error: ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as T & { error?: number; message?: string };
      if (data.error) {
        throw new Error(`Last.fm API error ${data.error}: ${data.message}`);
      }
      return data;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error("unreachable");
}

export async function getTopTracks(
  username: string,
  period: Period = "7day",
  limit = 5
): Promise<LastfmTrack[]> {
  const data = await fetchLastfm<{ toptracks: { track: LastfmTrack[] } }>({
    method: "user.getTopTracks",
    user: username,
    period,
    limit: String(limit),
  });
  return data.toptracks.track ?? [];
}

export async function getTopArtists(
  username: string,
  period: Period = "7day",
  limit = 5
): Promise<LastfmArtist[]> {
  const data = await fetchLastfm<{ topartists: { artist: LastfmArtist[] } }>({
    method: "user.getTopArtists",
    user: username,
    period,
    limit: String(limit),
  });
  return data.topartists.artist ?? [];
}

export async function getUserInfo(username: string): Promise<LastfmUserInfo> {
  const data = await fetchLastfm<{ user: LastfmUserInfo }>({
    method: "user.getInfo",
    user: username,
  });
  return data.user;
}

export async function getWeeklyTrackChart(
  username: string,
  from?: number,
  to?: number
): Promise<LastfmWeeklyTrackChart> {
  const params: Record<string, string> = {
    method: "user.getWeeklyTrackChart",
    user: username,
  };
  if (from) params.from = String(from);
  if (to) params.to = String(to);

  const data = await fetchLastfm<{ weeklytrackchart: LastfmWeeklyTrackChart }>(params);
  return data.weeklytrackchart;
}

export interface TrackDetails {
  loved: boolean;
  albumImages: LastfmImage[];
}

export async function getTrackDetails(
  username: string,
  track: string,
  artist: string
): Promise<TrackDetails> {
  try {
    const data = await fetchLastfm<{
      track: {
        userloved: string;
        album?: { image: LastfmImage[] };
      };
    }>({
      method: "track.getInfo",
      username,
      track,
      artist,
    });
    return {
      loved: data.track?.userloved === "1",
      albumImages: data.track?.album?.image ?? [],
    };
  } catch {
    return { loved: false, albumImages: [] };
  }
}
