import { SiteDescription, SiteName, SiteUrl } from "@shared/site"

function dateKey(date = new Date()) {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function rfcDate(date = new Date()) {
  return date.toUTCString()
}

function xmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;")
}

export default defineEventHandler((event) => {
  setHeader(event, "content-type", "application/rss+xml; charset=utf-8")
  const items = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - index)
    const key = dateKey(date)
    const link = `${SiteUrl}/daily/${key}-ai`
    return `    <item>
      <title>${xmlEscape(`${key} AI 资讯日报`)}</title>
      <link>${xmlEscape(link)}</link>
      <guid>${xmlEscape(link)}</guid>
      <pubDate>${rfcDate(date)}</pubDate>
      <description>${xmlEscape("择流每日整理 AI、大模型、科技产品、开源项目与行业动态，帮助你快速了解今天值得关注的资讯。")}</description>
    </item>`
  }).join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape(SiteName)}</title>
    <link>${xmlEscape(SiteUrl)}</link>
    <description>${xmlEscape(SiteDescription)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${rfcDate()}</lastBuildDate>
${items}
  </channel>
</rss>
`
})
