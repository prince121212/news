import { metadata } from "./metadata"
import sources from "./sources"
import type { CustomGroup, SourceID } from "./types"

export function normalizeGroupSources(items: SourceID[], options: { includeHottest?: boolean } = {}) {
  return [...new Set(items
    .filter(Boolean)
    .map(k => sources[k]?.redirect ?? k)
    .filter(k => !sources[k] || options.includeHottest || sources[k]?.type !== "hottest"))] as SourceID[]
}

export function createDefaultCustomGroups(): CustomGroup[] {
  const tech = metadata.tech.sources.filter(id => sources[id]?.type !== "hottest")
  const finance = metadata.finance.sources.filter(id => sources[id]?.type !== "hottest")
  const ai = normalizeGroupSources([
    "aihot",
    "solidot",
    "v2ex-share",
  ].filter(id => sources[id as SourceID]) as SourceID[])
  const entertainment: SourceID[] = []
  const podcast = normalizeGroupSources([
    "ximalaya-kuayangreyi",
    "xiaoyuzhou-sulachigua",
  ].filter(id => sources[id as SourceID]) as SourceID[])
  const military = normalizeGroupSources([
    "sputniknewscn",
    "cankaoxiaoxi",
  ].filter(id => sources[id as SourceID]) as SourceID[])

  return [
    { id: "tech", name: "科技", sources: normalizeGroupSources(tech) },
    { id: "finance", name: "财经", sources: normalizeGroupSources(finance) },
    { id: "ent", name: "娱乐", sources: entertainment },
    { id: "podcast", name: "播客", sources: podcast },
    { id: "ai", name: "AI", sources: ai },
    { id: "military", name: "军事", sources: military },
  ]
}

export function sanitizeDefaultGroups(groups: CustomGroup[] = []) {
  return groups.map((group, index) => {
    const id = String(group.id || `group-${index + 1}`).replace(/[^\w-]/g, "").slice(0, 40) || `group-${index + 1}`
    return {
      id,
      name: String(group.name || "分组").trim().slice(0, 8),
      sources: normalizeGroupSources(group.sources ?? []),
    }
  }).filter(group => group.name)
}
