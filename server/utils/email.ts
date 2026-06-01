import process from "node:process"
import { $fetch } from "ofetch"

export async function sendVerificationEmail(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw createError({ statusCode: 500, message: "邮件服务未配置" })

  const from = process.env.RESEND_FROM ?? "择流 <zl@292828.xyz>"
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
      <h2 style="margin:0 0 16px;font-size:20px;">择流验证码</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#555;">您的验证码如下，10 分钟内有效。请勿泄露给他人。</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#f5f5f5;border-radius:8px;color:#F14D42;">${code}</div>
      <p style="margin:24px 0 0;font-size:12px;color:#999;">如果您没有请求此验证码，请忽略本邮件。</p>
    </div>
  `

  await $fetch("https://api.resend.com/emails", {
    method: "POST",
    timeout: 10000,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: {
      from,
      to: [email],
      subject: "择流验证码",
      html,
    },
  })
}
