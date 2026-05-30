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
