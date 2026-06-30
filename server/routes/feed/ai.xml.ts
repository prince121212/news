import { SiteUrl, chinaDateKey } from "@shared/site"

function rfcDate(date = new Date()) {
  return date.toUTCString()
}

function xmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;")
}

export default defineEventHandler((event) => {
  setHeader(event, "content-type", "application/rss+xml; charset=utf-8")
  const items = Array.from({ length: 14 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - index)
    const key = chinaDateKey(date)
    const link = `${SiteUrl}/daily/${key}-ai`
    return `    <item>
      <title>${xmlEscape(`${key} AI 日报：大模型、AI 工具与开源动态`)}</title>
      <link>${xmlEscape(link)}</link>
      <guid>${xmlEscape(link)}</guid>
      <pubDate>${rfcDate(date)}</pubDate>
      <description>${xmlEscape("今日 AI 行业重点资讯、产品更新、模型发布、开源项目和趋势观察。")}</description>
    </item>`
  }).join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape("择流 AI 日报")}</title>
    <link>${xmlEscape(`${SiteUrl}/ai`)}</link>
    <description>${xmlEscape("择流 AI 频道聚合大模型、AI 工具、开源项目、论文和创业动态。")}</description>
    <language>zh-CN</language>
    <lastBuildDate>${rfcDate()}</lastBuildDate>
${items}
  </channel>
</rss>
`
})
