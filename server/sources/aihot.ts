import type { NewsItem } from "@shared/types"

type AihotPublicItem = {
  id?: string
  title?: string
  url?: string
  source?: string
  publishedAt?: string
  summary?: string
  category?: string
  coverUrl?: string
  image?: string
  videoUrl?: string
}

type AihotPublicResponse = {
  items?: AihotPublicItem[]
}

function normalizeCategory(category?: string) {
  const map: Record<string, string> = {
    paper: "论文",
    tip: "观点",
    "ai-products": "产品",
    product: "产品",
    model: "模型",
    funding: "融资",
    open_source: "开源",
    opensource: "开源",
  }
  return category ? (map[category] ?? category) : ""
}

export default defineSource(async () => {
  const data = await myFetch<AihotPublicResponse>("https://aihot.virxact.com/api/public/items?mode=all")
  return (data.items ?? [])
    .filter(item => item.title && item.url)
    .map((item): NewsItem => ({
      id: item.id || item.url!,
      title: item.title!,
      url: item.url!,
      sourceId: "aihot",
      sourceName: item.source || "AIHOT",
      summary: item.summary || "",
      content: item.summary || "",
      coverUrl: item.coverUrl || item.image || undefined,
      videoUrl: item.videoUrl || undefined,
      tag: normalizeCategory(item.category),
      pubDate: item.publishedAt,
      extra: {
        info: item.summary || item.source || "",
        hover: item.source || "AIHOT",
      },
    }))
})
