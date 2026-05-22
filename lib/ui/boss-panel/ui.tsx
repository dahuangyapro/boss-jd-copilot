import type { CSSProperties } from "react"

/**
 * 探针仅供开发期定位 Boss DOM 选择器，生产构建里隐藏入口。
 * Plasmo/Parcel 在 build 时把 process.env.NODE_ENV 替换为字面量，配合 if 守卫
 * 可以让生产包里相关 UI 被 tree-shake 掉（probe 模块本身仍在 bundle，但不会执行）。
 */
export const IS_DEV = process.env.NODE_ENV !== "production"

/**
 * 开发期最常见的坑：在 chrome://extensions 点"重新加载"扩展后，已经打开的 Boss
 * 页面里 content script 变成"孤儿"——chrome.runtime 被卸载，访问 .sendMessage
 * 会抛 "Cannot read properties of undefined" 或 "Extension context invalidated"。
 * 解药就一个：刷新当前 Boss 页面。
 */
export const isExtensionAlive = (): boolean => {
  try {
    return typeof chrome !== "undefined" && !!chrome?.runtime?.id
  } catch {
    return false
  }
}

export const CONTEXT_DEAD_MSG =
  "扩展上下文已失效（开发期重载扩展后会出现）。请按 Ctrl+R 刷新当前 Boss 页面再试。"

/** content script 无权直接打开 options 页，必须通过 background 代为打开 */
export const requestOpenOptions = () => {
  try {
    chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" }).catch(() => {})
  } catch {
    // 上下文死了；用户下一次操作会从 generate 流程看到 CONTEXT_DEAD_MSG
  }
}

export const HEADER_ICON_BTN: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  border: "none",
  background: "transparent",
  color: "#ffffff",
  cursor: "pointer",
  borderRadius: 4,
  padding: 0
}

export const BTN: Record<"primary" | "secondary", CSSProperties> = {
  primary: {
    padding: "8px 12px",
    background: "#0ea5e9",
    border: "1px solid #0ea5e9",
    borderRadius: 8,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 500
  },
  secondary: {
    padding: "8px 12px",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    color: "#0f172a",
    cursor: "pointer",
    fontSize: 12.5
  }
}

export const SearchIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

export const GearIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export const MetaRow = ({
  label,
  value
}: {
  label: string
  value: string
}) => (
  <div style={{ display: "flex", gap: 8, marginBottom: 4, lineHeight: 1.5 }}>
    <span style={{ color: "#94a3b8", flex: "0 0 36px" }}>{label}</span>
    <span style={{ color: "#0f172a", flex: 1, wordBreak: "break-all" }}>
      {value}
    </span>
  </div>
)
