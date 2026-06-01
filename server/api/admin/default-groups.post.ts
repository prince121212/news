import process from "node:process"
import type { CustomGroup } from "@shared/types"
import { DefaultGroupTable } from "#/database/default-groups"

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      email?: string
      password?: string
      groups?: CustomGroup[]
    }>(event)

    assertAdmin(body)

    const db = useAppDatabase()
    if (!db) throw new Error("db is not defined")
    const table = new DefaultGroupTable(db)
    if (process.env.INIT_TABLE !== "false") await table.init()

    if (Array.isArray(body.groups)) {
      return {
        success: true,
        groups: await table.setGroups(body.groups),
      }
    }

    return {
      success: true,
      groups: await table.getGroups(),
    }
  } catch (e) {
    logger.error(e)
    if (e && typeof e === "object" && "statusCode" in e) throw e
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : "默认分组接口错误",
    })
  }
})
