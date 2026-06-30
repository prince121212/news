import { useEffect } from "react"
import { SiteName, SiteUrl } from "@shared/site"

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>("link[rel=\"canonical\"]")
  if (!el) {
    el = document.createElement("link")
    el.rel = "canonical"
    document.head.appendChild(el)
  }
  el.href = url
}

export function usePageSEO(options: {
  title: string
  description: string
  path?: string
  type?: "website" | "article"
}) {
  useEffect(() => {
    const url = `${SiteUrl}${options.path ?? window.location.pathname}`
    document.title = options.title
    upsertMeta("meta[name=\"description\"]", "name", "description", options.description)
    upsertMeta("meta[property=\"og:title\"]", "property", "og:title", options.title)
    upsertMeta("meta[property=\"og:description\"]", "property", "og:description", options.description)
    upsertMeta("meta[property=\"og:url\"]", "property", "og:url", url)
    upsertMeta("meta[property=\"og:type\"]", "property", "og:type", options.type ?? "website")
    upsertMeta("meta[name=\"twitter:title\"]", "name", "twitter:title", options.title)
    upsertMeta("meta[name=\"twitter:description\"]", "name", "twitter:description", options.description)
    upsertCanonical(url)
  }, [options.description, options.path, options.title, options.type])
}

export function seoTitle(title: string) {
  return `${title} | ${SiteName}`
}
