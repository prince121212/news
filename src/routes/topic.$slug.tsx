import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import type { NewsItem, SourceID } from "@shared/types"
import { SiteUrl } from "@shared/site"
import { seoTitle, usePageSEO } from "~/utils/seo"

const topicMap: Record<string, { name: string, desc: string, sources: SourceID[], keywords: string[] }> = {
  "ai-tools": {
    name: "AI 工具",
    desc: "追踪 AI Agent、编程助手、设计工具、办公自动化和新兴 AI 产品动态。",
    sources: ["aihot", "aihot-selected", "v2ex-share"],
    keywords: ["AI工具", "AI Agent", "编程助手", "生产力工具"],
  },
  "llm": {
    name: "大模型",
    desc: "聚合大模型发布、模型 API、推理能力、国产大模型和开源模型生态。",
    sources: ["aihot", "aihot-selected", "solidot"],
    keywords: ["大模型", "LLM", "OpenAI", "Claude", "Gemini", "国产大模型"],
  },
  "openai": {
    name: "OpenAI 动态",
    desc: "整理 OpenAI 产品、模型、API、开发者生态与行业影响。",
    sources: ["aihot", "aihot-selected"],
    keywords: ["OpenAI", "ChatGPT", "GPT", "AI模型"],
  },
}

interface NewsPage {
  items: (NewsItem & { sourceId?: SourceID, sourceName?: string })[]
}

export const Route = createFileRoute("/topic/$slug")({
  component: TopicComponent,
})

function TopicComponent() {
  const { slug } = Route.useParams()
  const topic = topicMap[slug] ?? topicMap.llm
  usePageSEO({
    title: seoTitle(`${topic.name}最新动态`),
    description: `${topic.desc}择流持续聚合相关资讯、原文链接与每日简报。`,
    path: `/topic/${slug}`,
  })

  const { data, isLoading } = useQuery({
    queryKey: ["seo-topic", slug],
    queryFn: () => myFetch<NewsPage>("/news", { method: "POST", body: { sources: topic.sources, limit: 20 } }),
    staleTime: 60 * 1000,
    retry: false,
  })

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${topic.name}最新动态`,
    "url": `${SiteUrl}/topic/${slug}`,
    "description": topic.desc,
  }

  return (
    <main className="seo-page aihot-app">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="seo-hero">
        <a href="/ai" className="seo-back">← AI 频道</a>
        <p className="seo-kicker">Topic</p>
        <h1>
          {topic.name}
          最新动态
        </h1>
        <p>{topic.desc}</p>
        <div className="seo-actions">{topic.keywords.map(k => <span className="seo-secondary" key={k}>{k}</span>)}</div>
      </section>
      <section className="seo-card">
        <h2>最新资讯</h2>
        {isLoading && <p className="seo-muted">正在加载专题资讯...</p>}
        <div className="seo-news-list">
          {(data?.items ?? []).map(item => (
            <a className="seo-news-row" key={`${item.sourceId}-${item.id}`} href={item.url} target="_blank" rel="noreferrer">
              <span>{item.sourceName || item.sourceId || topic.name}</span>
              <strong>{item.title}</strong>
              {(item.summary || item.content) && <p>{item.summary || item.content?.slice(0, 160)}</p>}
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}
