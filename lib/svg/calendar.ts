import { shiftDate } from "../lastfm/calendar";
import { getTheme } from "./themes";
import { escapeXml } from "./utils";

export interface CalendarOptions {
  username: string;
  counts: Record<string, number>;
  start: string;
  end: string;
  timeZone: string;
  theme?: string;
}

/** Render a self-contained activity grid with relative intensity and daily tooltips. */
export function generateCalendarCard(options: CalendarOptions): string {
  const { username, counts, start, end, timeZone, theme = "dark" } = options;
  const colors = getTheme(theme);
  const palette = theme === "light"
    ? ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"]
    : ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
  const weekday = (key: string) => new Date(`${key}T00:00:00Z`).getUTCDay();
  const first = shiftDate(start, -weekday(start));
  const days: string[] = [];
  for (let key = start; key <= end; key = shiftDate(key, 1)) days.push(key);
  const total = days.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
  const peak = Math.max(1, ...days.map((key) => counts[key] ?? 0));
  const level = (count: number) => count === 0 ? 0 : Math.min(4, Math.ceil(count / peak * 4));
  const offset = (key: string) => Math.round((Date.parse(key) - Date.parse(first)) / 86_400_000);
  const columns = Math.floor(offset(end) / 7) + 1;
  const width = Math.max(760, 66 + columns * 14);
  const cell = (x: number, y: number, fill: string, title = "") =>
    `<rect x="${x}" y="${y}" width="11" height="11" rx="2" fill="${fill}">${title ? `<title>${escapeXml(title)}</title>` : ""}</rect>`;
  const squares = days.map((key) => cell(
    48 + Math.floor(offset(key) / 7) * 14, 76 + weekday(key) * 14,
    palette[level(counts[key] ?? 0)], `${key}: ${counts[key] ?? 0} scrobbles`,
  )).join("\n");
  const months = days.filter((key) => key.endsWith("-01")).map((key) => {
    const label = new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    return `<text x="${48 + Math.floor(offset(key) / 7) * 14}" y="66">${label}</text>`;
  }).join("");
  const labels = [1, 3, 5].map((day) =>
    `<text x="16" y="${85 + day * 14}">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}</text>`,
  ).join("");
  const legend = palette.map((fill, i) => cell(width - 130 + i * 14, 190, fill)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="224" viewBox="0 0 ${width} 224" role="img" aria-labelledby="title description">
  <title id="title">${escapeXml(username)} · Last.fm listening activity</title>
  <desc id="description">${total} scrobbles from ${start} to ${end}, grouped by ${escapeXml(timeZone)}. Darker intensity levels indicate more scrobbles; the highest level is relative to the busiest day.</desc>
  <rect x="0.5" y="0.5" width="${width - 1}" height="223" rx="10" fill="${colors.background}" stroke="${colors.border}"/>
  <g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="10" fill="${colors.textSecondary}">
    <text x="18" y="28" fill="${colors.title}" font-size="15" font-weight="600">Last.fm · Listening activity</text>
    <text x="18" y="47">${total.toLocaleString("en-US")} scrobbles in the last 365 days · ${escapeXml(username)}</text>
    ${months}${labels}${squares}
    <text x="18" y="200">${start} – ${end} · ${escapeXml(timeZone)}</text>
    <text x="${width - 160}" y="199">Less</text>${legend}<text x="${width - 52}" y="199">More</text>
  </g>
</svg>\n`;
}
