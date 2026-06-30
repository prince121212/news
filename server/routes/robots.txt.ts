import { SiteUrl } from "@shared/site"

export default defineEventHandler((event) => {
  setHeader(event, "content-type", "text/plain; charset=utf-8")
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "",
    `Sitemap: ${SiteUrl}/sitemap.xml`,
    `Host: ${SiteUrl.replace(/^https?:\/\//, "")}`,
    "",
  ].join("\n")
})
