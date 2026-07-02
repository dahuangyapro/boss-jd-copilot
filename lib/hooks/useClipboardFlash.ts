import { useCallback, useState } from "react"

/** 写入剪贴板后短暂显示「已复制」反馈 */
export const useClipboardFlash = (durationMs = 1800) => {
  const [flashed, setFlashed] = useState(false)

  const flash = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text)
        setFlashed(true)
        setTimeout(() => setFlashed(false), durationMs)
        return true
      } catch {
        setFlashed(false)
        return false
      }
    },
    [durationMs]
  )

  const reset = useCallback(() => setFlashed(false), [])

  return { flashed, flash, reset }
}
