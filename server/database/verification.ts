import type { AppDatabase } from "#/utils/database"

const CODE_TTL = 10 * 60 * 1000
const SEND_INTERVAL = 60 * 1000
const MAX_ATTEMPTS = 5

interface CodeRow {
  email: string
  code: string
  expires: number
  sent: number
  attempts: number
}

export class VerificationTable {
  private db
  constructor(db: AppDatabase) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS email_code (
        email TEXT PRIMARY KEY,
        code TEXT,
        expires INTEGER,
        sent INTEGER,
        attempts INTEGER DEFAULT 0
      );
    `).run()
    logger.success(`init email_code table`)
  }

  async canSend(email: string) {
    const row = (await this.db.prepare(`SELECT sent FROM email_code WHERE email = ?`).get(email)) as { sent: number } | undefined
    if (!row) return true
    return Date.now() - row.sent >= SEND_INTERVAL
  }

  async setCode(email: string, code: string) {
    const now = Date.now()
    await this.db.prepare(
      `INSERT OR REPLACE INTO email_code (email, code, expires, sent, attempts) VALUES (?, ?, ?, ?, 0)`,
    ).run(email, code, now + CODE_TTL, now)
    logger.success(`set code for ${email}`)
  }

  async verifyCode(email: string, code: string) {
    const row = (await this.db.prepare(`SELECT email, code, expires, sent, attempts FROM email_code WHERE email = ?`).get(email)) as CodeRow | undefined
    if (!row) throw createError({ statusCode: 400, message: "验证码无效或已过期" })
    if (row.expires < Date.now()) {
      await this.db.prepare(`DELETE FROM email_code WHERE email = ?`).run(email)
      throw createError({ statusCode: 400, message: "验证码已过期" })
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      await this.db.prepare(`DELETE FROM email_code WHERE email = ?`).run(email)
      throw createError({ statusCode: 400, message: "验证码错误次数过多，请重新获取" })
    }
    if (row.code !== String(code)) {
      await this.db.prepare(`UPDATE email_code SET attempts = attempts + 1 WHERE email = ?`).run(email)
      throw createError({ statusCode: 400, message: "验证码错误" })
    }
    await this.db.prepare(`DELETE FROM email_code WHERE email = ?`).run(email)
  }
}
