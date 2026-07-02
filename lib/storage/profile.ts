/** personal-profile-analysis.md 输出的结构化个人画像 */
export type WorkBackground = {
  experience_years: string
  role: string
  recent_focus: string
}

export type JobPreferences = {
  target_role: string
  preferred_direction: string
}

export type PersonalProfile = {
  work_background: WorkBackground
  technical_stack: string[]
  capability_tags: string[]
  representative_experiences: string[]
  job_preferences: JobPreferences
}

export const DEFAULT_WORK_BACKGROUND: WorkBackground = {
  experience_years: "",
  role: "",
  recent_focus: ""
}

export const DEFAULT_JOB_PREFERENCES: JobPreferences = {
  target_role: "",
  preferred_direction: ""
}

export const DEFAULT_PERSONAL_PROFILE: PersonalProfile = {
  work_background: { ...DEFAULT_WORK_BACKGROUND },
  technical_stack: [],
  capability_tags: [],
  representative_experiences: [],
  job_preferences: { ...DEFAULT_JOB_PREFERENCES }
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((item) => typeof item === "string")

const asString = (v: unknown): string => (typeof v === "string" ? v : "")

const normalizeWorkBackground = (raw: unknown): WorkBackground => {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_WORK_BACKGROUND }
  const obj = raw as Record<string, unknown>
  return {
    experience_years: asString(obj.experience_years),
    role: asString(obj.role),
    recent_focus: asString(obj.recent_focus)
  }
}

const normalizeJobPreferences = (raw: unknown): JobPreferences => {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_JOB_PREFERENCES }
  const obj = raw as Record<string, unknown>
  return {
    target_role: asString(obj.target_role),
    preferred_direction: asString(obj.preferred_direction)
  }
}

/** 合并 storage 读出的部分字段，保证结构完整 */
export const normalizePersonalProfile = (
  raw: unknown
): PersonalProfile => {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PERSONAL_PROFILE }
  const obj = raw as Record<string, unknown>
  return {
    work_background: normalizeWorkBackground(obj.work_background),
    technical_stack: isStringArray(obj.technical_stack)
      ? obj.technical_stack
      : [],
    capability_tags: isStringArray(obj.capability_tags)
      ? obj.capability_tags
      : [],
    representative_experiences: isStringArray(obj.representative_experiences)
      ? obj.representative_experiences
      : [],
    job_preferences: normalizeJobPreferences(obj.job_preferences)
  }
}

/** 旧版 userProfile 纯文本迁移：整段放进代表经历 */
export const personalProfileFromLegacyText = (
  text: string
): PersonalProfile => {
  const trimmed = text.trim()
  if (!trimmed) return { ...DEFAULT_PERSONAL_PROFILE }
  return {
    ...DEFAULT_PERSONAL_PROFILE,
    representative_experiences: [trimmed]
  }
}

export const linesToArray = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

export const arrayToLines = (items: string[]): string => items.join("\n")

export const formatWorkBackgroundText = (wb: WorkBackground): string =>
  [wb.experience_years, wb.role, wb.recent_focus].join("\n")

export const parseWorkBackgroundText = (text: string): WorkBackground => {
  const lines = text.split("\n").map((line) => line.trim())
  return {
    experience_years: lines[0] ?? "",
    role: lines[1] ?? "",
    recent_focus: lines[2] ?? ""
  }
}

export const formatJobPreferencesText = (jp: JobPreferences): string =>
  [jp.target_role, jp.preferred_direction].join("\n")

export const parseJobPreferencesText = (text: string): JobPreferences => {
  const lines = text.split("\n").map((line) => line.trim())
  return {
    target_role: lines[0] ?? "",
    preferred_direction: lines[1] ?? ""
  }
}

export const formatProfileForPrompt = (profile: PersonalProfile): string =>
  JSON.stringify(profile, null, 2)

export const isPersonalProfileEmpty = (profile: PersonalProfile): boolean => {
  const wb = profile.work_background
  return (
    !wb.experience_years.trim() &&
    !wb.role.trim() &&
    !wb.recent_focus.trim() &&
    profile.technical_stack.length === 0 &&
    profile.capability_tags.length === 0 &&
    profile.representative_experiences.length === 0 &&
    !profile.job_preferences.target_role.trim() &&
    !profile.job_preferences.preferred_direction.trim()
  )
}

export const personalProfilesEqual = (
  a: PersonalProfile,
  b: PersonalProfile
): boolean => JSON.stringify(a) === JSON.stringify(b)
