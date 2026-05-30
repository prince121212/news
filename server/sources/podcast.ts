import type { NewsItem } from "@shared/types"

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

async function podcastRSS(url: string, sourceName: string, tag: string) {
  const data = await rss2json(url)
  if (!data?.items.length) throw new Error("Cannot fetch podcast rss data")
  const avatar = data.image || undefined
  return data.items.slice(0, 50).map((item: any): NewsItem => {
    const audioUrl = enclosureUrl(item)
    return {
      id: item.id || item.link || item.title,
      title: item.title,
      url: item.link || audioUrl || url,
      sourceName,
      sourceAvatarUrl: avatar,
      summary: stripHtml(item.description || item.itunes_summary || item.content).slice(0, 500),
      coverUrl: item.itunes_image?.href || item.itunes_image?.url || avatar,
      pubDate: item.created,
      tag,
      tags: [tag, "播客"],
      extra: {
        info: audioUrl ? "播客音频" : tag,
        hover: stripHtml(item.description || item.itunes_summary || item.content),
      },
    }
  })
}

export default defineSource({
  "ximalaya-kuayangreyi": () => podcastRSS("https://www.ximalaya.com/album/82179651.xml", "喜马拉雅 · 跨洋热议", "喜马拉雅"),
  "xiaoyuzhou-sulachigua": () => podcastRSS("https://rsshub.rssforever.com/xiaoyuzhou/podcast/63bee70c30ff2a00103a63b5", "小宇宙 · 俗辣吃瓜", "小宇宙"),
})
