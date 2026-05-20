import { jobCacheKey } from "~lib/storage/keys"

export type JobCacheEntry = {
  jobKey: string
  title: string
  company?: string
  jdText: string
  greeting?: string
  updatedAt: number
}

export const saveJobCache = async (entry: JobCacheEntry) => {
  await chrome.storage.local.set({
    [jobCacheKey(entry.jobKey)]: entry
  })
}

export const getJobCache = async (
  jobKey: string
): Promise<JobCacheEntry | null> => {
  const key = jobCacheKey(jobKey)
  const result = await chrome.storage.local.get(key)
  return (result[key] as JobCacheEntry | undefined) ?? null
}
