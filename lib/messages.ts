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

export type ExtensionMessage =
  | GenerateGreetingRequest
  | OpenOptionsRequest
  | DebugLogRequest

export type ExtensionMessageType = ExtensionMessage["type"]
