export interface Env {
  NEWS_REFRESH_URL: string
  NEWS_REFRESH_TOKEN: string
}

async function refresh(env: Env) {
  if (!env.NEWS_REFRESH_URL || !env.NEWS_REFRESH_TOKEN) {
    throw new Error("NEWS_REFRESH_URL and NEWS_REFRESH_TOKEN are required")
  }

  const response = await fetch(env.NEWS_REFRESH_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-refresh-token": env.NEWS_REFRESH_TOKEN,
    },
    body: JSON.stringify({ force: false }),
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`News refresh failed: ${response.status} ${text}`)
  }

  return text
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(refresh(env))
  },

  async fetch(_request: Request, env: Env) {
    const body = await refresh(env)
    return new Response(body, {
      headers: { "content-type": "application/json; charset=utf-8" },
    })
  },
}
