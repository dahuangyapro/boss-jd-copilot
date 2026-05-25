import { useEffect, useRef, useState } from "react"

import {
  extractChatPosition,
  fillChatInput,
  hasSelfSentMessage,
  isChatInputEmpty,
  observeChatPosition,
  waitForChatHistoryReady,
  type ChatPosition
} from "~lib/boss/dom-chat"
import {
  findJobCacheByTitle,
  type JobCacheEntry
} from "~lib/storage/job-cache"

import { BTN, MetaRow } from "./ui"

type ChatViewState =
  | { kind: "waiting" }
  | { kind: "no-match"; position: ChatPosition }
  | {
      kind: "matched"
      position: ChatPosition
      entry: JobCacheEntry
      autoFilled: boolean
      filledOnce: boolean
    }

/**
 * 在职位详情页生成、写入 storage 的招呼语，到了沟通页（同 HR 的会话）由这里
 * 反查并自动填入。Boss 二次起会从详情页直接跳转到 `/web/geek/chat`，详情页
 * content script 实例随页面卸载销毁，**所有同页填入路径都失效**，只剩这里能
 * 接管。
 *
 * 匹配键：chat 页 URL 没有 jobId（用户实测，纯 `/web/geek/chat`），且公司 selector
 * 当前还会拿到 HR 名而非真正的招聘公司，所以暂只按职位名归一化反查
 * （见 `findJobCacheByTitle`）。同名职位多公司时按 `updatedAt` 取最新。
 * 浮层展示的职位/公司一律走 `entry.*`（详情页存的是准确版），而非 DOM 读到的
 * `position.*`——后者目前公司位会显示成 HR 名"田沁"。
 *
 * 自动填入门槛：仅在「输入框为空」且「该会话还没有自己发过的消息」时填入；
 * 任一条件不满足只显示匹配结果 + 手动按钮，避免覆盖用户已有的输入或对话。
 */
export const ChatView = () => {
  const [state, setState] = useState<ChatViewState>({ kind: "waiting" })
  // observer 在 lastTitleRef 上去重，避免 MutationObserver 的高频回调反复扫 storage
  const lastTitleRef = useRef<string>("")

  useEffect(() => {
    let cancelled = false

    const handle = async (pos: ChatPosition) => {
      if (cancelled) return
      if (pos.title === lastTitleRef.current) return
      lastTitleRef.current = pos.title

      const matched = await findJobCacheByTitle(pos.title)
      if (cancelled) return
      if (!matched || !matched.greeting) {
        setState({ kind: "no-match", position: pos })
        return
      }

      // chat 页打开时职位名先渲染、消息列表后渲染；不等的话 hasSelfSentMessage()
      // 会把"已聊过的会话"误判成新会话并自动覆盖
      await waitForChatHistoryReady()
      if (cancelled) return

      const shouldAutoFill = isChatInputEmpty() && !hasSelfSentMessage()
      let autoFilled = false
      if (shouldAutoFill) {
        autoFilled = fillChatInput(matched.greeting)
      }
      setState({
        kind: "matched",
        position: pos,
        entry: matched,
        autoFilled,
        filledOnce: autoFilled
      })
    }

    const cleanup = observeChatPosition(handle)
    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  const refill = () => {
    if (state.kind !== "matched" || !state.entry.greeting) return
    const ok = fillChatInput(state.entry.greeting)
    if (ok) setState({ ...state, autoFilled: false, filledOnce: true })
  }

  if (state.kind === "waiting") {
    return (
      <div style={{ color: "#64748b", padding: "8px 0", lineHeight: 1.5 }}>
        等待当前会话加载…
        <br />
        若长时间无响应，请确认左侧已选中一个会话。
      </div>
    )
  }

  if (state.kind === "no-match") {
    return (
      <>
        <MetaRow label="职位" value={state.position.title} />
        {/* 不显示 position.company：当前 chat 页公司 selector 还会拿到 HR 名（"田沁"），
            no-match 时没有 storage entry 可回退，宁可不展示也不误导 */}
        <div
          style={{
            marginTop: 10,
            padding: 10,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 8,
            color: "#9a3412",
            fontSize: 12.5,
            lineHeight: 1.55
          }}>
          本地未找到该岗位的招呼语。请先回到该职位的详情页（或推荐列表的右侧详情面板），点「生成招呼语」后再回来。
        </div>
      </>
    )
  }

  return (
    <>
      {/* 展示走 entry.*（详情页存的，准确）；position.* 当前职位有书名号/"招聘"
          后缀污染，公司是 HR 名 —— 不直接展示给用户 */}
      <MetaRow label="职位" value={state.entry.title} />
      <MetaRow label="公司" value={state.entry.company || "—"} />
      <div
        style={{
          marginTop: 8,
          padding: 10,
          background: "#ecfeff",
          border: "1px solid #a5f3fc",
          borderRadius: 8,
          color: "#0f172a",
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap"
        }}>
        {state.entry.greeting}
      </div>
      <div
        style={{
          marginTop: 8,
          color: state.autoFilled ? "#047857" : "#64748b",
          fontSize: 12,
          lineHeight: 1.5
        }}>
        {state.autoFilled
          ? "已自动填入聊天输入框，按发送即可。"
          : state.filledOnce
            ? "已重新填入聊天输入框。"
            : hasSelfSentMessage()
              ? "该会话已有发送记录，未自动填入（避免覆盖已有对话）。"
              : "输入框非空，未自动填入（避免覆盖你正在编辑的内容）。"}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={refill} style={{ ...BTN.primary, flex: 1 }}>
          {state.filledOnce ? "再次填入" : "填入聊天框"}
        </button>
      </div>
    </>
  )
}
