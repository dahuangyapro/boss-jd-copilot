import type { ExtractedJob } from "~lib/boss/dom-job-detail"
import type { AiSettings, GreetingTone } from "~lib/storage/options"

const TONE_HINT: Record<GreetingTone, string> = {
  concise: "简洁有力，60-100 字",
  detailed: "充分具体，120-180 字",
  casual: "自然口语，60-120 字，可用'您好'开头",
  formal: "正式礼貌，80-140 字，避免口语化"
}

const SYSTEM = (toneHint: string) =>
  `你是经验丰富的求职顾问，正在帮一名求职者向 Boss 直聘上的 HR 发送第一条招呼语。
输出会直接被复制粘贴到聊天框，因此：
- 不要加引号、不要解释、不要"以下是招呼语:"之类的前缀
- 不使用 emoji；不要透露你是 AI
- 风格要求：${toneHint}

内容必须做到：
1. 体现求职者对岗位的具体理解，引用 JD 中 1-2 个关键点（技术栈、职责或业务方向）
2. 用求职者的真实经验呼应这些点（不要夸大，不要编造）
3. 结尾自然地邀约进一步沟通

避免：
- 群发感（"贵司发展前景广阔""非常向往加入"等空话）
- 罗列简历式的清单
- 自称"完美匹配"等绝对化措辞`

const USER = (job: ExtractedJob, profile: string) =>
  `【目标岗位】${job.title}
【公司】${job.company || "未知"}
【HR】${job.hrName || "未知"}${job.hrTitle ? ` · ${job.hrTitle}` : ""}

【JD 原文】
${job.jdText}

【我的画像】
${profile.trim() || "（求职者未填写自我介绍，请仅依据 JD 生成一段克制、不夸大的招呼语）"}

请生成一条招呼语，直接输出正文。`

export type ChatMessages = {
  system: string
  user: string
}

export const buildGreetingMessages = (
  job: ExtractedJob,
  settings: AiSettings
): ChatMessages => ({
  system: SYSTEM(TONE_HINT[settings.tone]),
  user: USER(job, settings.userProfile)
})
