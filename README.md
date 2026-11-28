# AirWise AI — Your Intelligent Air Quality & Healthy Living Companion

> **PromptWars Virtual Challenge 6 | Production-Ready GenAI Application**  
> *Tagline: Breathe Smarter. Live Healthier. Choose Greener.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue.svg)](tsconfig.json)
[![Tests: 83 Passed | 94% Lines](https://img.shields.io/badge/Tests-83%2F83%20Passing%20%2894%25%20Lines%29-emerald.svg)](tests/)
[![Lighthouse: 100/100](https://img.shields.io/badge/Lighthouse-100%2F100%20Desktop%20%26%20Mobile-brightgreen.svg)](docs/FINAL_LIGHTHOUSE_REPORT.md)
[![WCAG: 2.2 AA](https://img.shields.io/badge/Accessibility-WCAG%202.2%20AA-teal.svg)](docs/ACCESSIBILITY_AUDIT.md)
[![Repo Size: < 0.85 MB](https://img.shields.io/badge/Repo%20Size-%3C0.85%20MB%20%28%3C8MB%20target%29-brightgreen.svg)](scripts/size-audit.js)

---

## 1. Executive Summary & Challenge Alignment

**AirWise AI** is a production-grade personal environmental intelligence assistant engineered for families and communities navigating severe winter smog and urban air pollution.

Unlike typical static dashboards or speculative AI wrappers, AirWise AI enforces strict scientific integrity by combining:
1. **Verified Real-Time Atmospheric Data**: Copernicus Atmosphere Monitoring Service (CAMS) & Open-Meteo Air Quality ingestion covering PM2.5, PM10, NO2, SO2, O3, and CO, with regional standards (US EPA AQI and Indian CPCB NAQI).
2. **Deterministic Public Health Safety Rules**: Hardcoded clinical safety guardrails (N95 respirator mandates, window sealing during temperature inversion, and cancellation of outdoor exercise during hazardous AQI) that cannot be bypassed by language model hallucinations.
3. **Evidence-Grounded Generative AI**: Google Gemini integration using the official `@google/genai` SDK, producing personalized daily action plans, smart commute alternatives, and indoor clean air guidance.
4. **Dual Direct Impact Engine**: Strict scientific distinction between **Personal Exposure Shielding** (protecting your own lungs) and **Environmental Emission Abatement** (reducing citywide source pollution), complete with transparent methodologies, assumptions, and uncertainty disclosures.

---

## 2. Key Capabilities & Feature Modules

### A. Real-Time Air Quality Dashboard
- Displays AQI with official regional standard identification (`US_AQI` or `CPCB_AQI`).
- Criteria pollutant cards for PM2.5, PM10, NO2, SO2, O3, and CO with WHO 24-hour benchmark references.
- **Zero Hallucination Policy**: If a pollutant is not reported by a station, it remains `null` ("Not Reported") rather than fabricating a fake zero reading.
- Interactive 24-hour forecast trend chart illustrating daily morning and evening traffic pollution spikes.

### B. Personalized Low-Emission Daily Routines
- Time-bracketed schedules for **Morning**, **Commute**, **Workplace/School**, **Indoor Air**, **Cooking**, and **Evening**.
- Step-by-step practical implementation guidelines, expected benefits, and dual impact analysis.
- One-click saving to local persistence checklist.

### C. Conversational GenAI Assistant
- Interactive assistant grounded in verified environmental readings and household context.
- Fast prompt suggestion pills for immediate safety queries (e.g. "Is it suitable to run outdoors today?", "How should I plan my commute with current smog?").
- Fully resilient with deterministic rule-based fallback mode if API keys are absent or quota is exceeded.

### D. Indoor Air Quality & Clean Air Zone Guide
- Interactive appliance sizing tool calculating target Clean Air Delivery Rate (CADR in CFM and m³/h) for your room square footage.
- Outdoor-aware ventilation protocol (open windows during clean windows; seal windows during winter smog peaks).
- Critical safety warnings: Explicit warnings against harmful ozone generators and scientific clarification of the houseplant filtration myth.
- Transparency notice clarifying that without a dedicated indoor sensor, indoor readings are not fabricated.

### E. Sustainable Living & Clean Commute Planner
- Interactive clean commute calculator computing avoided tailpipe CO2e (kg) and exhaust PM2.5 (g) per trip.
- Strict safety guardrail: Prohibits recommending cycling or running when outdoor AQI is Unhealthy or Hazardous.
- Zero engine idling guide and errand trip-chaining recommendations.

### F. Direct Impact Explainer Engine
- Dedicated deep-dive tool differentiating **Category A: Personal Exposure Benefit** (biological lung shielding) from **Category B: Environmental Emission Benefit** (source reduction).
- Transparent documented assumptions, emission factors (IPCC / DEFRA), and stated uncertainty ranges (±25%).

### G. Family & Community Protection Mode
- Household demographic preferences (children under 14, elderly 65+, respiratory sensitivities).
- School playground protocols and classroom air hygiene guidelines.
- Shareable privacy-safe community air quality text briefings for resident associations and parent messaging groups without exposing home GPS coordinates.

### H. Persistent Action Checklist & Summary Export
- Interactive checklist to track and complete saved daily routines.
- Overall completion progress meter.
- Complete summary report export in JSON format for personal records.

---

## 3. Technology Stack & Architecture

```
airwise-ai/
├── client/                     # Frontend Application (React 18 + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Accessible UI components (AQIBadge, PollutantCard, etc.)
│   │   ├── pages/              # 9 dedicated feature pages
│   │   ├── services/           # Typed API service client
│   │   └── types/              # Frontend types
│   ├── index.html              # Accessible HTML5 template
│   └── vite.config.ts          # Vite build configuration
├── server/                     # Backend API Server (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── controllers/        # Request handling and controller orchestration
│   │   ├── middleware/         # Helmet CSP, CORS, rate limiting, and error handler
│   │   ├── providers/          # Open-Meteo & Demo air quality provider abstraction
│   │   ├── routes/             # RESTful API route definitions
│   │   ├── services/           # GeminiService, GeminiGuardrails, AirQualityService, Storage
│   │   └── index.ts            # Server entrypoint and rate-limited SPA hosting
│   └── tsconfig.json           # Server TypeScript configuration
├── shared/                     # Universal Domain Code & Contracts
│   ├── types.ts                # Domain interfaces and type contracts
│   ├── preferences.ts          # Pure-TS preference defaults & merge helpers
│   ├── indoorGuidance.ts       # Pure CADR sizing & indoor hygiene constants
│   ├── schemas.ts              # Zod v4 validation schemas
│   ├── safetyRules.ts          # Deterministic safety rules and CPCB/US AQI engine
│   └── impact.ts               # Direct impact calculations and methodologies
├── tests/                      # Multi-Tier Automated Test Suite (Vitest)
│   ├── unit/                   # AQI, safety rules, impact, and schema tests
│   ├── integration/            # Supertest Express API endpoint integration tests
│   ├── component/              # React Testing Library component tests
│   └── e2e/                    # Complete end-to-end user journey test
├── docs/                       # Final Release Audits & Competition Reports
│   ├── FINAL_COMPETITION_SCORECARD.md  # Official baseline vs post-release evaluation
│   ├── FINAL_RELEASE_AUDIT.md          # Complete forensic optimization & cleanup log
│   ├── FINAL_LIGHTHOUSE_REPORT.md      # Mobile & Desktop Lighthouse audit records
│   ├── FINAL_FUNCTIONAL_TEST_REPORT.md # Vitest, V8 coverage & Chrome/Edge E2E QA
│   ├── FINAL_SECURITY_REPORT.md        # Threat model, CORS/CSP, audit & history scan
│   ├── SUBMISSION_CHECKLIST.md         # 8-step evaluator demonstration walkthrough
│   ├── ARCHITECTURE.md                 # System design & component architecture
│   └── PROBLEM_ALIGNMENT.md            # Challenge 6 traceability matrix
├── scripts/
│   └── size-audit.js           # Automated repository size & secret scanning script
├── .env.example                # Environment variables template
├── .gitignore                  # Git exclusions (no node_modules, dist, or secrets)
└── package.json                # Root package configuration and scripts
```

---

## 4. Getting Started & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher (Tested and verified on Node.js v24.12.0)
- **npm**: v9.0.0 or higher (Tested and verified on npm v11.6.2)

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd airwise-ai
npm install
```

### 2. Configure Environment Variables
Copy the example environment configuration:
```bash
cp .env.example .env
```
Edit `.env` as needed:
```ini
PORT=3001
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
AIR_QUALITY_PROVIDER=open-meteo

# Optional: Add Google Gemini API key for live LLM synthesis.
# If left blank, AirWise AI automatically operates in deterministic
# evidence-aware rule engine mode without failing.
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
```

---

## 5. Development & Build Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| **Full Development** | `npm run dev` | Concurrently starts the Express backend (port 3001) and Vite frontend (port 5173). |
| **Server Dev** | `npm run dev:server` | Starts backend in watch mode via `tsx`. |
| **Client Dev** | `npm run dev:client` | Starts Vite development server with API proxying. |
| **Typecheck** | `npm run typecheck` | Strictly typechecks root, shared, server, and client code. |
| **Linting** | `npm run lint` | Runs ESLint 9 (`no-explicit-any`, React Hooks, JSX-A11y) across all files. |
| **Automated Tests** | `npm test` | Runs the complete 83-test multi-tier suite across 12 Vitest suites. |
| **Coverage Report** | `npm run test:coverage` | Runs all 12 Vitest suites enforcing V8 coverage thresholds (`>93%` stmts, `>94%` lines). |
| **Production Build**| `npm run build` | Compiles code-split client (`dist/client`) and server (`dist/server`). |
| **Start Production**| `npm start` | Launches compiled gzip-compressed Express server hosting static client files. |
| **Size Audit** | `npm run size-audit` | Audits repository size and scans file contents for secret patterns. |

---

## 6. Verified Automated Test Results

The consolidated multi-tier test suite passes with **100% success** (**83 tests passing across 12 suites**, **0 failures**, **0 skipped**, **`93.31%` Statements / `94.19%` Lines / `93.82%` Functions / `82.70%` Branches** via V8 AST coverage, plus live Google Chrome & Microsoft Edge E2E verification across 8 responsive viewports):

- `tests/unit/` (8 suites, 58 tests): AQI breakpoints, safety rules, dual impact math, indoor CADR math, Zod v4 schemas, Open-Meteo UTC/clamping/geocoding/cache, Gemini resilience & injection defense, async serialized NTFS-safe storage, client API wrapper.
- `tests/integration/api-endpoints.test.ts` (10 tests): Express API contracts, CORS origin + state-changing write protections (`403`), `/robots.txt`, `/favicon.ico`, rate limiting headers, parameter validation, 500 secret redaction.
- `tests/component/` (2 suites, 14 tests): UI components across all 7 AQI severity states, SVG ForecastChart, all 9 pages, LocationModal flows, keyboard accessibility, and automated `axe-core` WCAG verification.
- `tests/e2e/workflow.test.ts` (1 test): Full multi-step API journey.

---

## 7. Security, Privacy & Compliance Highlights

- **Server-Side API Keys**: API credentials never leak to the client bundle (`0` matches in built JS).
- **Zero Known Vulnerabilities**: Both `npm audit` and `npm audit --omit=dev --offline` report `found 0 vulnerabilities`.
- **Strict Validation, Inline-Free CSP & Headers**: Route payloads validated via Zod v4; production CORS explicitly scoped + blocks untrusted cross-origin writes (`403`); Express Helmet + `vercel.json` enforce inline-style-free CSP (`style-src 'self'`, `script-src 'self'`, `object-src 'none'`), HSTS, and static rate limiting (`staticRateLimiter`).
- **Repository Under 1 MB**: Source footprint `< 0.85 MB`, well below the 8 MB safety target and 10 MB competition ceiling.
- **Accessibility**: WCAG 2.2 Level AA verified via ESLint `jsx-a11y`, `axe-core`, and `100/100` Lighthouse Accessibility on Mobile & Desktop.

---

## 8. License

Distributed under the MIT License. Developed for **PromptWars Virtual Challenge 6**.

