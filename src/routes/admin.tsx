import { Link, createFileRoute } from "@tanstack/react-router"
import "~/components/aihot/style.css"

type AdminData = {
  updatedTime: number
  tableNames: string[]
  table?: string
  page: number
  pageSize: number
  total: number
  rows: Record<string, unknown>[]
}

const TableLabels: Record<string, string> = {
  cache: "内容缓存",
  user: "用户数据",
  feed_source: "信息流信源",
  hot_source: "热搜信源",
  news_item: "信息流内容",
  _cf_KV: "系统数据",
}

const HiddenColumns = new Set(["password"])

const DefaultColumnWidth = 160

const ColumnWidths: Record<string, number> = {
  id: 140,
  enabled: 96,
  type: 120,
  column_id: 120,
  tag: 120,
  tags: 180,
  source_id: 120,
  source_name: 160,
  collector_source_id: 120,
  original_id: 180,
  title: 280,
  username: 180,
  name: 160,
  home: 260,
  url: 320,
  mobile_url: 320,
  icon: 260,
  source_avatar_url: 260,
  cover_url: 280,
  video_url: 280,
  summary: 360,
  content: 420,
  data: 420,
  raw_extra: 360,
  pub_date: 180,
  fetched_at: 180,
  updated_at: 180,
  updated: 180,
  created: 180,
}

const ColumnLabels: Record<string, Record<string, string>> = {
  cache: { id: "信源", data: "内容", updated: "更新时间" },
  user: { id: "编号", username: "用户名", data: "同步数据", type: "账号类型", created: "创建时间", updated: "更新时间" },
  feed_source: { id: "ID", name: "名称", title: "副标题", column_id: "分类", home: "主页", icon: "图标", redirect: "跳转", enabled: "启用", updated: "更新时间" },
  hot_source: { id: "ID", name: "名称", title: "副标题", column_id: "分类", home: "主页", icon: "图标", redirect: "跳转", enabled: "启用", updated: "更新时间" },
  news_item: { id: "ID", source_id: "信源", source_name: "信源名称", source_avatar_url: "信源头像", collector_source_id: "获取源", tag: "标签", tags: "标签组", original_id: "原始ID", title: "标题", url: "链接", mobile_url: "移动端链接", summary: "摘要", content: "正文", cover_url: "封面", video_url: "视频", pub_date: "发布时间", fetched_at: "抓取时间", updated_at: "更新时间", raw_extra: "扩展数据" },
}

export const Route = createFileRoute("/admin")({ component: AdminComponent })

