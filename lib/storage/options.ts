import { STORAGE_KEYS } from "~lib/storage/keys"

export type GreetingTone = "concise" | "detailed" | "casual" | "formal"

export type AiSettings = {
  /** OpenAI 兼容协议的 baseURL，末尾不带 /chat/completions，由 client 自动拼接 */
  baseURL: string
  apiKey: string
  model: string
  /** 求职者自述（经验、技能、求职方向）；prompt 中作为"我的画像"段落注入 */
  userProfile: string
  /** 快速预设的招呼语风格；当 customPrompt 为空时生效 */
  tone: GreetingTone
  /** 用户自定义系统 prompt；非空时**整段**顶替预设。用户可"加载预设到编辑器"再改 */
  customPrompt: string
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  baseURL: "https://api.deepseek.com/v1",
  apiKey: "",
  model: "deepseek-chat",
  userProfile: "",
  tone: "concise",
  customPrompt: ""
}

/**
 * 国内主流 + 海外常用，统一走 OpenAI 兼容协议。
 * baseURL 约定以 "/v1" 或其等价版本路径结尾，client 后续拼 "/chat/completions"。
 */
export const PROVIDER_PRESETS = [
  {
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    model: "deepseek-chat"
  },
  {
    name: "Kimi (Moonshot)",
    baseURL: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k"
  },
  {
    name: "智谱 GLM",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash"
  },
  {
    name: "通义千问 (DashScope 兼容)",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-turbo"
  },
  {
    name: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini"
  },
  {
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini"
  },
  { name: "自定义", baseURL: "", model: "" }
] as const

export const TONE_LABELS: Record<GreetingTone, string> = {
  concise: "简洁（60-100 字）",
  detailed: "详尽（120-180 字）",
  casual: "自然口语",
  formal: "正式礼貌"
}

/**
 * 这三个 helper 都是空字符串/无效 URL 时返回 false/null，调用方按业务给提示。
 */
export const baseUrlToOrigin = (baseURL: string): string | null => {
  try {
    return new URL(baseURL.trim()).origin
  } catch {
    return null
  }
}

export const hasBaseUrlPermission = async (
  baseURL: string
): Promise<boolean> => {
  const origin = baseUrlToOrigin(baseURL)
  if (!origin) return false
  try {
    return await chrome.permissions.contains({ origins: [`${origin}/*`] })
  } catch {
    return false
  }
}

/** 必须从 user gesture 同步调用（onClick/onChange），否则 Chrome 拒绝弹窗 */
export const requestBaseUrlPermission = async (
  baseURL: string
): Promise<boolean> => {
  const origin = baseUrlToOrigin(baseURL)
  if (!origin) return false
  try {
    return await chrome.permissions.request({ origins: [`${origin}/*`] })
  } catch {
    return false
  }
}

export const getAiSettings = async (): Promise<AiSettings> => {
  const result = await chrome.storage.local.get(STORAGE_KEYS.aiSettings)
  const stored = result[STORAGE_KEYS.aiSettings] as
    | Partial<AiSettings>
    | undefined
  return { ...DEFAULT_AI_SETTINGS, ...(stored ?? {}) }
}

export const saveAiSettings = async (settings: AiSettings): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.aiSettings]: settings })
}
