import process from "node:process"
import type { SourceID } from "@shared/types"
import { getters } from "#/getters"
import { NewsItemTable } from "#/database/news"

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      sources?: SourceID[]
      cursor?: number
      limit?: number
      keyword?: string
      refresh?: boolean
    }>(event)
    const sourceIds = [...new Set((body.sources ?? [])
      .filter(id => sources[id] && getters[id] && sources[id].type !== "hottest"))] as SourceID[]

    const db = useAppDatabase()
    if (!db) throw new Error("db is not defined")
    const newsTable = new NewsItemTable(db)
    if (process.env.INIT_TABLE !== "false") await newsTable.init()

    await Promise.allSettled(sourceIds.map(async (id) => {
      const lastFetchedAt = await newsTable.getLastFetchedAt(id)
      const stale = body.refresh || !lastFetchedAt || Date.now() - lastFetchedAt > sources[id].interval
      if (!stale) return
      const data = (await getters[id]()).slice(0, 30)
      await newsTable.upsertItems(id, data)
    }))

    return await newsTable.query({
      sourceIds,
      limit: body.limit ?? 30,
      cursor: body.cursor,
      keyword: body.keyword,
    })
  } catch (e) {
    logger.error(e)
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : "Internal Server Error",
    })
  }
})
