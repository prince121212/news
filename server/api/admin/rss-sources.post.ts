import process from "node:process"
import { RssSourceTable, rssSourceId } from "#/database/rss-source"
import { validateRssUrl } from "#/utils/rss-dynamic"

const ValidColumns = new Set(["china", "world", "tech", "finance"])

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      email?: string
      password?: string
      url?: string
      name?: string
      title?: string
      column?: string
      interval?: number
    }>(event)

    assertAdmin(body)

    const db = useAppDatabase()
    if (!db) throw new Error("db is not defined")
    const table = new RssSourceTable(db)
    if (process.env.INIT_TABLE !== "false") await table.init()

    if (!body.url) {
      return { success: true, sources: await table.getAll() }
    }

    const { url, data } = await validateRssUrl(body.url)
    const id = rssSourceId(url)
    const column = ValidColumns.has(body.column || "") ? body.column : "china"
    const row = await table.upsert({
      id,
      name: (body.name || data.title || "RSS").trim().slice(0, 24),
      title: (body.title || (data.title && body.name ? data.title : "")).trim().slice(0, 32),
      column_id: column,
      home: typeof data.link === "string" ? data.link : url,
      icon: data.image || "/icons/rss.png",
      url,
      original_url: body.url,
      interval: Math.min(Math.max(Number(body.interval || 30 * 60 * 1000), 2 * 60 * 1000), 24 * 60 * 60 * 1000),
      enabled: 1,
    })

    return {
      success: true,
      source: row,
      preview: data.items.slice(0, 5).map(item => ({ title: item.title, created: item.created, link: item.link })),
      sources: await table.getAll(),
    }
  } catch (e) {
    logger.error(e)
    if (e && typeof e === "object" && "statusCode" in e) throw e
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : "RSS 信源接口错误",
    })
  }
})
