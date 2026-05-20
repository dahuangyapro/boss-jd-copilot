export const STORAGE_KEYS = {
  jobCachePrefix: "job:"
} as const

export const jobCacheKey = (jobKey: string) =>
  `${STORAGE_KEYS.jobCachePrefix}${jobKey}`
