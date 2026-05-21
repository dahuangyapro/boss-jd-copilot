/**
 * DOM 探针工具：给浮层"探针模式"用，定位 Boss 页面任意元素的 CSS 选择器与内容预览。
 *
 * 背景：Boss 直聘的反调试不仅会塞 `debugger`，还会直接关页面或弹"控制台已开"对话框，
 * 导致正常的 F12 → Elements 流程不可用。这里把"检查元素"做进扩展自己：
 * 进入探针模式后 hover 任意元素，浮层显示选择器/HTML 片段，便于扩 lib/boss/dom-*.ts 的选择器。
 */

const HIGHLIGHT_ATTR = "data-boss-copilot-probe-hover"
const STYLE_ID = "boss-copilot-probe-style"

export type ProbedInfo = {
  selector: string
  tag: string
  className: string
  text: string
  outerHtml: string
}

/** 注入"鼠标命中元素加蓝框 + crosshair"的全局样式 */
export const addProbeStyles = () => {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = `
    [${HIGHLIGHT_ATTR}] {
      outline: 2px solid #0ea5e9 !important;
      outline-offset: 1px !important;
      cursor: crosshair !important;
    }
  `
  document.head.appendChild(style)
}

export const removeProbeStyles = () => {
  document.getElementById(STYLE_ID)?.remove()
}

/** 把高亮 attr 从老元素摘下、贴到新元素；传 null 即全部清除 */
export const setHover = (el: Element | null) => {
  document.querySelectorAll(`[${HIGHLIGHT_ATTR}]`).forEach((n) => {
    n.removeAttribute(HIGHLIGHT_ATTR)
  })
  if (el) el.setAttribute(HIGHLIGHT_ATTR, "")
}

/**
 * 生成可读的 CSS 路径（最多 5 级）。优先用 id；class 取前 2 个；不追加 nth-child
 * 保持可读——目的是给人看，给 dom-*.ts 的选择器列表挑灵感，不是要全局唯一。
 */
export const getCssPath = (el: Element): string => {
  const path: string[] = []
  let cur: Element | null = el
  let depth = 0
  while (cur && cur !== document.documentElement && depth < 5) {
    if (cur.id) {
      path.unshift(`#${cur.id}`)
      break
    }
    let sel = cur.tagName.toLowerCase()
    const classes = Array.from(cur.classList)
    if (classes.length) {
      sel += "." + classes.slice(0, 2).join(".")
    }
    path.unshift(sel)
    cur = cur.parentElement
    depth++
  }
  return path.join(" > ")
}

const getTextPreview = (el: Element, max = 80): string => {
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim()
  return text.length > max ? text.slice(0, max) + "…" : text
}

const truncateHtml = (html: string, max = 400): string =>
  html.length > max ? html.slice(0, max) + "…" : html

export const inspectElement = (el: Element): ProbedInfo => ({
  selector: getCssPath(el),
  tag: el.tagName.toLowerCase(),
  className: Array.from(el.classList).join(" "),
  text: getTextPreview(el),
  outerHtml: truncateHtml(el.outerHTML)
})
