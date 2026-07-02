import { CONTEXT_DEAD_MSG } from "~lib/ui/boss-panel/ui"

export const sendExtensionMessage = async <T,>(
  payload: unknown
): Promise<
  { ok: true; data: T } | { ok: false; error: string; contextDead: boolean }
> => {
  try {
    const data = (await chrome.runtime.sendMessage(payload)) as T | undefined
    if (data === undefined) {
      return {
        ok: false,
        error: "background 无响应，请确认扩展已重新加载",
        contextDead: false
      }
    }
    return { ok: true, data }
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e)
    const contextDead = /Extension context invalidated|sendMessage/i.test(raw)
    return {
      ok: false,
      error: contextDead ? CONTEXT_DEAD_MSG : raw,
      contextDead
    }
  }
}
