# AirWise AI — Final Security, Privacy & Integrity Report

**Project:** AirWise AI — PromptWars Virtual Challenge 6  
**Previous Official Security Score:** `99 / 100`  
**Audit Scope:** Credentials, Git History, Build Artifacts, CORS, CSP/Helmet, Edge Headers, Rate Limiting, Input/Output Validation, Prompt Injection Defense, Dependency CVEs, Location & Health Privacy

---

## 1. Security Controls Verified & Hardened

| Control Domain | Implementation & Hardening Details | Verification Evidence |
| :--- | :--- | :--- |
| **API Credential Isolation** | `GEMINI_API_KEY` consumed exclusively in Node backend (`server/src/services/GeminiService.ts`). Never exposed with `VITE_*` prefix or client env. | Built JS regex scan across `dist/client/assets/*.js`: **`0` matches** for `GEMINI_API_KEY`, `AIza*`, or `AQ.*`. |
| **Git History & Working Tree Secret Scan** | `.env` excluded in `.gitignore`. `scripts/size-audit.js` upgraded from filename-only check to full content pattern scanning across tracked & non-ignored workspace files. | `node scripts/size-audit.js`: **`0` credential files or secret patterns across 92 files**. `git log --all` confirmed zero `.env` commits and zero `AIza*` / private keys in history (`GEMINI_API_KEY=` appeared solely in `.env.example` template). |
| **Production CORS Allowlist** | Replaced wildcard `*.vercel.app` regex in [security.ts](file:///d:/challenge6/server/src/middleware/security.ts) with strict `isOriginAllowed(origin)` verifying explicit `CLIENT_ORIGIN`, Vercel deployment host variables, `https://airwiseaibot.vercel.app`, and non-cloud `localhost`. | Integration test in `tests/integration/api-endpoints.test.ts` verified rejection (`undefined` ACAO header) of untrusted external `.vercel.app` origins while permitting trusted origins. |
| **CSP & HTTP Security Headers (Server + Vercel Edge)** | Tightened Express `helmetMiddleware` CSP (`default-src 'self'`, `script-src 'self'`, `connect-src` scoped strictly to `'self'` and Open-Meteo/Geocoding endpoints, removed orphaned `fonts.googleapis.com` / `fonts.gstatic.com`). Added equivalent HTTP security headers (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `/assets/*` immutable caching) to [vercel.json](file:///d:/challenge6/vercel.json) for CDN static routes. | Express integration tests confirmed `X-Powered-By` disabled and CSP headers enforced cleanly. |
| **Prompt Injection Defense & AI Output Validation** | [GeminiService.ts](file:///d:/challenge6/server/src/services/GeminiService.ts) isolates trusted rules via `@google/genai` `config.systemInstruction`, fences user messages in `<UNTRUSTED_USER_QUERY>`, strips control characters & injection markers, enforces 8.5s per-attempt `AbortController` timeouts + `401`/`403` fast-fail, validates AI plans at runtime using Zod `GeminiDailyPlanOutputSchema`, strips HTML tags & secret patterns (`sanitizeTextOutput`), and applies deterministic safety rule overrides. | Verified in `tests/unit/gemini-resilience-and-security.test.ts` (`6` targeted adversarial & resilience tests). |
| **Request Size Limits, Rate Limiting & Route Param Validation** | `express.json({ limit: '200kb' })`; `trust proxy: 1`; `apiRateLimiter` (120/15m) applied to `/air-quality/*`, `/recommendations/*`, `/saved-actions*`, and `/preferences`; `aiRateLimiter` (40/15m) on `/chat`; Zod v4 schemas across all routes + `SavedActionIdParamSchema` (`^[a-zA-Z0-9_-]+$`) on `:id` params. | Integration tests verified HTTP `400` rejection on malformed JSON, NaN/out-of-range coordinates, invalid action IDs, and oversized/malformed bodies without internal stack traces. |
| **Dependency Security (`npm audit`)** | Upgraded `zod` (`^4.6.7`), `vitest` (`5.1.2`), `@vitest/coverage-v8` (`5.1.2`), and `@testing-library/jest-dom` (`@latest`); added official `compression` (`^1.8.2`); removed 37 unused packages (`recharts`, `clsx`, `tailwind-merge`). | Both `npm audit` (all 578 packages) and `npm audit --omit=dev --offline` report **`found 0 vulnerabilities`**. |
| **Data Minimization & Location Privacy** | No personal names, medical diagnoses, account auth tokens, or analytics trackers collected. Browser geolocation runs strictly on explicit user trigger (`LocationModal.tsx`), with manual city selection always available. | Inspected `HouseholdPreferencesSchema`, `SavedActionInputSchema`, `FamilyCommunityPage.tsx` share briefing text. |

---

## 2. Residual Architectural Disclosures

1. **Serverless Storage Ephemerality:** On Vercel serverless deployment, local file persistence falls back to `/tmp/airwise-store.json` (scoped to warm function containers), which is non-permanent across cold restarts unless backed by an external database. Local storage contains non-PII action checklists and household preference flags only.
2. **Inline Styles in CSP (`style-src 'self' 'unsafe-inline'`):** Retained conservatively to support Tailwind base/dynamic bar width styles (`style={{ height, width }}`); `script-src` remains strictly `'self'` with zero inline scripts and zero `dangerouslySetInnerHTML`.
