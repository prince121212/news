import { createFileRoute } from "@tanstack/react-router"

type AdminTable = {
  name: string
  rows: Record<string, unknown>[]
  error?: string
}

type AdminData = {
  updatedTime: number
  tables: AdminTable[]
}

const TableLabels: Record<string, string> = {
  cache: "缓存表",
  user: "用户表",
}

const ColumnLabels: Record<string, Record<string, string>> = {
  cache: {
    id: "数据源",
    data: "缓存内容",
    updated: "更新时间",
  },
  user: {
    id: "编号",
    username: "用户名",
    password: "密码",
    data: "同步数据",
    type: "账号类型",
    created: "创建时间",
    updated: "更新时间",
  },
}

export const Route = createFileRoute("/admin")({
  component: AdminComponent,
})

function AdminComponent() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [data, setData] = useState<AdminData>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const loadData = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await myFetch("/admin/db", {
        method: "POST",
        body: {
          username,
          password,
        },
      }) as AdminData
      setData(res)
    } catch (e: any) {
      setError(e?.data?.message || e?.message || "读取失败")
    } finally {
      setLoading(false)
    }
  }, [password, username])

  return (
    <div className="mx-auto max-w-1200px px-4 pb-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">数据库</h1>
          <p className="text-sm op-60">管理员查看全部表数据</p>
        </div>
        {data && (
          <button
            type="button"
            className="btn i-ph:arrow-clockwise-duotone text-2xl color-primary"
            title="刷新"
            onClick={() => loadData()}
          />
        )}
      </div>

      {!data && (
        <form
          className="mx-auto mt-18 max-w-360px rounded-lg bg-neutral-400/10 p-4 shadow"
          onSubmit={loadData}
        >
          <div className="mb-4 text-lg font-bold">管理员登录</div>
          <label className="mb-3 flex flex-col gap-1">
            <span className="text-sm op-70">账号</span>
            <input
              className="rounded-md bg-base p-2 outline-none focus:ring-2 focus:ring-primary"
              value={username}
              autoFocus
              onChange={e => setUsername(e.target.value)}
            />
          </label>
          <label className="mb-3 flex flex-col gap-1">
            <span className="text-sm op-70">密码</span>
            <input
              className="rounded-md bg-base p-2 outline-none focus:ring-2 focus:ring-primary"
              value={password}
              type="password"
              onChange={e => setPassword(e.target.value)}
            />
          </label>
          {error && <div className="mb-3 rounded-md bg-red/10 p-2 text-sm color-red">{error}</div>}
          <button
            type="submit"
            className="w-full rounded-md bg-primary p-2 color-white disabled:op-50"
            disabled={loading}
          >
            {loading ? "读取中..." : "查看数据库"}
          </button>
        </form>
      )}

      {data && (
        <div className="flex flex-col gap-6">
          {data.tables.length === 0 && (
            <div className="rounded-lg bg-neutral-400/10 p-4 text-sm op-70">暂无数据表</div>
          )}
          {data.tables.map(table => (
            <section key={table.name} className="rounded-lg bg-neutral-400/10 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">{TableLabels[table.name] ?? table.name}</h2>
                <span className="text-sm op-60">{table.rows.length} 行</span>
              </div>
              {table.error && <div className="mb-3 rounded-md bg-red/10 p-2 text-sm color-red">{table.error}</div>}
              <AdminTableView tableName={table.name} rows={table.rows} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminTableView({ tableName, rows }: { tableName: string, rows: Record<string, unknown>[] }) {
  const columns = useMemo(() => Array.from(new Set(rows.flatMap(row => Object.keys(row)))), [rows])

  if (rows.length === 0) {
    return <div className="rounded-md bg-base/60 p-3 text-sm op-60">空表</div>
  }

  return (
    <div className="overflow-x-auto rounded-md bg-base/60">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-400/20">
            {columns.map(column => (
              <th key={column} className="whitespace-nowrap p-2 font-bold">{ColumnLabels[tableName]?.[column] ?? column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-neutral-400/10 last:border-b-0">
              {columns.map(column => (
                <td key={column} className="max-w-420px p-2 align-top">
                  <AdminCell column={column} value={row[column]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminCell({ column, value }: { column: string, value: unknown }) {
  const [expanded, setExpanded] = useState(false)
  const text = formatCell(value)
  const collapsible = column === "data" && text.length > 80

  if (!collapsible) {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-xs">
        {text}
      </pre>
    )
  }

  return (
    <button
      type="button"
      className="block max-w-420px text-left font-mono text-xs"
      onClick={() => setExpanded(v => !v)}
    >
      <pre className={$(expanded ? "whitespace-pre-wrap" : "max-h-36px overflow-hidden whitespace-pre-wrap", "break-words")}>
        {text}
      </pre>
      <span className="mt-1 inline-block text-xs color-primary">
        {expanded ? "收起" : "展开"}
      </span>
    </button>
  )
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  return JSON.stringify(value, null, 2)
}
