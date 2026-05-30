interface ConfirmState {
  id: number
  message: string
  resolve: (ok: boolean) => void
}

export const confirmAtom = atom<ConfirmState | undefined>(undefined)

export function useConfirm() {
  const setConfirm = useSetAtom(confirmAtom)
  return useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirm({ id: Date.now(), message, resolve })
    })
  }, [setConfirm])
}
