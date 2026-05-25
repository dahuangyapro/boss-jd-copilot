import { jobCacheKey, STORAGE_KEYS } from "~lib/storage/keys"

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

/**
 * 列出所有 `job:*` 缓存条目，供 chat 页反查。Boss 的 chat 页 URL 是
 * `/web/geek/chat` 干净路径，**没有 jobId**，无法用 `getJobCache(id:xxx)` 直接命中；
 * 只能扫全表按职位名匹配。条目规模通常 < 100，全表扫成本可忽略。
 */
export const listJobCacheEntries = async (): Promise<JobCacheEntry[]> => {
  const all = await chrome.storage.local.get(null)
  const entries: JobCacheEntry[] = []
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith(STORAGE_KEYS.jobCachePrefix)) continue
    if (value && typeof value === "object" && "jobKey" in value) {
      entries.push(value as JobCacheEntry)
    }
  }
  return entries
}

/**
 * 招聘 title 归一化。两端的 title 文案不一致：
 * - 详情页存进 storage 的是 `document.title.split('_')[0]`，Boss 给的形如
 *   `「前端开发（react）招聘」` —— 带成对书名号 + 尾部"招聘"
 * - chat 页 DOM 的 `.position-name` 是干净的 `前端开发（react）`
 *
 * 直接 `===` 比对必失配，归一化后再比。去成对引号/书名号、去尾部"招聘"、
 * 收掉首尾空白；不动中间字符，避免误改用户岗位里的关键词。
 */
const normalizeJobTitle = (title: string): string =>
  title
    .trim()
    .replace(/^[「『《【"'`]+|[」』》】"'`]+$/g, "")
    .replace(/招聘$/, "")
    .trim()
    .toLowerCase()

/**
 * 按 title 反查最新一条招呼语缓存。多条同名职位（不同公司）目前不区分公司
 * （因为 chat 页公司 selector 还不准），按 `updatedAt` 降序取最新——求职者
 * 重复投递同名岗位时，最近一次生成的招呼语通常就是想要的。
 */
export const findJobCacheByTitle = async (
  title: string
): Promise<JobCacheEntry | null> => {
  const target = normalizeJobTitle(title)
  if (!target) return null
  const entries = await listJobCacheEntries()
  const matches = entries.filter(
    (e) => normalizeJobTitle(e.title) === target
  )
  if (matches.length === 0) return null
  matches.sort((a, b) => b.updatedAt - a.updatedAt)
  return matches[0]
}
