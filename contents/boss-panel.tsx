import { useEffect, useRef, useState } from "react"
import type { PlasmoCSConfig } from "plasmo"

import {
  getPageType,
  type BossPageType,
  type JobDetailPageType
} from "~lib/boss/pages"
import {
  extractJobDetail,
  getJobKey,
  observeJobDetail,
  type ExtractedJob
} from "~lib/boss/dom-job-detail"
import {
  addProbeStyles,
  inspectElement,
  removeProbeStyles,
  setHover,
  type ProbedInfo
} from "~lib/boss/probe"
import type {
  GenerateGreetingRequest,
  GenerateGreetingResponse
} from "~lib/messages"

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

/**
 * 开发期最常见的坑：在 chrome://extensions 点"重新加载"扩展后，已经打开的 Boss
 * 页面里 content script 变成"孤儿"——chrome.runtime 被卸载，访问 .sendMessage
 * 会抛 "Cannot read properties of undefined" 或 "Extension context invalidated"。
 * 解药就一个：刷新当前 Boss 页面。
 */
const isExtensionAlive = (): boolean => {
  try {
    return typeof chrome !== "undefined" && !!chrome?.runtime?.id
  } catch {
    return false
  }
}

const CONTEXT_DEAD_MSG =
  "扩展上下文已失效（开发期重载扩展后会出现）。请按 Ctrl+R 刷新当前 Boss 页面再试。"

/** content script 无权直接打开 options 页，必须通过 background 代为打开 */
const requestOpenOptions = () => {
  try {
    chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" }).catch(() => {})
  } catch {
    // 上下文死了；用户下一次操作会从 generate 流程看到 CONTEXT_DEAD_MSG
  }
}

const HEADER_ICON_BTN: React.CSSProperties = {
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

const SearchIcon = () => (
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

const GearIcon = () => (
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
  const [probeMode, setProbeMode] = useState(false)
  const [probed, setProbed] = useState<ProbedInfo | null>(null)
  const [probeLocked, setProbeLocked] = useState(false)
  // ref 给 pointermove 闭包读，避免 locked 一变就重挂全局监听
  const probeLockedRef = useRef(false)

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

  /**
   * 探针模式：开启后给页面注入蓝框 + crosshair 样式，监听全局 pointermove 实时更新
   * 选择器/HTML 预览；click 拦截掉避免被 Boss 链接带跳走；Esc 退出。
   * Plasmo CSUI 在 <plasmo-csui> 自定义元素里，事件 retarget 后 target 就是它，
   * 用这个特征过滤掉浮层自己的鼠标事件——hover 浮层时不更新预览也不清高亮。
   */
  useEffect(() => {
    if (!probeMode) return
    // 每次开探针从干净状态开始：未锁定、无信息
    probeLockedRef.current = false
    setProbeLocked(false)
    setProbed(null)
    addProbeStyles()

    const isInPanel = (target: EventTarget | null): boolean =>
      target instanceof Element &&
      target.tagName.toLowerCase().startsWith("plasmo-")

    const onMove = (e: PointerEvent) => {
      if (probeLockedRef.current) return // 已锁定：鼠标随便动，不再覆盖选中
      if (isInPanel(e.target)) return
      if (e.target instanceof Element) {
        setHover(e.target)
        setProbed(inspectElement(e.target))
      }
    }
    const onClick = (e: MouseEvent) => {
      if (isInPanel(e.target)) return
      // 拦掉 Boss 的链接/按钮默认行为，避免一点就被跳走
      e.preventDefault()
      e.stopImmediatePropagation()
      // 锁定当前选中：再 hover 也不会变；退出探针才能重新选
      probeLockedRef.current = true
      setProbeLocked(true)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProbeMode(false)
    }

    document.addEventListener("pointermove", onMove, true)
    document.addEventListener("click", onClick, true)
    document.addEventListener("keydown", onKey, true)

    return () => {
      document.removeEventListener("pointermove", onMove, true)
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("keydown", onKey, true)
      setHover(null)
      removeProbeStyles()
    }
  }, [probeMode])

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
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              setProbeMode((v) => !v)
              if (collapsed) setCollapsed(false)
            }}
            title={
              probeMode
                ? "退出探针模式（Esc）"
                : "DOM 探针：鼠标定位元素并复制选择器"
            }
            aria-label="DOM 探针"
            style={{
              ...HEADER_ICON_BTN,
              background: probeMode
                ? "rgba(255,255,255,0.25)"
                : "transparent"
            }}>
            <SearchIcon />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={requestOpenOptions}
            title="打开设置"
            aria-label="打开设置"
            style={HEADER_ICON_BTN}>
            <GearIcon />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "展开" : "收起"}
            aria-label={collapsed ? "展开" : "收起"}
            style={{
              ...HEADER_ICON_BTN,
              fontSize: 14,
              lineHeight: 1,
              padding: "2px 6px"
            }}>
            {collapsed ? "+" : "−"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: 12 }}>
          {probeMode ? (
            <ProbeView
              info={probed}
              locked={probeLocked}
              onExit={() => setProbeMode(false)}
              onReselect={() => {
                // 解锁继续选；清掉旧高亮，hover 新元素时再画
                probeLockedRef.current = false
                setProbeLocked(false)
                setProbed(null)
                setHover(null)
              }}
            />
          ) : (
            <>
              {isJobDetailLike(pageType) && (
                <JobDetailView urlKey={currentUrl} pageType={pageType} />
              )}
              {pageType === "chat" && <ChatPlaceholder />}
            </>
          )}
        </div>
      )}
    </div>
  )
}

