// Plasmo/Parcel：以纯文本打包 lib/prompts/jd-analyze.md
import JD_ANALYZE_SYSTEM from "data-text:~lib/prompts/jd-analyze.md"

import type { ChatMessages } from "~lib/ai/prompts"
import type { JdAnalysis } from "~lib/messages"

const USER = (jdText: string) =>
  `请分析以下 JD 原文，严格按 system 要求的 JSON schema 输出：

【JD 原文】
${jdText}`

export const buildJdAnalyzeMessages = (jdText: string): ChatMessages => ({
  system: JD_ANALYZE_SYSTEM,
  user: USER(jdText)
})

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((item) => typeof item === "string")

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

export const parseJdAnalysis = (
  raw: string
): { ok: true; analysis: JdAnalysis } | { ok: false; error: string } => {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonText(raw))
  } catch {
    return { ok: false, error: "JD 分析结果不是合法 JSON，请重试" }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "JD 分析结果格式无效" }
  }
  const obj = parsed as Record<string, unknown>
  const fields = [
    "position_features",
    "business_features",
    "technical_stack",
    "generic_responsibilities"
  ] as const
  for (const key of fields) {
    if (!isStringArray(obj[key])) {
      return { ok: false, error: `JD 分析缺少有效字段：${key}` }
    }
  }
  return {
    ok: true,
    analysis: {
      position_features: obj.position_features as string[],
      business_features: obj.business_features as string[],
      technical_stack: obj.technical_stack as string[],
      generic_responsibilities: obj.generic_responsibilities as string[]
    }
  }
}
