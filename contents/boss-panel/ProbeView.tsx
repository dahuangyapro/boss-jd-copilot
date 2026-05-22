import type { CSSProperties, ReactNode } from "react"

import type { ProbedInfo } from "~lib/boss/probe"

/**
 * 探针展示组件，纯展示——全局监听 / 锁定逻辑都在父组件（index.tsx）。
 * - 未锁定：按钮"退出"整体退出探针模式
 * - 已锁定：按钮"重新选择"解锁继续选，Esc 才退出探针模式
 */
export const ProbeView = ({
  info,
  locked,
  onExit,
  onReselect
}: {
  info: ProbedInfo | null
  locked: boolean
  onExit: () => void
  onReselect: () => void
}) => {
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          color: "#475569",
          fontSize: 12.5
        }}>
        <span>
          {locked
            ? "已锁定选中，点「重新选择」继续，或按 Esc 退出"
            : "鼠标移到元素上预览，点击锁定；Esc 退出"}
        </span>
        <button
          onClick={locked ? onReselect : onExit}
          style={{
            padding: "4px 10px",
            background: locked ? "#0ea5e9" : "#ffffff",
            border: `1px solid ${locked ? "#0ea5e9" : "#cbd5e1"}`,
            borderRadius: 6,
            color: locked ? "#ffffff" : "#0f172a",
            cursor: "pointer",
            fontSize: 12,
            whiteSpace: "nowrap"
          }}>
          {locked ? "重新选择" : "退出"}
        </button>
      </div>

      {!info && (
        <div style={{ color: "#94a3b8", padding: "8px 0" }}>
          移动鼠标到页面任意元素…
        </div>
      )}

      {info && (
        <>
          <ProbeRow label="选择器">
            <code style={CODE_STYLE}>{info.selector || "—"}</code>
          </ProbeRow>
          <ProbeRow label="tag">
            <code style={CODE_STYLE}>{info.tag}</code>
          </ProbeRow>
          <ProbeRow label="class">
            <code style={CODE_STYLE}>{info.className || "—"}</code>
          </ProbeRow>
          <ProbeRow label="文本">
            <span style={{ wordBreak: "break-all" }}>{info.text || "—"}</span>
          </ProbeRow>
          <details style={{ marginTop: 6 }}>
            <summary
              style={{
                cursor: "pointer",
                color: "#475569",
                fontSize: 12.5
              }}>
              outerHTML（前 400 字符）
            </summary>
            <pre
              style={{
                marginTop: 6,
                padding: 8,
                background: "#0f172a",
                color: "#e2e8f0",
                borderRadius: 6,
                maxHeight: 160,
                overflow: "auto",
                fontSize: 11.5,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all"
              }}>
              {info.outerHtml}
            </pre>
          </details>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button
              onClick={() => copy(info.selector)}
              style={PROBE_BTN}
              title="复制选择器到剪贴板">
              复制选择器
            </button>
            <button
              onClick={() => copy(info.text)}
              style={PROBE_BTN}
              title="复制元素文本">
              复制文本
            </button>
            <button
              onClick={() => copy(info.outerHtml)}
              style={PROBE_BTN}
              title="复制 outerHTML 片段">
              复制 HTML
            </button>
          </div>
        </>
      )}
    </>
  )
}

const ProbeRow = ({
  label,
  children
}: {
  label: string
  children: ReactNode
}) => (
  <div style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 12.5 }}>
    <span style={{ color: "#94a3b8", flex: "0 0 44px" }}>{label}</span>
    <span style={{ flex: 1, color: "#0f172a" }}>{children}</span>
  </div>
)

const CODE_STYLE: CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  fontSize: 11.5,
  background: "#f1f5f9",
  padding: "1px 5px",
  borderRadius: 4,
  wordBreak: "break-all"
}

const PROBE_BTN: CSSProperties = {
  flex: 1,
  padding: "6px 8px",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  color: "#0f172a",
  cursor: "pointer",
  fontSize: 12
}
