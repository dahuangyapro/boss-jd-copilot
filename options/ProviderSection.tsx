import { useState } from "react"

import { PROVIDER_PRESETS, type AiSettings } from "~lib/storage/options"

import { Field, S, Section, type Patcher } from "./ui"

export const ProviderSection = ({
  settings,
  patch
}: {
  settings: AiSettings
  patch: Patcher
}) => {
  const [showKey, setShowKey] = useState(false)

  const applyPreset = (presetName: string) => {
    const preset = PROVIDER_PRESETS.find((p) => p.name === presetName)
    if (!preset) return
    patch({
      baseURL: preset.baseURL || settings.baseURL,
      model: preset.model || settings.model
    })
  }

  return (
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

      <Field label="baseURL" hint="结尾通常是 /v1，会自动拼 /chat/completions">
        <input
          style={S.input}
          value={settings.baseURL}
          placeholder="https://api.deepseek.com/v1"
          onChange={(e) => patch({ baseURL: e.target.value })}
        />
      </Field>

      <Field
        label="API Key"
        hint="仅保存在本机 chrome.storage.local，不会同步到云端">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...S.input, flex: 1 }}
            type={showKey ? "text" : "password"}
            value={settings.apiKey}
            placeholder="sk-..."
            onChange={(e) => patch({ apiKey: e.target.value })}
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
          placeholder="deepseek-v4-flash"
          onChange={(e) => patch({ model: e.target.value })}
        />
      </Field>
    </Section>
  )
}