function AdminComponent() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [data, setData] = useState<AdminData>()
  const [activeTable, setActiveTable] = useState("")
  const [page, setPage] = useState(1)
  const [jumpPage, setJumpPage] = useState("1")
  const [pageSize] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const loadData = useCallback(async (targetTable = activeTable, targetPage = page, e?: React.FormEvent, targetPageSize = pageSize) => {
    e?.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await myFetch("/admin/db", { method: "POST", body: { username, password, table: targetTable || undefined, page: targetPage, pageSize: targetPageSize ?? 50 } }) as AdminData
      setData(res)
      setActiveTable(res.table ?? "")
      setPage(res.page)
      setJumpPage(String(res.page))
    } catch (e: any) {
      setError(e?.data?.message || e?.message || "读取失败")
    } finally {
      setLoading(false)
    }
  }, [activeTable, page, password, username])

  const switchTable = (table: string) => {
    setActiveTable(table)
    setPage(1)
    loadData(table, 1)
  }

  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1

  const goToPage = (targetPage: number) => {
    if (!data || loading) return
    const next = Math.min(Math.max(Math.trunc(targetPage) || 1, 1), totalPages)
    setPage(next)
    setJumpPage(String(next))
    loadData(activeTable, next)
  }

  const submitJumpPage = (e: React.FormEvent) => {
    e.preventDefault()
    goToPage(Number(jumpPage))
  }

  return (
    <div className="aihot-app">
      <main className="aihot-admin-main">
        <section className="aihot-admin-hero">
          <div>
            <h1>管理员</h1>
            <p>数据库与系统数据查看</p>
          </div>
          <div className="aihot-admin-actions">
            <span className="aihot-admin-version">V0.0.1</span>
            <Link to="/" className="aihot-admin-link">返回首页</Link>
            {data && (
              <button
                type="button"
                className="aihot-refresh aihot-admin-refresh"
                title="刷新当前表格"
                aria-label="刷新当前表格"
                disabled={loading}
                onClick={() => loadData(data.table ?? activeTable, data.page ?? page)}
              >
                ↻
              </button>
            )}
          </div>
        </section>

        {!data && (
          <form className="aihot-admin-login" onSubmit={e => loadData(activeTable, 1, e)}>
            <h2>管理员登录</h2>
            <label className="aihot-field"><span>账号</span><input value={username} autoFocus onChange={e => setUsername(e.target.value)} /></label>
            <label className="aihot-field"><span>密码</span><input value={password} type="password" onChange={e => setPassword(e.target.value)} /></label>
            {error && <div className="aihot-error">{error}</div>}
            <button className="aihot-admin-submit" disabled={loading}>{loading ? "读取中" : "进入管理后台"}</button>
          </form>
        )}

        {data && (
          <div className="aihot-admin-tables">
            <div className="aihot-admin-tabs">
              {data.tableNames.map(table => <button key={table} className={$(activeTable === table && "active")} disabled={loading} onClick={() => switchTable(table)}>{TableLabels[table] ?? table}</button>)}
            </div>
            {error && <div className="aihot-error">{error}</div>}
            <section className="aihot-admin-card">
              <div className="aihot-admin-card-head">
                <h2>{TableLabels[data.table ?? ""] ?? data.table}</h2>
                <span>第 {data.page} / {totalPages} 页，共 {data.total} 条</span>
              </div>
              <AdminTableView tableName={data.table ?? ""} rows={data.rows} />
              <div className="aihot-admin-pager">
                <button disabled={loading || page <= 1} onClick={() => goToPage(1)}>首页</button>
                <button disabled={loading || page <= 1} onClick={() => goToPage(page - 1)}>上一页</button>
                <span className="aihot-admin-pager-info">每页 50 条</span>
                <form className="aihot-admin-page-jump" onSubmit={submitJumpPage}>
                  <span>跳至</span>
                  <input
                    value={jumpPage}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label="跳转页码"
                    disabled={loading}
                    onChange={e => setJumpPage(e.target.value.replace(/\D/g, ""))}
                  />
                  <span>页</span>
                  <button disabled={loading || !jumpPage}>跳转</button>
                </form>
                <button disabled={loading || page >= totalPages} onClick={() => goToPage(page + 1)}>下一页</button>
                <button disabled={loading || page >= totalPages} onClick={() => goToPage(totalPages)}>尾页</button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function AdminTableView({ tableName, rows }: { tableName: string, rows: Record<string, unknown>[] }) {
  const columns = useMemo(() => Array.from(new Set(rows.flatMap(row => Object.keys(row)))).filter(column => !HiddenColumns.has(column)), [rows])
  const tableWidth = useMemo(() => columns.reduce((sum, column) => sum + (ColumnWidths[column] ?? DefaultColumnWidth), 0), [columns])
  if (!rows.length) return <div className="aihot-admin-empty">暂无数据</div>
  return (
    <div className="aihot-admin-table-wrap">
      <table className="aihot-admin-table" style={{ width: tableWidth, minWidth: "100%" }}>
        <colgroup>
          {columns.map(column => <col key={column} style={{ width: ColumnWidths[column] ?? DefaultColumnWidth }} />)}
        </colgroup>
        <thead><tr>{columns.map(column => <th key={column}>{ColumnLabels[tableName]?.[column] ?? column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{columns.map(column => <td key={column}><AdminCell column={column} value={row[column]} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

function AdminCell({ column, value }: { column: string, value: unknown }) {
  const [expanded, setExpanded] = useState(false)
  const text = formatCell(column, value)
  const preview = previewCell(text)
  const collapsible = preview !== text
  if (!collapsible) return <pre title={text}>{text}</pre>
  return (
    <button
      className={$("aihot-admin-cell-toggle", expanded && "expanded")}
      title={text}
      onClick={() => setExpanded(v => !v)}
    >
      <span className="aihot-admin-cell-text">{expanded ? text : preview}</span>
      <span className="aihot-admin-cell-hint">{expanded ? "收起" : "查看"}</span>
    </button>
  )
}

function previewCell(text: string) {
  const compact = text.replace(/\s+/g, " ").trim()
  if (!compact) return ""
  if (compact.length <= 8) return compact
  return `${compact.slice(0, 5)}...`
}

function formatCell(column: string, value: unknown) {
  if (value === null || value === undefined) return ""
  if (["updated", "created", "updated_at", "fetched_at", "pub_date"].includes(column) && typeof value === "number") return new Date(value).toLocaleString("zh-CN")
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value }
  }
  return JSON.stringify(value, null, 2)
}
