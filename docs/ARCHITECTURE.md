# AirWise AI — System Architecture & Technical Design

## 1. System Overview

**AirWise AI** is an intelligent urban air quality and healthy living assistant developed for **PromptWars Virtual Challenge 6**. The application transforms complex atmospheric measurements into actionable, personalized daily routines, combining verified environmental monitoring data, deterministic public health safety rules, and Generative AI (Google Gemini via `@google/genai`).

```
+-----------------------------------------------------------------------------------+
|                                  USER / CLIENT                                    |
|  - React 18 + Vite + Tailwind CSS + Lucide Icons + Recharts                       |
|  - WCAG 2.2 AA Accessible UI (No color-only indicators, screen-reader semantics)   |
|  - Local Offline Persistence Store & Export Engine                                |
+----------------------------------------+------------------------------------------+
                                         | REST / JSON
                                         v
+-----------------------------------------------------------------------------------+
|                             AIRWISE EXPRESS SERVER                                |
|  - Security: Helmet CSP, Restricted CORS, express-rate-limit, Zod input validation|
|  - Production-Safe Error Sanitization (No stack traces in production)             |
+-------------------+--------------------+--------------------+---------------------+
                    |                    |                    |
                    v                    v                    v
      +-----------------------------+  +--------------------+  +--------------------+
      |    AIR QUALITY SERVICE      |  | DETERMINISTIC      |  | GENAI SERVICE      |
      | - In-Memory Cache (TTL: 15m)|  | SAFETY ENGINE      |  | - Official SDK     |
      | - Stale-While-Revalidate    |  | - Official US EPA  |  |   (@google/genai)  |
      | - Open-Meteo & CAMS Provider|  |   & CPCB NAQI      |  | - Grounded Context |
      | - Simulation/Demo Provider  |  | - Smog Alerts      |  | - Prompt Injection |
      | - Zero Pollutant Hallucinate|  | - N95 Guidance     |  |   Defense          |
      | - CPCB NAQI Sub-Index Calc  |  | - Vent Protocols   |  | - Deterministic    |
      +-----------------------------+  +--------------------+    Fallback Mode      |
                                                               +--------------------+
```

---

## 2. Layered Architecture & Separation of Concerns

### A. Shared Domain Layer (`shared/`)
Contains pure TypeScript contracts, domain models, and deterministic engines shared across client and server:
- `types.ts`: Universal interfaces for `AirQualityData`, `PollutantMeasurements`, `SafetyEvaluation`, `ImpactAssessment`, `HouseholdPreferences`, and `RecommendationActionItem`.
- `schemas.ts`: Strict Zod validation schemas for input requests, coordinates, and household settings.
- `safetyRules.ts`: Official US EPA and Indian CPCB NAQI breakpoints and deterministic health rule engine.
- `impact.ts`: Transparent calculations for avoided transport emissions and qualitative distinctions between personal exposure shielding and environmental source abatement.

### B. Backend Services Layer (`server/src/`)
- **Providers (`providers/`)**:
  - `AirQualityProvider`: Abstract interface for environmental data ingestion.
  - `OpenMeteoProvider`: Live integration with Copernicus Atmosphere Monitoring Service (CAMS) and Open-Meteo Air Quality & Geocoding APIs.
  - `DemoAirQualityProvider`: High-fidelity deterministic simulator for testing and offline demo modes.
  - `ProviderFactory`: Factory pattern selecting provider dynamically via environment variables (`AIR_QUALITY_PROVIDER`).
- **Services (`services/`)**:
  - `CacheService`: Thread-safe LRU-style in-memory cache with configurable TTL (default 15 mins) and stale-while-revalidate flags.
  - `AirQualityService`: Orchestrates geocoding, cache lookups, data normalization, and missing-pollutant flagging.
  - `GeminiService`: Google Gemini official SDK client (`@google/genai`) with prompt injection sanitization, verified environmental grounding, and deterministic fallback mode.
  - `StorageService`: Persistent storage for saved actions, completion checklists, and household preferences.
- **Middleware (`middleware/`)**:
  - `security.ts`: Helmet with strict CSP headers and restricted CORS.
  - `rateLimiter.ts`: Sliding-window rate limiters for general API requests (120 req/15 min) and AI inference (40 req/15 min).
  - `errorHandler.ts`: Centralized error handler preventing credential or path leakage.

### C. Frontend Presentation Layer (`client/src/`)
- Built with React 18, Vite, and Tailwind CSS.
- **Pages**:
  1. `LandingPage`: Problem education, winter smog dynamics, and feature onboarding.
  2. `DashboardPage`: Real-time AQI with index standard, 6 criteria pollutants, source attribution, and 24h hourly forecast trend chart.
  3. `DailyPlanPage`: Time-bracketed routines (Morning, Commute, Indoor, Cooking, Evening) with dual impact badges and one-click saving.
  4. `AssistantPage`: Grounded conversational interface with prompt suggestion pills and context attribution.
  5. `IndoorGuidePage`: Interactive room/appliance sizing (CADR calculator), ventilation timing, and ozone warnings.
  6. `SustainablePlannerPage`: Clean commute calculator with avoided CO2 and PM2.5 emissions.
  7. `ImpactExplainerPage`: Interactive scientific comparison between personal exposure shielding and environmental emission reduction.
  8. `FamilyCommunityPage`: Household composition preferences and privacy-safe shareable air quality briefings.
  9. `SavedActionsPage`: Interactive checklist with progress percentage, export summary, and deletion controls.

---

## 3. Data Integrity & Regional Standards

1. **Regional Standard Selection**:
   - For Indian geographic coordinates, AirWise AI applies the official Indian Central Pollution Control Board (CPCB) NAQI standard derived from validated PM2.5 and PM10 concentration breakpoints.
   - For other global locations, the US EPA Air Quality Index scale is applied.
   - The index standard is always prominently labeled (e.g. `CPCB_AQI` or `US_AQI`) to prevent user confusion.
2. **Missing Pollutant Integrity**:
   - If a monitoring station does not report a specific pollutant (e.g., SO2 or CO), the value is preserved as `null` and displayed as "Not Reported by Station".
   - AirWise AI **never** substitutes `0` for missing values.
3. **Dual Impact Distinction**:
   - **Personal Exposure Benefit**: Explains biological lung protection (e.g., N95 respirators, HEPA filters).
   - **Environmental Emission Benefit**: Explains source pollution prevention (e.g., switching from private cars to metro transit).
