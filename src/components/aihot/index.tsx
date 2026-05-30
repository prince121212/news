import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Suspense, lazy } from "react"
import { createPortal } from "react-dom"
import type { CustomGroup, NewsItem, SourceCatalog, SourceID, SourceResponse } from "@shared/types"
import { customGroupsAtom } from "~/atoms"
import { primitiveMetadataAtom } from "~/atoms/primitiveMetadataAtom"
import "./style.css"

const DotLottieReact = lazy(() => import("@lottiefiles/dotlottie-react").then(module => ({ default: module.DotLottieReact })))

const FEED_COPY: Record<string, [string, string]> = {
  all: ["全部动态", "所有已选信源的最新内容"],
  hottest: ["热搜", "各平台热搜排行"],
  settings: ["设置", "偏好设置与信源管理"],
}

type Feed = "all" | "hottest" | `group:${string}` | "settings"
type CatalogMap = Partial<Record<SourceID, SourceCatalog>>

function fallbackSource(id: SourceID): SourceCatalog {
  const source = sources[id]
  return {
    id,
    name: source?.name ?? id,
    title: source?.title,
    type: source?.type,
    column: source?.column,
    home: source?.home,
    icon: `/icons/${id.split("-")[0]}.png`,
    redirect: source?.redirect,
    enabled: !source?.disable,
  }
}

function getSourceInfo(id: SourceID, catalogMap: CatalogMap) {
  return catalogMap[id] ?? fallbackSource(id)
}

function useSourceCatalog() {
  const query = useQuery({
    queryKey: ["source-catalog"],
    queryFn: () => myFetch<SourceCatalog[]>("/sources/catalog"),
    staleTime: Infinity,
    retry: false,
  })
  return query.data ?? []
}

function useSourceCatalogMap() {
  const catalog = useSourceCatalog()
  return useMemo(() => typeSafeObjectFromEntries(catalog.map(item => [item.id, item])) as CatalogMap, [catalog])
}

