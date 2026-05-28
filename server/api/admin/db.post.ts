const AdminUsername = "admin123"
const AdminPassword = "4598"

function normalizeRows(res: any) {
  return res?.results ?? res?.rows ?? res ?? []
}

function quoteIdentifier(id: string) {
  return `"${id.replaceAll("\"", "\"\"")}"`
}

async function tryAll(db: ReturnType<typeof useDatabase>, sql: string) {
  try {
    return normalizeRows(await db.prepare(sql).all())
  } catch {
    return []
  }
}

async function getTableNames(db: ReturnType<typeof useDatabase>) {
  const queries = [
    `
      SELECT name
      FROM sqlite_schema
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `,
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `,
    `PRAGMA table_list`,
  ]

  for (const query of queries) {
    const rows = await tryAll(db, query) as { name?: string, type?: string }[]
    const names = rows
      .filter(row => !row.type || row.type === "table")
      .map(row => row.name)
      .filter((name): name is string => !!name && !name.startsWith("sqlite_"))
    if (names.length) return Array.from(new Set(names)).sort()
  }

  const knownTables = ["cache", "user"]
  const existing: string[] = []
  for (const name of knownTables) {
    try {
      await db.prepare(`SELECT 1 FROM ${quoteIdentifier(name)} LIMIT 1`).all()
      existing.push(name)
    } catch {
      //
    }
  }
  return existing
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      username?: string
      password?: string
    }>(event)

    if (body.username !== AdminUsername || body.password !== AdminPassword) {
      throw createError({
        statusCode: 401,
        message: "管理员账号或密码错误",
      })
    }

    const db = useDatabase()
    if (!db) throw new Error("db is not defined")

    const tableNames = await getTableNames(db)
    const tables = await Promise.all(tableNames.map(async (name) => {
      try {
        const rowsResult = await db.prepare(`SELECT * FROM ${quoteIdentifier(name)}`).all()
        return {
          name,
          rows: normalizeRows(rowsResult),
        }
      } catch (e) {
        return {
          name,
          rows: [],
          error: e instanceof Error ? e.message : "读取表失败",
        }
      }
    }))

    return {
      updatedTime: Date.now(),
      tables,
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
