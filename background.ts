import { generateGreeting } from "~lib/ai/client"
import { buildGreetingMessages } from "~lib/ai/prompts"
import type {
  ExtensionMessage,
  GenerateGreetingRequest,
  GenerateGreetingResponse
} from "~lib/messages"
import { saveJobCache } from "~lib/storage/job-cache"
import { getAiSettings } from "~lib/storage/options"

/**
 * Service Worker：唯一持有 API Key 的执行环境。content / panel 通过 sendMessage
 * 发起请求，这里读 options、拼 prompt、调 AI、写 storage 缓存。
 */
chrome.runtime.onMessage.addListener(
  (msg: ExtensionMessage, _sender, sendResponse) => {
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
    if (msg.type === "OPEN_OPTIONS") {
      // content script 无权直接调 openOptionsPage，必须由 background 代为打开
      chrome.runtime.openOptionsPage()
      sendResponse({ ok: true })
      return false
    }
    return false
  }
)

const handleGenerate = async (
  req: GenerateGreetingRequest
): Promise<GenerateGreetingResponse> => {
  const settings = await getAiSettings()
  const messages = buildGreetingMessages(req.job, settings)
  const result = await generateGreeting(messages, settings)

  // 项目 tsconfig 是 strict:false，需用 === 显式比较才能让 TS 收窄 discriminated union
  if (result.ok === false) {
    return { ok: false, error: result.error }
  }

  await saveJobCache({
    jobKey: req.jobKey,
    title: req.job.title,
    company: req.job.company,
    jdText: req.job.jdText,
    greeting: result.greeting,
    updatedAt: Date.now()
  })

  return { ok: true, greeting: result.greeting }
}
