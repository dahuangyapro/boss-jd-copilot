import { useRef, useState } from "react"

import type { AnalyzeResumeRequest, AnalyzeResumeResponse } from "~lib/messages"
import { extractPdfText, PdfExtractError } from "~lib/pdf"
import type { AiSettings } from "~lib/storage/options"
import {
  arrayToLines,
  formatJobPreferencesText,
  formatWorkBackgroundText,
  linesToArray,
  parseJobPreferencesText,
  parseWorkBackgroundText,
  type PersonalProfile
} from "~lib/storage/profile"

import { Field, S, Section, type Patcher } from "./ui"

type UploadStage =
  | { kind: "idle" }
  | { kind: "extracting"; fileName: string }
  | { kind: "analyzing"; fileName: string }
  | { kind: "error"; message: string }

const textareaStyle = { ...S.input, ...S.textarea, marginTop: 0 }

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
  const profile = settings.personalProfile

  const patchProfile = (next: PersonalProfile) => {
    patch({ personalProfile: next })
  }

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
        patchProfile(resp.profile)
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
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <Section title="个人画像">
      <Field
        label="上传简历"
        hint="上传 PDF 后由 AI 自动提取并填入下方各字段，会覆盖当前内容。也可手动编辑后保存。">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
      </Field>

      <Field
        label="技术栈"
        hint="每行一项，按熟悉程度排序。例：Vue3、TypeScript、Vite">
        <textarea
          style={{ ...textareaStyle, minHeight: 72 }}
          rows={3}
          value={arrayToLines(profile.technical_stack)}
          placeholder={"Vue3\nTypeScript\nVite"}
          onChange={(e) =>
            patchProfile({
              ...profile,
              technical_stack: linesToArray(e.target.value)
            })
          }
          disabled={busy}
        />
      </Field>

      <Field
        label="工作背景"
        hint="三行依次为：工作年限 / 当前角色 / 最近主要方向">
        <textarea
          style={{ ...textareaStyle, minHeight: 72 }}
          rows={3}
          value={formatWorkBackgroundText(profile.work_background)}
          placeholder={
            "3 年正式 + 3 个月实习\n前端开发工程师\n企业微信、小程序及 AI 产品开发"
          }
          onChange={(e) =>
            patchProfile({
              ...profile,
              work_background: parseWorkBackgroundText(e.target.value)
            })
          }
          disabled={busy}
        />
      </Field>

      <Field
        label="能力标签"
        hint="每行一个短语，不超过 10 个。例：工程化、性能优化、组件库">
        <textarea
          style={{ ...textareaStyle, minHeight: 72 }}
          rows={3}
          value={arrayToLines(profile.capability_tags)}
          placeholder={"工程化\n性能优化\n组件库"}
          onChange={(e) =>
            patchProfile({
              ...profile,
              capability_tags: linesToArray(e.target.value)
            })
          }
          disabled={busy}
        />
      </Field>

      <Field
        label="代表经历"
        hint="每行一条真实工作经历，3~5 条为宜">
        <textarea
          style={{ ...textareaStyle, minHeight: 96 }}
          rows={4}
          value={arrayToLines(profile.representative_experiences)}
          placeholder={
            "参与组件库建设，提高业务复用效率\n负责小程序性能优化，将关键页面渲染时间降低至 100ms"
          }
          onChange={(e) =>
            patchProfile({
              ...profile,
              representative_experiences: linesToArray(e.target.value)
            })
          }
          disabled={busy}
        />
      </Field>

      <Field
        label="求职方向"
        hint="两行依次为：目标岗位 / 偏好业务或技术方向">
        <textarea
          style={{ ...textareaStyle, minHeight: 56 }}
          rows={2}
          value={formatJobPreferencesText(profile.job_preferences)}
          placeholder={"前端开发工程师\nAI 产品、企业应用"}
          onChange={(e) =>
            patchProfile({
              ...profile,
              job_preferences: parseJobPreferencesText(e.target.value)
            })
          }
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
