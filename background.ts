import { chatCompletion } from "~lib/ai/client"
import {
  buildJdAnalyzeMessages,
  parseJdAnalysis
} from "~lib/ai/jd-analyze-prompt"
import { buildGreetingMessages } from "~lib/ai/prompts"
import {
  buildResumeAnalysisMessages,
  parsePersonalProfile
} from "~lib/ai/resume-prompt"
import type {
  AnalyzeJdRequest,
  AnalyzeJdResponse,
  AnalyzeResumeRequest,
  AnalyzeResumeResponse,
  ExtensionMessage,
  GenerateGreetingRequest,
  GenerateGreetingResponse
} from "~lib/messages"
import { saveJobCache } from "~lib/storage/job-cache"
import { getAiSettings } from "~lib/storage/options"

/**
 * Service Worker：唯一持有 API Key 的执行环境。content / panel / options 通过
 * sendMessage 发起请求；这里读 options 配置，分别走招呼语生成 / 简历分析 / 打开 options。
 */
chrome.runtime.onMessage.addListener(
  (msg: ExtensionMessage, _sender, sendResponse) => {
    if (msg.type === "ANALYZE_JD") {
      handleAnalyzeJd(msg)
        .then(sendResponse)
        .catch((e) =>
          sendResponse({
            ok: false,
            error: e instanceof Error ? e.message : String(e)
          } satisfies AnalyzeJdResponse)
        )
      return true
    }
    if (msg.type === "GENERATE_GREETING") {
      handleGenerate(msg)
        .then(sendResponse)
        .catch((e) =>
          sendResponse({
            ok: false,
            error: e instanceof Error ? e.message : String(e)
          } satisfies GenerateGreetingResponse)
        )
      // 返回 true 让 Chrome 保持消息通道开启，等 Promise 解析后再回响应
      return true
    }
    if (msg.type === "ANALYZE_RESUME") {
      handleAnalyzeResume(msg)
        .then(sendResponse)
        .catch((e) =>
          sendResponse({
            ok: false,
            error: e instanceof Error ? e.message : String(e)
          } satisfies AnalyzeResumeResponse)
        )
      return true
    }
    if (msg.type === "OPEN_OPTIONS") {
      // content script 无权直接调 openOptionsPage，必须由 background 代为打开
      chrome.runtime.openOptionsPage()
      sendResponse({ ok: true })
      return false
    }
    return false
  }
)

const handleAnalyzeJd = async (
  req: AnalyzeJdRequest
): Promise<AnalyzeJdResponse> => {
  const settings = await getAiSettings()
  const messages = buildJdAnalyzeMessages(req.job.jdText)
  const result = await chatCompletion(messages, settings, {
    temperature: 0.2,
    maxTokens: 1200
  })

  if (result.ok === false) {
    return { ok: false, error: result.error }
  }

  const parsed = parseJdAnalysis(result.text)
  if (parsed.ok === false) {
    return { ok: false, error: parsed.error }
  }

  return { ok: true, analysis: parsed.analysis }
}

const handleGenerate = async (
  req: GenerateGreetingRequest
): Promise<GenerateGreetingResponse> => {
  const settings = await getAiSettings()
  const messages = buildGreetingMessages(settings, req.jdAnalysis)
  const result = await chatCompletion(messages, settings)

  // 项目 tsconfig 是 strict:false，需用 === 显式比较才能让 TS 收窄 discriminated union
  if (result.ok === false) {
    return { ok: false, error: result.error }
  }

  await saveJobCache({
    jobKey: req.jobKey,
    title: req.job.title,
    company: req.job.company,
    jdText: req.job.jdText,
    greeting: result.text,
    updatedAt: Date.now()
  })

  return { ok: true, greeting: result.text }
}

const handleAnalyzeResume = async (
  req: AnalyzeResumeRequest
): Promise<AnalyzeResumeResponse> => {
  const settings = await getAiSettings()
  const messages = buildResumeAnalysisMessages(req.resumeText)
  const result = await chatCompletion(messages, settings, {
    temperature: 0.2,
    maxTokens: 1200
  })

  if (result.ok === false) {
    return { ok: false, error: result.error }
  }

  const parsed = parsePersonalProfile(result.text)
  if (parsed.ok === false) {
    return { ok: false, error: parsed.error }
  }

  return { ok: true, profile: parsed.profile }
}
