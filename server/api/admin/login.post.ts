import process from "node:process"
import { VerificationTable } from "#/database/verification"
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "#/utils/admin-auth"

export default defineEventHandler(async (event) => {
  try {
    const db = useAppDatabase()
    if (!db) throw new Error("db is not defined")

    const verificationTable = new VerificationTable(db)
    if (process.env.INIT_TABLE !== "false") await verificationTable.init()

    const body = await readBody<{ email?: string, code?: string }>(event)
    let email: string
    try {
      email = verifyEmail(body.email)
    } catch {
      throw createError({ statusCode: 400, message: "邮箱格式不正确" })
    }
    if (email !== ADMIN_EMAIL) {
      throw createError({ statusCode: 401, message: "无效的管理员邮箱" })
    }

    await verificationTable.verifyCode(email, String(body.code ?? ""))

    return { success: true, password: ADMIN_PASSWORD }
  } catch (e) {
    logger.error(e)
    if (e && typeof e === "object" && "statusCode" in e) throw e
    throw createError({
      statusCode: 400,
      message: e instanceof Error ? e.message : "管理员登录失败",
    })
  }
})
