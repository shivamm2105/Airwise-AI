# AirWise AI — Final Functional, Coverage & Cross-Browser QA Report

**Project:** AirWise AI — PromptWars Virtual Challenge 6  
**Automated Test Runner:** Vitest `v5.1.2` + `@vitest/coverage-v8@5.1.2` + `@testing-library/react` + `axe-core`  
**Live Browser Automation:** Headless Google Chrome & Microsoft Edge (`puppeteer-core`)  

---

## 1. Automated Vitest Suite Results

- **Suites Passed:** **12 / 12 (`100%`)**
- **Tests Passed:** **97 / 97 (`0` failed, `0` skipped)**
- **Duration:** `14.28s`
- **Test Isolation:** Unit, integration, component, and E2E suites clear `GEMINI_API_KEY`, use controlled service mocks for offline determinism, and isolate writes to PID-scoped `server/data/airwise-test-store-${process.pid}.json` with teardown cleanup.

| Suite File | Type | Tests | Status | Verified Functionality & Edge Cases |
| :--- | :--- | :---: | :---: | :--- |
| `tests/unit/aqi-classification.test.ts` | Unit | 15 | Passed | US EPA & India CPCB thresholds, negative and non-finite AQI safety clamping |
| `tests/unit/safety-rules.test.ts` | Unit | 6 | Passed | Smog alert escalation, vulnerable household triggers, `isIndiaLocation` |
| `tests/unit/impact-engine.test.ts` | Unit | 5 | Passed | Personal Exposure vs Environmental Emission separation, DEFRA/IPCC commute math |
| `tests/unit/schemas-and-validation.test.ts` | Unit | 8 | Passed | Zod v4 validation schemas, `.finite()` bounds, `:id` regex, `mergeHouseholdPreferences` |
| `tests/unit/environmental-data-integrity.test.ts` | Unit | 10 | Passed | 2024 US EPA & CPCB PM2.5/PM10 breakpoints, `timezone=GMT` UTC parsing, negative value rejection, HTTP `502` & abort recovery, fake-timer cache expiry, in-flight request coalescing |
| `tests/unit/gemini-resilience-and-security.test.ts` | Unit / Security | 6 | Passed | `systemInstruction` isolation, `<UNTRUSTED_USER_QUERY>` fencing, injection marker filtering, script/secret output stripping, `503` cascade, `401` fast-fail, `429` exhaustion fallback, per-attempt timeout abort, Zod invalid JSON recovery, ozone-generator vs outdoor-exercise override precision |
| `tests/unit/services-and-resilience.test.ts` | Unit | 8 | Passed | `CacheService` TTL expiry, atomic `StorageService` reload persistence, defensive cloning, 15-way concurrent write/toggle safety |
| `tests/unit/client-api-and-providers.test.ts` | Unit | 3 | Passed | `ProviderFactory` routing, `client/src/services/api.ts` endpoints, one-shot `primeDefaultAirQuality`, HTTP error & `AbortError` propagation |
| `tests/integration/api-endpoints.test.ts` | Integration | 19 | Passed | `/api/health`, `/api/air-quality/*` (coords, city geocode, search, 404 unknown city, invalid coords), `/api/chat`, `/api/recommendations/*`, `/api/saved-actions*` CRUD + 400/404s, `/api/preferences`, CORS allow/reject rules, malformed JSON 400 sanitization |
| `tests/component/ui-components.test.tsx` | Component | 6 | Passed | `AQIBadge`, `PollutantCard`, `SafetyAlertBanner`, `ForecastChart`, `ImpactCard` non-color status & missing pollutant rendering |
| `tests/component/pages-accessibility.test.tsx` | Component / WCAG | 10 | Passed | Interactive coverage across `LandingPage`, `Navbar`, `LocationModal` (geolocation denial, preset select, search & clear), `DashboardPage` (skeleton & retry), `SavedActionsPage` (toggle, filter, export, inline Clear All confirm), `SustainablePlannerPage` (alert & commit), `IndoorGuidePage` (CADR slider, toggles, save), `AssistantPage` (send & reset), `DailyPlanPage`, `FamilyCommunityPage`, `ImpactExplainerPage`, `Footer`, `App`, plus zero `axe-core` WCAG violations |
| `tests/e2e/workflow.test.ts` | E2E | 1 | Passed | Complete backend user journey: location readings -> daily plan -> save -> toggle -> impact calculation -> JSON export |

---

## 2. AST-Based V8 Coverage Summary (`vitest run --coverage`)

*(Pure TypeScript declaration/interface files `shared/types.ts` and `server/src/providers/AirQualityProvider.ts`, plus `main.tsx` / `server/src/index.ts` bootstrap entrypoints are excluded in `vitest.config.ts`.)*