const ProbeView = ({
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
  children: React.ReactNode
}) => (
  <div style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 12.5 }}>
    <span style={{ color: "#94a3b8", flex: "0 0 44px" }}>{label}</span>
    <span style={{ flex: 1, color: "#0f172a" }}>{children}</span>
  </div>
)

const CODE_STYLE: React.CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  fontSize: 11.5,
  background: "#f1f5f9",
  padding: "1px 5px",
  borderRadius: 4,
  wordBreak: "break-all"
}

const PROBE_BTN: React.CSSProperties = {
  flex: 1,
  padding: "6px 8px",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  color: "#0f172a",
  cursor: "pointer",
  fontSize: 12
}

type GreetingState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; text: string }
  | { kind: "error"; message: string }

const JobDetailView = ({
  urlKey,
  pageType
}: {
  urlKey: string
  pageType: JobDetailPageType
}) => {
  const [job, setJob] = useState<ExtractedJob | null>(null)
  const [status, setStatus] = useState<"waiting" | "ready">("waiting")
  const [greeting, setGreeting] = useState<GreetingState>({ kind: "idle" })
  const [copied, setCopied] = useState(false)
  const [jdCopied, setJdCopied] = useState(false)

  // URL 变化时重新订阅；推荐页 observer 会持续监听，详情页则首次抽到后即断开
  useEffect(() => {
    setJob(null)
    setStatus("waiting")
    setGreeting({ kind: "idle" })
    setCopied(false)
    setJdCopied(false)
    const cleanup = observeJobDetail(pageType, (next) => {
      setJob(next)
      setStatus("ready")
      // 切换到新 JD 后旧招呼语作废，避免误以为是新岗位生成的
      setGreeting({ kind: "idle" })
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

  const generate = async () => {
    if (!job) return
    if (!isExtensionAlive()) {
      setGreeting({ kind: "error", message: CONTEXT_DEAD_MSG })
      return
    }
    setGreeting({ kind: "loading" })
    setCopied(false)
    const req: GenerateGreetingRequest = {
      type: "GENERATE_GREETING",
      jobKey: getJobKey(job),
      job
    }
    try {
      const resp = (await chrome.runtime.sendMessage(
        req
      )) as GenerateGreetingResponse | undefined
      if (!resp) {
        setGreeting({
          kind: "error",
          message: "background 无响应，请确认扩展已重新加载"
        })
        return
      }
      // 项目 tsconfig 是 strict:false，用 === 显式比较以触发联合类型收窄
      if (resp.ok === true) {
        setGreeting({ kind: "ready", text: resp.greeting })
      } else {
        setGreeting({ kind: "error", message: resp.error })
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      const friendly =
        /Extension context invalidated|sendMessage/i.test(raw)
          ? CONTEXT_DEAD_MSG
          : raw
      setGreeting({ kind: "error", message: friendly })
    }
  }

  const copy = async () => {
    if (greeting.kind !== "ready") return
    try {
      await navigator.clipboard.writeText(greeting.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // 剪贴板权限失败兜底：选中文本让用户手动复制
      setCopied(false)
    }
  }

  const copyJd = async () => {
    if (!job) return
    try {
      await navigator.clipboard.writeText(job.jdText)
      setJdCopied(true)
      setTimeout(() => setJdCopied(false), 1800)
    } catch {
      setJdCopied(false)
    }
  }

  const openOptions = requestOpenOptions

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
          maxHeight: 200,
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          lineHeight: 1.55,
          color: "#1e293b",
          fontSize: 12.5
        }}>
        {job.jdText}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button
          onClick={reextract}
          title="重新从页面 DOM 抽取 JD"
          style={{ ...BTN.secondary, flex: "0 0 auto" }}>
          重新提取
        </button>
        <button
          onClick={copyJd}
          title="复制 JD 原文到剪贴板（便于在其他 AI 工具里用）"
          style={{ ...BTN.secondary, flex: "0 0 auto" }}>
          {jdCopied ? "已复制" : "复制 JD"}
        </button>
        <button
          onClick={generate}
          disabled={greeting.kind === "loading"}
          style={{
            ...BTN.primary,
            flex: 1,
            ...(greeting.kind === "loading"
              ? { background: "#7dd3fc", cursor: "wait" }
              : {})
          }}>
          {greeting.kind === "loading"
            ? "生成中…"
            : greeting.kind === "ready"
              ? "重新生成"
              : "生成招呼语"}
        </button>
      </div>

      {greeting.kind === "error" && (
        <div
          style={{
            marginTop: 10,
            padding: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            color: "#b91c1c",
            fontSize: 12.5,
            lineHeight: 1.5
          }}>
          {greeting.message}
          {/未配置|API Key/.test(greeting.message) && (
            <>
              {" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  openOptions()
                }}
                style={{ color: "#0ea5e9", textDecoration: "underline" }}>
                打开设置
              </a>
            </>
          )}
        </div>
      )}

      {greeting.kind === "ready" && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              padding: 10,
              background: "#ecfeff",
              border: "1px solid #a5f3fc",
              borderRadius: 8,
              color: "#0f172a",
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap"
            }}>
            {greeting.text}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={copy} style={{ ...BTN.primary, flex: 1 }}>
              {copied ? "已复制" : "复制到剪贴板"}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const BTN: Record<"primary" | "secondary", React.CSSProperties> = {
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
