import process from "node:process"
import type { SourceID } from "@shared/types"
import { NewsItemTable } from "#/database/news"
import { refreshNewsSources, resolveNewsSourceIds, scheduleNewsRefresh } from "#/utils/news-refresh"

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      sources?: SourceID[]
      cursor?: number
      limit?: number
      keyword?: string
      refresh?: boolean
    }>(event)
    const db = useAppDatabase()
    if (!db) throw new Error("db is not defined")
    const sourceIds = await resolveNewsSourceIds(db, body.sources)
    const newsTable = new NewsItemTable(db)
    if (process.env.INIT_TABLE !== "false") await newsTable.init()

    const result = await newsTable.query({
      sourceIds,
      limit: body.limit ?? 30,
      cursor: body.cursor,
      keyword: body.keyword,
    })

    // 首屏(无 cursor)总是触发后台抓取；refresh 时强制抓取当前分组所有信源。
    // 抓取不阻塞响应，新内容由前端稍后静默重查取回。
    if (!body.cursor) {
      scheduleNewsRefresh(event, refreshNewsSources({
        db,
        sourceIds,
        force: body.refresh,
      }))
    }

    return result
  } catch (e) {
    logger.error(e)
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : "Internal Server Error",
    })
  }
})
