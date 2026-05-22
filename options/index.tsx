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
import { S, type Patcher } from "./ui"

const OptionsPage = () => {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [permWarning, setPermWarning] = useState<string | null>(null)

  useEffect(() => {
    getAiSettings().then((s) => {
      setSettings(s)
      setLoaded(true)
    })
  }, [])

  const patch: Patcher = useCallback((delta) => {
    setSettings((prev) => ({ ...prev, ...delta }))
    setSavedAt(null)
    setPermWarning(null)
  }, [])

  /**
   * 商城合规：常驻 host_permissions 只覆盖 zhipin，AI baseURL 走 optional。
   * 保存按钮的点击是 user gesture——必须把 permission.request 放在 await 链最前，
   * 否则 Chrome 判定"非手势触发"会直接拒绝弹窗。
   */
  const onSave = async () => {
    const granted = await requestBaseUrlPermission(settings.baseURL)
    await saveAiSettings(settings)
    setSavedAt(Date.now())
    setPermWarning(
      granted
        ? null
        : "未授权访问该 baseURL 的域名，AI 调用会失败。再点一次「保存」重新授权，或换一个域名。"
    )
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
        {permWarning && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              color: "#b91c1c",
              fontSize: 12.5,
              lineHeight: 1.5
            }}>
            {permWarning}
          </div>
        )}
      </div>
    </div>
  )
}

export default OptionsPage
