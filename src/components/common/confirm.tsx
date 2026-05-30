import { createPortal } from "react-dom"
import { confirmAtom } from "~/hooks/useConfirm"

export function ConfirmDialog() {
  const [state, setState] = useAtom(confirmAtom)
  if (!state) return null
  const finish = (ok: boolean) => {
    state.resolve(ok)
    setState(undefined)
  }
  return createPortal(
    <div className="aihot-modal-backdrop" onClick={() => finish(false)}>
      <div className="aihot-confirm-modal" onClick={e => e.stopPropagation()}>
        <p className="aihot-confirm-msg">{state.message}</p>
        <div className="aihot-confirm-actions">
          <button type="button" className="aihot-confirm-cancel" onClick={() => finish(false)}>取消</button>
          <button type="button" className="aihot-confirm-ok" onClick={() => finish(true)}>确定</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
