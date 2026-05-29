import md5 from "md5"
import type { NewsItem, SourceID } from "@shared/types"
import type { AppDatabase } from "#/utils/database"

type NewsItemRow = {
  id: string
  source_id: SourceID
  source_name?: string
  source_avatar_url?: string
  collector_source_id?: SourceID
  original_id: string
  title: string
  url: string
  mobile_url?: string
  summary?: string
  content?: string
  cover_url?: string
  video_url?: string
  tag?: string
  tags?: string
  pub_date?: number
  fetched_at: number
  updated_at: number
  raw_extra?: string
}

function normalizeRows(res: any) {
  return res?.results ?? res?.rows ?? res ?? []
}

function toTime(value: unknown) {
  if (!value) return 0
  const n = typeof value === "number" ? value : new Date(String(value)).getTime()
  return Number.isFinite(n) ? n : 0
}

function firstUrl(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === "string") return /^https?:\/\//.test(value) ? value : undefined
  if (typeof value === "object" && value && "url" in value) return firstUrl((value as { url?: unknown }).url)
}

function getSummary(item: NewsItem) {
  if (item.summary) return item.summary
  if (item.content) return item.content.slice(0, 500)
  if (typeof item.extra?.info === "string") return item.extra.info
  if (typeof item.extra?.hover === "string") return item.extra.hover
  return ""
}

function getCoverUrl(item: NewsItem) {
  return item.coverUrl || firstUrl(item.extra?.icon)
}

function getVideoUrl(item: NewsItem) {
  return item.videoUrl
}

function itemKey(item: NewsItem) {
  return md5(item.url || String(item.id))
}

function rowToItem(row: NewsItemRow): NewsItem & { source: SourceID, sourceId: SourceID, fetchedAt: number, coverUrl?: string, videoUrl?: string } {
  return {
    id: row.original_id || row.id,
    title: row.title,
    url: row.url,
    mobileUrl: row.mobile_url || undefined,
    pubDate: row.pub_date || undefined,
    source: row.source_id,
    sourceId: row.source_id,
    sourceName: row.source_name || undefined,
    sourceAvatarUrl: row.source_avatar_url || undefined,
    collectorSourceId: row.collector_source_id || undefined,
    fetchedAt: row.fetched_at,
    summary: row.summary || undefined,
    content: row.content || undefined,
    coverUrl: row.cover_url || undefined,
    videoUrl: row.video_url || undefined,
    tag: row.tag || undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    extra: row.raw_extra ? JSON.parse(row.raw_extra) : undefined,
  }
}