function relative(date?: string | number) {
  if (!date) return ""
  const t = new Date(date).getTime()
  if (!Number.isFinite(t)) return ""
  const diff = Math.max(0, Date.now() - t)
  const m = Math.floor(diff / 60000)
  if (m < 1) return "刚刚"
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

function itemTime(item: NewsItem) {
  return item.pubDate || item.extra?.date || 0
}

function clock(item: NewsItem) {
  const t = new Date(itemTime(item)).getTime()
  if (!Number.isFinite(t)) return "--:--"
  return new Date(t).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function summary(item: NewsItem) {
  if (item.summary) return item.summary
  if (item.content) return item.content.slice(0, 240)
  const info = item.extra?.info
  if (typeof info === "string") return info
  return item.extra?.hover || ""
}

async function fetchSource(id: SourceID, latest = false) {
  const res: SourceResponse = await myFetch(`/s?id=${id}${latest ? "&latest" : ""}`)
  cacheSources.set(id, res)
  return res
}

type TimelineNewsItem = NewsItem & { sourceId: SourceID, source?: SourceID, fetchedAt?: number }
interface NewsPage {
  items: TimelineNewsItem[]
  nextCursor?: number
}

async function fetchNewsPage(payload: { sources: SourceID[], keyword?: string, cursor?: number, limit?: number, refresh?: boolean }) {
  return await myFetch<NewsPage>("/news", {
    method: "POST",
    body: payload,
  })
}

function useSourceQueries(ids: SourceID[]) {
  return useQueries({
    queries: ids.map(id => ({
      queryKey: ["source", id],
      queryFn: () => fetchSource(id),
      placeholderData: () => cacheSources.get(id),
      staleTime: Infinity,
      retry: false,
    })),
  })
}

function normalizeGroupName(name: string) {
  return name.trim().slice(0, 8)
}

function LoadingAnimation({ label = "加载中" }: { label?: string }) {
  return (
    <div className="aihot-loading" role="status" aria-label={label}>
      <Suspense fallback={<div className="aihot-loading-lottie fallback" />}>
        <DotLottieReact src="/animations/loading.lottie" loop autoplay className="aihot-loading-lottie" />
      </Suspense>
      <span>{label}</span>
    </div>
  )
}

export function AiHotApp() {
  const { isDark, toggleDark } = useDark()
  const [feed, setFeed] = useState<Feed>("all")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [timelineKeyword, setTimelineKeyword] = useState("")
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [refreshState, setRefreshState] = useState<"idle" | "refreshing" | "has-update">("idle")
  const [primitiveMetadata, setPrimitiveMetadata] = useAtom(primitiveMetadataAtom)
  const groups = primitiveMetadata.customGroups
  const defaultGroups = useQuery({
    queryKey: ["default-groups"],
    queryFn: () => myFetch<CustomGroup[]>("/default-groups"),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  useEffect(() => {
    if (primitiveMetadata.updatedTime !== 0 || !defaultGroups.data?.length) return
    setPrimitiveMetadata({
      ...primitiveMetadata,
      customGroups: defaultGroups.data,
      updatedTime: Date.now(),
      action: "sync",
    })
  }, [defaultGroups.data, primitiveMetadata, setPrimitiveMetadata])

  const activeGroup = feed.startsWith("group:") ? groups.find(g => g.id === feed.slice(6)) : undefined
  const title = feed === "settings" ? FEED_COPY.settings[0] : activeGroup?.name || FEED_COPY[feed]?.[0] || FEED_COPY.all[0]
  const subtitle = feed === "settings" ? FEED_COPY.settings[1] : activeGroup ? `${activeGroup.name}分组的最新内容` : FEED_COPY[feed]?.[1] || FEED_COPY.all[1]
  const showTimelineSearch = feed !== "hottest" && feed !== "settings"
  const timelineSources = activeGroup ? activeGroup.sources : feed === "all" ? allDynamicSources(groups) : []
  const canRefresh = showTimelineSearch && timelineSources.length > 0
  const triggerRefresh = () => {
    if (refreshState === "refreshing" || !canRefresh) return
    setRefreshState("refreshing")
    setRefreshSignal(signal => signal + 1)
  }
  const timelineKey = `${feed}|${timelineSources.join(",")}|${timelineKeyword}`
  useEffect(() => {
    setRefreshState("idle")
  }, [timelineKey])

  return (
    <div className="aihot-app">
      <header className="aihot-mobile-header">
        <button type="button" className="aihot-mobile-logo" onClick={() => setFeed("all")}>
          择
          <b>流</b>
        </button>
        <div className="aihot-mobile-title">{title}</div>
        <div className="aihot-mobile-actions">
          <button type="button" aria-label="切换显示模式" onClick={toggleDark}>{isDark ? "☾" : "☀"}</button>
          <button type="button" aria-label="打开设置" onClick={() => setDrawerOpen(true)}>⚙</button>
        </div>
      </header>
      <div className={$("aihot-drawer-backdrop", drawerOpen && "open")} onClick={() => setDrawerOpen(false)} />
      <aside className={$("aihot-drawer", drawerOpen && "open")}>
        <div className="aihot-drawer-head">
          <div className="aihot-drawer-logo">
            择
            <b>流</b>
          </div>
          <button type="button" className="aihot-drawer-close" aria-label="关闭" onClick={() => setDrawerOpen(false)}>×</button>
        </div>
        <Nav
          feed={feed}
          setFeed={(v) => {
            setFeed(v)
            setDrawerOpen(false)
          }}
          groups={groups}
        />
      </aside>
      <div className="aihot-shell">
        <aside className="aihot-sidebar">
          <button type="button" className="aihot-logo" onClick={() => setFeed("all")}>
            择
            <b>流</b>
          </button>
          <Nav feed={feed} setFeed={setFeed} groups={groups} />
          <div className="aihot-sidebar-bottom">
            <AccountAction />
            <button type="button" className="aihot-theme" onClick={toggleDark}>
              <span>{isDark ? "☾" : "☀"}</span>
              <span>{isDark ? "深色模式" : "浅色模式"}</span>
            </button>
            <div>© 2026 择流</div>
          </div>
        </aside>
        <main className="aihot-main">
          <section className={$("aihot-hero", feed === "hottest" && "hot")}>
            <div className="aihot-hero-row">
              <div className="aihot-hero-head">
                <div>
                  <h1>{title}</h1>
                  <p className="aihot-subtitle">{subtitle}</p>
                </div>
                {canRefresh && (
                  <button
                    type="button"
                    className={$("aihot-hero-refresh", refreshState === "refreshing" && "loading", refreshState === "has-update" && "has-update")}
                    onClick={triggerRefresh}
                    disabled={refreshState === "refreshing"}
                    aria-label={refreshState === "has-update" ? "有最新内容，点击刷新" : "刷新当前分组"}
                    title={refreshState === "has-update" ? "有最新内容，点击查看" : "抓取当前分组所有信源"}
                  >
                    <span className="i-ph:arrows-clockwise-bold" />
                  </button>
                )}
              </div>
              {showTimelineSearch && <input className="aihot-search" value={timelineKeyword} onChange={e => setTimelineKeyword(e.target.value)} placeholder="搜索标题、摘要或来源" />}
            </div>
          </section>
          {feed === "settings" ? <Settings /> : feed === "hottest" ? <Hottest /> : <Timeline sources={timelineSources} keyword={timelineKeyword} refreshSignal={refreshSignal} onRefreshDone={() => setRefreshState("idle")} onUpdateAvailable={() => setRefreshState("has-update")} />}
        </main>
      </div>
    </div>
  )
}

function Nav({ feed, setFeed, groups }: { feed: Feed, setFeed: (feed: Feed) => void, groups: CustomGroup[] }) {
  return (
    <nav className="aihot-nav">
      <button type="button" className={$("aihot-nav-item", feed === "all" && "active")} onClick={() => setFeed("all")}>
        <span>☷</span>
        全部动态
      </button>
      <button type="button" className={$("aihot-nav-item", feed === "hottest" && "active")} onClick={() => setFeed("hottest")}>
        <span>#</span>
        热搜
      </button>
      <div className="aihot-nav-title">分组</div>
      {groups.map(group => (
        <button type="button" key={group.id} className={$("aihot-nav-item", feed === `group:${group.id}` && "active")} onClick={() => setFeed(`group:${group.id}`)}>
          <span>⌘</span>
          {group.name}
        </button>
      ))}
      <div className="aihot-nav-title">管理</div>
      <button type="button" className={$("aihot-nav-item", feed === "settings" && "active")} onClick={() => setFeed("settings")}>
        <span>⚙</span>
        设置
      </button>
      <AccountAction compact />
    </nav>
  )
}

function allDynamicSources(groups: CustomGroup[]) {
  return [...new Set(groups.flatMap(g => g.sources).filter(id => sources[id]?.type !== "hottest"))] as SourceID[]
}

function Timeline({ sources: ids, keyword, refreshSignal, onRefreshDone, onUpdateAvailable }: { sources: SourceID[], keyword: string, refreshSignal: number, onRefreshDone: () => void, onUpdateAvailable: () => void }) {
  const catalogMap = useSourceCatalogMap()
  const queryClient = useQueryClient()
  const [extraPages, setExtraPages] = useState<NewsPage[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [collapsedDays, setCollapsedDays] = useState<string[]>([])
  const sourceKey = ids.join(",")
  const firstPage = useQuery({
    queryKey: ["news", sourceKey, keyword],
    queryFn: () => fetchNewsPage({ sources: ids, keyword, limit: 30 }),
    enabled: ids.length > 0,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  useEffect(() => {
    setExtraPages([])
    setCollapsedDays([])
  }, [sourceKey, keyword])
  useEffect(() => {
    if (!refreshSignal || !ids.length) return
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    // 后台抓取写库需要时间：先后在 10s、20s 各静默重查一次（不动列表）。
    // 任一次检测到「当前未展示」的新条目即提示更新，并停止后续复查。
    const scheduleSilentCheck = (delay: number, next?: number) => {
      timers.push(setTimeout(async () => {
        if (cancelled) return
        try {
          const fresh = await fetchNewsPage({ sources: ids, keyword, limit: 30 })
          if (cancelled) return
          const shown = queryClient.getQueryData<NewsPage>(["news", sourceKey, keyword])
          const shownUrls = new Set((shown?.items ?? []).map(item => item.url))
          if (fresh.items.some(item => !shownUrls.has(item.url))) onUpdateAvailable()
          else if (next) scheduleSilentCheck(next)
        } catch {}
      }, delay))
    }
    ;(async () => {
      try {
        // 乐观返回：立即取回当前数据库最新数据并展示，同时后端会后台 force 抓取所有信源。
        const page = await fetchNewsPage({ sources: ids, keyword, limit: 30, refresh: true })
        if (cancelled) return
        setExtraPages([])
        setCollapsedDays([])
        queryClient.setQueryData(["news", sourceKey, keyword], page)
      } finally {
        if (!cancelled) onRefreshDone()
      }
      scheduleSilentCheck(10000, 10000)
    })()
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal])
  const pages = [firstPage.data, ...extraPages].filter(Boolean) as NewsPage[]
  const items = pages.flatMap(page => page.items)
  const nextCursor = pages.at(-1)?.nextCursor
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await fetchNewsPage({ sources: ids, keyword, cursor: nextCursor, limit: 30 })
      setExtraPages(prev => [...prev, page])
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, loadingMore, ids, keyword])
  // 触底自动加载：哨兵元素进入视口即触发 loadMore，按钮仍可手动点击兜底。
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !nextCursor) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore()
    }, { rootMargin: "200px" })
    observer.observe(el)
    return () => observer.disconnect()
  }, [nextCursor, loadMore])
  return (
    <section className="aihot-timeline-wrap">
      <div className="aihot-timeline">
        {firstPage.isLoading && <LoadingAnimation label="正在加载资讯" />}
        {groupByDate(items).map((group) => {
          const isCollapsed = collapsedDays.includes(group.dateKey)
          return (
            <div key={group.dateKey} className="aihot-day-group">
              <button
                type="button"
                className="aihot-day-label"
                aria-expanded={!isCollapsed}
                onClick={() => setCollapsedDays(days => days.includes(group.dateKey) ? days.filter(day => day !== group.dateKey) : [...days, group.dateKey])}
              >
                <span>{group.label}</span>
                <span className="aihot-day-arrow">{isCollapsed ? "›" : "⌄"}</span>
              </button>
              {!isCollapsed && group.items.map(item => <TimelineItem key={`${item.sourceId}-${item.id}`} item={item} source={item.sourceId ?? item.source!} catalogMap={catalogMap} />)}
            </div>
          )
        })}
        {!firstPage.isLoading && !items.length && <div className="aihot-empty">暂无信息</div>}
        {nextCursor && (
          <div ref={sentinelRef} className="aihot-load-more-wrap">
            <button type="button" className="aihot-load-more" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "加载中" : "加载更多"}</button>
          </div>
        )}
      </div>
    </section>
  )
}

