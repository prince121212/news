import { Link, createFileRoute } from "@tanstack/react-router"
import { SiteDescription, SiteName, SiteUrl } from "@shared/site"
import { seoTitle, usePageSEO } from "~/utils/seo"

export const Route = createFileRoute("/about")({
  component: AboutComponent,
})

function AboutComponent() {
  usePageSEO({
    title: seoTitle("关于择流"),
    description: "了解择流的信息来源、更新方式、AI/科技/财经资讯聚合能力以及 RSS、llms.txt 等开放入口。",
    path: "/about",
  })

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": `关于${SiteName}`,
    "url": `${SiteUrl}/about`,
    "description": SiteDescription,
  }

  return (
    <main className="seo-page aihot-app">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="seo-hero">
        <Link to="/" className="seo-back">← 返回首页</Link>
        <p className="seo-kicker">About</p>
        <h1>关于择流</h1>
        <p>{SiteDescription}</p>
      </section>

      <section className="seo-card-grid">
        <article className="seo-card">
          <h2>我们解决什么问题？</h2>
          <p>每天 AI、大模型、科技产品和财经快讯更新很快，单个平台很难覆盖完整信息。择流把公开信息源、热榜和 RSS 聚合成统一时间线，帮助读者减少切换成本。</p>
        </article>
        <article className="seo-card">
          <h2>主要覆盖方向</h2>
          <ul>
            <li>AI、大模型、AI 工具、开源项目</li>
            <li>科技产品、开发者社区、行业动态</li>
            <li>财经快讯、市场热点、公司新闻</li>
            <li>微博、知乎、头条等平台热搜趋势</li>
          </ul>
        </article>
        <article className="seo-card">
          <h2>开放入口</h2>
          <ul>
            <li><a href="/sitemap.xml">Sitemap</a></li>
            <li><a href="/llms.txt">llms.txt</a></li>
            <li><a href="/feed.xml">全站 RSS</a></li>
            <li><a href="/feed/ai.xml">AI 日报 RSS</a></li>
          </ul>
        </article>
      </section>

      <section className="seo-card">
        <h2>内容说明</h2>
        <p>择流聚合公开网页、公开 RSS、公开热榜和第三方信息源，并尽量保留原文链接。页面中的标题、摘要、标签和时间信息用于辅助快速阅读，不替代原始媒体报道。若需要完整上下文，请以原文为准。</p>
      </section>
    </main>
  )
}
