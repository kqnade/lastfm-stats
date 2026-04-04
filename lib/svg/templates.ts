import type { ProcessedTrack, ProcessedArtist, ProcessedStats } from "../lastfm/types";
import { escapeXml, truncate, formatCount, PLACEHOLDER_IMAGE } from "./utils";
import { getTheme } from "./themes";

const CARD_WIDTH = 495;
const PADDING = 20;
const ITEM_HEIGHT = 60;
const HEADER_HEIGHT = 60;
const FOOTER_PADDING = 16;

// Last.fm brand logo (simple text-based)
function lastfmLogo(x: number, y: number, color: string): string {
  return `<text x="${x}" y="${y}" font-family="monospace" font-size="13" font-weight="bold" fill="${color}" opacity="0.8">last.fm</text>`;
}

function heartTspan(color: string): string {
  return `<tspan fill="${color}" dx="4">&#x2665;</tspan>`;
}

function cardWrapper(
  content: string,
  height: number,
  theme: ReturnType<typeof getTheme>
): string {
  const shadowFilter =
    theme.shadow !== "rgba(0,0,0,0.0)"
      ? `<filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${theme.shadow}"/>
        </filter>`
      : "";
  const filterAttr = theme.shadow !== "rgba(0,0,0,0.0)" ? 'filter="url(#shadow)"' : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${CARD_WIDTH}" height="${height}" viewBox="0 0 ${CARD_WIDTH} ${height}">
  <defs>
    ${shadowFilter}
    <clipPath id="roundedClip">
      <rect width="${CARD_WIDTH}" height="${height}" rx="10" ry="10"/>
    </clipPath>
    <style>
      text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
    </style>
  </defs>
  <rect width="${CARD_WIDTH}" height="${height}" rx="10" ry="10" fill="${theme.background}" stroke="${theme.border}" stroke-width="1" ${filterAttr}/>
  ${content}
</svg>`;
}

function itemImage(
  x: number,
  y: number,
  base64: string | null,
  size = 40,
  isArtist = false
): string {
  const src = base64 ?? PLACEHOLDER_IMAGE;
  const clipId = `clip-${x}-${y}`;
  const radius = isArtist ? size / 2 : 4;
  return `
  <defs>
    <clipPath id="${clipId}">
      <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/>
    </clipPath>
  </defs>
  <image href="${src}" x="${x}" y="${y}" width="${size}" height="${size}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>`;
}

// ─── Top Tracks Card ────────────────────────────────────────────────────────

export function generateTopTracksCard(
  tracks: ProcessedTrack[],
  period: string,
  themeName: string
): string {
  const theme = getTheme(themeName);
  const periodLabel = period === "7day" ? "Weekly" : "Monthly";
  const cardHeight = HEADER_HEIGHT + tracks.length * ITEM_HEIGHT + FOOTER_PADDING;

  let content = "";

  // Header
  content += `
  <text x="${PADDING}" y="36" font-size="18" font-weight="700" fill="${theme.title}">Top Tracks</text>
  <text x="${PADDING + 112}" y="36" font-size="13" font-weight="500" fill="${theme.textSecondary}">${periodLabel}</text>
  ${lastfmLogo(CARD_WIDTH - PADDING - 52, 36, theme.textSecondary)}
  <line x1="${PADDING}" y1="${HEADER_HEIGHT}" x2="${CARD_WIDTH - PADDING}" y2="${HEADER_HEIGHT}" stroke="${theme.headerLine}" stroke-width="1"/>`;

  // Track items
  tracks.forEach((track, i) => {
    const itemY = HEADER_HEIGHT + i * ITEM_HEIGHT;
    const imgX = PADDING;
    const imgY = itemY + 10;
    const textX = imgX + 50;

    content += itemImage(imgX, imgY, track.imageBase64, 40, false);

    // Track name with inline rank and loved heart
    const displayName = `#${track.rank} ${truncate(track.name, 32)}`;
    content += `<text x="${textX}" y="${imgY + 16}" font-size="14" font-weight="600" fill="${theme.textPrimary}">${escapeXml(displayName)}${track.loved ? heartTspan(theme.accent) : ""}</text>`;

    // Artist name
    content += `<text x="${textX}" y="${imgY + 32}" font-size="12" fill="${theme.textSecondary}">${escapeXml(truncate(track.artist, 40))}</text>`;

    // Play count badge
    const countText = `${formatCount(track.playcount)} plays`;
    content += `
    <rect x="${CARD_WIDTH - PADDING - 72}" y="${imgY + 8}" width="72" height="20" rx="10" fill="${theme.badgeBg}" stroke="${theme.border}" stroke-width="1"/>
    <text x="${CARD_WIDTH - PADDING - 36}" y="${imgY + 22}" font-size="11" text-anchor="middle" fill="${theme.textSecondary}">${countText}</text>`;

    // Separator
    if (i < tracks.length - 1) {
      content += `<line x1="${textX}" y1="${itemY + ITEM_HEIGHT}" x2="${CARD_WIDTH - PADDING}" y2="${itemY + ITEM_HEIGHT}" stroke="${theme.headerLine}" stroke-width="1"/>`;
    }
  });

  return cardWrapper(content, cardHeight, theme);
}

// ─── Top Artists Card ────────────────────────────────────────────────────────

