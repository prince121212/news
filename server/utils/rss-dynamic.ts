import process from "node:process"
import type { NewsItem } from "@shared/types"
import type { RssSourceRow } from "#/database/rss-source"

const DefaultRSSHubBase = "https://rsshub.rssforever.com"

function stripHtml(value?: string) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function enclosureUrl(item: any) {
  const enclosure = item.enclosures?.[0]
  if (!enclosure) return undefined
  if (typeof enclosure === "string") return enclosure
  return enclosure.url || enclosure.href
}

export function normalizeRssInputUrl(input: string) {
  const value = input.trim()
  if (value.startsWith("rsshub://")) {
    const path = value.replace(/^rsshub:\/\//, "").replace(/^\/+/, "")
    if (!path) throw new Error("RSSHub 地址不能为空")
    return `${process.env.RSSHUB_BASE || DefaultRSSHubBase}/${path}`
  }
  if (/^https?:\/\//i.test(value)) return value
  throw new Error("仅支持 http(s):// 或 rsshub:// 标准 RSS 地址")
}

export async function validateRssUrl(input: string) {
  const url = normalizeRssInputUrl(input)
  const data = await rss2json(url)
  if (!data?.items?.length) throw new Error("未解析到 RSS 条目，请确认这是标准 RSS 源")
  return { url, data }
}

export function rssItemsToNews(source: RssSourceRow, items: any[], limit = 50): NewsItem[] {
  return items.slice(0, limit).filter(item => item.title).map((item): NewsItem => {
    const audioUrl = enclosureUrl(item)
    const description = stripHtml(item.description || item.itunes_summary || item.content).slice(0, 500)
    return {
      id: item.id || item.link || item.title,
      title: item.title,
      url: item.link || audioUrl || source.home || source.url,
      sourceName: source.title ? `${source.name} · ${source.title}` : source.name,
      sourceAvatarUrl: source.icon,
      summary: description,
      coverUrl: item.itunes_image?.href || item.itunes_image?.url || undefined,
      pubDate: item.created,
      tag: source.name,
      tags: [source.name, "RSS"],
      extra: {
        info: audioUrl ? "音频" : "RSS",
        hover: description,
      },
    }
  })
}
