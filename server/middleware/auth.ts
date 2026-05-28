import process from "node:process"
import { jwtVerify } from "jose"

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  if (!url.pathname.startsWith("/api")) return

  if (["/api/s", "/api/me"].find(p => url.pathname.startsWith(p))) {
    const token = getHeader(event, "Authorization")?.replace(/Bearer\s*/, "")?.trim()
    if (token) {
      try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET ?? "newsnow-password-login")) as { payload?: { id: string, type: string } }
        if (payload?.id) {
          event.context.user = {
            id: payload.id,
            type: payload.type,
          }
        }
      } catch {
        if (url.pathname.startsWith("/api/me"))
          throw createError({ statusCode: 401, message: "JWT verification failed" })
        else logger.warn("JWT verification failed")
      }
    } else if (url.pathname.startsWith("/api/me")) {
      throw createError({ statusCode: 401, message: "JWT verification failed" })
    }
  }
})
