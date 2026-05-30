import md5 from "md5"
import type { SourceCatalog, SourceID } from "@shared/types"
import type { AppDatabase } from "#/utils/database"

export interface RssSourceRow {
  id: SourceID
  name: string
  title?: string
  column_id?: string
  home?: string
  icon?: string
  url: string
  original_url?: string
  interval?: number
  enabled?: number
  updated?: number
  last_error?: string
}

function normalizeRows(res: any) {
  return res?.results ?? res?.rows ?? res ?? []
}

export function rssSourceId(url: string) {
  return `rss-${md5(url).slice(0, 12)}` as SourceID
}

export class RssSourceTable {
  private db

  constructor(db: AppDatabase) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS rss_source (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT,
        column_id TEXT,
        home TEXT,
        icon TEXT,
        url TEXT NOT NULL UNIQUE,
        original_url TEXT,
        interval INTEGER NOT NULL DEFAULT 1800000,
        enabled INTEGER NOT NULL DEFAULT 1,
        updated INTEGER,
        last_error TEXT
      );
    `).run()
  }

  async upsert(row: Omit<RssSourceRow, "updated">) {
    const now = Date.now()
    await this.db.prepare(`
      INSERT INTO rss_source (id, name, title, column_id, home, icon, url, original_url, interval, enabled, updated, last_error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        title = excluded.title,
        column_id = excluded.column_id,
        home = excluded.home,
        icon = excluded.icon,
        url = excluded.url,
        original_url = excluded.original_url,
        interval = excluded.interval,
        enabled = excluded.enabled,
        updated = excluded.updated,
        last_error = excluded.last_error;
    `).run(row.id, row.name, row.title ?? "", row.column_id ?? "", row.home ?? "", row.icon ?? "/icons/rss.png", row.url, row.original_url ?? row.url, row.interval ?? 30 * 60 * 1000, row.enabled ?? 1, now, row.last_error ?? "")
    return { ...row, updated: now } as RssSourceRow
  }

  async getAll(options: { enabledOnly?: boolean } = {}) {
    const rows = normalizeRows(await this.db.prepare(`
      SELECT * FROM rss_source
      ${options.enabledOnly ? "WHERE enabled = 1" : ""}
      ORDER BY updated DESC, id ASC
    `).all()) as RssSourceRow[]
    return rows
  }

  async getByIds(ids: SourceID[]) {
    if (!ids.length) return []
    return normalizeRows(await this.db.prepare(`
      SELECT * FROM rss_source
      WHERE enabled = 1 AND id IN (${ids.map(() => "?").join(",")})
    `).all(...ids)) as RssSourceRow[]
  }

  async getCatalog(): Promise<SourceCatalog[]> {
    const rows = await this.getAll({ enabledOnly: true })
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      title: row.title || undefined,
      kind: "feed",
      column: row.column_id as any || undefined,
      home: row.home || undefined,
      icon: row.icon || "/icons/rss.png",
      enabled: Boolean(row.enabled),
      updated: row.updated,
    }))
  }
}
