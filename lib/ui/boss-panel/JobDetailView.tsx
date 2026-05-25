import { useEffect, useState } from "react"

import {
  extractJobDetail,
  getJobKey,
  observeJobDetail,
  type ExtractedJob
} from "~lib/boss/dom-job-detail"
import type { JobDetailPageType } from "~lib/boss/pages"
import { fillStartchatTextarea } from "~lib/boss/startchat-dialog"
import type {
  GenerateGreetingRequest,
  GenerateGreetingResponse
} from "~lib/messages"

import {
  BTN,
  CONTEXT_DEAD_MSG,
  isExtensionAlive,
  MetaRow,
  requestOpenOptions
} from "./ui"

type GreetingState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; text: string }
  | { kind: "error"; message: string }

type FillState =
  | { kind: "idle" }
  | { kind: "filling" }
  | { kind: "filled" }
  | { kind: "error"; message: string }

export const JobDetailView = ({
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
  const [fill, setFill] = useState<FillState>({ kind: "idle" })

  // URL 变化时重新订阅；推荐页 observer 会持续监听，详情页则首次抽到后即断开
  useEffect(() => {
    setJob(null)
    setStatus("waiting")
    setGreeting({ kind: "idle" })
    setCopied(false)
    setJdCopied(false)
    setFill({ kind: "idle" })
    const cleanup = observeJobDetail(pageType, (next) => {
      setJob(next)
      setStatus("ready")
      // 切换到新 JD 后旧招呼语作废，避免误以为是新岗位生成的
      setGreeting({ kind: "idle" })
      setFill({ kind: "idle" })
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
      const resp = (await chrome.runtime.sendMessage(req)) as
        | GenerateGreetingResponse
        | undefined
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
      const friendly = /Extension context invalidated|sendMessage/i.test(raw)
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

  const fillToChat = async () => {
    if (greeting.kind !== "ready") return
    setFill({ kind: "filling" })
    const result = await fillStartchatTextarea(greeting.text)
    if (result.ok) {
      setFill({ kind: "filled" })
      // 2 秒后回到 idle，让按钮恢复可再次点击的样子
      setTimeout(() => {
        setFill((cur) => (cur.kind === "filled" ? { kind: "idle" } : cur))
      }, 2000)
    } else {
      setFill({ kind: "error", message: result.reason })
    }
  }

  const copyJd = async () => {
    if (!job) return
    // 复制时带上职位 + 公司头部，方便贴到其他 AI 工具时无需补充上下文
    const payload = [
      `【职位】${job.title || "—"}`,
      `【公司】${job.company || "—"}`,
      "",
      "【JD】",
      job.jdText
    ].join("\n")
    try {
      await navigator.clipboard.writeText(payload)
      setJdCopied(true)
      setTimeout(() => setJdCopied(false), 1800)
    } catch {
      setJdCopied(false)
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
          title="复制「职位 + 公司 + JD 原文」到剪贴板（便于在其他 AI 工具里用）"
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
                  requestOpenOptions()
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
            <button
              onClick={fillToChat}
              disabled={fill.kind === "filling"}
              title="点击页面「立即沟通」并把招呼语填入浮窗输入框（不会自动发送，由你自己点发送）"
              style={{
                ...BTN.primary,
                flex: 1,
                ...(fill.kind === "filling"
                  ? { background: "#7dd3fc", cursor: "wait" }
                  : {})
              }}>
              {fill.kind === "filling"
                ? "填入中…"
                : fill.kind === "filled"
                  ? "已填入"
                  : "填入聊天框"}
            </button>
            <button onClick={copy} style={{ ...BTN.secondary, flex: 1 }}>
              {copied ? "已复制" : "复制到剪贴板"}
            </button>
          </div>
          {fill.kind === "error" && (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                color: "#b91c1c",
                fontSize: 12.5,
                lineHeight: 1.5
              }}>
              {fill.message}
            </div>
          )}
        </div>
      )}
    </>
  )
}
