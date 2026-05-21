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
  savedHint: { fontSize: 12, color: "#10b981" },
  loading: { padding: 32, textAlign: "center", color: "#64748b" }
}
