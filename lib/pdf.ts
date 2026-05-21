import * as pdfjsLib from "pdfjs-dist"

/**
 * MV3 + Plasmo/Parcel：用 `url:` 前缀让 Plasmo 把 worker 文件作为静态资源打包，
 * 输出 chrome-extension://... 的 URL，并自动注册到 web_accessible_resources。
 * CSP 默认 worker-src 'self'，同源 worker 可加载。
 *
 * 早期试过 `?url` 后缀（Parcel 原生语法）— Plasmo 5 不识别会报
 * "does not export 'default'"；`url:` 前缀是 Plasmo 提供的等价机制。
 */
import workerUrl from "url:pdfjs-dist/build/pdf.worker.min.mjs"

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/** 简历常见错误：扫描件 / 加密 / 损坏 PDF — 都翻译成可读消息 */
export class PdfExtractError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | "empty"
      | "encrypted"
      | "scanned_image"
      | "parse_failure"
  ) {
    super(message)
    this.name = "PdfExtractError"
  }
}

export const extractPdfText = async (file: File): Promise<string> => {
  const data = await file.arrayBuffer()

  let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/password|encrypt/i.test(msg)) {
      throw new PdfExtractError(
        "PDF 已加密，请提供未加密的版本",
        "encrypted"
      )
    }
    throw new PdfExtractError(`PDF 解析失败：${msg}`, "parse_failure")
  }

  const parts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      // pdfjs 把每个文本块拆成 TextItem；只取有 str 字段的，把 TextMarkedContent 过滤掉
      .map((it) => ("str" in it ? it.str : ""))
      .filter(Boolean)
      .join(" ")
    if (pageText.trim()) parts.push(pageText)
  }

  const full = parts.join("\n\n").trim()
  if (!full) {
    throw new PdfExtractError(
      "PDF 中没有可提取的文字——可能是扫描件/纯图片版。请用文字版简历重试。",
      "scanned_image"
    )
  }
  return full
}
