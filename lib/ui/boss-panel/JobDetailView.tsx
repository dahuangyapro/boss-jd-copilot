import type { JobDetailPageType } from "~lib/boss/pages"
import { useGreetingActions } from "~lib/hooks/useGreetingActions"
import { useGreetingGeneration } from "~lib/hooks/useGreetingGeneration"
import { useJobDetail } from "~lib/hooks/useJobDetail"

import {
  BTN,
  MetaRow,
  requestOpenOptions
} from "./ui"

export const JobDetailView = ({
  urlKey,
  pageType
}: {
  urlKey: string
  pageType: JobDetailPageType
}) => {
  const { job, reextract, isWaiting } = useJobDetail(urlKey, pageType)
  const { greeting, generate, isGenerating } = useGreetingGeneration(job)
  const { fill, copied, jdCopied, copy, copyJd, fillToChat } =
    useGreetingActions({ job, pageType, greeting })

  if (isWaiting || !job) {
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
          disabled={isGenerating}
          style={{
            ...BTN.primary,
            flex: 1,
            ...(isGenerating ? { background: "#7dd3fc", cursor: "wait" } : {})
          }}>
          {greeting.kind === "loading"
            ? greeting.phase === "analyzing_jd"
              ? "分析 JD 中…"
              : "生成招呼语中…"
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
              title={
                pageType === "job_recommend"
                  ? "跳转到聊天页并自动填入招呼语（不会自动发送）"
                  : "点击页面「立即沟通」并把招呼语填入浮窗输入框（不会自动发送，由你自己点发送）"
              }
              style={{
                ...BTN.primary,
                flex: 1,
                ...(fill.kind === "filling"
                  ? { background: "#7dd3fc", cursor: "wait" }
                  : {})
              }}>
              {fill.kind === "filling"
                ? pageType === "job_recommend"
                  ? "前往聊天页…"
                  : "填入中…"
                : fill.kind === "filled"
                  ? "已填入"
                  : pageType === "job_recommend"
                    ? "发起聊天"
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