function groupByDate(items: TimelineNewsItem[]) {
  const groups: { dateKey: string, label: string, items: TimelineNewsItem[] }[] = []
  for (const item of items) {
    const time = new Date(itemTime(item)).getTime()
    const date = new Date(time)
    const dateKey = Number.isFinite(time) ? date.toLocaleDateString("sv-SE") : "unknown"
    const label = Number.isFinite(time) ? date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" }) : "未知日期"
    const last = groups.at(-1)
    if (!last || last.dateKey !== dateKey) groups.push({ dateKey, label, items: [item] })
    else last.items.push(item)
  }
  return groups
}

function TimelineItem({ item, source, catalogMap }: { item: NewsItem, source: SourceID, catalogMap: CatalogMap }) {
  const text = summary(item)
  const info = getSourceInfo(source, catalogMap)
  const tags = item.tags?.length ? item.tags : (item.tag ? [item.tag] : [info.column ? columns[info.column as keyof typeof columns].zh : "资讯"])
  const avatar = item.sourceAvatarUrl || info.icon
  return (
    <article className="aihot-timeline-item">
      <div className="aihot-line"><span className="aihot-dot" /></div>
      <div>
        <div className="aihot-time">{clock(item)}</div>
        <a className="aihot-news-card" href={item.url} target="_blank" rel="noreferrer">
          <div className="aihot-meta">
            <div className="aihot-meta-source">
              <img className="aihot-avatar" src={avatar} onError={e => e.currentTarget.style.display = "none"} />
              {" "}
              <span>{item.sourceName || info.name}</span>
              {!item.sourceName && info.title && (
                <span>
                  @
                  {info.title}
                </span>
              )}
            </div>
            <div className="aihot-tags">
              {tags.map(tag => <span className="aihot-tag" key={tag}>{tag}</span>)}
              {!item.tags?.length && !item.tag && info.type === "realtime" && <span className="aihot-tag">实时</span>}
            </div>
          </div>
          <h2 className="aihot-title">{item.title}</h2>
          {text && <p className="aihot-summary">{text}</p>}
          {(item.coverUrl || item.videoUrl) && (
            <div className="aihot-media-preview">
              <img src={item.coverUrl || item.videoUrl} alt="" loading="lazy" />
              {item.videoUrl && <span className="aihot-play">▶</span>}
            </div>
          )}
        </a>
      </div>
    </article>
  )
}

