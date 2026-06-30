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

export const Route = createFileRoute("/ai")({
  component: AiChannelComponent,
})

function AiChannelComponent() {
  usePageSEO({
    title: seoTitle("AI 资讯日报 - 大模型、AI 工具与开源动态"),
    description: "择流 AI 频道聚合 OpenAI、Claude、Gemini、国产大模型、AI 工具、开源项目、论文和创业动态。",
    path: "/ai",
  })

  const { data, isLoading } = useQuery({
    queryKey: ["seo-ai-news"],
    queryFn: () => myFetch<NewsPage>("/news", {
      method: "POST",
      body: { sources: aiSources, limit: 20 },
    }),
    staleTime: 60 * 1000,
    retry: false,
  })

  const today = new Date().toISOString().slice(0, 10)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "AI 资讯日报",
    "url": `${SiteUrl}/ai`,
    "description": "大模型、AI 工具、开源项目与行业动态聚合。",
  }

  return (
    <main className="seo-page aihot-app">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="seo-hero">
        <Link to="/" className="seo-back">← 返回首页</Link>
        <p className="seo-kicker">AI News</p>
        <h1>AI 资讯日报</h1>
        <p>聚合大模型、AI 工具、开源项目、论文与创业动态，适合 AI 开发者、产品经理和创业者每天快速浏览。</p>
        <div className="seo-actions">
          <Link to="/daily/$date" params={{ date: `${today}-ai` }} className="seo-primary">查看今日日报</Link>
          <a href="/feed/ai.xml" className="seo-secondary">订阅 AI RSS</a>
        </div>
      </section>

      <section className="seo-card-grid">
        <article className="seo-card">
          <h2>大模型动态</h2>
          <p>跟踪 OpenAI、Claude、Gemini、国产大模型、模型 API 和能力更新。</p>
        </article>
        <article className="seo-card">
          <h2>AI 工具</h2>
          <p>关注生产力工具、Agent、设计工具、编程助手和商业化产品。</p>
        </article>
        <article className="seo-card">
          <h2>开源与论文</h2>
          <p>整理值得关注的开源项目、模型发布、论文进展和开发者社区讨论。</p>
        </article>
      </section>

      <section className="seo-card">
        <div className="seo-section-head">
          <h2>最新 AI 动态</h2>
          <Link to="/daily" className="seo-link">日报归档</Link>
        </div>
        {isLoading && <p className="seo-muted">正在加载最新资讯...</p>}
        <div className="seo-news-list">
          {(data?.items ?? []).map(item => <NewsRow key={`${item.sourceId}-${item.id}`} item={item} />)}
        </div>
      </section>
    </main>
  )
}

function NewsRow({ item }: { item: NewsItem & { sourceName?: string } }) {
  return (
    <a className="seo-news-row" href={item.url} target="_blank" rel="noreferrer">
      <span>{item.sourceName || item.sourceId || "AI"}</span>
      <strong>{item.title}</strong>
      {(item.summary || item.content) && <p>{item.summary || item.content?.slice(0, 120)}</p>}
    </a>
  )
}
