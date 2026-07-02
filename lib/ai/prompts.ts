import type { JdAnalysis } from "~lib/messages"
import type { AiSettings } from "~lib/storage/options"
import {
  formatProfileForPrompt,
  isPersonalProfileEmpty
} from "~lib/storage/profile"

// Plasmo/Parcel：以纯文本打包 lib/prompts/get-greetings.md
import GREETING_SYSTEM from "data-text:~lib/prompts/get-greetings.md"

const USER = (profile: AiSettings["personalProfile"], jdAnalysis: JdAnalysis) =>
  `## JD Analysis
${JSON.stringify(jdAnalysis, null, 2)}

## Candidate Profile
${
  isPersonalProfileEmpty(profile)
    ? "（求职者未填写个人画像，请仅依据 JD 分析生成一段克制、不夸大的招呼语）"
    : formatProfileForPrompt(profile)
}`

export type ChatMessages = {
  system: string
  user: string
}

export const buildGreetingMessages = (
  settings: AiSettings,
  jdAnalysis: JdAnalysis
): ChatMessages => ({
  system: GREETING_SYSTEM,
  user: USER(settings.personalProfile, jdAnalysis)
})
