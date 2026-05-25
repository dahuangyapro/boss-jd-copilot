/**
 * 职位详情页内嵌「立即沟通」浮窗的操作 —— 选择器集中在此文件。
 * 用户在浮层点「填入聊天框」时：
 *   1. 若浮窗 textarea 已存在（用户先前已点过）→ 直接填
 *   2. 否则点击页面上的「立即沟通」→ 等浮窗出现 → 填
 * 不会自动点发送，发送动作仍由用户在 Boss 浮窗里完成。
 */

const STARTCHAT_BUTTON = "a.btn.btn-startchat"
const DIALOG_TEXTAREA =
  "div.dialog-con div.startchat-content textarea.input-area"

const waitForElement = <T extends Element>(
  selector: string,
  timeoutMs: number
): Promise<T | null> =>
  new Promise((resolve) => {
    const existing = document.querySelector<T>(selector)
    if (existing) {
      resolve(existing)
      return
    }
    let settled = false
    const finish = (el: T | null) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      observer.disconnect()
      resolve(el)
    }
    const observer = new MutationObserver(() => {
      const el = document.querySelector<T>(selector)
      if (el) finish(el)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    const timer = window.setTimeout(() => finish(null), timeoutMs)
  })

/**
 * Boss 浮窗 textarea 是 React/Vue 受控组件：直接给 .value 赋值，框架内部
 * 的虚拟值不会同步，点发送会以为输入框为空。必须经原生 setter 再派发
 * 一次 bubbling 的 input 事件，让框架走它自己的 onChange 流程。
 */
const setReactTextareaValue = (
  textarea: HTMLTextAreaElement,
  text: string
) => {
  const proto = Object.getPrototypeOf(textarea) as HTMLTextAreaElement
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  if (setter) {
    setter.call(textarea, text)
  } else {
    textarea.value = text
  }
  textarea.dispatchEvent(new Event("input", { bubbles: true }))
}

export type FillStartchatResult =
  | { ok: true }
  | { ok: false; reason: string }

export const fillStartchatTextarea = async (
  text: string
): Promise<FillStartchatResult> => {
  let textarea = document.querySelector<HTMLTextAreaElement>(DIALOG_TEXTAREA)

  if (!textarea) {
    const button = document.querySelector<HTMLAnchorElement>(STARTCHAT_BUTTON)
    if (!button) {
      // Boss 在已沟通过该 HR 的状态下，按钮可能整个不渲染。招呼语此时已经在
      // background 流程里写过 chrome.storage.local（见 background.ts:handleGenerate），
      // 引导用户用「复制到剪贴板」走手动路径作为 P0 兜底。
      return {
        ok: false,
        reason:
          "未找到「立即沟通」按钮（可能已和该 HR 沟通过，或 Boss 改版）。招呼语已存本地，可用右侧「复制到剪贴板」取回粘贴。"
      }
    }
    button.click()
    textarea = await waitForElement<HTMLTextAreaElement>(DIALOG_TEXTAREA, 2500)
    if (!textarea) {
      // 二次起 Boss 会直接 navigate 到 /web/geek/chat*，content script 会被销毁，
      // 此分支大概率根本来不及渲染——保留是为了覆盖"既没跳也没弹浮窗"的罕见状态
      return {
        ok: false,
        reason:
          "聊天浮窗未出现，Boss 可能已跳转到聊天页。招呼语已存本地，可用右侧「复制到剪贴板」取回粘贴。"
      }
    }
  }

  setReactTextareaValue(textarea, text)
  textarea.focus()
  // 光标移到末尾，方便用户继续微调或直接点发送
  try {
    const end = text.length
    textarea.setSelectionRange(end, end)
  } catch {
    // 个别浏览器在 hidden textarea 上调用会抛错；忽略不影响主流程
  }
  return { ok: true }
}
