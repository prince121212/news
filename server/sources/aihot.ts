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
  hasNext?: boolean
  nextCursor?: string
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

function mapPublicItem(item: AihotPublicItem): NewsItem {
  return {
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
  }
}

const all = defineSource(async () => {
  const collected: AihotPublicItem[] = []
  let cursor = ""
  for (let page = 0; page < 3; page += 1) {
    const url = new URL("https://aihot.virxact.com/api/public/items")
    url.searchParams.set("mode", "all")
    if (cursor) url.searchParams.set("cursor", cursor)
    const data = await myFetch<AihotPublicResponse>(url.toString())
    collected.push(...(data.items ?? []))
    if (!data.hasNext || !data.nextCursor) break
    cursor = data.nextCursor
  }
  return collected
    .filter(item => item.title && item.url)
    .map(mapPublicItem)
})

const selected = defineSource(async () => {
  const data = await myFetch<AihotPublicResponse>("https://aihot.virxact.com/api/public/items?mode=selected")
  return (data.items ?? [])
    .filter(item => item.title && item.url)
    .map(item => ({
      ...mapPublicItem(item),
      sourceId: "aihot-selected",
    }))
})

export default defineSource({
  aihot: all,
  "aihot-selected": selected,
})
