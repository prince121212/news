import process from "node:process"
import { SourceCatalogTable } from "#/database/source"

export default defineEventHandler(async () => {
  try {
    const db = useAppDatabase()
    if (!db) throw new Error("db is not defined")
    const sourceTable = new SourceCatalogTable(db)
    if (process.env.INIT_TABLE !== "false") await sourceTable.init()
    return await sourceTable.getAll()
  } catch (e) {
    logger.error(e)
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : "Internal Server Error",
    })
  }
})
