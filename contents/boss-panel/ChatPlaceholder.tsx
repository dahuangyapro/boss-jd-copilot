/**
 * 聊天页占位区块：未来要做"匹配缓存招呼语并填入输入框"。
 * 目前 content script 已经注入 chat 页，但该流程尚未实现，按钮 disabled。
 */
export const ChatPlaceholder = () => (
  <>
    <div style={{ marginBottom: 8, color: "#475569", lineHeight: 1.5 }}>
      匹配当前会话的缓存招呼语并填入输入框
    </div>
    <button
      disabled
      style={{
        width: "100%",
        padding: "8px 12px",
        background: "#f1f5f9",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        color: "#94a3b8",
        cursor: "not-allowed",
        fontSize: 13
      }}>
      填入招呼语（待接入）
    </button>
  </>
)
