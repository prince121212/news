import process from "node:process"
import { sources } from "@shared/sources"
import { typeSafeObjectEntries } from "@shared/type.util"
import type { SourceCatalog } from "@shared/types"
import type { AppDatabase } from "#/utils/database"

type SourceKind = "feed" | "hot"

export class SourceCatalogTable {
  private db

  constructor(db: AppDatabase) {
    this.db = db
  }

  private normalizeRows(res: any) {
    return res?.results ?? res?.rows ?? res ?? []
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS feed_source (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT,
        column_id TEXT,
        home TEXT,
        icon TEXT,
        redirect TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        updated INTEGER
      );
    `).run()
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS hot_source (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT,
        column_id TEXT,
        home TEXT,
        icon TEXT,
        redirect TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        updated INTEGER
      );
    `).run()
    // 开发阶段直接切到两张信源表；旧聚合表不再使用。
    await this.db.prepare(`DROP TABLE IF EXISTS source_catalog`).run()
    logger.success("init source tables")
  }

  private sourceRows(kind: SourceKind) {
    const now = Date.now()
    return typeSafeObjectEntries(sources)
      .filter(([, source]) => kind === "hot" ? source.type === "hottest" : source.type !== "hottest")
      .map(([id, source]) => ({
        id,
        name: source.name,
        title: source.title ?? "",
        column: source.column ?? "",
        home: source.home ?? "",
        icon: `/icons/${id.split("-")[0]}.png`,
        redirect: source.redirect ?? "",
        enabled: source.disable ? 0 : 1,
        updated: now,
      }))
  }

  private tableName(kind: SourceKind) {
    return kind === "hot" ? "hot_source" : "feed_source"
  }

  private async seedKindIfNeeded(kind: SourceKind) {
    const expected = this.sourceRows(kind).length
    const table = this.tableName(kind)
    const row = await this.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count?: number } | undefined
    if (Number(row?.count ?? 0) === expected) return
    await this.seedKind(kind)
  }

  private async seedKind(kind: SourceKind) {
    const table = this.tableName(kind)
    const rows = this.sourceRows(kind)

    for (const row of rows) {
      await this.db.prepare(`
        INSERT INTO ${table} (id, name, title, column_id, home, icon, redirect, enabled, updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          title = excluded.title,
          column_id = excluded.column_id,
          home = excluded.home,
          icon = excluded.icon,
          redirect = excluded.redirect,
          enabled = excluded.enabled,
          updated = excluded.updated;
      `).run(row.id, row.name, row.title, row.column, row.home, row.icon, row.redirect, row.enabled, row.updated)
    }
    logger.success(`seed ${table}`)
  }

  async seed() {
    await this.seedKind("feed")
    await this.seedKind("hot")
  }

  async getAll(): Promise<SourceCatalog[]> {
    if (process.env.INIT_TABLE !== "false") {
      await this.seedKindIfNeeded("feed")
      await this.seedKindIfNeeded("hot")
    }
    const rows = this.normalizeRows(await this.db.prepare(`
      SELECT id, name, title, NULL AS type, column_id, home, icon, redirect, enabled, updated, 'feed' AS kind
      FROM feed_source
      WHERE enabled = 1
      UNION ALL
      SELECT id, name, title, 'hottest' AS type, column_id, home, icon, redirect, enabled, updated, 'hot' AS kind
      FROM hot_source
      WHERE enabled = 1
      ORDER BY name COLLATE NOCASE ASC, id ASC
    `).all()) as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      title: row.title || undefined,
      type: row.type || undefined,
      kind: row.kind,
      column: row.column_id || undefined,
      home: row.home || undefined,
      icon: row.icon,
      redirect: row.redirect || undefined,
      enabled: Boolean(row.enabled),
      updated: row.updated,
    }))
  }
}
