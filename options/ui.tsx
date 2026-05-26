import type { CSSProperties, ReactNode } from "react"

import type { AiSettings } from "~lib/storage/options"

/** 每个 Section 都通过 patch 部分更新 settings；多字段联动（如选 preset）调一次 patch 即可 */
export type Patcher = (delta: Partial<AiSettings>) => void

export const Section = ({
  title,
  children
}: {
  title: string
  children: ReactNode
}) => (
  <section style={S.section}>
    <h2 style={S.sectionTitle}>{title}</h2>
    {children}
  </section>
)

/**
 * 可独立保存的卡片：包一组 Section，底部带保存按钮 + 已保存提示 + 可选 perm warning。
 * dirty=true 时按钮变橙提示有未保存修改，按下保存后由父组件 reset 父级 stored snapshot
 * 让 dirty 重新算回 false。
 */
export const SaveCard = ({
  children,
  onSave,
  dirty,
  savedAt,
  warning,
  busy
}: {
  children: ReactNode
  onSave: () => void
  dirty: boolean
  savedAt: number | null
  warning?: string | null
  busy?: boolean
}) => (
  <div style={S.card}>
    {children}
    <div style={S.cardFooter}>
      <button
        type="button"
        style={dirty ? S.saveBtnDirty : S.saveBtn}
        onClick={onSave}
        disabled={busy}>
        {dirty ? "保存修改" : "保存"}
      </button>
      {!dirty && savedAt && (
        <span style={S.savedHint}>
          已保存 · {new Date(savedAt).toLocaleTimeString()}
        </span>
      )}
      {dirty && (
        <span style={S.dirtyHint}>有未保存的修改</span>
      )}
    </div>
    {warning && <div style={S.warningBox}>{warning}</div>}
  </div>
)

export const Field = ({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: ReactNode
}) => (
  <div style={S.field}>
    <label style={S.label}>{label}</label>
    {children}
    {hint && <div style={S.hint}>{hint}</div>}
  </div>
)

export const S: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    color: "#0f172a",
    padding: "32px 16px"
  },
  container: {
    maxWidth: 640,
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: 12,
    boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
    padding: 28
  },
  title: { fontSize: 22, fontWeight: 600, margin: "0 0 8px" },
  subtitle: {
    margin: "0 0 24px",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.55
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0ea5e9",
    margin: "0 0 12px",
    paddingBottom: 6,
    borderBottom: "1px solid #e2e8f0"
  },
  field: { marginBottom: 14 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
    color: "#334155"
  },
  hint: { marginTop: 4, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 },
  input: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "inherit",
    color: "#0f172a",
    background: "#ffffff",
    boxSizing: "border-box",
    outline: "none"
  },
  textarea: { resize: "vertical", lineHeight: 1.55, minHeight: 100 },
  smallBtn: {
    padding: "6px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    background: "#f1f5f9",
    color: "#334155",
    fontSize: 12,
    cursor: "pointer"
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 8
  },
  saveBtn: {
    padding: "9px 24px",
    background: "#0ea5e9",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  },
  saveBtnDirty: {
    padding: "9px 24px",
    background: "#f59e0b",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  },
  savedHint: { fontSize: 12, color: "#10b981" },
  dirtyHint: { fontSize: 12, color: "#b45309" },
  card: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "16px 18px",
    marginBottom: 16
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px dashed #e2e8f0"
  },
  warningBox: {
    marginTop: 10,
    padding: "8px 12px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    color: "#b91c1c",
    fontSize: 12.5,
    lineHeight: 1.5
  },
  loading: { padding: 32, textAlign: "center", color: "#64748b" },
  linkBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: 0,
    background: "transparent",
    border: "none",
    color: "#0ea5e9",
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 500
  },
  activeBadge: {
    marginLeft: 6,
    padding: "1px 6px",
    background: "#ecfeff",
    border: "1px solid #a5f3fc",
    borderRadius: 4,
    color: "#0e7490",
    fontSize: 11,
    fontWeight: 500
  },
  applyBtn: {
    padding: "7px 14px",
    background: "#0ea5e9",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer"
  }
}
