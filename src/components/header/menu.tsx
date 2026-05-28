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
  const { loggedIn, login, logout, userInfo, enableLogin, loginDialogOpen, setLoginDialogOpen, submitLogin } = useLogin()
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
          />,
          document.body,
        )
      )}
    </>
  )
}

function LoginDialog({ onClose, onSubmit }: {
  onClose: () => void
  onSubmit: (payload: { username: string, password: string, action: "login" | "register" }) => Promise<void>
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = useCallback(async (action: "login" | "register") => {
    setError("")
    setLoading(true)
    try {
      await onSubmit({ username, password, action })
    } catch (e: any) {
      setError(e?.data?.message || e?.message || "登录失败")
    } finally {
      setLoading(false)
    }
  }, [onSubmit, password, username])

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4" onClick={onClose}>
      <motion.form
        className="w-full max-w-360px rounded-lg bg-base p-4 shadow-xl color-base"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          submit("login")
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-bold">账号</span>
          <button type="button" className="btn i-ph:x-duotone" onClick={onClose} />
        </div>
        <label className="flex flex-col gap-1 mb-3">
          <span className="text-sm op-70">用户名</span>
          <input
            className="rounded-md bg-neutral-400/10 p-2 outline-none focus:ring-2 focus:ring-primary"
            value={username}
            autoFocus
            onChange={e => setUsername(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 mb-3">
          <span className="text-sm op-70">密码</span>
          <input
            className="rounded-md bg-neutral-400/10 p-2 outline-none focus:ring-2 focus:ring-primary"
            value={password}
            type="password"
            onChange={e => setPassword(e.target.value)}
          />
        </label>
        {error && <div className="mb-3 rounded-md bg-red/10 p-2 text-sm color-red">{error}</div>}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary p-2 color-white disabled:op-50"
          >
            {loading ? "处理中..." : "登录"}
          </button>
          <button
            type="button"
            disabled={loading}
            className="rounded-md bg-neutral-400/10 p-2 color-base disabled:op-50"
            onClick={() => submit("register")}
          >
            注册
          </button>
        </div>
      </motion.form>
    </div>
  )
}
