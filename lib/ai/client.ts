import type { ChatMessages } from "~lib/ai/prompts"
import {
  baseUrlToOrigin,
  hasBaseUrlPermission,
  type AiSettings
} from "~lib/storage/options"

export type ChatResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export type ChatOptions = {
  /** 默认 0.7；招呼语用 0.7，简历分析想稳一点可传 0.3 */
  temperature?: number
  /** 默认 400；简历画像短小，招呼语更短，800 足够覆盖各种情况 */
  maxTokens?: number
}

/** OpenAI 兼容协议的 /chat/completions 调用；非流式；通用，不只用于招呼语。 */
export const chatCompletion = async (
  messages: ChatMessages,
  settings: AiSettings,
  opts: ChatOptions = {}
): Promise<ChatResult> => {
  if (!settings.apiKey.trim()) {
    return { ok: false, error: "尚未配置 API Key，请到扩展选项页填写" }
  }
  if (!settings.baseURL.trim() || !settings.model.trim()) {
    return { ok: false, error: "baseURL 或模型名未配置" }
  }

  // host_permissions 在 manifest 里只覆盖 zhipin，AI 域名走 optional_host_permissions。
  // 没授权时 fetch 会以 CORS-like 形式失败，错误信息很迷惑——先 contains 一下给清晰提示。
  const origin = baseUrlToOrigin(settings.baseURL)
  if (!origin) {
    return { ok: false, error: "baseURL 格式无效，请检查是否带 https://" }
  }
  if (!(await hasBaseUrlPermission(settings.baseURL))) {
    return {
      ok: false,
      error: `未授权访问 ${origin}。请到扩展选项页点「保存」授权该域名。`
    }
  }

  // 用户可能填带或不带尾斜杠的 baseURL；统一去尾再拼端点
  const url = `${settings.baseURL.replace(/\/+$/, "")}/chat/completions`

  let resp: Response
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: "system", content: messages.system },
          { role: "user", content: messages.user }
        ],
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 400,
        stream: false,
        // DeepSeek V4 系列默认 thinking=enabled，会让模型把 max_tokens 全用在
        // reasoning 上、content 为空。本扩展是结构化输出场景（招呼语、简历画像），
        // 用户看不到思考过程，统一关掉更稳。其他厂商兼容 API 通常忽略未知字段，不影响。
        thinking: { type: "disabled" }
      })
    })
  } catch (e) {
    return {
      ok: false,
      error: `网络请求失败：${e instanceof Error ? e.message : String(e)}`
    }
  }

  if (!resp.ok) {
    let detail = ""
    try {
      detail = await resp.text()
    } catch {
      // 忽略 body 读取失败
    }
    const hint =
      resp.status === 401
        ? "（API Key 无效或权限不足）"
        : resp.status === 429
          ? "（请求过多或额度耗尽）"
          : ""
    return {
      ok: false,
      error: `HTTP ${resp.status}${hint}${detail ? ` · ${detail.slice(0, 200)}` : ""}`
    }
  }

  let data: unknown
  try {
    data = await resp.json()
  } catch {
    return { ok: false, error: "响应解析失败（非 JSON）" }
  }

  const extracted = extractContent(data)
  if (extracted.kind === "text") return { ok: true, text: extracted.value }
  if (extracted.kind === "reasoning-only") {
    return {
      ok: false,
      error:
        "模型把 token 全用在内部推理上、content 为空。本扩展已默认禁用 thinking 模式，若仍触发说明你用的厂商不支持禁用 reasoning——请在选项页换成非 reasoning 模型（如 deepseek-v4-flash、gpt-4o-mini、qwen-turbo 等）。"
    }
  }
  return { ok: false, error: "模型未返回有效内容" }
}

type ExtractResult =
  | { kind: "text"; value: string }
  | { kind: "reasoning-only" }
  | { kind: "empty" }

/**
 * Reasoning 模型（DeepSeek V4 thinking 模式、OpenAI o1 等）的响应里 `content` 可能为空，
 * 而推理内容在 `reasoning_content` 字段。区分"真没返回"和"全在推理"才能给用户有用的错误。
 */
const extractContent = (data: unknown): ExtractResult => {
  if (!data || typeof data !== "object") return { kind: "empty" }
  const choices = (data as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return { kind: "empty" }
  const message = (choices[0] as { message?: unknown }).message
  if (!message || typeof message !== "object") return { kind: "empty" }
  const content = (message as { content?: unknown }).content
  if (typeof content === "string" && content.trim()) {
    return { kind: "text", value: content.trim() }
  }
  const reasoning = (message as { reasoning_content?: unknown }).reasoning_content
  if (typeof reasoning === "string" && reasoning.trim()) {
    return { kind: "reasoning-only" }
  }
  return { kind: "empty" }
}
