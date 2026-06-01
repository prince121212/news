import { motion } from "framer-motion"
import { createPortal } from "react-dom"

// function ThemeToggle() {
//   const { isDark, toggleDark } = useDark()
//   return (
//     <li onClick={toggleDark} className="cursor-pointer [&_*]:cursor-pointer transition-all">
//       <span className={$("inline-block", isDark ? "i-ph-moon-stars-duotone" : "i-ph-sun-dim-duotone")} />
//       <span>
//         {isDark ? "浅色模式" : "深色模式"}
//       </span>
//     </li>
//   )
// }

export function Menu() {
  const { loggedIn, login, logout, userInfo, enableLogin, loginDialogOpen, setLoginDialogOpen, submitLogin, sendCode } = useLogin()
  const [shown, show] = useState(false)
  return (
    <>
      <span className="relative" onMouseEnter={() => show(true)} onMouseLeave={() => show(false)}>
        <span className="flex items-center scale-90">
          <button
            type="button"
            title={loggedIn ? userInfo.name : "账号"}
            className={$(loggedIn ? "btn i-ph:user-circle-duotone" : "btn i-si:more-muted-horiz-circle-duotone")}
          />
        </span>
        {shown && (
          <div className="absolute right-0 z-99 bg-transparent pt-4 top-4">
            <motion.div
              id="dropdown-menu"
              className={$([
                "w-200px",
                "bg-primary backdrop-blur-5 bg-op-70! rounded-lg shadow-xl",
              ])}
              initial={{
                scale: 0.9,
              }}
              animate={{
                scale: 1,
              }}
            >
              <ol className="bg-base bg-op-70! backdrop-blur-md p-2 rounded-lg color-base text-base">
                {enableLogin && (loggedIn
                  ? (
                      <>
                        <li>
                          <span className="i-ph:user-circle-duotone inline-block" />
                          <span>{userInfo.name}</span>
                        </li>
                        <li onClick={logout}>
                          <span className="i-ph:sign-out-duotone inline-block" />
                          <span>退出登录</span>
                        </li>
                      </>
                    )
                  : (
                      <li onClick={login}>
                        <span className="i-ph:sign-in-duotone inline-block" />
                        <span>账号登录 / 注册</span>
                      </li>
                    ))}
                {/* <ThemeToggle /> */}
              </ol>
            </motion.div>
          </div>
        )}
      </span>
      {loginDialogOpen && (
        createPortal(
          <LoginDialog
            onClose={() => setLoginDialogOpen(false)}
            onSubmit={submitLogin}
            onSendCode={sendCode}
          />,
          document.body,
        )
      )}
    </>
  )
}

type LoginMode = "login" | "register"

function LoginDialog({ onClose, onSubmit, onSendCode }: {
  onClose: () => void
  onSubmit: (payload: { email: string, password?: string, code?: string, action: "login" | "register" | "login-code" }) => Promise<void>
  onSendCode: (email: string) => Promise<void>
}) {
  const [mode, setMode] = useState<LoginMode>("login")
  const [codeLogin, setCodeLogin] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // register always needs a code; in login mode only when codeLogin is on
  const needCode = mode === "register" || codeLogin
  const needPassword = mode === "register" || !codeLogin

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const isValidEmail = useCallback((v: string) => /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(v.trim()), [])

  const handleSendCode = useCallback(async () => {
    setError("")
    if (!isValidEmail(email)) {
      setError("请输入正确的邮箱")
      return
    }
    setSending(true)
    try {
      await onSendCode(email.trim())
      setCountdown(60)
    } catch (e: any) {
      setError(e?.data?.message || e?.message || "验证码发送失败")
    } finally {
      setSending(false)
    }
  }, [email, isValidEmail, onSendCode])

  const submit = useCallback(async () => {
    setError("")
    if (!isValidEmail(email)) {
      setError("请输入正确的邮箱")
      return
    }
    const action = mode === "register" ? "register" : codeLogin ? "login-code" : "login"
    setLoading(true)
    try {
      await onSubmit({
        email: email.trim(),
        password: needPassword ? password : undefined,
        code: needCode ? code : undefined,
        action,
      })
    } catch (e: any) {
      setError(e?.data?.message || e?.message || "操作失败")
    } finally {
      setLoading(false)
    }
  }, [codeLogin, code, email, isValidEmail, mode, needCode, needPassword, onSubmit, password])

  const switchMode = useCallback((next: LoginMode) => {
    setMode(next)
    setCodeLogin(false)
    setError("")
  }, [])

  const tabClass = (active: boolean) => $(
    "flex-1 rounded-md p-2 text-sm transition-all",
    active ? "bg-primary color-white" : "bg-neutral-400/10 color-base op-70",
  )

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4" onClick={onClose}>
      <motion.form
        className="w-full max-w-360px rounded-lg bg-base p-4 shadow-xl color-base"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-bold">账号</span>
          <button type="button" className="btn i-ph:x-duotone" onClick={onClose} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button type="button" className={tabClass(mode === "login")} onClick={() => switchMode("login")}>登录</button>
          <button type="button" className={tabClass(mode === "register")} onClick={() => switchMode("register")}>注册</button>
        </div>
        <label className="flex flex-col gap-1 mb-3">
          <span className="text-sm op-70">邮箱</span>
          <input
            className="rounded-md bg-neutral-400/10 p-2 outline-none focus:ring-2 focus:ring-primary"
            value={email}
            type="email"
            autoFocus
            placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)}
          />
        </label>
        {needCode && (
          <label className="flex flex-col gap-1 mb-3">
            <span className="text-sm op-70">验证码</span>
            <div className="flex gap-2">
              <input
                className="flex-1 w-0 rounded-md bg-neutral-400/10 p-2 outline-none focus:ring-2 focus:ring-primary"
                value={code}
                inputMode="numeric"
                placeholder="6 位验证码"
                onChange={e => setCode(e.target.value)}
              />
              <button
                type="button"
                disabled={sending || countdown > 0}
                className="whitespace-nowrap rounded-md bg-neutral-400/10 px-3 text-sm color-base disabled:op-50"
                onClick={handleSendCode}
              >
                {countdown > 0 ? `${countdown}s` : sending ? "发送中" : "发送验证码"}
              </button>
            </div>
          </label>
        )}
        {needPassword && (
          <label className="flex flex-col gap-1 mb-3">
            <span className="text-sm op-70">密码</span>
            <input
              className="rounded-md bg-neutral-400/10 p-2 outline-none focus:ring-2 focus:ring-primary"
              value={password}
              type="password"
              placeholder={mode === "register" ? "至少 6 位" : undefined}
              onChange={e => setPassword(e.target.value)}
            />
          </label>
        )}
        {error && <div className="mb-3 rounded-md bg-red/10 p-2 text-sm color-red">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary p-2 color-white disabled:op-50"
        >
          {loading ? "处理中..." : mode === "register" ? "注册" : "登录"}
        </button>
        {mode === "login" && (
          <button
            type="button"
            className="mt-3 w-full text-center text-sm op-70 hover:op-100"
            onClick={() => {
              setCodeLogin(v => !v)
              setError("")
            }}
          >
            {codeLogin ? "用密码登录" : "忘记密码？用验证码登录"}
          </button>
        )}
      </motion.form>
    </div>
  )
}
