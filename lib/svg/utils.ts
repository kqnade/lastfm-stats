export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

export function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

export async function imageUrlToBase64(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// Last.fm returns this hash for all placeholder/default images
const LASTFM_PLACEHOLDER_HASH = "2a96cbd8b46e442fc41c2b86b821562f";

function isPlaceholderUrl(url: string): boolean {
  return url.includes(LASTFM_PLACEHOLDER_HASH);
}

export function getLastfmImageUrl(
  images: Array<{ "#text": string; size: string }>,
  preferredSize = "medium"
): string {
  const preferred = images.find((img) => img.size === preferredSize && img["#text"] && !isPlaceholderUrl(img["#text"]));
  if (preferred) return preferred["#text"];
  // Fallback: largest non-empty, non-placeholder
  const fallback = [...images].reverse().find((img) => img["#text"] && !isPlaceholderUrl(img["#text"]));
  return fallback?.["#text"] ?? "";
}

// Last.fm placeholder SVG (grey box) as base64
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#21262d" rx="4"/><text x="20" y="26" text-anchor="middle" font-size="18" fill="#8b949e">♪</text></svg>`
  ).toString("base64");
