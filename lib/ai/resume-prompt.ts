// Plasmo/Parcel：以纯文本打包 lib/prompts/personal-profile-analysis.md
import PROFILE_SYSTEM from "data-text:~lib/prompts/personal-profile-analysis.md"

import type { ChatMessages } from "~lib/ai/prompts"
import {
  normalizePersonalProfile,
  type PersonalProfile
} from "~lib/storage/profile"

const USER = (resumeText: string) =>
  `请分析以下从 PDF 提取的简历文本，严格按 system 要求的 JSON schema 输出：

【简历原文】
${resumeText}`

export const buildResumeAnalysisMessages = (
  resumeText: string
): ChatMessages => ({
  system: PROFILE_SYSTEM,
  user: USER(resumeText)
})

/** 模型偶发包裹 ```json fence，剥掉后再 parse */
const extractJsonText = (raw: string): string => {
  const trimmed = raw.trim()
  if (trimmed.startsWith("{")) return trimmed
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i)
  if (fenced) return fenced[1].trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

export const parsePersonalProfile = (
  raw: string
): { ok: true; profile: PersonalProfile } | { ok: false; error: string } => {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonText(raw))
  } catch {
    return { ok: false, error: "简历分析结果不是合法 JSON，请重试" }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "简历分析结果格式无效" }
  }
  return { ok: true, profile: normalizePersonalProfile(parsed) }
}
