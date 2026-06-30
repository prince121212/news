export const SiteUrl = "https://news.292828.xyz"
export const SiteName = "择流"
export const SiteTitle = "择流 - AI、科技、财经、热点新闻聚合"
export const SiteDescription = "择流聚合 AI、科技、财经、国内外热点资讯，实时追踪各平台最新动态、热搜排行与每日简报。"

export const SeoRoutes = [
  { path: "/", priority: "1.0", changefreq: "always" },
  { path: "/ai", priority: "0.9", changefreq: "hourly" },
  { path: "/daily", priority: "0.8", changefreq: "daily" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/topic/ai-tools", priority: "0.7", changefreq: "daily" },
  { path: "/topic/llm", priority: "0.7", changefreq: "daily" },
  { path: "/topic/openai", priority: "0.7", changefreq: "daily" },
  { path: "/source/aihot", priority: "0.6", changefreq: "hourly" },
] as const
