/**
 * 沟通页（/web/geek/chat*）DOM 读取与填入 —— 选择器集中在此文件。
 *
 * 跟详情页的关键差异：
 * - URL 是干净的 `/web/geek/chat`，**切换会话不变 URL**（无 jobId/chatId 参数），
 *   所以必须用 MutationObserver 盯职位名节点变化来感知"用户切了会话"。
 * - 输入框是 `<div contenteditable="true">` 而**非 textarea**，写入路径跟
 *   `startchat-dialog.ts` 的 React 受控 textarea 完全不同：不能走 prototype value setter，
 *   要写 textContent + 派发 bubbling InputEvent + 用 Range/Selection 把光标放到末尾。
 */

const CHAT_INPUT = "#chat-input"
const POSITION_NAME =
  "div.chat-position-content div.position-main div.position-content div.left-content span.position-name"
const COMPANY_NAME =
  "div.top-info-content div.user-info-wrap div.user-info div.base-info span"
const MESSAGE_LIST = "div.chat-conversation ul.im-list"
const SELF_MESSAGE_ITEM = `${MESSAGE_LIST} > li.item-myself`

export type ChatPosition = {
  title: string
  company: string
}

const getText = (selector: string): string =>
  document.querySelector(selector)?.textContent?.trim() ?? ""

export const extractChatPosition = (): ChatPosition | null => {
  const title = getText(POSITION_NAME)
  if (!title) return null
  const company = getText(COMPANY_NAME)
  return { title, company }
}

/**
 * 盯职位名节点的内容变化。Boss chat 页切换会话**不改 URL**，所以 popstate / pushState
 * hook 都接收不到信号；用 MutationObserver 在 body 子树上节流到下一帧再读取。
 * 上层用 `lastTitle` 自己去重，本函数只负责"内容可能变了"的广播。
 */
export const observeChatPosition = (
  onChange: (position: ChatPosition) => void
): (() => void) => {
  let disposed = false
  let scheduled = false

  const tryEmit = () => {
    if (disposed) return
    const pos = extractChatPosition()
    if (pos) onChange(pos)
  }

  const schedule = () => {
    if (scheduled || disposed) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      tryEmit()
    })
  }

  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })
  tryEmit()

  return () => {
    disposed = true
    observer.disconnect()
  }
}

/**
 * 写入聊天输入框。contenteditable 跟 React/Vue 受控 textarea 的同步机制不一样：
 * - 不能用 HTMLTextAreaElement prototype 上的 value setter（这里根本不是 textarea）
 * - textContent 直接赋值在多数框架下能感知，但保险起见再派发一次 bubbling InputEvent
 *   让 Boss 的 onInput 监听跑一遍，确保发送按钮的可点状态、字符计数等都同步
 * - 把光标移到末尾，让用户继续微调或直接 Enter / 点发送
 */
export const fillChatInput = (text: string): boolean => {
  const input = document.querySelector<HTMLElement>(CHAT_INPUT)
  if (!input) return false
  input.focus()
  input.textContent = text
  input.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: text
    })
  )
  try {
    const range = document.createRange()
    range.selectNodeContents(input)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  } catch {
    // selection API 在少数 contenteditable 状态下会抛；不影响主流程
  }
  return true
}

/**
 * 检查输入框是否为空。Boss placeholder 走 ::before 伪元素，不进 textContent，
 * 所以 trim 后长度即可判定真实输入；空字符串和零宽字符都视作空。
 */
export const isChatInputEmpty = (): boolean => {
  const input = document.querySelector<HTMLElement>(CHAT_INPUT)
  if (!input) return true
  return !(input.textContent ?? "").replace(/[\s​-‍﻿]/g, "").length
}

/**
 * 当前会话里求职者**已经发送过**消息？用来避免对"已开聊"的会话强塞新招呼语。
 * Boss 自己消息条目带 .item-myself，HR 消息没有；只要数组非空就视为"已开聊"。
 */
export const hasSelfSentMessage = (): boolean =>
  !!document.querySelector(SELF_MESSAGE_ITEM)

export const runOnChatPage = () => {
  // 当前由 lib/ui/boss-panel/ChatPlaceholder.tsx 在浮层挂载时调用 observeChatPosition
  // 驱动「读职位 → 反查 storage → 自动填入」。content.ts 保留这个调度入口，便于将来
  // 做"无 UI、纯 content script 接管"时直接在这里启动。
}
