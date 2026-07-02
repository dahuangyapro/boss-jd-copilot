import type { ExtractedJob } from "~lib/boss/dom-job-detail"
import type { PersonalProfile } from "~lib/storage/profile"

/** jd-analyze.md 输出的四类结构化标签 */
export type JdAnalysis = {
  position_features: string[]
  business_features: string[]
  technical_stack: string[]
  generic_responsibilities: string[]
}

export type AnalyzeJdRequest = {
  type: "ANALYZE_JD"
  job: ExtractedJob
}

export type AnalyzeJdResponse =
  | { ok: true; analysis: JdAnalysis }
  | { ok: false; error: string }

export type GenerateGreetingRequest = {
  type: "GENERATE_GREETING"
  jobKey: string
  job: ExtractedJob
  jdAnalysis: JdAnalysis
}

export type GenerateGreetingResponse =
  | { ok: true; greeting: string }
  | { ok: false; error: string }

export type OpenOptionsRequest = { type: "OPEN_OPTIONS" }

export type DebugLogRequest = { type: "DEBUG_LOG"; payload: unknown }

export type AnalyzeResumeRequest = {
  type: "ANALYZE_RESUME"
  /** PDF 解析后的纯文本；调用方负责先在 options 页用 lib/pdf.ts 提取 */
  resumeText: string
}

export type AnalyzeResumeResponse =
  | { ok: true; profile: PersonalProfile }
  | { ok: false; error: string }

export type ExtensionMessage =
  | AnalyzeJdRequest
  | GenerateGreetingRequest
  | OpenOptionsRequest
  | DebugLogRequest
  | AnalyzeResumeRequest

export type ExtensionMessageType = ExtensionMessage["type"]