export function generateTopArtistsCard(
  artists: ProcessedArtist[],
  period: string,
  themeName: string
): string {
  const theme = getTheme(themeName);
  const periodLabel = period === "7day" ? "Weekly" : "Monthly";
  const cardHeight = HEADER_HEIGHT + artists.length * ITEM_HEIGHT + FOOTER_PADDING;

  let content = "";

  // Header
  content += `
  <text x="${PADDING}" y="36" font-size="18" font-weight="700" fill="${theme.title}">Top Artists</text>
  <text x="${PADDING + 116}" y="36" font-size="13" font-weight="500" fill="${theme.textSecondary}">${periodLabel}</text>
  ${lastfmLogo(CARD_WIDTH - PADDING - 52, 36, theme.textSecondary)}
  <line x1="${PADDING}" y1="${HEADER_HEIGHT}" x2="${CARD_WIDTH - PADDING}" y2="${HEADER_HEIGHT}" stroke="${theme.headerLine}" stroke-width="1"/>`;

  // Artist items
  artists.forEach((artist, i) => {
    const itemY = HEADER_HEIGHT + i * ITEM_HEIGHT;
    const imgX = PADDING;
    const imgY = itemY + 10;
    const textX = imgX + 50;

    content += itemImage(imgX, imgY, artist.imageBase64, 40, true);

    // Artist name with inline rank
    const displayName = `#${artist.rank} ${truncate(artist.name, 36)}`;
    content += `<text x="${textX}" y="${imgY + 22}" font-size="14" font-weight="600" fill="${theme.textPrimary}">${escapeXml(displayName)}</text>`;

    // Play count badge
    const countText = `${formatCount(artist.playcount)} plays`;
    content += `
    <rect x="${CARD_WIDTH - PADDING - 72}" y="${imgY + 8}" width="72" height="20" rx="10" fill="${theme.badgeBg}" stroke="${theme.border}" stroke-width="1"/>
    <text x="${CARD_WIDTH - PADDING - 36}" y="${imgY + 22}" font-size="11" text-anchor="middle" fill="${theme.textSecondary}">${countText}</text>`;

    if (i < artists.length - 1) {
      content += `<line x1="${textX}" y1="${itemY + ITEM_HEIGHT}" x2="${CARD_WIDTH - PADDING}" y2="${itemY + ITEM_HEIGHT}" stroke="${theme.headerLine}" stroke-width="1"/>`;
    }
  });

  return cardWrapper(content, cardHeight, theme);
}

// ─── Stats Card ──────────────────────────────────────────────────────────────

export function generateStatsCard(stats: ProcessedStats, themeName: string): string {
  const theme = getTheme(themeName);
  const cardHeight = 200;

  const statItems = [
    { label: "Total Scrobbles", value: formatCount(stats.totalScrobbles), icon: "🎵" },
    { label: "This Month", value: formatCount(stats.monthlyScrobbles), icon: "📅" },
    { label: "This Week", value: formatCount(stats.weeklyScrobbles), icon: "📊" },
  ];

  const colWidth = (CARD_WIDTH - PADDING * 2) / 3;

  let content = "";

  // Header
  content += `
  <text x="${PADDING}" y="36" font-size="18" font-weight="700" fill="${theme.title}">Scrobble Stats</text>
  ${lastfmLogo(CARD_WIDTH - PADDING - 52, 36, theme.textSecondary)}
  <line x1="${PADDING}" y1="${HEADER_HEIGHT}" x2="${CARD_WIDTH - PADDING}" y2="${HEADER_HEIGHT}" stroke="${theme.headerLine}" stroke-width="1"/>`;

  // User info row
  const avatarSize = 48;
  content += itemImage(PADDING, HEADER_HEIGHT + 14, stats.avatarBase64, avatarSize, true);
  content += `
  <text x="${PADDING + avatarSize + 12}" y="${HEADER_HEIGHT + 34}" font-size="16" font-weight="700" fill="${theme.textPrimary}">${escapeXml(stats.username)}</text>
  <text x="${PADDING + avatarSize + 12}" y="${HEADER_HEIGHT + 52}" font-size="11" fill="${theme.textSecondary}">Since ${stats.registeredDate}</text>`;

  // Stats columns
  const statsY = HEADER_HEIGHT + 90;
  statItems.forEach((item, i) => {
    const x = PADDING + i * colWidth + colWidth / 2;
    content += `
    <text x="${x}" y="${statsY}" font-size="20" font-weight="700" text-anchor="middle" fill="${theme.title}">${item.value}</text>
    <text x="${x}" y="${statsY + 18}" font-size="11" text-anchor="middle" fill="${theme.textSecondary}">${item.label}</text>`;

    if (i < statItems.length - 1) {
      content += `<line x1="${PADDING + (i + 1) * colWidth}" y1="${statsY - 16}" x2="${PADDING + (i + 1) * colWidth}" y2="${statsY + 20}" stroke="${theme.border}" stroke-width="1"/>`;
    }
  });

  return cardWrapper(content, cardHeight, theme);
}

// ─── Error Card ──────────────────────────────────────────────────────────────

export function generateErrorCard(message: string, themeName: string): string {
  const theme = getTheme(themeName);
  const cardHeight = 100;

  const content = `
  <text x="${CARD_WIDTH / 2}" y="44" font-size="14" text-anchor="middle" fill="${theme.accent}">⚠ Error</text>
  <text x="${CARD_WIDTH / 2}" y="66" font-size="12" text-anchor="middle" fill="${theme.textSecondary}">${escapeXml(truncate(message, 60))}</text>`;

  return cardWrapper(content, cardHeight, theme);
}