function Hottest() {
  const catalog = useSourceCatalog()
  const catalogMap = useMemo(() => typeSafeObjectFromEntries(catalog.map(item => [item.id, item])) as CatalogMap, [catalog])
  const hotSources = (catalog.length ? catalog.filter(item => item.type === "hottest" && !item.redirect).map(item => item.id) : metadata.hottest.sources) as SourceID[]
  const results = useSourceQueries(hotSources)
  return <section className="aihot-hot-wrap"><div className="aihot-hot-grid">{hotSources.map((id, index) => <HotCard key={id} id={id} data={results[index].data} catalogMap={catalogMap} />)}</div></section>
}

function HotCard({ id, data, catalogMap }: { id: SourceID, data?: SourceResponse, catalogMap: CatalogMap }) {
  const [expanded, setExpanded] = useState(false)
  const queryClient = useQueryClient()
  const info = getSourceInfo(id, catalogMap)
  const items = data?.items ?? []
  const shown = expanded ? items : items.slice(0, 3)
  const refresh = async () => {
    await fetchSource(id, true)
    queryClient.invalidateQueries({ queryKey: ["source", id] })
  }
  return (
    <article className="aihot-hot-card">
      <div className="aihot-hot-head">
        <button type="button" className="aihot-source-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          <img className="aihot-source-logo" src={info.icon} onError={e => e.currentTarget.style.display = "none"} />
          <span>
            <span className="aihot-source-name">
              {info.name}
              {info.title && <b className="aihot-hot-badge">{info.title}</b>}
            </span>
            <span className="aihot-source-sub">{relative(data?.updatedTime) || "正在更新"}</span>
          </span>
        </button>
        <button type="button" className="aihot-refresh" aria-label="刷新" onClick={refresh}>↻</button>
      </div>
      <div className="aihot-hot-list">
        {shown.map((item, i) => (
          <a key={item.id} className="aihot-hot-item" href={item.url} target="_blank" rel="noreferrer">
            <span className="aihot-rank">{i + 1}</span>
            <span className="aihot-hot-title">{item.title}</span>
            {item.extra?.info && <span className="aihot-heat">{item.extra.info}</span>}
          </a>
        ))}
      </div>
    </article>
  )
}

