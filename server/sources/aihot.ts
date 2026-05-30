import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"

interface AihotPublicItem {
  id?: string
  title?: string
  url?: string
  source?: string
  publishedAt?: string
  summary?: string
  category?: string
  tags?: string[]
  sourceAvatarUrl?: string
  coverUrl?: string
  image?: string
  videoUrl?: string
}

interface AihotPublicResponse {
  items?: AihotPublicItem[]
  hasNext?: boolean
  nextCursor?: string
}

interface AihotPageMeta {
  sourceAvatarUrl?: string
  coverUrl?: string
  videoUrl?: string
  tags?: string[]
}

function normalizeProxyUrl(url?: string) {
  if (!url) return undefined
  if (url.startsWith("/api/img-proxy?")) {
    const proxy = new URL(url, "https://aihot.virxact.com")
    return proxy.searchParams.get("u") || undefined
  }
  if (url.startsWith("http")) return url
  return new URL(url, "https://aihot.virxact.com").toString()
}

async function getAihotPageMeta() {
  const html = await myFetch<string>("https://aihot.virxact.com")
  const $ = cheerio.load(html)
  const map = new Map<string, AihotPageMeta>()
  $("[data-item-id]").each((_, el) => {
    const $item = $(el)
    const id = $item.attr("data-item-id")
    if (!id) return
    const avatar = normalizeProxyUrl($item.find(".timeline-head-left img.uc-avatar").first().attr("src"))
    const media = $item.find(".x-tweet-media-img").first()
    const mediaUrl = normalizeProxyUrl(media.attr("src"))
    const isVideo = media.closest(".x-tweet-media-cell-video").length > 0
    const tags = $item.find(".timeline-tags .tag").map((_, tagEl) => $(tagEl).text().trim()).get().filter(Boolean)
    map.set(id, {
      sourceAvatarUrl: avatar,
      coverUrl: mediaUrl,
      videoUrl: isVideo ? mediaUrl : undefined,
      tags,
    })
  })
  return map
}

function normalizeCategory(category?: string) {
  const map: Record<string, string> = {
    "paper": "论文",
    "tip": "观点",
    "ai-products": "产品",
    "product": "产品",
    "model": "模型",
    "funding": "融资",
    "open_source": "开源",
    "opensource": "开源",
  }
  return category ? (map[category] ?? category) : ""
}

function mapPublicItem(item: AihotPublicItem, meta?: AihotPageMeta): NewsItem {
  return {
    id: item.id || item.url!,
    title: item.title!,
    url: item.url!,
    sourceId: "aihot",
    sourceName: item.source || "AIHOT",
    sourceAvatarUrl: item.sourceAvatarUrl || meta?.sourceAvatarUrl,
    summary: item.summary || "",
    content: item.summary || "",
    coverUrl: item.coverUrl || item.image || meta?.coverUrl || undefined,
    videoUrl: item.videoUrl || meta?.videoUrl || undefined,
    tag: normalizeCategory(item.category) || meta?.tags?.[0] || "",
    tags: item.tags?.length ? item.tags : (meta?.tags?.length ? meta.tags : [normalizeCategory(item.category)].filter(Boolean)),
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
  const pageMeta = await getAihotPageMeta().catch(() => new Map<string, AihotPageMeta>())
  return collected
    .filter(item => item.title && item.url)
    .map(item => mapPublicItem(item, pageMeta.get(item.id || "")))
})

const selected = defineSource(async () => {
  const data = await myFetch<AihotPublicResponse>("https://aihot.virxact.com/api/public/items?mode=selected")
  const pageMeta = await getAihotPageMeta().catch(() => new Map<string, AihotPageMeta>())
  return (data.items ?? [])
    .filter(item => item.title && item.url)
    .map(item => ({
      ...mapPublicItem(item, pageMeta.get(item.id || "")),
      sourceId: "aihot-selected",
    }))
})

export default defineSource({
  "aihot": all,
  "aihot-selected": selected,
})
