import type { PlasmoCSConfig } from "plasmo"

import { getPageType } from "~lib/boss/pages"
import { runOnChatPage } from "~lib/boss/dom-chat"
import { runOnJobDetailPage } from "~lib/boss/dom-job-detail"

export const config: PlasmoCSConfig = {
  matches: [
    "https://www.zhipin.com/job_detail*",
    "https://www.zhipin.com/web/geek/chat*"
  ]
}

const main = () => {
  const pageType = getPageType(location.href)

  if (pageType === "job_detail") {
    runOnJobDetailPage()
    return
  }

  if (pageType === "chat") {
    runOnChatPage()
  }
}

main()
