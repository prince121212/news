import type { CustomGroup } from "@shared/types"
import { createDefaultCustomGroups } from "@shared/default-groups"
import sources from "@shared/sources"
import { RssSourceTable } from "#/database/rss-source"
import type { AppDatabase } from "#/utils/database"

function normalizeRows(res: any) {
  return res?.results ?? res?.rows ?? res ?? []
}

export class DefaultGroupTable {
  private db

  constructor(db: AppDatabase) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS default_group (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sources TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1,
        updated INTEGER
      );
    `).run()
    await this.seedIfNeeded()
  }

  private async seedIfNeeded() {
    const row = await this.db.prepare(`SELECT COUNT(*) AS count FROM default_group`).get() as { count?: number } | undefined
    if (Number(row?.count ?? 0) > 0) return
    await this.setGroups(createDefaultCustomGroups())
  }

  private async validSourceIds() {
    const rssIds = (await new RssSourceTable(this.db).getAll({ enabledOnly: true })).map(row => row.id)
    return new Set([...Object.keys(sources), ...rssIds])
  }

  private async sanitizeGroups(groups: CustomGroup[] = []) {
    const valid = await this.validSourceIds()
    return groups.map((group, index) => ({
      id: String(group.id || `group-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || `group-${index + 1}`,
      name: String(group.name || "分组").trim().slice(0, 8),
      sources: [...new Set((group.sources ?? [])
        .filter(Boolean)
        .map(id => sources[id]?.redirect ?? id)
        .filter(id => valid.has(id) && sources[id]?.type !== "hottest"))] as any,
    })).filter(group => group.name)
  }

  async getGroups(): Promise<CustomGroup[]> {
    const rows = normalizeRows(await this.db.prepare(`
      SELECT id, name, sources
      FROM default_group
      WHERE enabled = 1
      ORDER BY sort_order ASC, updated ASC, id ASC
    `).all()) as { id: string, name: string, sources: string }[]

    if (!rows.length) return createDefaultCustomGroups()
    return await this.sanitizeGroups(rows.map(row => ({
      id: row.id,
      name: row.name,
      sources: JSON.parse(row.sources || "[]"),
    })))
  }

  async setGroups(groups: CustomGroup[]) {
    const normalized = await this.sanitizeGroups(groups)
    const now = Date.now()
    await this.db.prepare(`DELETE FROM default_group`).run()
    for (const [index, group] of normalized.entries()) {
      await this.db.prepare(`
        INSERT INTO default_group (id, name, sources, sort_order, enabled, updated)
        VALUES (?, ?, ?, ?, 1, ?)
      `).run(group.id, group.name, JSON.stringify(group.sources), index, now)
    }
    return normalized
  }
}
