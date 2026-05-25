import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useRef, useState } from "react"

import {
  getPageType,
  type BossPageType,
  type JobDetailPageType
} from "~lib/boss/pages"
import {
  addProbeStyles,
  inspectElement,
  removeProbeStyles,
  setHover,
  type ProbedInfo
} from "~lib/boss/probe"
import { ChatPlaceholder } from "~lib/ui/boss-panel/ChatPlaceholder"
import { JobDetailView } from "~lib/ui/boss-panel/JobDetailView"
import { ProbeView } from "~lib/ui/boss-panel/ProbeView"
import {
  GearIcon,
  HEADER_ICON_BTN,
  IS_DEV,
  requestOpenOptions,
  SearchIcon
} from "~lib/ui/boss-panel/ui"

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

const isJobDetailLike = (type: BossPageType): type is JobDetailPageType =>
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
          {IS_DEV && (
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
                background: probeMode ? "rgba(255,255,255,0.25)" : "transparent"
              }}>
              <SearchIcon />
            </button>
          )}
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

export default BossPanel