export class NewsItemTable {
  private db
  constructor(db: AppDatabase) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS news_item (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        source_name TEXT,
        source_avatar_url TEXT,
        collector_source_id TEXT,
        original_id TEXT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        mobile_url TEXT,
        summary TEXT,
        content TEXT,
        cover_url TEXT,
        video_url TEXT,
        tag TEXT,
        tags TEXT,
        pub_date INTEGER,
        fetched_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        raw_extra TEXT,
        UNIQUE(url)
      );
    `).run()
    await this.migrate()
    await this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_news_item_source_time ON news_item(source_id, pub_date DESC, fetched_at DESC);`).run()
    await this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_news_item_time ON news_item(pub_date DESC, fetched_at DESC);`).run()
    await this.ensureUniqueUrlIndex()
    logger.success("init news item table")
  }


  private async ensureUniqueUrlIndex() {
    const duplicateRows = normalizeRows(await this.db.prepare(`
      SELECT url, COUNT(*) AS count
      FROM news_item
      GROUP BY url
      HAVING COUNT(*) > 1
    `).all()) as { url: string, count: number }[]
    for (const row of duplicateRows) {
      await this.db.prepare(`
        DELETE FROM news_item
        WHERE url = ?
          AND id NOT IN (
            SELECT id FROM news_item WHERE url = ? ORDER BY updated_at DESC, fetched_at DESC LIMIT 1
          )
      `).run(row.url, row.url)
    }
    await this.db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_news_item_url_unique ON news_item(url);`).run()
  }

  private async migrate() {
    const columns = normalizeRows(await this.db.prepare(`PRAGMA table_info(news_item)`).all()) as { name: string }[]
    const columnNames = columns.map(column => column.name)
    if (!columnNames.includes("collector_source_id")) {
      await this.db.prepare(`ALTER TABLE news_item ADD COLUMN collector_source_id TEXT`).run()
    }
    if (!columnNames.includes("source_name")) {
      await this.db.prepare(`ALTER TABLE news_item ADD COLUMN source_name TEXT`).run()
    }
    if (!columnNames.includes("source_avatar_url")) {
      await this.db.prepare(`ALTER TABLE news_item ADD COLUMN source_avatar_url TEXT`).run()
    }
    if (!columnNames.includes("tag")) {
      await this.db.prepare(`ALTER TABLE news_item ADD COLUMN tag TEXT`).run()
    }
    if (!columnNames.includes("tags")) {
      await this.db.prepare(`ALTER TABLE news_item ADD COLUMN tags TEXT`).run()
    }
  }

  async upsertItems(sourceId: SourceID, items: NewsItem[], collectorSourceId?: SourceID) {
    const now = Date.now()
    for (const item of items) {
      if (!item.title || !item.url) continue
      const pubDate = toTime(item.pubDate || item.extra?.date) || now
      const visibleSourceId = item.sourceId ?? sourceId
      const collector = item.sourceId && item.sourceId !== sourceId ? sourceId : collectorSourceId
      const tags = item.tags?.length ? [...new Set(item.tags.filter(Boolean))] : (item.tag ? [item.tag] : [])
      await this.db.prepare(`
        INSERT INTO news_item (id, source_id, source_name, source_avatar_url, collector_source_id, original_id, title, url, mobile_url, summary, content, cover_url, video_url, tag, tags, pub_date, fetched_at, updated_at, raw_extra)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(url) DO UPDATE SET
          source_id = excluded.source_id,
          source_name = excluded.source_name,
          source_avatar_url = excluded.source_avatar_url,
          collector_source_id = excluded.collector_source_id,
          title = excluded.title,
          mobile_url = excluded.mobile_url,
          summary = excluded.summary,
          content = excluded.content,
          cover_url = excluded.cover_url,
          video_url = excluded.video_url,
          tag = excluded.tag,
          tags = excluded.tags,
          pub_date = excluded.pub_date,
          fetched_at = excluded.fetched_at,
          updated_at = excluded.updated_at,
          raw_extra = excluded.raw_extra;
      `).run(
        itemKey(item),
        visibleSourceId,
        item.sourceName ?? "",
        item.sourceAvatarUrl ?? "",
        collector && collector !== visibleSourceId ? collector : "",
        String(item.id),
        item.title,
        item.url,
        item.mobileUrl ?? "",
        getSummary(item),
        item.content ?? "",
        getCoverUrl(item) ?? "",
        getVideoUrl(item) ?? "",
        item.tag ?? tags[0] ?? "",
        tags.length ? JSON.stringify(tags) : "",
        pubDate,
        now,
        now,
        item.extra ? JSON.stringify(item.extra) : "",
      )
    }
    logger.success(`upsert ${sourceId} news items`)
  }

  async getLastFetchedAt(sourceId: SourceID) {
    const row = await this.db.prepare(`SELECT MAX(fetched_at) AS fetched_at FROM news_item WHERE source_id = ?`).get(sourceId) as { fetched_at?: number } | undefined
    return Number(row?.fetched_at ?? 0)
  }

  async query(options: { sourceIds: SourceID[], limit: number, cursor?: number, keyword?: string }) {
    const ids = options.sourceIds
    if (!ids.length) return { items: [], nextCursor: undefined }
    const limit = Math.min(Math.max(options.limit || 30, 1), 100)
    const clauses = [`source_id IN (${ids.map(() => "?").join(",")})`]
    const params: unknown[] = [...ids]
    if (options.cursor) {
      clauses.push(`COALESCE(pub_date, fetched_at) < ?`)
      params.push(options.cursor)
    }
    if (options.keyword?.trim()) {
      clauses.push(`(title LIKE ? OR summary LIKE ? OR content LIKE ?)`)
      const keyword = `%${options.keyword.trim()}%`
      params.push(keyword, keyword, keyword)
    }
    params.push(limit + 1)
    const rows = normalizeRows(await this.db.prepare(`
      SELECT * FROM news_item
      WHERE ${clauses.join(" AND ")}
      ORDER BY COALESCE(pub_date, fetched_at) DESC, fetched_at DESC
      LIMIT ?
    `).all(...params)) as NewsItemRow[]
    const pageRows = rows.slice(0, limit)
    const last = pageRows.at(-1)
    return {
      items: pageRows.map(rowToItem),
      nextCursor: rows.length > limit && last ? (last.pub_date || last.fetched_at) : undefined,
    }
  }
}
