import { useState } from "react"

import { PRESET_PROMPTS } from "~lib/ai/prompts"
import {
  TONE_LABELS,
  type AiSettings,
  type GreetingTone
} from "~lib/storage/options"

import { Field, S, Section, type Patcher } from "./ui"

const TONES = Object.keys(TONE_LABELS) as GreetingTone[]

export const GreetingSection = ({
  settings,
  patch
}: {
  settings: AiSettings
  patch: Patcher
}) => {
  const [showAdvanced, setShowAdvanced] = useState(
    () => settings.customPrompt.trim().length > 0
  )

  const isCustom = settings.customPrompt.trim().length > 0

  const loadPresetIntoEditor = () => {
    patch({ customPrompt: PRESET_PROMPTS[settings.tone] })
    setShowAdvanced(true)
  }

  const clearCustom = () => {
    patch({ customPrompt: "" })
  }

  return (
    <Section title="招呼语风格">
      <Field
        label="预设"
        hint={
          isCustom
            ? "当前使用自定义 prompt（下方）；切换预设不会自动覆盖"
            : "快速选一种风格；想完全自己控制请展开下方高级编辑器"
        }>
        <select
          style={S.input}
          value={settings.tone}
          onChange={(e) => patch({ tone: e.target.value as GreetingTone })}>
          {TONES.map((t) => (
            <option key={t} value={t}>
              {TONE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        style={S.linkBtn}>
        {showAdvanced ? "▾" : "▸"} 高级：自定义系统 prompt
        {isCustom && (
          <span style={S.activeBadge}>当前生效</span>
        )}
      </button>

      {showAdvanced && (
        <div style={{ marginTop: 10 }}>
          <div style={S.hint}>
            非空时会**整段**顶替预设。建议从某个预设加载进来再改，避免漏掉关键约束（如"不要加引号""引用 JD 1-2 个具体点"等）。
          </div>
          <textarea
            style={{
              ...S.input,
              ...S.textarea,
              marginTop: 8,
              minHeight: 180,
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
              fontSize: 12.5,
              lineHeight: 1.55
            }}
            rows={10}
            value={settings.customPrompt}
            placeholder={
              "留空时使用上方预设。点下方按钮可把当前预设填入这里再修改。"
            }
            onChange={(e) => patch({ customPrompt: e.target.value })}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              style={S.smallBtn}
              onClick={loadPresetIntoEditor}
              title={`把"${TONE_LABELS[settings.tone]}"完整内容填入编辑器`}>
              加载当前预设到编辑器
            </button>
            <button
              type="button"
              style={S.smallBtn}
              onClick={clearCustom}
              disabled={!isCustom}>
              清空（用预设）
            </button>
          </div>
        </div>
      )}
    </Section>
  )
}
