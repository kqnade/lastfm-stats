import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getTopTracks, getTopArtists, getUserInfo, getWeeklyTrackChart, isTrackLoved } from "../lib/lastfm/api";
import type { Period, ProcessedTrack, ProcessedArtist, ProcessedStats } from "../lib/lastfm/types";
import { generateTopTracksCard, generateTopArtistsCard, generateStatsCard } from "../lib/svg/templates";
import { imageUrlToBase64, getLastfmImageUrl } from "../lib/svg/utils";

const USERNAME = process.env.LASTFM_USERNAME;
const PERIOD = (process.env.LASTFM_PERIOD ?? "7day") as Period;
const THEME = process.env.LASTFM_THEME ?? "dark";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, "..", "output");

if (!USERNAME) {
  console.error("LASTFM_USERNAME is required");
  process.exit(1);
}
if (!process.env.LASTFM_API_KEY) {
  console.error("LASTFM_API_KEY is required");
  process.exit(1);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

async function generateTopTracks() {
  console.log(`Fetching top tracks for ${USERNAME} (${PERIOD})...`);
  const rawTracks = await getTopTracks(USERNAME!, PERIOD, 5);

  const processed: ProcessedTrack[] = await Promise.all(
    rawTracks.map(async (track, i) => {
      const imageUrl = getLastfmImageUrl(track.image, "medium");
      const [imageBase64, loved] = await Promise.all([
        imageUrl ? imageUrlToBase64(imageUrl) : Promise.resolve(null),
        isTrackLoved(USERNAME!, track.name, track.artist.name),
      ]);
      return {
        rank: i + 1,
        name: track.name,
        artist: track.artist.name,
        playcount: parseInt(track.playcount, 10),
        imageUrl,
        imageBase64,
        loved,
        url: track.url,
      };
    })
  );

  const svg = generateTopTracksCard(processed, PERIOD, THEME);
  writeFileSync(join(OUTPUT_DIR, "top-tracks.svg"), svg);
  console.log(`  -> output/top-tracks.svg (${processed.length} tracks)`);
}

async function generateTopArtists() {
  console.log(`Fetching top artists for ${USERNAME} (${PERIOD})...`);
  const rawArtists = await getTopArtists(USERNAME!, PERIOD, 5);

  const processed: ProcessedArtist[] = await Promise.all(
    rawArtists.map(async (artist, i) => {
      const imageUrl = getLastfmImageUrl(artist.image, "medium");
      const imageBase64 = imageUrl ? await imageUrlToBase64(imageUrl) : null;
      return {
        rank: i + 1,
        name: artist.name,
        playcount: parseInt(artist.playcount, 10),
        imageUrl,
        imageBase64,
        url: artist.url,
      };
    })
  );

  const svg = generateTopArtistsCard(processed, PERIOD, THEME);
  writeFileSync(join(OUTPUT_DIR, "top-artists.svg"), svg);
  console.log(`  -> output/top-artists.svg (${processed.length} artists)`);
}

async function generateStats() {
  console.log(`Fetching stats for ${USERNAME}...`);
  const userInfo = await getUserInfo(USERNAME!);

  const now = Math.floor(Date.now() / 1000);
  const sevenDaysAgo = now - 7 * 24 * 60 * 60;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

  const [weeklyChart, monthlyChart] = await Promise.all([
    getWeeklyTrackChart(USERNAME!, sevenDaysAgo, now),
    getWeeklyTrackChart(USERNAME!, thirtyDaysAgo, now),
  ]);

  const weeklyScrobbles = Array.isArray(weeklyChart.track)
    ? weeklyChart.track.reduce((sum, t) => sum + parseInt(t.playcount, 10), 0)
    : 0;
  const monthlyScrobbles = Array.isArray(monthlyChart.track)
    ? monthlyChart.track.reduce((sum, t) => sum + parseInt(t.playcount, 10), 0)
    : 0;

  const avatarUrl = getLastfmImageUrl(userInfo.image, "medium");
  const avatarBase64 = avatarUrl ? await imageUrlToBase64(avatarUrl) : null;

  const registeredTs = parseInt(userInfo.registered.unixtime, 10);
  const registeredDate = new Date(registeredTs * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });

  const stats: ProcessedStats = {
    username: userInfo.name,
    totalScrobbles: parseInt(userInfo.playcount, 10),
    weeklyScrobbles,
    monthlyScrobbles,
    registeredDate,
    avatarUrl,
    avatarBase64,
  };

  const svg = generateStatsCard(stats, THEME);
  writeFileSync(join(OUTPUT_DIR, "stats.svg"), svg);
  console.log(`  -> output/stats.svg (total: ${stats.totalScrobbles})`);
}

async function main() {
  console.log("=== Last.fm Stats SVG Generator ===\n");

  await Promise.all([
    generateTopTracks(),
    generateTopArtists(),
    generateStats(),
  ]);

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
