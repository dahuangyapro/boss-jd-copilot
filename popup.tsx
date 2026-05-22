import { useEffect, useState } from "react"

import { getPageType, type BossPageType } from "~lib/boss/pages"
import { getAiSettings } from "~lib/storage/options"

const PAGE_LABEL: Record<BossPageType, { text: string; ok: boolean }> = {
  job_detail: { text: "Boss 职位详情（浮层已注入）", ok: true },
  job_recommend: { text: "Boss 推荐列表（浮层已注入）", ok: true },
  chat: { text: "Boss 沟通会话（浮层已注入）", ok: true },
  unknown: {
    text: "请打开 Boss 直聘的推荐列表页或职位详情页",
    ok: false
  }
}

const Popup = () => {
  const [pageType, setPageType] = useState<BossPageType>("unknown")
  const [hasKey, setHasKey] = useState<boolean | null>(null)

  useEffect(() => {
    // 读当前激活 tab 的 URL 判断页面类型（host_permissions 已覆盖 https://*/*，无需额外权限）
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url) setPageType(getPageType(tab.url))
    })
    getAiSettings().then((s) => setHasKey(s.apiKey.trim().length > 0))
  }, [])

  const page = PAGE_LABEL[pageType]

  return (
    <div style={S.container}>
      <div style={S.header}>
        <span style={S.title}>JD Copilot</span>
        <span style={S.subtitle}>Boss 直聘 AI 招呼语助手</span>
      </div>

      <Row label="当前页面" ok={page.ok}>
        {page.text}
      </Row>

      <Row
        label="AI 配置"
        ok={hasKey === true}
        loading={hasKey === null}>
        {hasKey === null
          ? "读取中…"
          : hasKey
            ? "已配置 API Key"
            : "尚未配置 API Key"}
      </Row>

      <button
        onClick={() => chrome.runtime.openOptionsPage()}
        style={S.primaryBtn}>
        {hasKey ? "打开设置" : "前往配置"}
      </button>

      <div style={S.footer}>
        浮层用法见 <a
          href="https://github.com/dahuangyapro/boss-jd-copilot#使用方法"
          target="_blank"
          rel="noreferrer"
          style={S.link}>
          README
        </a>
      </div>
    </div>
  )
}

const Row = ({
  label,
  ok,
  loading,
  children
}: {
  label: string
  ok: boolean
  loading?: boolean
  children: React.ReactNode
}) => (
  <div style={S.row}>
    <div style={S.rowLabel}>{label}</div>
    <div
      style={{
        ...S.rowValue,
        color: loading ? "#94a3b8" : ok ? "#0f766e" : "#b45309"
      }}>
      <span
        style={{
          ...S.dot,
          background: loading ? "#cbd5e1" : ok ? "#10b981" : "#f59e0b"
        }}
      />
      <span>{children}</span>
    </div>
  </div>
)

const S: Record<string, React.CSSProperties> = {
  container: {
    width: 280,
    padding: 16,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 13,
    color: "#0f172a",
    background: "#ffffff"
  },
  header: { marginBottom: 14 },
  title: { fontSize: 16, fontWeight: 600, display: "block" },
  subtitle: { fontSize: 12, color: "#64748b", marginTop: 2, display: "block" },
  row: { marginBottom: 10 },
  rowLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 3 },
  rowValue: {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
    fontSize: 12.5,
    lineHeight: 1.45
  },
  dot: {
    flex: "0 0 8px",
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5
  },
  primaryBtn: {
    width: "100%",
    padding: "8px 12px",
    background: "#0ea5e9",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    marginTop: 4
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid #e2e8f0",
    fontSize: 11.5,
    color: "#94a3b8",
    textAlign: "center"
  },
  link: { color: "#0ea5e9", textDecoration: "none" }
}

export default Popup
