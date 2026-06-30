import { SeoRoutes, SiteUrl, chinaDateKey } from "@shared/site"

function recentDailyRoutes(days = 21) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - index)
    return {
      path: `/daily/${chinaDateKey(date)}-ai`,
      priority: index === 0 ? "0.9" : "0.7",
      changefreq: index === 0 ? "hourly" : "weekly",
    }
  })
}

function xmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;")
}

export default defineEventHandler((event) => {
  setHeader(event, "content-type", "application/xml; charset=utf-8")
  const lastmod = chinaDateKey()
  const routes = [...SeoRoutes, ...recentDailyRoutes()]
  const urls = routes.map(route => `  <url>
    <loc>${xmlEscape(`${SiteUrl}${route.path}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
})
