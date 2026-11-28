# AirWise AI — System Architecture & Technical Design

## 1. System Overview

**AirWise AI** is an intelligent urban air quality and healthy living assistant developed for **PromptWars Virtual Challenge 6**. The application transforms complex atmospheric measurements into actionable, personalized daily routines, combining verified environmental monitoring data, deterministic public health safety rules, and Generative AI (Google Gemini via `@google/genai`).

```
+-----------------------------------------------------------------------------------+
|                                  USER / CLIENT                                    |
|  - React 18 + Vite + Tailwind CSS + Lucide Icons + Lightweight SVG Visualizations |
|  - WCAG 2.2 AA Accessible UI (No color-only indicators, screen-reader semantics)   |
|  - Strict inline-style-free rendering compatible with `style-src 'self'` CSP      |
+----------------------------------------+------------------------------------------+
                                         | REST / JSON
                                         v
+-----------------------------------------------------------------------------------+
|                             AIRWISE EXPRESS SERVER                                |
|  - Security: Strict Helmet CSP (`style-src 'self'`), Origin CORS + write block,   |
|              API/AI/static rate limiting, Zod v4 input & param validation         |
|  - Compression (`compression`) & production-safe sanitized error handling         |
+-------------------+--------------------+--------------------+---------------------+
                    |                    |                    |
                    v                    v                    v
      +-----------------------------+  +--------------------+  +--------------------+
      |    AIR QUALITY SERVICE      |  | DETERMINISTIC      |  | GENAI SERVICE      |
      | - In-Memory Cache (TTL: 15m)|  | SAFETY & IMPACT    |  | - Official SDK     |
      | - In-Flight Deduplication   |  | - Official US EPA  |  |   (@google/genai)  |
      | - Stale-While-Revalidate    |  |   & CPCB NAQI      |  | - Multi-Model      |
      | - Open-Meteo & CAMS Provider|  | - Smog & N95 Rules |  |   Cascade & Abort  |
      | - Zero Pollutant Hallucinate|  | - Exposure vs CO2  |  | - GeminiGuardrails |
      +-----------------------------+  +--------------------+  +--------------------+
```

---

## 2. Layered Architecture & Separation of Concerns

### A. Shared Domain Layer (`shared/`)
Pure TypeScript contracts, domain models, and deterministic engines shared across client and server:
- `types.ts`: Universal interfaces for `AirQualityData`, `PollutantMeasurements`, `SafetyEvaluation`, `ImpactAssessment`, `HouseholdPreferences`, and `RecommendationActionItem`.
- `preferences.ts`: Pure-TS default preference builder keeping Zod out of frontend bundles.
- `indoorGuidance.ts`: Pure CADR room sizing math (4 ACH benchmark) and type guards for cooking setups.
- `schemas.ts`: Strict Zod v4 validation schemas for request payloads, coordinates, route IDs, and Gemini plan validation.
- `safetyRules.ts`: Table-driven US EPA & Indian CPCB NAQI breakpoints and deterministic clinical health guardrails.
- `impact.ts`: Data-driven Direct Impact Explanation Engine distinguishing Personal Exposure Shielding from Environmental Emission Abatement.

### B. Backend Services Layer (`server/src/`)
- **Providers (`providers/`)**:
  - `AirQualityProvider`: Abstract interface for environmental data ingestion.
  - `OpenMeteoProvider`: Live Copernicus CAMS & Open-Meteo ingestion with explicit GMT timezone handling, type-safe response parsing, and Geocoding lookup.
  - `DemoAirQualityProvider`: High-fidelity deterministic simulator for testing and offline demo modes.
  - `ProviderFactory`: Factory selecting active provider dynamically via environment config.
- **Services (`services/`)**:
  - `CacheService`: Bounded in-memory cache with 15-minute TTL and stale-while-revalidate metadata.
  - `AirQualityService`: Request deduplication, cache orchestration, and stale fallback handling.
  - `GeminiGuardrails`: Isolated `systemInstruction`, `<UNTRUSTED_USER_QUERY>` fencing, HTML/secret output sanitization, and deterministic clinical rule overrides.
  - `GeminiService`: `@google/genai` multi-model cascade (`gemini-3.5-flash-lite` -> fallback chain) with per-attempt `AbortController` timeouts and Zod plan verification.
  - `DeterministicGuidance`: Standalone verified fallback engine when Gemini keys or upstream quotas are unavailable.
  - `StorageService`: Non-blocking `fs/promises` atomic persistence serialized via an internal write queue with NTFS `EPERM`/`EBUSY` recovery.
- **Middleware (`middleware/`)**:
  - `security.ts`: Production `style-src 'self'` CSP, strict Origin CORS allowlist, and `blockUntrustedCrossOriginWrites`.
  - `rateLimiter.ts`: Sliding-window rate limiters across API routes (`120/15m`), AI chat (`40/15m`), and static file routes (`300/15m`).
  - `errorHandler.ts`: Production error redaction stripping internal stacks and secret token patterns.

### C. Frontend Presentation Layer (`client/src/`)
- Built with React 18, Vite (route-level `React.lazy` splitting), and Tailwind CSS (zero inline `style={{}}` attributes).
- **Pages (`client/src/pages/`)**: `DashboardPage`, `LandingPage`, `DailyPlanPage`, `AssistantPage`, `IndoorGuidePage`, `SustainablePlannerPage`, `ImpactExplainerPage`, `FamilyCommunityPage`, and `SavedActionsPage`.
- **Reusable Components (`client/src/components/`)**: `Navbar`, `Footer`, `LocationModal`, `AQIBadge`, `PollutantCard`, `ForecastChart`, `SafetyAlertBanner`, `ImpactCard`, `ActionCard`, `InlineFeedbackBanner`, and `CommunityBriefingCard`.
