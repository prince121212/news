const AdminUsername = "admin123"
const AdminPassword = "4598"

function normalizeRows(res: any) {
  return res?.results ?? res?.rows ?? res ?? []
}

function quoteIdentifier(id: string) {
  return `"${id.replaceAll("\"", "\"\"")}"`
}

export default defineEventHandler(async (event) => {
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

  const tableResult = await db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all()

  const tableRows = normalizeRows(tableResult) as { name: string }[]

  const tables = await Promise.all(tableRows.map(async ({ name }) => {
    const rowsResult = await db.prepare(`SELECT * FROM ${quoteIdentifier(name)}`).all()
    return {
      name,
      rows: normalizeRows(rowsResult),
    }
  }))

  return {
    updatedTime: Date.now(),
    tables,
  }
})
