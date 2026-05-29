import process from "node:process"
import { $fetch } from "ofetch"

type D1QueryResult = {
  results?: unknown[]
  success?: boolean
  meta?: Record<string, unknown>
}

type D1QueryResponse = {
  success: boolean
  errors?: { message?: string }[]
  result?: D1QueryResult[]
}

export type AppDatabase = {
  prepare: (sql: string) => {
    all: (...params: any[]) => Promise<any>
    get: (...params: any[]) => Promise<any>
    run: (...params: any[]) => Promise<any>
  }
  exec?: (sql: string) => Promise<any>
}

function shouldUseRemoteD1() {
  return process.env.REMOTE_D1 === "true"
    && !!process.env.CLOUDFLARE_API_TOKEN
    && !!process.env.CLOUDFLARE_ACCOUNT_ID
    && !!process.env.D1_DATABASE_ID
}

async function queryRemoteD1(sql: string, params: unknown[] = []) {
  const response = await $fetch<D1QueryResponse>(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.D1_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      },
      body: {
        sql,
        params,
      },
    },
  )

  if (!response.success || response.result?.[0]?.success === false) {
    throw new Error(response.errors?.map(error => error.message).filter(Boolean).join("; ") || "Remote D1 query failed")
  }

  return response.result?.[0] ?? { success: true, results: [] }
}

function useRemoteD1Database() {
  return {
    prepare(sql: string) {
      return {
        async all(...params: unknown[]) {
          const result = await queryRemoteD1(sql, params)
          return result.results ?? []
        },
        async get(...params: unknown[]) {
          const result = await queryRemoteD1(sql, params)
          return result.results?.[0]
        },
        async run(...params: unknown[]) {
          const result = await queryRemoteD1(sql, params)
          return {
            success: result.success !== false,
            ...result.meta,
          }
        },
      }
    },
    async exec(sql: string) {
      const result = await queryRemoteD1(sql)
      return {
        success: result.success !== false,
        ...result.meta,
      }
    },
  }
}

export function useAppDatabase() {
  if (shouldUseRemoteD1()) return useRemoteD1Database()
  return useDatabase()
}
