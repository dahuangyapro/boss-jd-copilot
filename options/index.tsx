import { useCallback, useEffect, useState } from "react"

import {
  DEFAULT_AI_SETTINGS,
  getAiSettings,
  saveAiSettings,
  type AiSettings
} from "~lib/storage/options"

import { GreetingSection } from "./GreetingSection"
import { ProfileSection } from "./ProfileSection"
import { ProviderSection } from "./ProviderSection"
import { S, type Patcher } from "./ui"

const OptionsPage = () => {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    getAiSettings().then((s) => {
      setSettings(s)
      setLoaded(true)
    })
  }, [])

  const patch: Patcher = useCallback((delta) => {
    setSettings((prev) => ({ ...prev, ...delta }))
    setSavedAt(null)
  }, [])

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

        <ProviderSection settings={settings} patch={patch} />
        <ProfileSection settings={settings} patch={patch} />
        <GreetingSection settings={settings} patch={patch} />

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

export default OptionsPage
