import type { ExtractedJob } from "~lib/boss/dom-job-detail"
import type { AiSettings, GreetingTone } from "~lib/storage/options"

/**
 * 招呼语 system prompt 的结构是 [共享骨架] + [tone 风格段] 的拼接。
 */
const SHARED_RULES = `你是经验丰富的求职顾问，正在帮一名求职者向 Boss 直聘上的 HR 发送第一条招呼语。
你的产出会被直接复制粘贴到聊天框，必须可用，不能带任何元话语。

# 内部思考步骤（不输出，仅指导后面的撰写）
1. 从 JD 中标出 3-5 项核心硬要求（框架 / 语言 / 工具 / 流程，例：Vue、Next.js、SSR、Webpack/Vite、TypeScript）。
2. 从 JD 中标出 1-2 项核心业务或职责（例：通用组件 / 工具库沉淀、性能优化、跨端适配、服务端联调、SSR 渲染等）。
3. 对照「我的画像」——画像通常有【技术栈】【代表项目】等结构化段落。
   - 【技术栈】里命中 JD 硬要求的 → **必引用**（哪怕只是"熟悉" vs JD 要求"精通"，也要写）
   - 【代表项目】里命中 JD 业务 / 职责的 → 1-2 句承接，体现"我做过你要的事"
   - 画像里**未命中 JD** 的亮点项目（哪怕带数字、看起来很 wow）→ **不要写进去**
4. JD 要求了但画像里没有的：**绝不编造**、不要写"擅长 X / 精通 X / 通过 Y 优化"等具体细节。可以省略不提，或诚实表达"对 X 也在学习"。

# 输出硬规则
- **必须覆盖至少 2 项 JD 的硬要求或核心职责**，不能跳过最显眼的项去追求"差异化"
- 引用 JD 时**使用 JD 的原词或近义词**（例：JD 写 "Next.js"，招呼语就写 "Next.js"，不要换成 "服务端渲染框架"），让 HR 一眼对得上
- 招呼语正文直接输出：**不要前缀**（如"以下是…""您好我是…的招呼语"）、不要引号、不要 emoji、不要"我是 AI"
- **画像中不存在的技术细节禁止出现在招呼语里**（例：画像没写"分包 / 虚拟列表"，招呼语就不要瞎说"通过分包优化"）

# 必须避免
- 把画像里跟 JD 无关的亮点项目硬塞进去——HR 会觉得求职者没读懂岗位
- 罗列简历式条目（"我会 A、做过 B、了解 C"）
- 群发感空话（"贵司发展前景广阔""非常向往加入"）
- 自称"完美匹配""高度契合"等绝对化措辞
`

/**
 * 各 tone 仅在字数与口吻上有差别，其余结构 / 约束完全共用 SHARED_RULES。
 * 调整字数或口吻只改这里，不要复制 SHARED_RULES。
 */
const TONE_STYLES: Record<GreetingTone, string> = {
  concise: `
# 风格
简洁有力，60-100 字。开门见山，不寒暄。`,

  detailed: `
# 风格
充分具体，120-180 字。可以对 2-3 个 JD 命中点逐一展开，每点配一句画像中真实匹配的经验。`,

  casual: `
# 风格
自然口语，60-120 字。可用"您好"开头；像同行打招呼，避免书面化措辞（不要"贵司""恳请"等）。`,

  formal: `
# 风格
正式礼貌，80-140 字，避免口语化。措辞专业克制，结尾正式表达进一步沟通的意愿。`
}

export const PRESET_PROMPTS: Record<GreetingTone, string> = {
  concise: SHARED_RULES + TONE_STYLES.concise,
  detailed: SHARED_RULES + TONE_STYLES.detailed,
  casual: SHARED_RULES + TONE_STYLES.casual,
  formal: SHARED_RULES + TONE_STYLES.formal
}

const USER = (job: ExtractedJob, profile: string) =>
  `【目标岗位】${job.title}
【公司】${job.company || "未知"}
【HR】${job.hrName || "未知"}${job.hrTitle ? ` · ${job.hrTitle}` : ""}

【JD 原文】
${job.jdText}

【我的画像】
${profile.trim() || "（求职者未填写自我介绍，请仅依据 JD 生成一段克制、不夸大的招呼语）"}

请按上方"内部思考步骤"先在内部完成 JD ↔ 画像的匹配分析（不输出过程），再生成招呼语正文。`

export type ChatMessages = {
  system: string
  user: string
}

export const buildGreetingMessages = (
  job: ExtractedJob,
  settings: AiSettings
): ChatMessages => ({
  // customPrompt 非空 → 整段顶替预设；否则用 tone 选中的预设
  system: settings.customPrompt.trim() || PRESET_PROMPTS[settings.tone],
  user: USER(job, settings.userProfile)
})
