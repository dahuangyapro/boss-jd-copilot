export type BossPageType =
  | "job_detail"
  | "job_recommend"
  | "chat"
  | "unknown"

/** 抽得到完整 JD 的两种页面：独立详情页 + 推荐列表页的右侧详情面板 */
export type JobDetailPageType = Extract<
  BossPageType,
  "job_detail" | "job_recommend"
>

export const getPageType = (href: string): BossPageType => {
  const url = new URL(href)

  if (url.pathname.includes("/job_detail")) {
    return "job_detail"
  }

  if (url.pathname.startsWith("/web/geek/jobs")) {
    return "job_recommend"
  }

  if (url.pathname.includes("/web/geek/chat")) {
    return "chat"
  }

  return "unknown"
}
