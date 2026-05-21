import type { ChatMessages } from "~lib/ai/prompts"

/**
 * 让模型把简历压缩成一段"个人画像"——结构化但保持可读，
 * 直接能塞进 options 的 userProfile textarea，再被招呼语 prompt 引用。
 * 注意：要避免模型自由发挥（编造经验），只能从简历原文里抽取。
 */
const SYSTEM = `你是一名经验丰富的招聘顾问，正在帮求职者把简历压缩成一段简短的"个人画像"，
这段画像之后会被用于 Boss 直聘的 AI 招呼语生成（作为"我的画像"段落）。

输出必须满足：
- 仅依据简历原文，**不要编造任何未在简历中出现的经验、技能或公司**
- 中文，5-10 行，每行一句话或一个要点
- 涵盖：工作年限、主要技术栈/方向、典型项目或亮点、求职方向（若简历中有体现）
- 风格干净、可直接复制使用；不要 Markdown 标题、不要序号编号、不要"以下是…"等前缀
- 不要写"求职者"等第三人称；用第一人称口吻或省略主语

避免：
- 罗列每个公司每段经历的细碎条目（这是画像，不是简历副本）
- 复制简历中的联系方式、教育细节、证书清单
- 加上简历里没有的形容词（"优秀的""资深的"等）`

const USER = (resumeText: string) =>
  `这是从用户上传的 PDF 简历里提取的原始文本（OCR/排版偶有错乱，请忽略明显的格式噪音）：

【简历原文】
${resumeText}

请输出 5-10 行的个人画像。`

export const buildResumeAnalysisMessages = (
  resumeText: string
): ChatMessages => ({
  system: SYSTEM,
  user: USER(resumeText)
})
