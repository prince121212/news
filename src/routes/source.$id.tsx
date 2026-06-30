import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { sources } from "@shared/sources"
import type { NewsItem, SourceID, SourceResponse } from "@shared/types"
import { SiteUrl } from "@shared/site"
import { seoTitle, usePageSEO } from "~/utils/seo"

interface NewsPage {
  items: (NewsItem & { sourceId?: SourceID, sourceName?: string })[]
}

export const Route = createFileRoute("/source/$id")({
  component: SourceComponent,
})

function SourceComponent() {
  const { id } = Route.useParams()
  const sourceId = id as SourceID
  const info = sources[sourceId]
  const name = info?.title ? `${info.name} · ${info.title}` : info?.name || id

  usePageSEO({
    title: seoTitle(`${name} 最新资讯`),
    description: `查看 ${name} 的最新资讯、更新时间、原文链接与相关动态。择流持续聚合公开信息源。`,
    path: `/source/${id}`,
  })

  const { data, isLoading } = useQuery({
    queryKey: ["seo-source", id],
    queryFn: async () => {
      if (info?.type === "hottest") {
        const res = await myFetch<SourceResponse>(`/s?id=${sourceId}`)
        return { items: res.items }
      }
      return await myFetch<NewsPage>("/news", { method: "POST", body: { sources: [sourceId], limit: 20 } })
    },
    enabled: !!info,
    staleTime: 60 * 1000,
    retry: false,
  })

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${name} 最新资讯`,
    "url": `${SiteUrl}/source/${id}`,
    "description": `择流聚合 ${name} 最新资讯。`,
  }

  return (
    <main className="seo-page aihot-app">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="seo-hero">
        <a href="/" className="seo-back">← 返回首页</a>
        <p className="seo-kicker">Source</p>
        <h1>
          {name}
          {" "}
          最新资讯
        </h1>
        <p>{info?.desc || `这里聚合 ${name} 的最新内容、摘要与原文链接。`}</p>
        {info?.home && <div className="seo-actions"><a className="seo-secondary" href={info.home} target="_blank" rel="noreferrer">访问原始信源</a></div>}
      </section>
      <section className="seo-card">
        <h2>最近内容</h2>
        {!info && <p className="seo-muted">信源不存在或暂未启用。</p>}
        {isLoading && <p className="seo-muted">正在加载信源资讯...</p>}
        <div className="seo-news-list">
          {(data?.items ?? []).map(item => (
            <a className="seo-news-row" key={`${sourceId}-${item.id}`} href={item.url} target="_blank" rel="noreferrer">
              <span>{name}</span>
              <strong>{item.title}</strong>
              {(item.summary || item.content) && <p>{item.summary || item.content?.slice(0, 160)}</p>}
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}
