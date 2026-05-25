/**
 * 推荐列表页（/web/geek/jobs*）的「发起聊天」按钮触发 + 中间弹窗处理。
 * 选择器集中在此文件。跟详情页的 `startchat-dialog.ts` 不同：列表页**不存在**
 * "首次同页浮窗填入"路径，所有路径最终都会跳到 `/web/geek/chat*`，由 chat 页
 * 的 ChatView 接管自动填入（招呼语在 background 生成时已写入 storage）。
 *
 * 两条理论跳转路径（按 Boss 真实点击的行为定义）：
 *
 *   1. 用户**未**设置 Boss 默认招呼语 → 点 `op-btn-chat` 直接跳 chat 页
 *
 *   2. 用户**已**设置 Boss 默认招呼语 → 点 `op-btn-chat` 后 Boss **立即**用
 *      默认招呼语发第一条消息 + 弹「已向 BOSS 发送消息」对话框
 *      （`div.greet-boss-dialog`），点「继续沟通」（`a.default-btn.sure-btn`）才进 chat 页。
 *
 * 但实测发现：**程序化 `.click()` 触发不会走路径 2**——大概率 Boss 用了
 * `MouseEvent.isTrusted` 检测，合成事件直接跳 chat 页，跟路径 1 等效。详见
 * project-boss-op-btn-chat-bypass 记忆。
 *
 * **保留路径 2 的 fallback 代码**：这是 Boss 隐式行为的副作用，不稳定——Boss
 * 任何时候可能 fix 这个 bypass，到时候弹窗会重新出现。当前 fallback 几乎不触发，
 * 但删了就等于把扩展的可用性绑死在一个我们不控制的实现细节上。
 */

const LIST_CHAT_BUTTON =
  "div.job-detail-container div.job-detail-header a.op-btn.op-btn-chat"
const GREET_DIALOG = "div.greet-boss-dialog"
const GREET_DIALOG_SURE_BTN = `${GREET_DIALOG} a.default-btn.sure-btn`

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

export type TriggerListChatResult =
  | { ok: true; via: "direct" | "greet-dialog" }
  | { ok: false; reason: string }

export const triggerListChatJump = async (): Promise<TriggerListChatResult> => {
  const chatBtn = document.querySelector<HTMLAnchorElement>(LIST_CHAT_BUTTON)
  if (!chatBtn) {
    return {
      ok: false,
      reason:
        "未找到「发起聊天」按钮（可能已沟通过该 HR，或 Boss 改版需更新选择器）"
    }
  }

  chatBtn.click()

  // 500ms 内若「已发送消息」弹窗出现 → 走路径 2，需要再点「继续沟通」才跳 chat 页
  // 没出现 → 走路径 1，Boss 已直接 navigate，content script 即将销毁
  const dialog = await waitForElement<HTMLElement>(GREET_DIALOG, 500)
  if (!dialog) {
    return { ok: true, via: "direct" }
  }

  const sureBtn = await waitForElement<HTMLAnchorElement>(
    GREET_DIALOG_SURE_BTN,
    1000
  )
  if (!sureBtn) {
    return {
      ok: false,
      reason:
        "「已发送消息」弹窗已弹出但未找到「继续沟通」按钮，请手动点弹窗里的按钮"
    }
  }
  sureBtn.click()
  return { ok: true, via: "greet-dialog" }
}
