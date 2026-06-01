import process from "node:process"
import { VerificationTable } from "#/database/verification"

function generateCode() {
  const buf = new Uint32Array(1)
  globalThis.crypto.getRandomValues(buf)
  return String(buf[0] % 1000000).padStart(6, "0")
}

export default defineEventHandler(async (event) => {
  try {
    const db = useAppDatabase()
    if (!db) throw new Error("db is not defined")

    const verificationTable = new VerificationTable(db)
    if (process.env.INIT_TABLE !== "false") await verificationTable.init()

    const body = await readBody<{ email?: string }>(event)
    let email: string
    try {
      email = verifyEmail(body.email)
    } catch {
      throw createError({ statusCode: 400, message: "邮箱格式不正确" })
    }

    if (!(await verificationTable.canSend(email))) {
      throw createError({ statusCode: 429, message: "发送过于频繁，请稍后再试" })
    }

    const code = generateCode()
    await sendVerificationEmail(email, code)
    await verificationTable.setCode(email, code)

    return { success: true }
  } catch (e) {
    logger.error(e)
    if (e && typeof e === "object" && "statusCode" in e) throw e
    throw createError({
      statusCode: 400,
      message: e instanceof Error ? e.message : "验证码发送失败",
    })
  }
})
