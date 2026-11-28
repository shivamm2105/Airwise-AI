# AirWise AI — Final Security, Privacy & Integrity Report

**Project:** AirWise AI — PromptWars Virtual Challenge 6  
**Audit Scope:** Credentials, Git History, Build Artifacts, CORS & CSRF Write Blocking, Inline-Free CSP, Static Route Rate Limiting, Prompt Injection Defense, Dependency CVEs, Privacy

---

## 1. Security Controls Verified & Hardened

| Control Domain | Implementation & Hardening Details | Verification Evidence |
| :--- | :--- | :--- |
| **API Credential Isolation** | `GEMINI_API_KEY` consumed exclusively in Node backend (`server/src/services/GeminiService.ts`). Zero `VITE_*` secret exposure. | `npm run size-audit` + built client bundle checks confirm `0` credential strings leaked. |
| **Git History & File Content Secret Scan** | `.env` excluded in `.gitignore`; `scripts/size-audit.js` scans file contents across git-tracked and workspace files. | `npm run size-audit` scanned all tracked/workspace files with `0` violations; git history clean. |
| **Strict Origin CORS & Write Blocking** | `isOriginAllowed(origin)` excludes wildcard `*.vercel.app` and ignores localhost `CLIENT_ORIGIN` entries in Vercel cloud prod; `credentials: false`; `blockUntrustedCrossOriginWrites` returns HTTP `403` on mutating requests (`POST`/`PUT`/`PATCH`/`DELETE`) from untrusted `Origin`s. | Verified in `tests/integration/api-endpoints.test.ts` (`403` write rejection, `VERCEL_URL` handling, omitted `ACAO` on untrusted `GET`). |
| **Inline-Free Strict Production CSP & Edge Headers** | Eliminated all inline JSX `style={{}}` attributes (`ForecastChart` & `SavedActionsPage` now use clean SVG graphics) so [security.ts](file:///d:/challenge6/server/src/middleware/security.ts) (when `NODE_ENV === 'production'`) and [vercel.json](file:///d:/challenge6/vercel.json) enforce `style-src 'self'` with zero `'unsafe-inline'`, `script-src 'self'`, `img-src 'self' data:`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, `form-action 'self'`, and `Strict-Transport-Security`. | Verified live in headless Chrome & Edge under compiled production runtime with `0` console/CSP errors across all 9 pages. |
| **Comprehensive Route Rate Limiting** | `apiRateLimiter` (`120/15m`), `aiRateLimiter` (`40/15m`), and `staticRateLimiter` (`300/15m`) protect API endpoints as well as Express file-serving routes (`/robots.txt`, `/favicon.ico`, SPA fallback). | Covered by `tests/integration/api-endpoints.test.ts` and [rateLimiter.ts](file:///d:/challenge6/server/src/middleware/rateLimiter.ts). |
| **Prompt Injection Defense & AI Output Validation** | [GeminiGuardrails.ts](file:///d:/challenge6/server/src/services/GeminiGuardrails.ts) & [GeminiService.ts](file:///d:/challenge6/server/src/services/GeminiService.ts) enforce `systemInstruction` separation, `<UNTRUSTED_USER_QUERY>` fencing, directive stripping, 8.5s per-attempt aborts, Zod `GeminiDailyPlanOutputSchema` runtime parsing, HTML/secret redaction, and clinical overrides. | Verified across 6 adversarial & cascade tests in `tests/unit/gemini-resilience-and-security.test.ts`. |
| **Sanitized Error & Endpoint Hygiene** | `errorHandler.ts` redacts secret token patterns and strips internal stacks outside `development`; `savedActionsController.ts` never echoes route `:id` in 404 messages; `/api/health` omits runtime `env` disclosure. | Verified by unit & Supertest integration checks. |
| **Dependency Security (`npm audit`)** | Upgraded `zod` (`^4.6.7`), `vitest` (`5.1.2`), `@vitest/coverage-v8` (`5.1.2`), `@testing-library/jest-dom` (`@latest`), `compression` (`^1.8.2`); pruned unused `recharts`, `clsx`, `tailwind-merge`. | `npm audit --omit=dev --offline` reports **`found 0 vulnerabilities`**. |

---

## 2. Residual Architectural Disclosure

- **Serverless Storage Ephemerality:** On Vercel serverless functions, `StorageService` stores non-PII action checklists and household preference flags in container-local `/tmp/airwise-store.json`, which resets across cold starts unless connected to an external persistent database.
