import { useEffect, useRef, useState } from "react"
import type { PlasmoCSConfig } from "plasmo"

import {
  getPageType,
  type BossPageType,
  type JobDetailPageType
} from "~lib/boss/pages"
import {
  extractJobDetail,
  observeJobDetail,
  type ExtractedJob
} from "~lib/boss/dom-job-detail"

export const config: PlasmoCSConfig = {
  matches: [
    "https://www.zhipin.com/job_detail*",
    "https://www.zhipin.com/web/geek/jobs*",
    "https://www.zhipin.com/web/geek/chat*"
  ]
}

const PANEL_WIDTH = 360
const DEFAULT_RIGHT = 24
const DEFAULT_TOP = 120

const pageTypeLabel: Record<BossPageType, string> = {
  job_detail: "职位详情",
  job_recommend: "推荐列表",
  chat: "沟通会话",
  unknown: "未识别"
}

const isJobDetailLike = (
  type: BossPageType
): type is JobDetailPageType =>
  type === "job_detail" || type === "job_recommend"

const BossPanel = () => {
  const [pageType, setPageType] = useState<BossPageType>(() =>
    getPageType(location.href)
  )
  const [currentUrl, setCurrentUrl] = useState(location.href)
  const [collapsed, setCollapsed] = useState(false)
  const [pos, setPos] = useState(() => ({
    left: Math.max(0, window.innerWidth - PANEL_WIDTH - DEFAULT_RIGHT),
    top: DEFAULT_TOP
  }))

  // Boss 是 SPA：pushState 切换路由时 URL 变了但 CS 不会重载，需手动监听
  useEffect(() => {
    const refresh = () => {
      setPageType(getPageType(location.href))
      setCurrentUrl(location.href)
    }
    window.addEventListener("popstate", refresh)
    const origPushState = history.pushState
    history.pushState = function (...args) {
      const ret = origPushState.apply(this, args)
      refresh()
      return ret
    }
    return () => {
      window.removeEventListener("popstate", refresh)
      history.pushState = origPushState
    }
  }, [])

  // 拖动状态放 ref，避免 pointermove 回调拿到陈旧的 pos
  const dragOffset = useRef<{ x: number; y: number } | null>(null)

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragOffset.current = { x: e.clientX - pos.left, y: e.clientY - pos.top }
  }

  const onHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOffset.current) return
    const nextLeft = e.clientX - dragOffset.current.x
    const nextTop = e.clientY - dragOffset.current.y
    setPos({
      left: Math.max(0, Math.min(window.innerWidth - 80, nextLeft)),
      top: Math.max(0, Math.min(window.innerHeight - 40, nextTop))
    })
  }

  const onHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragOffset.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  if (pageType === "unknown") return null

  return (
    <div
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: collapsed ? "auto" : PANEL_WIDTH,
        background: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(15, 23, 42, 0.18)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: 13,
        color: "#0f172a",
        // Boss 站内 z-index 较高，这里取最大值确保浮层始终在顶
        zIndex: 2147483647
      }}>
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "8px 12px",
          background: "#0ea5e9",
          color: "#ffffff",
          borderRadius: collapsed ? 12 : "12px 12px 0 0",
          cursor: dragOffset.current ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none"
        }}>
        <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
          JD Copilot · {pageTypeLabel[pageType]}
        </span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setCollapsed((v) => !v)}
          style={{
            border: "none",
            background: "transparent",
            color: "#ffffff",
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
            padding: "2px 6px"
          }}>
          {collapsed ? "+" : "−"}
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: 12 }}>
          {isJobDetailLike(pageType) && (
            <JobDetailView urlKey={currentUrl} pageType={pageType} />
          )}
          {pageType === "chat" && <ChatPlaceholder />}
        </div>
      )}
    </div>
  )
}

const JobDetailView = ({
  urlKey,
  pageType
}: {
  urlKey: string
  pageType: JobDetailPageType
}) => {
  const [job, setJob] = useState<ExtractedJob | null>(null)
  const [status, setStatus] = useState<"waiting" | "ready">("waiting")

  // URL 变化时重新订阅；推荐页 observer 会持续监听，详情页则首次抽到后即断开
  useEffect(() => {
    setJob(null)
    setStatus("waiting")
    const cleanup = observeJobDetail(pageType, (next) => {
      setJob(next)
      setStatus("ready")
    })
    return cleanup
  }, [urlKey, pageType])

  const reextract = () => {
    const next = extractJobDetail(pageType)
    if (next) {
      setJob(next)
      setStatus("ready")
    }
  }

  if (status === "waiting" || !job) {
    return (
      <div style={{ color: "#64748b", padding: "8px 0" }}>
        等待 JD 渲染…若长时间无响应，请确认页面已加载完成。
      </div>
    )
  }

  return (
    <>
      <MetaRow label="职位" value={job.title} />
      <MetaRow label="公司" value={job.company || "—"} />
      <MetaRow
        label="HR"
        value={
          job.hrName
            ? `${job.hrName}${job.hrTitle ? ` · ${job.hrTitle}` : ""}`
            : "—"
        }
      />
      <div
        style={{
          marginTop: 8,
          padding: 8,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          maxHeight: 240,
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          lineHeight: 1.55,
          color: "#1e293b",
          fontSize: 12.5
        }}>
        {job.jdText}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={reextract}
          style={{
            flex: "0 0 auto",
            padding: "8px 12px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            color: "#0f172a",
            cursor: "pointer",
            fontSize: 12.5
          }}>
          重新提取
        </button>
        <button
          disabled
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            color: "#94a3b8",
            cursor: "not-allowed",
            fontSize: 12.5
          }}>
          生成招呼语（待接入）
        </button>
      </div>
    </>
  )
}

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: "flex", gap: 8, marginBottom: 4, lineHeight: 1.5 }}>
    <span style={{ color: "#94a3b8", flex: "0 0 36px" }}>{label}</span>
    <span style={{ color: "#0f172a", flex: 1, wordBreak: "break-all" }}>
      {value}
    </span>
  </div>
)

const ChatPlaceholder = () => (
  <>
    <div style={{ marginBottom: 8, color: "#475569", lineHeight: 1.5 }}>
      匹配当前会话的缓存招呼语并填入输入框
    </div>
    <button
      disabled
      style={{
        width: "100%",
        padding: "8px 12px",
        background: "#f1f5f9",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        color: "#94a3b8",
        cursor: "not-allowed",
        fontSize: 13
      }}>
      填入招呼语（待接入）
    </button>
  </>
)

export default BossPanel