function Settings() {
  const [groups, setGroups] = useAtom(customGroupsAtom)
  const { loggedIn, login, enableLogin } = useLogin()
  const toast = useToast()
  const confirm = useConfirm()
  const [activeId, setActiveId] = useState(groups[0]?.id ?? "")
  const [name, setName] = useState("")
  const [keyword, setKeyword] = useState("")
  const [selectedOnly, setSelectedOnly] = useState(false)
  const catalog = useSourceCatalog()
  const active = groups.find(g => g.id === activeId) ?? groups[0]
  useEffect(() => {
    if (!active && groups[0]) setActiveId(groups[0].id)
  }, [active, groups])
  const sourceList = useMemo(() => {
    const dbSources = catalog.length ? catalog : typeSafeObjectEntries(sources).map(([id]) => fallbackSource(id))
    return dbSources.filter(s => !s.redirect && s.type !== "hottest")
  }, [catalog])
  const filtered = sourceList.filter(s => (!keyword || `${s.name}${s.title ?? ""}`.toLowerCase().includes(keyword.toLowerCase())) && (!selectedOnly || active?.sources.includes(s.id)))
  const canEdit = !enableLogin || loggedIn
  const requireLogin = () => {
    if (canEdit) return false
    login()
    return true
  }
  const addGroup = () => {
    if (requireLogin()) return
    const n = normalizeGroupName(name)
    if (!n) return
    if (groups.some((g: CustomGroup) => g.name === n)) return toast("分组已存在", { type: "warning" })
    const next = { id: randomUUID(), name: n, sources: [] }
    setGroups([...groups, next])
    setActiveId(next.id)
    setName("")
  }
  const deleteGroup = async (id: string) => {
    if (requireLogin()) return
    const g = groups.find((g: CustomGroup) => g.id === id)
    if (!g || !await confirm(`确认删除「${g.name}」分组？`)) return
    const next = groups.filter((g: CustomGroup) => g.id !== id)
    setGroups(next)
    setActiveId(next[0]?.id ?? "")
  }
  const toggleSource = (id: SourceID) => {
    if (requireLogin()) return
    if (!active) return
    setGroups(groups.map((g: CustomGroup) => g.id === active.id ? { ...g, sources: g.sources.includes(id) ? g.sources.filter((s: SourceID) => s !== id) : [...g.sources, id] } : g))
  }
  return (
    <section className="aihot-settings">
      <div className="aihot-settings-grid">
        <div>
          <div className="aihot-settings-card">
            <h2>分组管理</h2>
            <p className="aihot-hint">创建常用分组，并为每个分组选择信源。分组名最多 8 个字。</p>
            {!canEdit && (
              <div className="aihot-login-tip">
                <span>登录后才能管理分组和同步信源设置。</span>
                <button type="button" onClick={login}>登录 / 注册</button>
              </div>
            )}
            <div className="aihot-group-list">
              {groups.map(g => (
                <div key={g.id} className={$("aihot-group-row", active?.id === g.id && "active")}>
                  <button type="button" className="aihot-group-name" onClick={() => setActiveId(g.id)}>{g.name}</button>
                  <span className="aihot-count">
                    {g.sources.length}
                    {" "}
                    个源
                  </span>
                  <button type="button" className="aihot-delete" disabled={!canEdit} aria-label={`删除${g.name}`} onClick={() => deleteGroup(g.id)}>×</button>
                </div>
              ))}
            </div>
            <div className="aihot-add">
              <input className="aihot-input" maxLength={8} disabled={!canEdit} value={name} onChange={e => setName(e.target.value)} placeholder={canEdit ? "新分组" : "请先登录"} />
              <button type="button" className="aihot-primary" disabled={!canEdit} onClick={addGroup}>添加</button>
            </div>
          </div>
          <div className="aihot-settings-card mt-4">
            <h2>关于 择流</h2>
            <p className="aihot-hint">择流 提供多源资讯聚合、热搜排行与个性化分组。登录后，你的分组和信源配置会自动同步。</p>
          </div>
        </div>
        <div className="aihot-settings-card">
          <h2>
            {active?.name ?? "分组"}
            {" "}
            · 信源
          </h2>
          <p className="aihot-hint">{canEdit ? "选择这个分组中要展示的信源。" : "未登录时只能查看默认分组，登录后才可以修改。"}</p>
          <div className="aihot-source-toolbar">
            <input className="aihot-input" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索信源" />
            <button type="button" className={$("aihot-filter", selectedOnly && "active")} onClick={() => setSelectedOnly(!selectedOnly)}>只看已选</button>
          </div>
          <div className="aihot-selected-strip">{active?.sources.map((id: SourceID) => <span className="aihot-tag" key={id}>{(catalog.find(s => s.id === id) ?? fallbackSource(id)).name}</span>)}</div>
          <div className="aihot-source-grid">
            {filtered.map(s => (
              <button type="button" key={s.id} disabled={!canEdit} className={$("aihot-source-check", active?.sources.includes(s.id) && "selected")} onClick={() => toggleSource(s.id)}>
                <span className="aihot-check">{active?.sources.includes(s.id) ? "✓" : ""}</span>
                <span>
                  {s.name}
                  {s.title ? ` · ${s.title}` : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AccountAction({ compact = false }: { compact?: boolean }) {
  const { loggedIn, login, logout, userInfo, enableLogin, loginDialogOpen, setLoginDialogOpen, submitLogin } = useLogin()
  const [open, setOpen] = useState(false)
  if (!enableLogin) return null
  return (
    <>
      {loggedIn
        ? (
            <div
              className={$("aihot-account-wrap", compact && "compact", open && "open")}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              <button
                type="button"
                className={$("aihot-account", compact && "compact")}
                onClick={() => setOpen(v => !v)}
              >
                <span>已登录</span>
                <b>{userInfo.name}</b>
              </button>
              <button
                type="button"
                className="aihot-logout-btn"
                onClick={logout}
              >
                退出登录
              </button>
            </div>
          )
        : (
            <button type="button" className={$("aihot-account", compact && "compact")} onClick={login}>
              <span>账号</span>
              <b>登录 / 注册</b>
            </button>
          )}
      {loginDialogOpen && createPortal(<AiHotLoginDialog onClose={() => setLoginDialogOpen(false)} onSubmit={submitLogin} />, document.body)}
    </>
  )
}

function AiHotLoginDialog({ onClose, onSubmit }: {
  onClose: () => void
  onSubmit: (payload: { username: string, password: string, action: "login" | "register" }) => Promise<void>
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = useCallback(async (action: "login" | "register") => {
    setError("")
    setLoading(true)
    try {
      await onSubmit({ username, password, action })
    } catch (e: any) {
      setError(e?.data?.message || e?.message || "操作失败")
    } finally {
      setLoading(false)
    }
  }, [onSubmit, password, username])

  return (
    <div className="aihot-modal-backdrop" onClick={onClose}>
      <form
        className="aihot-login-modal"
        onClick={e => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          submit("login")
        }}
      >
        <div className="aihot-modal-head">
          <div>
            <h2>账号登录</h2>
            <p>登录后同步分组与信源设置</p>
          </div>
          <button type="button" aria-label="关闭" onClick={onClose}>×</button>
        </div>
        <label className="aihot-field">
          <span>用户名</span>
          <input value={username} autoFocus minLength={4} onChange={e => setUsername(e.target.value)} />
        </label>
        <label className="aihot-field">
          <span>密码</span>
          <input value={password} type="password" onChange={e => setPassword(e.target.value)} />
        </label>
        {error && <div className="aihot-error">{error}</div>}
        <div className="aihot-login-actions">
          <button type="submit" disabled={loading}>{loading ? "处理中" : "登录"}</button>
          <button type="button" disabled={loading} onClick={() => submit("register")}>注册</button>
        </div>
      </form>
    </div>
  )
}
