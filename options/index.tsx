import { useCallback, useEffect, useState } from "react"

import {
  DEFAULT_AI_SETTINGS,
  getAiSettings,
  requestBaseUrlPermission,
  saveAiSettings,
  type AiSettings
} from "~lib/storage/options"

import { GreetingSection } from "./GreetingSection"
import { ProfileSection } from "./ProfileSection"
import { ProviderSection } from "./ProviderSection"
import { S, SaveCard, type Patcher } from "./ui"

/**
 * 字段按"卡片"归属：
 *  - Provider 卡：baseURL / apiKey / model
 *  - Content 卡：userProfile / tone / customPrompt
 * 每张卡独立保存按钮；保存时**只覆盖**自己关心的字段，从 storage 拉其他字段原值
 * 拼回去——这样在两张卡都改了但只按其中一张保存按钮的场景下，未保存那张的字段
 * 不会被误写入。
 */
const PROVIDER_FIELDS = ["baseURL", "apiKey", "model"] as const
const CONTENT_FIELDS = ["userProfile", "tone", "customPrompt"] as const

type ProviderField = (typeof PROVIDER_FIELDS)[number]
type ContentField = (typeof CONTENT_FIELDS)[number]

const isDirty = (
  a: AiSettings,
  b: AiSettings,
  fields: readonly (ProviderField | ContentField)[]
): boolean => fields.some((f) => a[f] !== b[f])

const OptionsPage = () => {
  const [stored, setStored] = useState<AiSettings>(DEFAULT_AI_SETTINGS)
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [providerSavedAt, setProviderSavedAt] = useState<number | null>(null)
  const [contentSavedAt, setContentSavedAt] = useState<number | null>(null)
  const [permWarning, setPermWarning] = useState<string | null>(null)
  const [providerBusy, setProviderBusy] = useState(false)
  const [contentBusy, setContentBusy] = useState(false)

  useEffect(() => {
    getAiSettings().then((s) => {
      setStored(s)
      setSettings(s)
      setLoaded(true)
    })
  }, [])

  const patch: Patcher = useCallback((delta) => {
    setSettings((prev) => ({ ...prev, ...delta }))
    setPermWarning(null)
  }, [])

  const providerDirty = isDirty(settings, stored, PROVIDER_FIELDS)
  const contentDirty = isDirty(settings, stored, CONTENT_FIELDS)

  /**
   * Provider 卡保存：先 user-gesture 触发 permission.request（Chrome 拒绝非手势调用），
   * 再读 storage 把 Content 字段保留下来、只覆盖 Provider 字段。
   */
  const onSaveProvider = async () => {
    setProviderBusy(true)
    try {
      const granted = await requestBaseUrlPermission(settings.baseURL)
      const latest = await getAiSettings()
      const next: AiSettings = {
        ...latest,
        baseURL: settings.baseURL,
        apiKey: settings.apiKey,
        model: settings.model
      }
      await saveAiSettings(next)
      setStored(next)
      setProviderSavedAt(Date.now())
      setPermWarning(
        granted
          ? null
          : "未授权访问该 baseURL 的域名，AI 调用会失败。再点一次「保存」重新授权，或换一个域名。"
      )
    } finally {
      setProviderBusy(false)
    }
  }

  const onSaveContent = async () => {
    setContentBusy(true)
    try {
      const latest = await getAiSettings()
      const next: AiSettings = {
        ...latest,
        userProfile: settings.userProfile,
        tone: settings.tone,
        customPrompt: settings.customPrompt
      }
      await saveAiSettings(next)
      setStored(next)
      setContentSavedAt(Date.now())
    } finally {
      setContentBusy(false)
    }
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

        <SaveCard
          onSave={onSaveProvider}
          dirty={providerDirty}
          savedAt={providerSavedAt}
          warning={permWarning}
          busy={providerBusy}>
          <ProviderSection settings={settings} patch={patch} />
        </SaveCard>

        <SaveCard
          onSave={onSaveContent}
          dirty={contentDirty}
          savedAt={contentSavedAt}
          busy={contentBusy}>
          <ProfileSection settings={settings} patch={patch} />
          <GreetingSection settings={settings} patch={patch} />
        </SaveCard>
      </div>
    </div>
  )
}

export default OptionsPage
