import type { PlasmoCSConfig } from "plasmo"

import { getPageType } from "~lib/boss/pages"
import { runOnChatPage } from "~lib/boss/dom-chat"
import { runOnJobDetailPage } from "~lib/boss/dom-job-detail"

export const config: PlasmoCSConfig = {
  matches: [
    "https://www.zhipin.com/job_detail*",
    "https://www.zhipin.com/web/geek/jobs*",
    "https://www.zhipin.com/web/geek/chat*"
  ]
}

const main = () => {
  const pageType = getPageType(location.href)

  // 独立详情页与推荐列表页右侧详情面板都能拿到完整 JD，复用同一抽取入口
  if (pageType === "job_detail" || pageType === "job_recommend") {
    runOnJobDetailPage()
    return
  }

  if (pageType === "chat") {
    runOnChatPage()
  }
}

main()
