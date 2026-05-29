import process from "node:process"
import { sources } from "@shared/sources"
import { UserTable } from "#/database/user"

function sanitizeCustomGroups(groups: any[] = []) {
  return groups.map(group => ({
    id: String(group?.id || randomUUID()),
    name: String(group?.name || "分组").slice(0, 5),
    sources: Array.from(new Set((Array.isArray(group?.sources) ? group.sources : [])
      .filter((id: string) => (sources as Record<string, any>)[id] && (sources as Record<string, any>)[id].type !== "hottest"))),
  }))
}

export default defineEventHandler(async (event) => {
  try {
    const { id } = event.context.user
    const db = useAppDatabase()
    if (!db) throw new Error("Not found database")
    const userTable = new UserTable(db as any)
    if (process.env.INIT_TABLE !== "false") await userTable.init()
    if (event.method === "GET") {
      const { data: raw, updated } = await userTable.getData(id)
      const parsed = raw ? JSON.parse(raw) : undefined
      if (!parsed) {
        return { data: undefined, customGroups: undefined, updatedTime: updated }
      }
      // Backward compatible: legacy rows stored only metadata.data.
      if (parsed.data) {
        return {
          data: parsed.data,
          customGroups: sanitizeCustomGroups(parsed.customGroups),
          updatedTime: parsed.updatedTime ?? updated,
        }
      }
      return {
        data: parsed,
        customGroups: [],
        updatedTime: updated,
      }
    } else if (event.method === "POST") {
      const body = await readBody(event)
      verifyPrimitiveMetadata(body)
      const { updatedTime, data, customGroups = [] } = body
      await userTable.setData(id, JSON.stringify({ data, customGroups: sanitizeCustomGroups(customGroups), updatedTime }), updatedTime)
      return {
        success: true,
        updatedTime,
      }
    }
  } catch (e) {
    logger.error(e)
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : "Internal Server Error",
    })
  }
})
