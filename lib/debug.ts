import type { ExtensionMessage } from "~lib/messages"

/** 经 background 输出，避免依赖 Boss 页内控制台 */
export const debugLog = (payload: unknown) => {
  const msg: ExtensionMessage = { type: "DEBUG_LOG", payload }
  void chrome.runtime.sendMessage(msg).catch(() => {
    // background 未就绪时忽略
  })
}
