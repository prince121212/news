import { useRegisterSW } from "virtual:pwa-register/react"

export function usePWA() {
  // 仅注册 service worker（离线缓存）。不提示、不自动更新、不自动刷新页面。
  // 新版本会在用户下次手动刷新或重开标签页时自然生效。
  useRegisterSW()
}
