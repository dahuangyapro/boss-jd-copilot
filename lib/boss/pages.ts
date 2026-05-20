export type BossPageType = "job_detail" | "chat" | "unknown"

export const getPageType = (href: string): BossPageType => {
  const url = new URL(href)

  if (url.pathname.includes("/job_detail")) {
    return "job_detail"
  }

  if (url.pathname.includes("/web/geek/chat")) {
    return "chat"
  }

  return "unknown"
}
