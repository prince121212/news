import { Link, createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import type { NewsItem, SourceID } from "@shared/types"
import { SiteUrl } from "@shared/site"
import { seoTitle, usePageSEO } from "~/utils/seo"

const aiSources = ["aihot", "aihot-selected", "solidot", "v2ex-share"] as SourceID[]

interface NewsPage {
  items: (NewsItem & { sourceId?: SourceID, sourceName?: string })[]
  nextCursor?: number
}

export const Route = createFileRoute("/daily/$date")({
  component: DailyDetailComponent,
})

function normalizeDate(slug: string) {
  const match = slug.match(/\d{4}-\d{2}-\d{2}/)
  return match?.[0] ?? new Date().toISOString().slice(0, 10)
}

function chineseDate(date: string) {
  const d = new Date(`${date}T00:00:00+08:00`)
  if (!Number.isFinite(d.getTime())) return date
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })
}

function DailyDetailComponent() {
  const { date: slug } = Route.useParams()
  const date = normalizeDate(slug)
  const title = `${date} AI 日报：大模型、AI 工具与开源动态`

  usePageSEO({
    title: seoTitle(title),
    description: `${chineseDate(date)}择流 AI 日报，整理大模型、AI 工具、开源项目、产品发布和行业动态。`,
    path: `/daily/${slug}`,
    type: "article",
  })

  const { data, isLoading } = useQuery({
    queryKey: ["seo-daily-ai", date],
    queryFn: () => myFetch<NewsPage>("/news", {
      method: "POST",
      body: { sources: aiSources, limit: 30 },
    }),
    staleTime: 60 * 1000,
    retry: false,
  })

  const items = data?.items ?? []
  const highlights = items.slice(0, 5)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": title,
    "datePublished": `${date}T08:00:00+08:00`,
    "dateModified": new Date().toISOString(),
    "author": { "@type": "Organization", "name": "择流" },
    "publisher": { "@type": "Organization", "name": "择流" },
    "mainEntityOfPage": `${SiteUrl}/daily/${slug}`,
    "description": `${date} AI 行业重点资讯与趋势摘要。`,
  }

  return (
    <main className="seo-page aihot-app">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="seo-hero">
        <Link to="/daily" className="seo-back">← 日报归档</Link>
        <p className="seo-kicker">
          AI Daily ·
          {chineseDate(date)}
        </p>
        <h1>{title}</h1>
        <p>这是一份面向 AI 开发者、产品经理和创业者的每日资讯简报，帮助你快速了解今天值得关注的大模型、AI 工具、开源项目和行业动态。</p>
      </section>

      <section className="seo-card-grid">
        <article className="seo-card">
          <h2>一句话总结</h2>
          <p>今日 AI 行业信息重点集中在模型能力更新、AI 工具产品化、开源生态和开发者社区讨论。</p>
        </article>
        <article className="seo-card">
          <h2>适合引用</h2>
          <p>
            据择流聚合信息，
            {date}
            {" "}
            AI 动态主要围绕大模型、AI 应用、开源项目与行业产品更新展开。
          </p>
        </article>
      </section>

      <section className="seo-card">
        <h2>今日重点</h2>
        {isLoading && <p className="seo-muted">正在加载今日资讯...</p>}
        <ol className="seo-highlight-list">
          {highlights.map(item => <li key={`${item.sourceId}-${item.id}`}><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></li>)}
        </ol>
      </section>

      <section className="seo-card">
        <h2>完整动态</h2>
        <div className="seo-news-list">
          {items.map(item => (
            <a className="seo-news-row" key={`${item.sourceId}-${item.id}`} href={item.url} target="_blank" rel="noreferrer">
              <span>{item.sourceName || item.sourceId || "AI"}</span>
              <strong>{item.title}</strong>
              {(item.summary || item.content) && <p>{item.summary || item.content?.slice(0, 160)}</p>}
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}