| Directory / Module | % Stmts | % Branch | % Funcs | % Lines |
| :--- | :---: | :---: | :---: | :---: |
| **`All files`** | **82.10%** | **74.18%** | **77.85%** | **84.24%** |
| `shared/` (`impact`, `preferences`, `safetyRules`, `schemas`) | **93.91%** | **92.62%** | **100.00%** | **94.52%** |
| `server/src/services/` (`AirQualityService`, `CacheService`, `DeterministicGuidance`, `GeminiService`, `StorageService`) | **88.77%** | **80.55%** | **95.91%** | **88.60%** |
| `server/src/middleware/` (`errorHandler`, `rateLimiter`, `security`) | **89.13%** | **55.55%** | **100.00%** | **88.88%** |
| `server/src/controllers/` | **87.09%** | **90.00%** | **100.00%** | **86.95%** |
| `server/src/routes/api.ts` | **100.00%** | **50.00%** | **100.00%** | **100.00%** |
| `client/src/services/api.ts` | **93.10%** | **81.25%** | **94.73%** | **94.44%** |
| `client/src/constants/locations.ts` | **100.00%** | **100.00%** | **100.00%** | **100.00%** |
| `client/src/components/` | **81.31%** | **72.92%** | **90.00%** | **84.88%** |
| `client/src/pages/` | **74.13%** | **71.38%** | **68.46%** | **75.92%** |

---

## 3. Live End-to-End Browser & Cross-Viewport Verification

Executed directly against the compiled production server (`node dist/server/server/src/index.js`) with live `.env` credentials (`AIR_QUALITY_PROVIDER=open-meteo`, live Google Gemini API enabled) in **both Google Chrome and Microsoft Edge**:

### Interactive User Flows Verified Live in Chrome
1. **Live Open-Meteo / CAMS Atmospheric Ingestion**: Initial dashboard loaded real-time New Delhi readings (`Poor (CPCB)` — AQI `299`, `isDemo: false`, 6 pollutant cards, 24h forecast chart).
2. **Location Search, Standard Auto-Switch & Escape Dismissal**: Searched `"London"` via Open-Meteo Geocoding API, verified `"Search Results"` (`United Kingdom`), dismissed with `Escape`, switched to London verifying **`US AQI`**, and switched back to New Delhi **`CPCB AQI`**.
3. **Landing Page & Navigation**: Verified all hero CTAs, 6 semantic feature buttons, and return navigation.
4. **Daily Action Plan & Action Save**: Generated personalized high-smog schedule, verified deterministic alert/safety banners, saved an action via `InlineFeedbackBanner`.
5. **Live Gemini Conversational Assistant**: Submitted `"Is it suitable to go outside for a run today?"` and received live **`GEMINI-3.5-FLASH-LITE`** response grounded in AQI `299` alongside indoor safety caveats (ozone generators, incense, houseplant PM2.5 reality check), followed by functional chat `Reset`.
6. **Indoor Air Quality Guide**: Verified room area slider CADR computation, HEPA toggle, cooking arrangement selector (`gas_unvented`), and preference save persistence.
7. **Sustainable Living Planner**: Selected `"Bicycle"` during AQI `299` and verified mandatory **`Health Safety Guardrail`** banner activation; switched to `"Public Transit"`, verified avoided emissions breakdown, and committed habit to checklist.
8. **Direct Impact Explainer**: Switched between exposure-shielding and dual-impact action cases validating Category A vs Category B separation.
9. **Family & Community Protection**: Updated demographic toggles (`Children under 14`), saved household preferences, and inspected shareable neighborhood text card.
10. **Saved Actions Checklist**: Awaited persisted items, toggled completion state (`1 of 2 Completed`), exercised filter tabs (`Completed (1)`, `All`), and completed inline `Clear All` confirmation workflow.

### 8-Viewport Responsiveness & Console Audit (Chrome & Microsoft Edge)

| Viewport Tested | Chrome Overflow (`scrollWidth / innerWidth`) | Edge Overflow (`scrollWidth / innerWidth`) | Mobile Hamburger Menu (`375px`) | Console / Page / HTTP Errors |
| :--- | :---: | :---: | :---: | :---: |
| `320 x 568` (Small Mobile) | `320 / 320` (**0 px**) | `320 / 320` (**0 px**) | — | **0** |
| `375 x 667` (Mobile SE) | `375 / 375` (**0 px**) | `375 / 375` (**0 px**) | Verified Open & Close | **0** |
| `390 x 844` (Mobile Standard) | `390 / 390` (**0 px**) | `390 / 390` (**0 px**) | — | **0** |
| `430 x 932` (Large Mobile) | `430 / 430` (**0 px**) | `430 / 430` (**0 px**) | — | **0** |
| `768 x 1024` (Tablet) | `768 / 768` (**0 px**) | `768 / 768` (**0 px**) | — | **0** |
| `1366 x 768` (Laptop) | `1366 / 1366` (**0 px**) | `1366 / 1366` (**0 px**) | Desktop Navbar Active | **0** |
| `1440 x 900` (Desktop) | `1440 / 1440` (**0 px**) | `1440 / 1440` (**0 px**) | Desktop Navbar Active | **0** |
| `1920 x 1080` (Large Desktop) | `1920 / 1920` (**0 px**) | `1920 / 1920` (**0 px**) | Desktop Navbar Active | **0** |

**Runtime Errors Observed Across Entire Session:** `0` Chrome console errors, `0` Chrome page errors, `0` failed Chrome HTTP requests; `0` Edge console errors, `0` Edge page errors, `0` failed Edge HTTP requests.
