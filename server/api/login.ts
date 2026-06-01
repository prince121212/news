import process from "node:process"
import { SignJWT } from "jose"
import { UserTable } from "#/database/user"
import { VerificationTable } from "#/database/verification"

export default defineEventHandler(async (event) => {
  try {
    const db = useAppDatabase()
    if (!db) throw new Error("db is not defined")

    const userTable = new UserTable(db)
    const verificationTable = new VerificationTable(db)
    if (process.env.INIT_TABLE !== "false") {
      await userTable.init()
      await verificationTable.init()
    }

    const body = await readBody<{
      email?: string
      password?: string
      code?: string
      action?: "login" | "register" | "login-code"
    }>(event)

    let email: string
    try {
      email = verifyEmail(body.email)
    } catch {
      throw createError({ statusCode: 400, message: "邮箱格式不正确" })
    }
    const password = String(body.password ?? "")
    const code = String(body.code ?? "")
    const action = body.action ?? "login"

    if (action === "register") {
      await verificationTable.verifyCode(email, code)
      if (password.length < 6) {
        throw createError({ statusCode: 400, message: "密码至少需要 6 位" })
      }
      const passwordHash = await myCrypto(`${email}:${password}`, "SHA-256")
      await userTable.addPasswordUser(email, passwordHash)
    } else if (action === "login-code") {
      await verificationTable.verifyCode(email, code)
      const user = await userTable.getUser(email)
      if (!user) throw createError({ statusCode: 401, message: "账号不存在，请先注册" })
      if (user.type !== "password") throw createError({ statusCode: 401, message: "该账号不支持验证码登录" })
    } else {
      const passwordHash = await myCrypto(`${email}:${password}`, "SHA-256")
      await userTable.verifyPasswordUser(email, passwordHash)
    }

    const jwtToken = await new SignJWT({
      id: email,
      type: "password",
    })
      .setExpirationTime("60d")
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode(process.env.JWT_SECRET ?? "newsnow-password-login"))

    return {
      jwt: jwtToken,
      user: {
        name: email,
      },
    }
  } catch (e) {
    logger.error(e)
    if (e && typeof e === "object" && "statusCode" in e) throw e
    throw createError({
      statusCode: e instanceof Error && e.message === "该邮箱已注册" ? 409 : 401,
      message: e instanceof Error ? e.message : "登录失败",
    })
  }
})
