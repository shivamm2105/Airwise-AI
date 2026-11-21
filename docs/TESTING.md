# AirWise AI — Automated Testing & Verification Report

## 1. Testing Strategy

AirWise AI implements a comprehensive, multi-tiered test pyramid executed via **Vitest**, **React Testing Library**, **Supertest**, and **JSDOM**:

1. **Unit Tests**:
   - `tests/unit/aqi-classification.test.ts`: Validates US EPA and Indian CPCB NAQI breakpoints, standard identification, and graceful handling of null/NaN values.
   - `tests/unit/safety-rules.test.ts`: Validates deterministic safety constraints (smog alerts, outdoor exercise cancellation, N95 respirator tiers, window sealing, ozone generator warnings, and non-medical disclaimers).
   - `tests/unit/impact-engine.test.ts`: Validates avoided transport emissions calculations, units, assumptions, and clear qualitative separation between personal exposure and environmental emission benefits.
   - `tests/unit/schemas-and-validation.test.ts`: Validates Zod schemas for coordinates, location queries, household preferences, and chat payloads.
2. **API Integration Tests**:
   - `tests/integration/api-endpoints.test.ts`: Tests Express endpoints (`/api/health`, `/api/air-quality/current`, `/api/recommendations/daily-plan`, `/api/recommendations/calculate-impact`, `/api/chat`, and saved actions CRUD) with deterministic mock providers.
3. **Frontend Component Tests**:
   - `tests/component/ui-components.test.tsx`: Tests `AQIBadge`, `PollutantCard`, `SafetyAlertBanner`, and `ImpactCard` for accessibility, textual status communication, and missing-data fallbacks.
4. **End-to-End Workflow Test**:
   - `tests/e2e/workflow.test.ts`: Simulates the complete primary user journey from location selection to data retrieval, safety evaluation, action plan generation, action saving, completion tracking, and summary export.

---

## 2. Test Execution Command & Results

```bash
# Run all automated test suites
npm test
```

### Verified Test Results:
```text
 ✓ tests/unit/impact-engine.test.ts (5 tests) 15ms
 ✓ tests/unit/safety-rules.test.ts (6 tests) 23ms
 ✓ tests/unit/aqi-classification.test.ts (14 tests) 26ms
 ✓ tests/unit/schemas-and-validation.test.ts (7 tests) 23ms
 ✓ tests/e2e/workflow.test.ts (1 test) 242ms
 ✓ tests/integration/api-endpoints.test.ts (11 tests) 269ms
 ✓ tests/component/ui-components.test.tsx (6 tests) 186ms

 Test Files  7 passed (7)
      Tests  50 passed (50)
   Start at  11:51:11
   Duration  10.86s
```

**Pass Rate:** 100% (50 passed out of 50 tests across 7 suites). Zero failed, zero skipped.

---

## 3. Edge Cases Covered

| Edge Case Scenario | Test File | Verified Expected Behavior |
| :--- | :--- | :--- |
| **Missing Station Pollutant (e.g., SO2 null)** | `ui-components.test.tsx` | Renders "Not Reported by Station". Never displays a fake `0`. |
| **Invalid Geographical Coordinates (lat: 200)** | `api-endpoints.test.ts` | Server returns HTTP 400 with structured Zod error details. |
| **Severe Smog Spike (AQI: 350)** | `safety-rules.test.ts` | Triggers `RULE_SEVERE_SMOG_ALERT`, forces exercise safe = false, mandates N95. |
| **Sensitive Group Exposure (AQI: 125)** | `safety-rules.test.ts` | Flags outdoor play unsafe for children and respiratory sensitive members. |
| **Offline / Unreachable API Upstream** | `e2e/workflow.test.ts` | Gracefully falls back to deterministic rule engine or cached stale readings. |
| **Active Commute in Smog** | `safety-rules.test.ts` | Blocks cycling/jogging recommendation; advises enclosed mass transit with N95. |

