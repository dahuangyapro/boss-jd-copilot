# Boss JD Copilot

一款帮**求职者**在 Boss 直聘 (zhipin.com) 上**针对当前 JD 一键生成个性化招呼语**的 Chrome 扩展。
不离开页面、不批量投递；让 HR 看到的是"像本人写的"，而不是"一看就是群发模板"的开场白。

## 产品定位

- **谁用**：在 Boss 直聘主动找工作的求职者。
- **解决什么问题**：不同岗位的 JD 要求不同，复制粘贴同一段招呼语显得敷衍；针对每个岗位手写又太累。
- **怎么解决**：在职位详情 / 推荐列表页注入浮层 → 抽取当前 JD → 用你配置的大模型 + 你的个人画像生成一条招呼语 → 复制到聊天页粘贴。
- **不做什么**：不做批量自动投递、不爬别人的数据、不替你点"发送"。

## 当前功能

| 模块 | 说明 |
|------|------|
| 三页注入 | `/job_detail/*`（独立详情页）、`/web/geek/jobs*`（推荐列表 + 右详情面板）、`/web/geek/chat*`（聊天页占位，自动填入待实现） |
| JD 抽取 | 内置反混淆解码，剔除 Boss 植入的隐藏类干扰字（如 "kanzhun"、"直聘"） |
| 可拖动浮层 | 右上角浮层，可拖动 / 收起 / 复制 JD / 一键生成招呼语 / 复制结果 |
| 招呼语生成 | OpenAI 兼容协议；4 种预设风格（简洁 / 详尽 / 口语 / 正式）+ 完全自定义 system prompt（可在编辑器里加载预设再改） |
| 个人画像 | 手填 textarea，或**上传 PDF 简历由 AI 自动生成**（解析后直接覆盖） |
| Provider 预设 | DeepSeek / Kimi / 智谱 GLM / 通义千问 / OpenAI / OpenRouter，也支持自定义 baseURL |

## 安装与使用

目前仅支持开发模式加载（未上架商店）。

```bash
git clone https://github.com/dahuangyapro/boss-jd-copilot.git
cd boss-jd-copilot
pnpm install
pnpm dev
```

Chrome → `chrome://extensions` → 启用「开发者模式」→ 「加载已解压的扩展程序」→ 选 `build/chrome-mv3-dev` 目录。

加载后到任意 Boss 职位页就会看到右上角浮层；首次使用先点浮层齿轮（或扩展图标右键 → 选项）填好 API Key 与个人画像即可。

> 生产打包用 `pnpm build`（产物在 `build/chrome-mv3-prod`）。改 `package.json` 的 `manifest.permissions` 或 `content.ts` 的 `matches` 后，需在 `chrome://extensions` 刷新扩展。

## 常见问题

| 现象 | 原因 / 解决 |
|------|-------------|
| 浮层没出现 | 当前页 URL 不在 3 个匹配模式里 / 扩展未启用 / Boss 页加载未完成 |
| 「扩展上下文已失效」 | 开发期重载扩展后会出现；**Ctrl+R 刷新当前 Boss 页面**即可 |
| 报 `HTTP 401` | API Key 错、过期或无权限。回选项页检查 |
| 报 `HTTP 429` | 请求过多或额度耗尽。换 provider 或等限流过去 |
| 报 `chrome.storage` undefined | manifest 缺 `storage` 权限，重新装一次依赖 + 重启 `pnpm dev` + 刷新扩展 |
| JD 抽取出 `kanzhun` / `直聘` 等字 | Boss 改版了反混淆策略，需更新 `lib/boss/dom-job-detail.ts` 的选择器或反爬逻辑 |
| 招呼语质量差 | 自我介绍写得越具体效果越好；或换更强的模型；或用自定义 prompt 加约束 |

## 技术栈

[Plasmo](https://docs.plasmo.com/) + Chrome Manifest V3 + React 18 + TypeScript + pdfjs-dist。
项目架构与目录约定见 [AGENTS.md](AGENTS.md)。

## 未来方向

非承诺，按手感推进：

- 聊天页根据缓存自动填入招呼语（v1 闭环的最后一块）
- 简历 OCR 支持扫描件 PDF
- 提示词模板库（社区分享的招呼语 prompt 一键应用）
- 流式生成（边出字边显示，提升等待体感）
- 原生 Anthropic / Google Gemini 协议适配（不走 OpenAI 兼容层）

## 隐私与免责声明

**本工具为非官方扩展，与 Boss 直聘、任何 AI 服务商均无关联。**

- 扩展**只读取**你当前打开的 Boss 页面 DOM；**不做**任何自动点击、批量发送、后台爬取或定时任务。
- 招呼语为 **AI 辅助生成**，仅在你**主动点击「生成」并复制粘贴**后才会出现在聊天框；**是否发送、发什么内容由你最终决定**。
- API Key、PDF 简历、生成的画像与招呼语**只存于本机** `chrome.storage.local`；调用大模型时**只发往你自己配置**的 endpoint。本扩展不收集、不上传任何数据到作者或第三方服务器。
- 调用大模型会消耗**你自己的 API 额度**，请按各 provider 计费规则使用。
- 若 Boss 直聘等第三方平台基于其 ToS 对你的账号采取限制措施，由你自行承担风险。建议合理使用，避免短时间高频生成。
- 代码以"按现状（as-is）"提供，不对生成内容的质量、合规性、求职效果作任何保证；**使用本扩展产生的任何直接或间接后果均由使用者自行承担**，作者及贡献者**不承担任何法律或道义责任**。下载、安装、使用本扩展即视为同意本条款。
