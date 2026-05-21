import { useEffect, useState } from "react"

import {
  DEFAULT_AI_SETTINGS,
  PROVIDER_PRESETS,
  TONE_LABELS,
  getAiSettings,
  saveAiSettings,
  type AiSettings,
  type GreetingTone
} from "~lib/storage/options"

const TONES = Object.keys(TONE_LABELS) as GreetingTone[]

const OptionsPage = () => {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    getAiSettings().then((s) => {
      setSettings(s)
      setLoaded(true)
    })
  }, [])

  const update = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSavedAt(null)
  }

  const applyPreset = (presetName: string) => {
    const preset = PROVIDER_PRESETS.find((p) => p.name === presetName)
    if (!preset) return
    setSettings((prev) => ({
      ...prev,
      baseURL: preset.baseURL || prev.baseURL,
      model: preset.model || prev.model
    }))
    setSavedAt(null)
  }

  const onSave = async () => {
    await saveAiSettings(settings)
    setSavedAt(Date.now())
  }

  if (!loaded) {
    return <div style={S.loading}>加载中…</div>
  }

  return (
    <div style={S.page}>
      <div style={S.container}>
        <h1 style={S.title}>Boss JD Copilot · 配置</h1>
        <p style={S.subtitle}>
          所有大模型 provider 走 OpenAI 兼容协议，配置后可在 Boss
          职位详情/推荐页生成个性化招呼语。
        </p>

        <Section title="大模型 Provider">
          <Field label="预设" hint="选预设会自动填 baseURL 与默认模型，仍可手改">
            <select
              style={S.input}
              onChange={(e) => applyPreset(e.target.value)}
              defaultValue="">
              <option value="" disabled>
                选择一个预设…
              </option>
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="baseURL" hint="结尾通常是 /v1，client 会自动拼 /chat/completions">
            <input
              style={S.input}
              value={settings.baseURL}
              placeholder="https://api.deepseek.com/v1"
              onChange={(e) => update("baseURL", e.target.value)}
            />
          </Field>

          <Field label="API Key" hint="仅保存在本机 chrome.storage.local，不会同步到云端">
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...S.input, flex: 1 }}
                type={showKey ? "text" : "password"}
                value={settings.apiKey}
                placeholder="sk-..."
                onChange={(e) => update("apiKey", e.target.value)}
              />
              <button
                type="button"
                style={S.smallBtn}
                onClick={() => setShowKey((v) => !v)}>
                {showKey ? "隐藏" : "显示"}
              </button>
            </div>
          </Field>

          <Field label="模型名">
            <input
              style={S.input}
              value={settings.model}
              placeholder="deepseek-chat"
              onChange={(e) => update("model", e.target.value)}
            />
          </Field>
        </Section>

        <Section title="个人画像">
          <Field
            label="自我介绍"
            hint="3-5 行：经验年限、技术栈或方向、亮点项目。越具体，招呼语越像你本人写的">
            <textarea
              style={{ ...S.input, ...S.textarea }}
              rows={6}
              value={settings.userProfile}
              placeholder={
                "示例：3 年 Go 后端，主做支付/订单方向，熟悉 Kafka 与 ES；\n上家在 xx 公司，独立设计过日交易峰值 50w+ 的清结算模块；\n求职方向：电商/金融科技后端，希望接触高并发与分布式事务"
              }
              onChange={(e) => update("userProfile", e.target.value)}
            />
          </Field>
        </Section>

        <Section title="招呼语风格">
          <Field label="语气">
            <select
              style={S.input}
              value={settings.tone}
              onChange={(e) => update("tone", e.target.value as GreetingTone)}>
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {TONE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <div style={S.footer}>
          <button style={S.saveBtn} onClick={onSave}>
            保存
          </button>
          {savedAt && (
            <span style={S.savedHint}>
              已保存 · {new Date(savedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const Section = ({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) => (
  <section style={S.section}>
    <h2 style={S.sectionTitle}>{title}</h2>
    {children}
  </section>
)

const Field = ({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) => (
  <div style={S.field}>
    <label style={S.label}>{label}</label>
    {children}
    {hint && <div style={S.hint}>{hint}</div>}
  </div>
)

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    color: "#0f172a",
    padding: "32px 16px"
  },
  container: {
    maxWidth: 640,
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: 12,
    boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
    padding: 28
  },
  title: { fontSize: 22, fontWeight: 600, margin: "0 0 8px" },
  subtitle: {
    margin: "0 0 24px",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.55
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0ea5e9",
    margin: "0 0 12px",
    paddingBottom: 6,
    borderBottom: "1px solid #e2e8f0"
  },
  field: { marginBottom: 14 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
    color: "#334155"
  },
  hint: { marginTop: 4, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 },
  input: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "inherit",
    color: "#0f172a",
    background: "#ffffff",
    boxSizing: "border-box",
    outline: "none"
  },
  textarea: { resize: "vertical", lineHeight: 1.55, minHeight: 100 },
  smallBtn: {
    padding: "6px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    background: "#f1f5f9",
    color: "#334155",
    fontSize: 12,
    cursor: "pointer"
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 8
  },
  saveBtn: {
    padding: "9px 24px",
    background: "#0ea5e9",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  },
  savedHint: { fontSize: 12, color: "#10b981" },
  loading: { padding: 32, textAlign: "center", color: "#64748b" }
}

export default OptionsPage
