import process from "node:process"
import type { SourceID } from "@shared/types"
import { refreshNewsSources } from "#/utils/news-refresh"

export default defineEventHandler(async (event) => {
  const expectedToken = process.env.NEWS_REFRESH_TOKEN || process.env.CRON_SECRET
  if (!expectedToken) {
    throw createError({ statusCode: 500, message: "NEWS_REFRESH_TOKEN is not configured" })
  }

  const query = getQuery(event)
  const token = getHeader(event, "x-refresh-token") || (typeof query.token === "string" ? query.token : "")
  if (token !== expectedToken) {
    throw createError({ statusCode: 401, message: "Invalid refresh token" })
  }

  const body = await readBody<{
    sources?: SourceID[]
    force?: boolean
    limit?: number
  }>(event).catch(() => undefined)

  const db = useAppDatabase()
  if (!db) throw new Error("db is not defined")

  return await refreshNewsSources({
    db,
    sourceIds: body?.sources,
    force: body?.force,
    limit: body?.limit,
  })
})
