# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Authoritative docs

`AGENTS.md` (Chinese) is the product/architecture spec — read it before any non-trivial change. `.cursor/rules/boss-jd-copilot.mdc` mirrors the directory tree and file-placement table. Keep both in sync when boundaries change.

## Commands

```bash
pnpm dev      # watch build → build/chrome-mv3-dev
pnpm build    # production build → build/chrome-mv3-prod
pnpm package  # zip for store submission
```

Load the extension via `chrome://extensions` → Developer mode → "Load unpacked" → pick `build/chrome-mv3-dev`. After changing `content.ts`'s `matches`, **reload the extension** in `chrome://extensions` so the new manifest takes effect.

There is no test runner, linter, or typecheck script wired into `package.json` — Plasmo handles TS compilation during build. Formatting is Prettier with `@ianvs/prettier-plugin-sort-imports` (see `.prettierrc.mjs`).

## Architecture

Plasmo + Chrome MV3 + React 18 + TypeScript. The product is a job-seeker-facing Boss直聘 extension that generates personalized greetings from a JD. **Two pages only** are injected:

| Page | URL pattern | Role |
|------|-------------|------|
| Job detail | `zhipin.com/job_detail*` | Read full JD from DOM → call AI → cache greeting in `chrome.storage.local` |
| Chat | `zhipin.com/web/geek/chat*` | Read current conversation's job name → match cache → fill input box |

The chat page typically only exposes the job title in the DOM, **not the full JD** — never try to reconstruct JD on the chat side. Match cached entries by `jobId` (if present in URL) or `职位名 + 公司名`.

Data flow:

```
job_detail page  → content script reads DOM (MutationObserver for SPA)
                 → background calls AI → writes chrome.storage.local
chat page        → content script reads job title → reads storage → fills input
```

### Module boundaries

Keep root entry files thin; business logic goes in `lib/` (imported via the `~lib/*` path alias, see `tsconfig.json`).

| File | Only does | Delegates to |
|------|-----------|--------------|
| `content.ts` | `PlasmoCSConfig.matches`, dispatch on `getPageType` | `lib/boss/*`, `contents/*` |
| `background.ts` | `onMessage`, call AI, write storage | `lib/ai/*`, `lib/storage/*` |
| `popup.tsx` | Status, link to options, dev probes | `lib/*` |
| `options.tsx` | API key & model config form | `lib/storage/*` |
| `contents/*.tsx` | Plasmo CS UI overlays inside Boss pages | `lib/*` |

**Before creating any new file, consult the placement table in `AGENTS.md` §3.2 / the `.mdc` rule.** Common slots:

- URL/page-type logic → `lib/boss/pages.ts`
- DOM extraction → `lib/boss/dom-job-detail.ts` or `dom-chat.ts`
- Storage keys & accessors → `lib/storage/`
- AI client + prompts → `lib/ai/` (called only from `background.ts`)
- Cross-context message types → `lib/messages.ts`

Forbidden: writing source under `build/` or `.plasmo/` (build outputs); injecting into Boss list pages or other URLs; embedding the AI API key in content scripts or popup (it must live in options/storage and be read by `background.ts`).

## Boss-page reality (don't fight it)

- Boss has anti-debug measures; **don't rely on `console.log` working inside `zhipin.com`** pages. Debug via `chrome.runtime.sendMessage` → Service Worker DevTools, the popup, or `chrome://extensions`.
- Prefer **reading rendered DOM** over reverse-engineering network APIs. Hooking `fetch` in MAIN world is a fallback, not the default — it breaks on Boss redesigns.
- Pages are SPAs — wrap DOM extraction in `MutationObserver` and wait for the JD container before reading.

## Conventions

- Minimum-diff changes; do not expand scope to other Boss pages or sites.
- Comments only for Boss business rules or non-obvious SPA/DOM behavior.
- The greeting is **assisted generation** — user confirms before sending; do not automate bulk messaging.
- Commits only when the user asks; never force-push `main`.
