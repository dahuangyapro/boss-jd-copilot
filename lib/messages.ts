import type { ExtractedJob } from "~lib/boss/dom-job-detail"

export type GenerateGreetingRequest = {
  type: "GENERATE_GREETING"
  jobKey: string
  job: ExtractedJob
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
  | { ok: true; profile: string }
  | { ok: false; error: string }

export type ExtensionMessage =
  | GenerateGreetingRequest
  | OpenOptionsRequest
  | DebugLogRequest
  | AnalyzeResumeRequest

export type ExtensionMessageType = ExtensionMessage["type"]
