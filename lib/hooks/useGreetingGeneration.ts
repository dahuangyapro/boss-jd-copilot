import { useCallback, useEffect, useState } from "react"

import { getJobKey, type ExtractedJob } from "~lib/boss/dom-job-detail"
import { sendExtensionMessage } from "~lib/utils/extension-message"
import type {
  AnalyzeJdRequest,
  AnalyzeJdResponse,
  GenerateGreetingRequest,
  GenerateGreetingResponse
} from "~lib/messages"
import { isExtensionAlive, CONTEXT_DEAD_MSG } from "~lib/ui/boss-panel/ui"

export type GeneratePhase = "analyzing_jd" | "generating_greeting"

export type GreetingState =
  | { kind: "idle" }
  | { kind: "loading"; phase: GeneratePhase }
  | { kind: "ready"; text: string }
  | { kind: "error"; message: string }

export const useGreetingGeneration = (job: ExtractedJob | null) => {
  const [greeting, setGreeting] = useState<GreetingState>({ kind: "idle" })
  const jobKey = job ? getJobKey(job) : null

  useEffect(() => {
    setGreeting({ kind: "idle" })
  }, [jobKey])

  const generate = useCallback(async () => {
    if (!job) return
    if (!isExtensionAlive()) {
      setGreeting({ kind: "error", message: CONTEXT_DEAD_MSG })
      return
    }

    setGreeting({ kind: "loading", phase: "analyzing_jd" })
    const analyzeReq: AnalyzeJdRequest = { type: "ANALYZE_JD", job }
    const analyzeResult = await sendExtensionMessage<AnalyzeJdResponse>(
      analyzeReq
    )
    if (analyzeResult.ok === false) {
      setGreeting({ kind: "error", message: analyzeResult.error })
      return
    }

    const analyzeResp = analyzeResult.data
    if (analyzeResp.ok === false) {
      setGreeting({ kind: "error", message: analyzeResp.error })
      return
    }

    setGreeting({ kind: "loading", phase: "generating_greeting" })
    const greetReq: GenerateGreetingRequest = {
      type: "GENERATE_GREETING",
      jobKey: getJobKey(job),
      job,
      jdAnalysis: analyzeResp.analysis
    }
    const greetResult = await sendExtensionMessage<GenerateGreetingResponse>(
      greetReq
    )
    if (greetResult.ok === false) {
      setGreeting({ kind: "error", message: greetResult.error })
      return
    }

    const greetResp = greetResult.data
    if (greetResp.ok === true) {
      setGreeting({ kind: "ready", text: greetResp.greeting })
      return
    }
    if (greetResp.ok === false) {
      setGreeting({ kind: "error", message: greetResp.error })
    }
  }, [job])

  return { greeting, generate, isGenerating: greeting.kind === "loading" }
}
