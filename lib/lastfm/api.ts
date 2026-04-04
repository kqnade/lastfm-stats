import type {
  Period,
  LastfmTrack,
  LastfmArtist,
  LastfmUserInfo,
  LastfmWeeklyTrackChart,
} from "./types";

const BASE_URL = "http://ws.audioscrobbler.com/2.0/";
const API_KEY = process.env.LASTFM_API_KEY!;

async function fetchLastfm<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(BASE_URL);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Last.fm API error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as T & { error?: number; message?: string };
  if (data.error) {
    throw new Error(`Last.fm API error ${data.error}: ${data.message}`);
  }
  return data;
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

export async function isTrackLoved(
  username: string,
  track: string,
  artist: string
): Promise<boolean> {
  try {
    const data = await fetchLastfm<{ track: { userloved: string } }>({
      method: "track.getInfo",
      username,
      track,
      artist,
    });
    return data.track?.userloved === "1";
  } catch {
    return false;
  }
}
