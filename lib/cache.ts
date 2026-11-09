import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

interface Entry { expires: number; value: unknown }

/** Optional build cache. Corrupt/missing entries are always safe to discard. */
export class BuildCache {
  private entries = new Map<string, Entry>();
  private pending = new Map<string, Promise<unknown>>();

  constructor(private file: string, private clock = Date.now) {
    try {
      const data = JSON.parse(readFileSync(file, "utf8"));
      if (data.version === 1 && Array.isArray(data.entries)) {
        for (const [key, entry] of data.entries) {
          if (typeof key === "string" && Number.isFinite(entry?.expires) && entry.expires > clock()) {
            this.entries.set(key, entry);
          }
        }
      }
    } catch { this.entries.clear(); }
  }

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry || entry.expires <= this.clock()) return undefined;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl: number): void {
    this.entries.set(key, { value, expires: this.clock() + ttl });
  }

  async remember<T>(key: string, ttl: number, fetchValue: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const existing = this.pending.get(key);
    if (existing) return existing as Promise<T>;
    const task = fetchValue().then((value) => {
      // Don't keep transient download/search failures for the entire TTL.
      if (value !== null && value !== undefined && value !== "") this.set(key, value, ttl);
      return value;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, task);
    return task;
  }

  save(): void {
    const entries = [...this.entries].filter(([, entry]) => entry.expires > this.clock()).slice(-256);
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file + ".tmp", JSON.stringify({ version: 1, entries }));
    renameSync(this.file + ".tmp", this.file);
  }
}

export const WEEK_MS = 7 * 86_400_000;
