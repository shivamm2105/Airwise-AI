# AirWise AI — Final Functional, Coverage & Cross-Browser QA Report

**Project:** AirWise AI — PromptWars Virtual Challenge 6  
**Automated Test Runner:** Vitest `v5.1.2` + `@vitest/coverage-v8@5.1.2` + `@testing-library/react` + `axe-core`  
**Live Browser Automation:** Headless Google Chrome & Microsoft Edge (`puppeteer-core`)

---

## 1. Automated Vitest Suite Results

- **Suites Passed:** **12 / 12 (`100%`)**
- **Tests Passed:** **83 / 83 (`0` failed, `0` skipped)**
- **Duration:** `11.91s` *(using `@vitest-environment node` on pure backend/shared suites for speed & zero clean-log noise)*
- **Enforced V8 Thresholds (`vitest.config.ts`):** `statements >= 90%`, `branches >= 82%`, `functions >= 88%`, `lines >= 90%` — **ALL PASSED**.

| Suite File | Env | Tests | Status | Verified Functionality & Edge Cases |
| :--- | :---: | :---: | :---: | :--- |
| `tests/unit/aqi-classification.test.ts` | `node` | 15 | Passed | US EPA & India CPCB thresholds, negative/non-finite clamping |
| `tests/unit/environmental-data-integrity.test.ts` | `node` | 9 | Passed | Open-Meteo geocoding errors/empty queries, GMT parsing, invalid timestamps, PM2.5 US_AQI fallback, missing current observations error, abort recovery, cache hit & stale SWR, concurrent coalescing |
| `tests/unit/gemini-resilience-and-security.test.ts` | `node` | 6 | Passed | `systemInstruction` isolation, `<UNTRUSTED_USER_QUERY>` fencing, injection directive filtering, script/secret stripping, unsafe exercise override notice, empty output + `503` cascade, `401` fast-fail, `429`/timeout fallback, schema-invalid/malformed JSON recovery |
| `tests/unit/services-and-resilience.test.ts` | `node` | 8 | Passed | `CacheService` TTL/eviction, async write-queued `StorageService` CRUD + nested dir creation, corrupted JSON recovery, Windows NTFS `EPERM` fallback, 15-way concurrent async write/toggle race safety |
| `tests/unit/schemas-and-validation.test.ts` | `node` | 8 | Passed | Zod v4 validation, coordinate limits, `:id` regex, `mergeHouseholdPreferences` |
| `tests/unit/safety-rules.test.ts` | `node` | 5 | Passed | Smog alert escalation, moderate/sensitive/hazardous ventilation, N95, ozone/houseplant warnings |
| `tests/unit/impact-engine.test.ts` | `node` | 4 | Passed | All 8 dual exposure vs emission impact profiles, commute DEFRA/IPCC math, `shared/indoorGuidance.ts` CADR sizing & finite clamping |
| `tests/unit/client-api-and-providers.test.ts` | `jsdom` | 3 | Passed | `ProviderFactory` routing, `api.ts` endpoints, non-JSON error handling, `AbortError` isolation, `primeDefaultAirQuality` |
| `tests/integration/api-endpoints.test.ts` | `node` | 10 | Passed | `/api/health`, `/robots.txt`, `/favicon.ico`, `/api/*` 404, air-quality coords/city/404/400, daily-plan, impact, chat, saved-actions CRUD, `403` untrusted cross-origin write block, `VERCEL_URL` & localhost cloud prod CORS guard, `500` secret redaction, rate-limit headers |
| `tests/component/ui-components.test.tsx` | `jsdom` | 5 | Passed | All 7 `AQIBadge` severities, `ForecastChart` SVG bars + empty/null/invalid points, `PollutantCard`, `SafetyAlertBanner`, `ImpactCard` |
| `tests/component/pages-accessibility.test.tsx` | `jsdom` | 9 | Passed | Full interactive & error coverage across all 9 pages, `LocationModal` geo grant/deny/timeout/search, `CommunityBriefingCard` clipboard & error, lazy `App` navigation + initial fetch retry, plus zero `axe-core` WCAG violations |
| `tests/e2e/workflow.test.ts` | `node` | 1 | Passed | Complete multi-step API journey: search -> AQI -> plan -> async save -> toggle -> JSON export |

---

## 2. AST-Based V8 Coverage Summary (`npm run test:coverage`)

*(Pure TypeScript interface files `shared/types.ts` and `server/src/providers/AirQualityProvider.ts`, plus `main.tsx` bootstrap remain excluded in `vitest.config.ts`; `server/src/index.ts` is directly covered by integration tests.)*

| Directory / Module | % Stmts | % Branch | % Funcs | % Lines |
| :--- | :---: | :---: | :---: | :---: |
| **`All files`** | **93.31%** | **82.70%** | **93.82%** | **94.19%** |
| `shared/` (`impact`, `indoorGuidance`, `preferences`, `safetyRules`, `schemas`) | **99.13%** | **93.93%** | **100.00%** | **100.00%** |
| `server/src/services/` (`AirQuality`, `Cache`, `DeterministicGuidance`, `GeminiGuardrails`, `Gemini`, `Storage`) | **94.05%** | **86.18%** | **94.82%** | **94.07%** |
| `server/src/middleware/` (`errorHandler`, `rateLimiter`, `security`) | **96.49%** | **81.15%** | **100.00%** | **98.21%** |
| `server/src/providers/` | **92.48%** | **76.02%** | **93.75%** | **93.29%** |
| `server/src/controllers/` | **87.09%** | **90.00%** | **100.00%** | **86.95%** |
| `client/src/App.tsx` | **97.22%** | **88.57%** | **96.66%** | **100.00%** |
| `client/src/components/` | **95.78%** | **88.17%** | **95.23%** | **97.76%** |
| `client/src/services/api.ts` | **95.45%** | **87.80%** | **100.00%** | **95.23%** |
| `client/src/pages/` | **91.39%** | **78.91%** | **90.99%** | **92.92%** |

---

## 3. Live End-to-End Browser & Cross-Viewport Verification

Executed directly against the compiled production server (`node dist/server/server/src/index.js`) with live `.env` credentials (`AIR_QUALITY_PROVIDER=open-meteo`, live Google Gemini API, strict `style-src 'self'` CSP active) in **both Google Chrome and Microsoft Edge** (and also verified cleanly against `https://airwiseaibot.vercel.app/`):

- All 10 interactive user workflows passed live in Google Chrome (`Dashboard` CAMS `liveOpenMeteo=true`, `LocationModal` London `US_AQI` -> New Delhi `CPCB_AQI` + `Escape`, `LandingPage`, `DailyPlanPage` + Save, live `GEMINI-3.5-FLASH-LITE` `AssistantPage` + Reset, `IndoorGuidePage` CADR + Save, `SustainablePlannerPage` Bicycle `Health Safety Guardrail` + Public Transit commit, `ImpactExplainerPage`, `FamilyCommunityPage` save, `SavedActionsPage` toggle/filter/inline `Clear All` confirm).
- All 8 responsive viewports (`320x568`, `375x667`, `390x844`, `430x932`, `768x1024`, `1366x768`, `1440x900`, `1920x1080`) passed in both **Google Chrome** and **Microsoft Edge** with **`0 px` horizontal overflow**, **`0` console errors** (confirming zero CSP violations under `style-src 'self'`), **`0` page errors**, and **`0` failed HTTP requests**.
