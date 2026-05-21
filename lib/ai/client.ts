import type { ChatMessages } from "~lib/ai/prompts"
import type { AiSettings } from "~lib/storage/options"

export type GenerateResult =
  | { ok: true; greeting: string }
  | { ok: false; error: string }

/** OpenAI 兼容协议的 /chat/completions 调用；非流式。 */
export const generateGreeting = async (
  messages: ChatMessages,
  settings: AiSettings
): Promise<GenerateResult> => {
  if (!settings.apiKey.trim()) {
    return { ok: false, error: "尚未配置 API Key，请到扩展选项页填写" }
  }
  if (!settings.baseURL.trim() || !settings.model.trim()) {
    return { ok: false, error: "baseURL 或模型名未配置" }
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
        temperature: 0.7,
        max_tokens: 400,
        stream: false
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

  const greeting = extractGreeting(data)
  if (!greeting) {
    return { ok: false, error: "模型未返回有效内容" }
  }

  return { ok: true, greeting }
}

const extractGreeting = (data: unknown): string | null => {
  if (!data || typeof data !== "object") return null
  const choices = (data as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return null
  const message = (choices[0] as { message?: unknown }).message
  if (!message || typeof message !== "object") return null
  const content = (message as { content?: unknown }).content
  if (typeof content !== "string") return null
  return content.trim() || null
}
