/** 职位详情页 DOM 抽取 — 选择器集中在此文件，Boss 改版时只改此处 */

import type { JobDetailPageType } from "~lib/boss/pages"

type DetailSelectors = {
  jd: string
  hrName: string
  companyAttr: string
}

/**
 * 选择器移植自 userscript "Boss直聘JD-HR信息精准提取 (智能反混淆版) v2.3"。
 * `/web/geek/jobs*` 是左列表 + 右详情的复合页，DOM 嵌在 `.job-detail-box` 里，
 * 多选择器写法兼容 Boss 两套样式。
 */
const SELECTORS: Record<JobDetailPageType, DetailSelectors> = {
  job_detail: {
    jd: ".job-sec-text",
    hrName: ".job-boss-info h2",
    companyAttr: ".job-boss-info .boss-info-attr"
  },
  job_recommend: {
    jd: ".job-detail-box .job-detail-body .desc, .job-detail-body .job-sec-text",
    hrName: ".job-detail-box .job-boss-info .name, .job-boss-info h2",
    companyAttr: ".job-detail-box .job-boss-info .boss-info-attr"
  }
}

export type ExtractedJob = {
  title: string
  jdText: string
  hrName: string
  company: string
  hrTitle: string
}

/**
 * Boss 反爬：在 JD 容器里塞 <style> 声明若干"隐藏类"，再用带这些类的 <span> 插入
 * "kanzhun""直聘"等垃圾字。直接读 textContent 会拿到污染后的文本。
 * 解法：克隆节点 → 解析内联 <style> 找出隐藏类 → 删掉命中的 <span> → 再读文本。
 */
const getCleanText = (element: Element | null): string => {
  if (!element) return ""
  const clone = element.cloneNode(true) as Element
  const hiddenClasses = new Set<string>()

  clone.querySelectorAll("style").forEach((style) => {
    const css = style.textContent ?? ""
    const re =
      /\.([a-zA-Z0-9_-]+)[^{]*\{[^}]*(?:display:\s*none|visibility:\s*hidden|width:\s*0|font-size:\s*0)[^}]*\}/gi
    let match: RegExpExecArray | null
    while ((match = re.exec(css)) !== null) {
      if (match[1]) hiddenClasses.add(match[1])
    }
    style.remove()
  })

  clone.querySelectorAll("span").forEach((span) => {
    for (const cls of Array.from(span.classList)) {
      if (hiddenClasses.has(cls)) {
        span.remove()
        return
      }
    }
  })

  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"))

  return (clone.textContent ?? "").replace(/\n\s*\n/g, "\n\n").trim()
}

const cleanHrName = (raw: string): string =>
  raw
    .replace(/刚刚活跃|今日活跃|在线/g, "")
    .split("\n")[0]
    .trim()

const parseCompanyAndTitle = (
  raw: string
): { company: string; hrTitle: string } => {
  const parts = raw
    .split("·")
    .map((p) => p.trim())
    .filter(Boolean)
  return {
    company: parts[0] ?? "",
    hrTitle: parts[1] ?? ""
  }
}

const getJobTitle = (pageType: JobDetailPageType): string => {
  // 推荐页 document.title 整页固定，应从右侧详情面板的标题取
  if (pageType === "job_recommend") {
    const el = document.querySelector(
      ".job-detail-box .name, .job-detail-box .job-name"
    )
    if (el?.textContent?.trim()) return el.textContent.trim().split("\n")[0]
  }
  // 详情页 title 形如 "Java开发工程师_某公司_xxx 招聘-BOSS直聘"，取分隔前段
  return document.title.split(/[_|]/)[0].trim()
}

export const extractJobDetail = (
  pageType: JobDetailPageType
): ExtractedJob | null => {
  const sel = SELECTORS[pageType]
  const jdEl = document.querySelector(sel.jd)
  if (!jdEl) return null
  const jdText = getCleanText(jdEl)
  if (!jdText) return null

  const hrName = cleanHrName(getCleanText(document.querySelector(sel.hrName)))
  const { company, hrTitle } = parseCompanyAndTitle(
    getCleanText(document.querySelector(sel.companyAttr))
  )

  return {
    title: getJobTitle(pageType),
    jdText,
    hrName,
    company,
    hrTitle
  }
}

/**
 * 等待 JD 渲染并抽取。Boss 是 SPA：
 * - `job_detail`：JD 容器出现一次后不再变，首次抽到即可断开 observer。
 * - `job_recommend`：用户在左列表点选不同卡片时，右详情面板的 innerHTML 会替换，
 *   需要持续 observe；用 jdText 去重避免短时间内重复回调。
 * 任一情况下，调用方都应在卸载/重导航时调用返回的 cleanup。
 */
export const observeJobDetail = (
  pageType: JobDetailPageType,
  onReady: (job: ExtractedJob) => void
): (() => void) => {
  const stopOnFirst = pageType === "job_detail"
  let disposed = false
  let scheduled = false
  let lastJdText = ""

  const tryRun = () => {
    if (disposed) return
    const job = extractJobDetail(pageType)
    if (!job) return
    if (job.jdText === lastJdText) return
    lastJdText = job.jdText
    onReady(job)
    if (stopOnFirst) {
      disposed = true
      observer.disconnect()
    }
  }

  // MutationObserver 在频繁 DOM 改动下会高频回调；合并到下一帧执行一次
  const schedule = () => {
    if (scheduled || disposed) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      tryRun()
    })
  }

  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })
  tryRun()

  return () => {
    disposed = true
    observer.disconnect()
  }
}

/**
 * 给一次 JD 命名出稳定 key，用于 chrome.storage 缓存匹配（详情页生成 → 聊天页填入）。
 * 优先用 URL 中的 Boss jobId，拿不到则退回 "公司|职位" 组合。
 */
export const getJobKey = (job: ExtractedJob): string => {
  const url = new URL(location.href)
  // /job_detail/<id>.html
  const pathMatch = url.pathname.match(/\/job_detail\/([^/.?]+)/)
  if (pathMatch?.[1]) return `id:${pathMatch[1]}`
  // /web/geek/jobs?...&jobId=<id> 或类似 query 参数
  const qJobId = url.searchParams.get("jobId") ?? url.searchParams.get("job_id")
  if (qJobId) return `id:${qJobId}`
  return `composite:${job.company}|${job.title}`
}

export const runOnJobDetailPage = () => {
  // 当前由 contents/boss-panel.tsx 直接调用 observeJobDetail 驱动抽取与展示。
  // 这里保留入口以便后续"无 UI 自动抽取 + 写 storage"接管。
}
