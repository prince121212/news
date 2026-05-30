import { Link, createFileRoute } from "@tanstack/react-router"
import type { CustomGroup, SourceCatalog, SourceID } from "@shared/types"
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
  default_group: "默认分组",
  _cf_KV: "系统数据",
}

const HiddenColumns = new Set(["password"])

const DefaultColumnWidth = 160
const MinAdminTableWidth = 1600

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
  default_group: { id: "ID", name: "分组名", sources: "默认信源", sort_order: "排序", enabled: "启用", updated: "更新时间" },
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
            <span className="aihot-admin-version">V0.0.2</span>
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
            <AdminDefaultGroups username={username} password={password} />
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


function AdminDefaultGroups({ username, password }: { username: string, password: string }) {
  const [groups, setGroups] = useState<CustomGroup[]>([])
  const [catalog, setCatalog] = useState<SourceCatalog[]>([])
  const [activeId, setActiveId] = useState("")
  const [newName, setNewName] = useState("")
  const [keyword, setKeyword] = useState("")
  const [selectedOnly, setSelectedOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [rssUrl, setRssUrl] = useState("")
  const [rssColumn, setRssColumn] = useState("china")
  const [rssName, setRssName] = useState("")
  const active = groups.find(group => group.id === activeId) ?? groups[0]

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setMessage("")
    try {
      const [groupRes, catalogRes] = await Promise.all([
        myFetch<{ groups: CustomGroup[] }>("/admin/default-groups", { method: "POST", body: { username, password } }),
        myFetch<SourceCatalog[]>("/sources/catalog"),
      ])
      setGroups(groupRes.groups ?? [])
      setCatalog(catalogRes ?? [])
      setActiveId(groupRes.groups?.[0]?.id ?? "")
    } catch (e: any) {
      setMessage(e?.data?.message || e?.message || "默认分组读取失败")
    } finally {
      setLoading(false)
    }
  }, [password, username])

  useEffect(() => { loadGroups() }, [loadGroups])

  const addRssSource = async () => {
    if (!rssUrl.trim()) return
    setLoading(true)
    setMessage("")
    try {
      const res = await myFetch<{ source: SourceCatalog }>("/admin/rss-sources", { method: "POST", body: { username, password, url: rssUrl, column: rssColumn, name: rssName || undefined } })
      setMessage(`RSS 信源已添加：${res.source?.name ?? rssUrl}`)
      setRssUrl("")
      setRssName("")
      const catalogRes = await myFetch<SourceCatalog[]>("/sources/catalog")
      setCatalog(catalogRes ?? [])
    } catch (e: any) {
      setMessage(e?.data?.message || e?.message || "RSS 信源添加失败")
    } finally {
      setLoading(false)
    }
  }

  const saveGroups = async () => {
    setLoading(true)
    setMessage("")
    try {
      const res = await myFetch<{ groups: CustomGroup[] }>("/admin/default-groups", { method: "POST", body: { username, password, groups } })
      setGroups(res.groups ?? [])
      setActiveId(id => (res.groups ?? []).some(group => group.id === id) ? id : (res.groups?.[0]?.id ?? ""))
      setMessage("默认分组已保存，新用户和未初始化用户会使用这套配置。")
    } catch (e: any) {
      setMessage(e?.data?.message || e?.message || "默认分组保存失败")
    } finally {
      setLoading(false)
    }
  }

  const addGroup = () => {
    const name = newName.trim().slice(0, 8)
    if (!name) return
    const group = { id: `group-${Date.now().toString(36)}`, name, sources: [] as SourceID[] }
    setGroups([...groups, group])
    setActiveId(group.id)
    setNewName("")
  }

  const updateActive = (patch: Partial<CustomGroup>) => {
    if (!active) return
    setGroups(groups.map(group => group.id === active.id ? { ...group, ...patch } : group))
  }

  const deleteGroup = (id: string) => {
    const group = groups.find(item => item.id === id)
    if (!group || !confirm(`确认删除默认分组「${group.name}」？`)) return
    const next = groups.filter(item => item.id !== id)
    setGroups(next)
    setActiveId(next[0]?.id ?? "")
  }

  const moveGroup = (id: string, offset: number) => {
    const index = groups.findIndex(group => group.id === id)
    const target = index + offset
    if (index < 0 || target < 0 || target >= groups.length) return
    const next = [...groups]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setGroups(next)
  }

  const sourceList = catalog.filter(source => !source.redirect && source.type !== "hottest")
  const filteredSources = sourceList.filter(source => {
    const text = `${source.id}${source.name}${source.title ?? ""}`.toLowerCase()
    const matched = !keyword || text.includes(keyword.toLowerCase())
    const selected = !!active?.sources.includes(source.id)
    return matched && (!selectedOnly || selected)
  })

  const toggleSource = (id: SourceID) => {
    if (!active) return
    updateActive({
      sources: active.sources.includes(id) ? active.sources.filter(source => source !== id) : [...active.sources, id],
    })
  }

  return (
    <section className="aihot-admin-card aihot-admin-default-groups">
      <div className="aihot-admin-card-head">
        <div>
          <h2>默认分组配置</h2>
          <span>修改默认分组名称、顺序和每组默认信源。保存后影响新用户/未初始化用户。</span>
        </div>
        <div className="aihot-admin-actions">
          <button className="aihot-admin-link" disabled={loading} onClick={loadGroups}>重载</button>
          <button className="aihot-admin-save" disabled={loading} onClick={saveGroups}>{loading ? "处理中" : "保存默认分组"}</button>
        </div>
      </div>
      {message && <div className="aihot-admin-message">{message}</div>}
      <div className="aihot-admin-rss-add">
        <input className="aihot-input" value={rssUrl} onChange={e => setRssUrl(e.target.value)} placeholder="标准 RSS 地址或 rsshub://..." />
        <input className="aihot-input" value={rssName} onChange={e => setRssName(e.target.value)} placeholder="信源名（可选）" />
        <select className="aihot-input" value={rssColumn} onChange={e => setRssColumn(e.target.value)}>
          <option value="china">国内</option>
          <option value="world">国际</option>
          <option value="tech">科技</option>
          <option value="finance">财经</option>
        </select>
        <button className="aihot-admin-save" disabled={loading || !rssUrl.trim()} onClick={addRssSource}>校验并添加 RSS 信源</button>
      </div>
      <div className="aihot-admin-default-grid">
        <div className="aihot-admin-default-side">
          <div className="aihot-group-list">
            {groups.map((group, index) => <div key={group.id} className={$("aihot-group-row", active?.id === group.id && "active")}>
              <button className="aihot-group-name" onClick={() => setActiveId(group.id)}>{group.name}</button>
              <span className="aihot-count">{group.sources.length} 源</span>
              <button className="aihot-mini" disabled={index === 0} onClick={() => moveGroup(group.id, -1)}>↑</button>
              <button className="aihot-mini" disabled={index === groups.length - 1} onClick={() => moveGroup(group.id, 1)}>↓</button>
              <button className="aihot-delete" aria-label={`删除${group.name}`} onClick={() => deleteGroup(group.id)}>×</button>
            </div>)}
          </div>
          <div className="aihot-add">
            <input className="aihot-input" maxLength={8} value={newName} onChange={e => setNewName(e.target.value)} placeholder="新默认分组" />
            <button className="aihot-primary" onClick={addGroup}>添加</button>
          </div>
        </div>
        <div className="aihot-admin-default-editor">
          {active
            ? <>
                <label className="aihot-field compact"><span>分组名</span><input maxLength={8} value={active.name} onChange={e => updateActive({ name: e.target.value.slice(0, 8) })} /></label>
                <div className="aihot-source-toolbar"><input className="aihot-input" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索信源" /><button className={$("aihot-filter", selectedOnly && "active")} onClick={() => setSelectedOnly(!selectedOnly)}>只看已选</button></div>
                <div className="aihot-selected-strip">{active.sources.map(id => <span className="aihot-tag" key={id}>{catalog.find(source => source.id === id)?.name ?? id}</span>)}</div>
                <div className="aihot-source-grid admin">{filteredSources.map(source => <button key={source.id} className={$("aihot-source-check", active.sources.includes(source.id) && "selected")} onClick={() => toggleSource(source.id)}><span className="aihot-check">{active.sources.includes(source.id) ? "✓" : ""}</span><span>{source.name}{source.title ? ` · ${source.title}` : ""}</span></button>)}</div>
              </>
            : <div className="aihot-admin-empty">暂无默认分组，请先添加。</div>}
        </div>
      </div>
    </section>
  )
}

function AdminTableView({ tableName, rows }: { tableName: string, rows: Record<string, unknown>[] }) {
  const columns = useMemo(() => Array.from(new Set(rows.flatMap(row => Object.keys(row)))).filter(column => !HiddenColumns.has(column)), [rows])
  const tableWidth = useMemo(() => Math.max(
    MinAdminTableWidth,
    columns.reduce((sum, column) => sum + (ColumnWidths[column] ?? DefaultColumnWidth), 0),
  ), [columns])
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
  if (compact.length <= 20) return compact
  return `${compact.slice(0, 20)}...`
}

function formatCell(column: string, value: unknown) {
  if (value === null || value === undefined) return ""
  if (["updated", "created", "updated_at", "fetched_at", "pub_date"].includes(column) && typeof value === "number") return new Date(value).toLocaleString("zh-CN")
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value }
  }
  return JSON.stringify(value, null, 2)
}
