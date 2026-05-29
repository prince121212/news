import process from "node:process"
import type { AppDatabase } from "#/utils/database"

const AdminUsername = process.env.ADMIN_USERNAME ?? "admin123"
const AdminPassword = process.env.ADMIN_PASSWORD ?? "4598"
const DefaultPageSize = 20
const MaxPageSize = 100

function normalizeRows(res: any) {
  return res?.results ?? res?.rows ?? res ?? []
}

function quoteIdentifier(id: string) {
  return `"${id.replaceAll("\"", "\"\"")}"`
}

async function tryAll(db: AppDatabase, sql: string) {
  try {
    return normalizeRows(await db.prepare(sql).all())
  } catch {
    return []
  }
}

async function getTableNames(db: AppDatabase) {
  const rows = await tryAll(db, `
    SELECT name
    FROM sqlite_schema
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `) as { name?: string }[]
  const names = rows.map(row => row.name).filter((name): name is string => !!name && !name.startsWith("_cf_"))
  if (names.length) return Array.from(new Set(names)).sort()

  const knownTables = ["cache", "feed_source", "hot_source", "news_item", "user"]
  const existing: string[] = []
  for (const name of knownTables) {
    try {
      await db.prepare(`SELECT 1 FROM ${quoteIdentifier(name)} LIMIT 1`).all()
      existing.push(name)
    } catch {
      // noop
    }
  }
  return existing
}

async function countRows(db: AppDatabase, table: string) {
  const row = await db.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`).get() as { count?: number } | undefined
  return Number(row?.count ?? 0)
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      username?: string
      password?: string
      table?: string
      page?: number
      pageSize?: number
    }>(event)

    if (body.username !== AdminUsername || body.password !== AdminPassword) {
      throw createError({ statusCode: 401, message: "管理员账号或密码错误" })
    }

    const db = useAppDatabase()
    if (!db) throw new Error("db is not defined")

    const tableNames = await getTableNames(db)
    const table = body.table && tableNames.includes(body.table) ? body.table : tableNames[0]
    const pageSize = Math.min(Math.max(Number(body.pageSize || DefaultPageSize), 1), MaxPageSize)
    const page = Math.max(Number(body.page || 1), 1)
    const offset = (page - 1) * pageSize

    if (!table) {
      return { updatedTime: Date.now(), tableNames, table: undefined, page, pageSize, total: 0, rows: [] }
    }

    const total = await countRows(db, table)
    const rowsResult = await db.prepare(`SELECT * FROM ${quoteIdentifier(table)} LIMIT ? OFFSET ?`).all(pageSize, offset)

    return {
      updatedTime: Date.now(),
      tableNames,
      table,
      page,
      pageSize,
      total,
      rows: normalizeRows(rowsResult),
    }
  } catch (e) {
    logger.error(e)
    if (e && typeof e === "object" && "statusCode" in e) throw e
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : "管理员接口错误",
    })
  }
})
