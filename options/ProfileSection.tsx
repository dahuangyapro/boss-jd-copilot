import { useRef, useState } from "react"

import type { AnalyzeResumeRequest, AnalyzeResumeResponse } from "~lib/messages"
import { extractPdfText, PdfExtractError } from "~lib/pdf"
import type { AiSettings } from "~lib/storage/options"

import { Field, S, Section, type Patcher } from "./ui"

type UploadStage =
  | { kind: "idle" }
  | { kind: "extracting"; fileName: string }
  | { kind: "analyzing"; fileName: string }
  | { kind: "error"; message: string }

const PROFILE_PLACEHOLDER =
  "示例：3 年 Go 后端，主做支付/订单方向，熟悉 Kafka 与 ES；\n上家在 xx 公司，独立设计过日交易峰值 50w+ 的清结算模块；\n求职方向：电商/金融科技后端，希望接触高并发与分布式事务"

export const ProfileSection = ({
  settings,
  patch
}: {
  settings: AiSettings
  patch: Patcher
}) => {
  const [stage, setStage] = useState<UploadStage>({ kind: "idle" })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const busy = stage.kind === "extracting" || stage.kind === "analyzing"

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStage({
        kind: "error",
        message: "请选择 PDF 文件（暂不支持其他格式）"
      })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setStage({
        kind: "error",
        message: "PDF 大于 10MB，可能是扫描件；请用文字版简历"
      })
      return
    }
    if (!settings.apiKey.trim()) {
      setStage({
        kind: "error",
        message:
          "请先在「大模型 Provider」里填好 API Key，简历分析会用相同的 provider"
      })
      return
    }

    // 1. 提取 PDF 文本（本地，不出本机）
    setStage({ kind: "extracting", fileName: file.name })
    let resumeText: string
    try {
      resumeText = await extractPdfText(file)
    } catch (err) {
      const msg =
        err instanceof PdfExtractError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err)
      setStage({ kind: "error", message: msg })
      return
    }

    // 2. 送 background → AI
    setStage({ kind: "analyzing", fileName: file.name })
    const req: AnalyzeResumeRequest = {
      type: "ANALYZE_RESUME",
      resumeText
    }
    try {
      const resp = (await chrome.runtime.sendMessage(req)) as
        | AnalyzeResumeResponse
        | undefined
      if (!resp) {
        setStage({
          kind: "error",
          message: "background 无响应，请确认扩展已重新加载"
        })
        return
      }
      if (resp.ok === true) {
        // 直接覆盖现有自我介绍 —— 用户明确希望"上传即生效"的体验
        patch({ userProfile: resp.profile })
        setStage({ kind: "idle" })
      } else {
        setStage({ kind: "error", message: resp.error })
      }
    } catch (err) {
      setStage({
        kind: "error",
        message: err instanceof Error ? err.message : String(err)
      })
    } finally {
      // 清掉 input.value，让用户能再次选同一个文件
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <Section title="个人画像">
      <Field
        label="自我介绍"
        hint="3-5 行：经验年限、技术栈或方向、亮点项目。越具体，招呼语越像你本人写的。也可以上传 PDF 简历由 AI 自动生成，会覆盖当前文本。">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8
          }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={onPick}
            style={{ fontSize: 12.5 }}
          />
          {busy && (
            <span style={{ color: "#0ea5e9", fontSize: 12.5 }}>
              {stage.kind === "extracting"
                ? `正在解析 ${stage.fileName}…`
                : `已读取，正在调用模型分析…`}
            </span>
          )}
        </div>
        <textarea
          style={{ ...S.input, ...S.textarea }}
          rows={6}
          value={settings.userProfile}
          placeholder={PROFILE_PLACEHOLDER}
          onChange={(e) => patch({ userProfile: e.target.value })}
          disabled={busy}
        />
      </Field>

      {stage.kind === "error" && (
        <div
          style={{
            marginTop: 6,
            padding: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 6,
            color: "#b91c1c",
            fontSize: 12.5,
            lineHeight: 1.5
          }}>
          {stage.message}
        </div>
      )}
    </Section>
  )
}
