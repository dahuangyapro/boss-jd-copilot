import { useCallback, useEffect, useState } from "react"

import { getJobKey, type ExtractedJob } from "~lib/boss/dom-job-detail"
import { triggerListChatJump } from "~lib/boss/list-startchat"
import type { JobDetailPageType } from "~lib/boss/pages"
import { fillStartchatTextarea } from "~lib/boss/startchat-dialog"
import { useClipboardFlash } from "~lib/hooks/useClipboardFlash"
import type { GreetingState } from "~lib/hooks/useGreetingGeneration"

export type FillState =
  | { kind: "idle" }
  | { kind: "filling" }
  | { kind: "filled" }
  | { kind: "error"; message: string }

export const useGreetingActions = ({
  job,
  pageType,
  greeting
}: {
  job: ExtractedJob | null
  pageType: JobDetailPageType
  greeting: GreetingState
}) => {
  const jobKey = job ? getJobKey(job) : null
  const [fill, setFill] = useState<FillState>({ kind: "idle" })
  const {
    flashed: copied,
    flash: flashCopy,
    reset: resetCopyFlash
  } = useClipboardFlash()
  const { flashed: jdCopied, flash: flashJdCopy } = useClipboardFlash()

  useEffect(() => {
    setFill({ kind: "idle" })
  }, [jobKey])

  useEffect(() => {
    if (greeting.kind === "loading") resetCopyFlash()
  }, [greeting, resetCopyFlash])

  const copy = useCallback(async () => {
    if (greeting.kind !== "ready") return
    await flashCopy(greeting.text)
  }, [greeting, flashCopy])

  const copyJd = useCallback(async () => {
    if (!job) return
    const payload = [
      `【职位】${job.title || "—"}`,
      `【公司】${job.company || "—"}`,
      "",
      "【JD】",
      job.jdText
    ].join("\n")
    await flashJdCopy(payload)
  }, [job, flashJdCopy])

  const fillToChat = useCallback(async () => {
    if (greeting.kind !== "ready") return
    setFill({ kind: "filling" })
    const result =
      pageType === "job_recommend"
        ? await triggerListChatJump()
        : await fillStartchatTextarea(greeting.text)
    if (result.ok === false) {
      setFill({ kind: "error", message: result.reason })
      return
    }
    setFill({ kind: "filled" })
    setTimeout(() => {
      setFill((cur) => (cur.kind === "filled" ? { kind: "idle" } : cur))
    }, 2000)
  }, [greeting, pageType])

  return { fill, copied, jdCopied, copy, copyJd, fillToChat }
}
