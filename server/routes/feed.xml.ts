import { SiteDescription, SiteName, SiteUrl, chinaDateKey } from "@shared/site"

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
    const key = chinaDateKey(date)
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
