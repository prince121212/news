const userAtom = atomWithStorage<{
  name?: string
}>("user", {})

const jwtAtom = atomWithStorage("jwt", "")
const loginDialogAtom = atom(false)

const enableLoginAtom = atomWithStorage<{
  enable: boolean
}>("login", {
  enable: true,
})

enableLoginAtom.onMount = (set) => {
  myFetch("/enable-login").then((r) => {
    set(r)
  }).catch((e) => {
    if (e.statusCode === 506) {
      set({ enable: false })
      localStorage.removeItem("jwt")
    }
  })
}

export function useLogin() {
  const userInfo = useAtomValue(userAtom)
  const setUserInfo = useSetAtom(userAtom)
  const jwt = useAtomValue(jwtAtom)
  const setJwt = useSetAtom(jwtAtom)
  const enableLogin = useAtomValue(enableLoginAtom)
  const [loginDialogOpen, setLoginDialogOpen] = useAtom(loginDialogAtom)

  const login = useCallback(() => {
    setLoginDialogOpen(true)
  }, [setLoginDialogOpen])

  const submitLogin = useCallback(async (payload: {
    username: string
    password: string
    action: "login" | "register"
  }) => {
    const res = await myFetch("/login", {
      method: "POST",
      body: payload,
    }) as {
      jwt: string
      user: {
        name: string
      }
    }
    setJwt(res.jwt)
    setUserInfo(res.user)
    setLoginDialogOpen(false)
  }, [setJwt, setUserInfo, setLoginDialogOpen])

  const logout = useCallback(() => {
    window.localStorage.clear()
    window.location.reload()
  }, [])

  return {
    loggedIn: !!jwt,
    jwt,
    userInfo,
    enableLogin: !!enableLogin.enable,
    logout,
    login,
    submitLogin,
    loginDialogOpen,
    setLoginDialogOpen,
  }
}
