import { useEffect, useState } from "react"

import {
  extractJobDetail,
  observeJobDetail,
  type ExtractedJob
} from "~lib/boss/dom-job-detail"
import type { JobDetailPageType } from "~lib/boss/pages"

export const useJobDetail = (
  urlKey: string,
  pageType: JobDetailPageType
) => {
  const [job, setJob] = useState<ExtractedJob | null>(null)
  const [status, setStatus] = useState<"waiting" | "ready">("waiting")

  useEffect(() => {
    setJob(null)
    setStatus("waiting")
    const cleanup = observeJobDetail(pageType, (next) => {
      setJob(next)
      setStatus("ready")
    })
    return cleanup
  }, [urlKey, pageType])

  const reextract = () => {
    const next = extractJobDetail(pageType)
    if (next) {
      setJob(next)
      setStatus("ready")
    }
  }

  return { job, status, reextract, isWaiting: status === "waiting" || !job }
}
