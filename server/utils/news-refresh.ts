import process from "node:process"
import type { SourceID } from "@shared/types"
import sources from "@shared/sources"
import { getters } from "#/getters"
import { NewsItemTable } from "#/database/news"
import type { AppDatabase } from "#/utils/database"

export type NewsRefreshResult = {
  total: number
  refreshed: SourceID[]
  skipped: SourceID[]
  failed: { id: SourceID, message: string }[]
  duration: number
}

export function defaultNewsSourceIds() {
  return Object.keys(sources)
    .filter((id): id is SourceID => {
      const sourceId = id as SourceID
      return !!getters[sourceId] && sources[sourceId]?.type !== "hottest" && !sources[sourceId]?.redirect
    })
}

export function normalizeNewsSourceIds(sourceIds?: SourceID[]) {
  const ids = sourceIds?.length ? sourceIds : defaultNewsSourceIds()
  return [...new Set(ids.filter(id => sources[id] && getters[id] && sources[id].type !== "hottest"))] as SourceID[]
}

export async function refreshNewsSources(options: {
  db: AppDatabase
  sourceIds?: SourceID[]
  force?: boolean
  limit?: number
}): Promise<NewsRefreshResult> {
  const startedAt = Date.now()
  const sourceIds = normalizeNewsSourceIds(options.sourceIds)
  const newsTable = new NewsItemTable(options.db)
  if (process.env.INIT_TABLE !== "false") await newsTable.init()

  const lastFetchedAtMap = await newsTable.getLastFetchedAtMap(sourceIds)
  const refreshed: SourceID[] = []
  const skipped: SourceID[] = []
  const failed: NewsRefreshResult["failed"] = []
  const now = Date.now()
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 100)

  await Promise.allSettled(sourceIds.map(async (id) => {
    try {
      const lastFetchedAt = lastFetchedAtMap.get(id) ?? 0
      const stale = options.force || !lastFetchedAt || now - lastFetchedAt > sources[id].interval
      if (!stale) {
        skipped.push(id)
        return
      }

      const data = (await getters[id]()).slice(0, limit)
      if (data.length) await newsTable.upsertItems(id, data)
      refreshed.push(id)
    } catch (error) {
      failed.push({
        id,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }))

  return {
    total: sourceIds.length,
    refreshed,
    skipped,
    failed,
    duration: Date.now() - startedAt,
  }
}

export function scheduleNewsRefresh(event: any, task: Promise<NewsRefreshResult>) {
  if (event.context?.waitUntil) {
    event.context.waitUntil(task)
  } else {
    task.catch(error => logger.error(error))
  }
}
