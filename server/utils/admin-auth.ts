export const ADMIN_EMAIL = "1608840095@qq.com"
export const ADMIN_PASSWORD = "123456"

export function assertAdmin(body: { email?: string, password?: string }) {
  let email: string
  try {
    email = verifyEmail(body.email)
  } catch {
    throw createError({ statusCode: 401, message: "管理员账号或密码错误" })
  }
  if (email !== ADMIN_EMAIL || body.password !== ADMIN_PASSWORD) {
    throw createError({ statusCode: 401, message: "管理员账号或密码错误" })
  }
}
