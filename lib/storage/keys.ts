export const STORAGE_KEYS = {
  jobCachePrefix: "job:",
  aiSettings: "aiSettings"
} as const

export const jobCacheKey = (jobKey: string) =>
  `${STORAGE_KEYS.jobCachePrefix}${jobKey}`
