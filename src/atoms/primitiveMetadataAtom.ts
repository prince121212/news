import type { PrimitiveAtom } from "jotai"
import type { CustomGroup, FixedColumnID, PrimitiveMetadata, SourceID } from "@shared/types"
import type { Update } from "./types"

function createPrimitiveMetadataAtom(
  key: string,
  initialValue: PrimitiveMetadata,
  preprocess: ((stored: PrimitiveMetadata) => PrimitiveMetadata),
): PrimitiveAtom<PrimitiveMetadata> {
  const getInitialValue = (): PrimitiveMetadata => {
    const item = localStorage.getItem(key)
    try {
      if (item) {
        const stored = JSON.parse(item) as PrimitiveMetadata
        verifyPrimitiveMetadata(stored)
        return preprocess({
          ...stored,
          action: "init",
        })
      }
    } catch { }
    return initialValue
  }
  const baseAtom = atom(getInitialValue())
  const derivedAtom = atom(get => get(baseAtom), (get, set, update: Update<PrimitiveMetadata>) => {
    const nextValue = preprocess(update instanceof Function ? update(get(baseAtom)) : update)
    if (nextValue.updatedTime > get(baseAtom).updatedTime) {
      set(baseAtom, nextValue)
      localStorage.setItem(key, JSON.stringify(nextValue))
    }
  })
  return derivedAtom
}

const initialMetadata = typeSafeObjectFromEntries(typeSafeObjectEntries(metadata)
  .filter(([id]) => fixedColumnIds.includes(id as any))
  .map(([id, val]) => [id, val.sources] as [FixedColumnID, SourceID[]]))

function normalizeSources(items: SourceID[], options: { includeHottest?: boolean } = {}) {
  return [...new Set(items
    .filter(k => sources[k])
    .map(k => sources[k].redirect ?? k)
    .filter(k => options.includeHottest || sources[k]?.type !== "hottest"))] as SourceID[]
}

export function createDefaultCustomGroups(): CustomGroup[] {
  const tech = metadata.tech.sources.filter(id => sources[id]?.type !== "hottest")
  const finance = metadata.finance.sources.filter(id => sources[id]?.type !== "hottest")
  const ai = normalizeSources([
    "solidot",
    "v2ex-share",
  ].filter(id => sources[id as SourceID]) as SourceID[])
  const entertainment: SourceID[] = []
  const military = normalizeSources([
    "sputniknewscn",
    "cankaoxiaoxi",
  ].filter(id => sources[id as SourceID]) as SourceID[])

  return [
    { id: "tech", name: "科技", sources: normalizeSources(tech) },
    { id: "finance", name: "财经", sources: normalizeSources(finance) },
    { id: "ent", name: "娱乐", sources: entertainment },
    { id: "ai", name: "AI", sources: ai },
    { id: "military", name: "军事", sources: military },
  ]
}

export function preprocessMetadata(target: PrimitiveMetadata) {
  const customGroups = (target.customGroups?.length ? target.customGroups : createDefaultCustomGroups())
    .map(group => ({
      id: group.id || randomUUID(),
      name: `${group.name || "分组"}`.slice(0, 5),
      sources: normalizeSources(group.sources ?? []),
    }))

  return {
    data: {
      ...initialMetadata,
      ...typeSafeObjectFromEntries(
        typeSafeObjectEntries(target.data)
          .filter(([id]) => initialMetadata[id])
          .map(([id, s]) => {
            if (id === "focus") return [id, normalizeSources(s)]
            const oldS = normalizeSources(s).filter(k => initialMetadata[id].includes(k))
            const newS = initialMetadata[id].filter(k => !oldS.includes(k))
            return [id, [...oldS, ...newS]]
          }),
      ),
    },
    customGroups,
    action: target.action,
    updatedTime: target.updatedTime,
  } as PrimitiveMetadata
}

export const primitiveMetadataAtom = createPrimitiveMetadataAtom("metadata", {
  updatedTime: 0,
  data: initialMetadata,
  customGroups: createDefaultCustomGroups(),
  action: "init",
}, preprocessMetadata)
