import process from "node:process"
import { DefaultGroupTable } from "#/database/default-groups"

export default defineEventHandler(async () => {
  try {
    const db = useAppDatabase()
    if (!db) throw new Error("db is not defined")
    const table = new DefaultGroupTable(db)
    if (process.env.INIT_TABLE !== "false") await table.init()
    return await table.getGroups()
  } catch (e) {
    logger.error(e)
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : "Internal Server Error",
    })
  }
})
