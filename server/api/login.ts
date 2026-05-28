import process from "node:process"
import { SignJWT } from "jose"
import { UserTable } from "#/database/user"

export default defineEventHandler(async (event) => {
  try {
    const db = useAppDatabase()
    if (!db) throw new Error("db is not defined")

    const userTable = new UserTable(db)
    if (process.env.INIT_TABLE !== "false") await userTable.init()

    const body = await readBody<{
      username?: string
      password?: string
      action?: "login" | "register"
    }>(event)

    const username = String(body.username ?? "").trim()
    const password = String(body.password ?? "")
    const action = body.action === "register" ? "register" : "login"

    if (username.length < 4) {
      throw createError({ statusCode: 400, message: "用户名至少需要 4 位" })
    }

    const passwordHash = await myCrypto(`${username}:${password}`, "SHA-256")
    if (action === "register") {
      await userTable.addPasswordUser(username, passwordHash)
    } else {
      await userTable.verifyPasswordUser(username, passwordHash)
    }

    const jwtToken = await new SignJWT({
      id: username,
      type: "password",
    })
      .setExpirationTime("60d")
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode(process.env.JWT_SECRET ?? "newsnow-password-login"))

    return {
      jwt: jwtToken,
      user: {
        name: username,
      },
    }
  } catch (e) {
    logger.error(e)
    if (e && typeof e === "object" && "statusCode" in e) throw e
    throw createError({
      statusCode: e instanceof Error && e.message === "用户名已存在" ? 409 : 401,
      message: e instanceof Error ? e.message : "登录失败",
    })
  }
})
