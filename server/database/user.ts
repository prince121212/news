import type { Database } from "db0"
import type { UserInfo } from "#/types"

export class UserTable {
  private db
  constructor(db: Database) {
    this.db = db
  }

  private normalizeRows(res: any) {
    return res?.results ?? res?.rows ?? res ?? []
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        data TEXT,
        type TEXT,
        created INTEGER,
        updated INTEGER
      );
    `).run()
    await this.migrateLegacyTable()
    await this.db.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_username ON user(username);
    `).run()
    logger.success(`init user table`)
  }

  private async migrateLegacyTable() {
    const columns = this.normalizeRows(await this.db.prepare(`PRAGMA table_info(user)`).all()) as { name: string }[]
    const columnNames = columns.map(column => column.name)
    if (columnNames.includes("username") && columnNames.includes("password")) return

    await this.db.prepare(`ALTER TABLE user RENAME TO user_legacy`).run()
    await this.db.prepare(`
      CREATE TABLE user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        data TEXT,
        type TEXT,
        created INTEGER,
        updated INTEGER
      );
    `).run()
    await this.db.prepare(`
      INSERT INTO user (username, password, data, type, created, updated)
      SELECT id, email, data, type, created, updated FROM user_legacy
    `).run()
    await this.db.prepare(`DROP TABLE user_legacy`).run()
    logger.success(`migrate legacy user table`)
  }

  async addUser(username: string, password: string, type: "github" | "password") {
    const u = await this.getUser(username)
    const now = Date.now()
    if (!u) {
      await this.db.prepare(`INSERT INTO user (username, password, data, type, created, updated) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(username, password, "", type, now, now)
      logger.success(`add user ${username}`)
    } else if (u.password !== password && u.type !== type) {
      await this.db.prepare(`UPDATE user SET password = ?, updated = ? WHERE username = ?`).run(password, now, username)
      logger.success(`update user ${username} password`)
    } else {
      logger.info(`user ${username} already exists`)
    }
  }

  async getUser(username: string) {
    return (await this.db.prepare(`SELECT id, username, password, data, type, created, updated FROM user WHERE username = ?`).get(username)) as UserInfo
  }

  async addPasswordUser(username: string, passwordHash: string) {
    const u = await this.getUser(username)
    if (u) throw new Error("用户名已存在")
    await this.addUser(username, passwordHash, "password")
  }

  async verifyPasswordUser(username: string, passwordHash: string) {
    const u = await this.getUser(username)
    if (!u || u.type !== "password" || u.password !== passwordHash) {
      throw new Error("用户名或密码错误")
    }
    return u
  }

  async setData(key: string, value: string, updatedTime = Date.now()) {
    const state = await this.db.prepare(
      `UPDATE user SET data = ?, updated = ? WHERE username = ?`,
    ).run(value, updatedTime, key)
    if (!state.success) throw new Error(`set user ${key} data failed`)
    logger.success(`set ${key} data`)
  }

  async getData(username: string) {
    const row: any = await this.db.prepare(`SELECT data, updated FROM user WHERE username = ?`).get(username)
    if (!row) throw new Error(`user ${username} not found`)
    logger.success(`get ${username} data`)
    return row as {
      data: string
      updated: number
    }
  }

  async deleteUser(key: string) {
    const state = await this.db.prepare(`DELETE FROM user WHERE username = ?`).run(key)
    if (!state.success) throw new Error(`delete user ${key} failed`)
    logger.success(`delete user ${key}`)
  }
}
