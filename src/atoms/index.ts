import type { CustomGroup, FixedColumnID, SourceID } from "@shared/types"
import type { Update } from "./types"

export const customGroupsAtom = atom((get) => {
  return get(primitiveMetadataAtom).customGroups
}, (get, set, update: Update<CustomGroup[]>) => {
  const _ = update instanceof Function ? update(get(customGroupsAtom)) : update
  set(primitiveMetadataAtom, {
    ...get(primitiveMetadataAtom),
    updatedTime: Date.now(),
    action: "manual",
    customGroups: _,
  })
})

export const focusSourcesAtom = atom((get) => {
  return get(primitiveMetadataAtom).data.focus
}, (get, set, update: Update<SourceID[]>) => {
  const _ = update instanceof Function ? update(get(focusSourcesAtom)) : update
  set(primitiveMetadataAtom, {
    ...get(primitiveMetadataAtom),
    updatedTime: Date.now(),
    action: "manual",
    data: {
      ...get(primitiveMetadataAtom).data,
      focus: _,
    },
  })
})

export const currentColumnIDAtom = atom<FixedColumnID>("focus")

export const currentSourcesAtom = atom((get) => {
  const id = get(currentColumnIDAtom)
  return get(primitiveMetadataAtom).data[id]
}, (get, set, update: Update<SourceID[]>) => {
  const _ = update instanceof Function ? update(get(currentSourcesAtom)) : update
  set(primitiveMetadataAtom, {
    ...get(primitiveMetadataAtom),
    updatedTime: Date.now(),
    action: "manual",
    data: {
      ...get(primitiveMetadataAtom).data,
      [get(currentColumnIDAtom)]: _,
    },
  })
})

export const goToTopAtom = atom({
  ok: false,
  el: undefined as HTMLElement | undefined,
  fn: undefined as (() => void) | undefined,
})
