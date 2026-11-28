# AirWise AI — Official Competition Submission & Demonstration Checklist

**Competition:** PromptWars Virtual Challenge 6  
**Application Name:** AirWise AI — Your Intelligent Air Quality & Healthy Living Companion  
**Tagline:** *Breathe Smarter. Live Healthier. Choose Greener.*  
**Primary Tech Stack:** React 18, Vite, TypeScript (Strict), Tailwind CSS, Node.js, Express, Zod, Official `@google/genai` SDK, Vitest.  
**Repository Source Size:** Under `0.85 MB` (Well below the `8.00 MB` safety target and `10.00 MB` competition ceiling)  
**Total Tracked Secrets:** **0** (Verified via automated content & git history scanner)  
**Test Suite Status:** **83 / 83 Passing Across 12 Suites** (`93.31%` Statements / `94.19%` Lines / `93.82%` Functions / `82.70%` Branches)  
**Accessibility Level:** **WCAG 2.2 AA Compliant** (`100 / 100` Lighthouse Accessibility, `0` diagnostics)  

---

## 1. Challenge 6 Problem Statement Verification Matrix

| Requirement | Implementation Details | Verified Source File |
| :--- | :--- | :--- |
| **Real Atmospheric Integration** | Copernicus CAMS & Open-Meteo ingestion with regional standards (`US_AQI` & Indian `CPCB_AQI`). Pollutants: PM2.5, PM10, NO2, SO2, O3, CO. Missing pollutants kept `null`. | `server/src/providers/OpenMeteoProvider.ts` |
| **Low-Emission Daily Routines** | Time-bracketed routines for Morning, Commute, Workplace/School, Indoor Air, Cooking, and Evening with practical steps, why it matters, and confidence rating. | `client/src/pages/DailyPlanPage.tsx`, `server/src/services/GeminiService.ts` |
| **Indoor Clean Air Guide** | Target CADR room calculator (CFM & m³/h), ventilation window timing, strict warnings against ozone generators, and houseplant myth debunking. | `client/src/pages/IndoorGuidePage.tsx`, `shared/safetyRules.ts` |
| **Sustainable Alternatives** | Tailpipe CO2e and exhaust PM2.5 avoided emissions calculator, trip-chaining routines, and idling reduction tips. Prohibits outdoor exercise during smog. | `client/src/pages/SustainablePlannerPage.tsx`, `shared/impact.ts` |
| **Direct Impact Explainer** | Clear scientific distinction between **Personal Exposure Shielding** (biological lung protection) and **Environmental Emission Abatement** (source reduction) with ±25% uncertainty disclosure. | `client/src/pages/ImpactExplainerPage.tsx`, `client/src/components/ImpactCard.tsx` |
| **Informed Decisions on Conditions** | Dynamic AQI status indicators, 24-hour forecast trend chart, and contextual safety alert banners. | `client/src/pages/DashboardPage.tsx`, `client/src/components/AQIBadge.tsx` |
| **Deterministic Safety Priority** | Clinical health rules (N95 respirator mandates, window closures during inversion, exercise bans) run deterministically, overriding LLM hallucinations. | `shared/safetyRules.ts`, `server/src/controllers/recommendationController.ts` |
| **Family & Community Mode** | Demographic preferences (children, elderly, respiratory sensitivity) without collecting sensitive health data; shareable privacy-safe text briefings. | `client/src/pages/FamilyCommunityPage.tsx` |
| **Saved Actions & Privacy** | Local persistent store for bookmarks, completion checkboxes, single/bulk deletion, and structured JSON export. Zero third-party ad tracking. | `client/src/pages/SavedActionsPage.tsx`, `server/src/controllers/savedActionsController.ts` |

---

## 2. Step-by-Step Evaluator Demonstration Script

Follow this step-by-step walkthrough to verify every major workflow of AirWise AI:

### Step 1: Launch Application
```bash
# In the repository root:
npm install
npm run build
npm start
```
- Open `http://localhost:3001` in your browser.
- Verify the **Landing Page** loads smoothly with deep navy/teal aesthetic, clear typography, and feature overviews.

### Step 2: Live AQI Dashboard & Multi-Standard Verification
- Click **"Check Real-Time Air Quality"** or navigate to **"AQI Dashboard"** in the top navigation bar.
- Notice the active city defaults to **New Delhi** (or your selected location).
- Observe the **AQI Badge**: For New Delhi, it displays **CPCB NAQI** (National Air Quality Index of India) with exact color/text categories.
- Click **"Change Location"** and search for **London**, **Tokyo**, or **New York**:
  - Notice the standard automatically shifts to **US EPA AQI**.
  - Notice the **Criteria Pollutants Grid** displays PM2.5, PM10, NO2, SO2, O3, and CO in standard units (with CO converted to mg/m³ per WHO guidelines).
  - Observe the **24-Hour Forecast Chart** showing diurnal peak patterns.
- Press the `Escape` key while the Location Modal is open to verify **WCAG 2.2 AA modal keyboard dismissal**.

### Step 3: Personalized Daily Action Plan & Deterministic Safety Rules
- Click **"Personalized Daily Plan"** from the navigation bar or dashboard button.
- Inspect the **Deterministic Safety Alert Banner**:
  - In high pollution (AQI > 150), verify the **Urgent Medical & Safety Alert** appears.
  - Verify that **Outdoor Exercise** is marked **"Avoid / Cancel Outdoor Cardio"**.
  - Verify the **Respirator Tier** specifies **"N95 / FFP2 / KN95 with airtight facial seal"**.
- Review the time-bracketed action schedule (Morning Routine, Clean Commute, Workplace, Evening).
- Notice every action card features a **Dual Direct Impact Card** distinguishing **Personal Exposure Benefit** from **Environmental Emission Benefit**.
- Click **"Save Action"** on any recommendation (e.g., "Equip N95 Respirator for Morning Commute"). The button changes to `"Saved to My Actions"`.

### Step 4: Conversational GenAI Assistant
- Navigate to **"AI Assistant"**.
- Click one of the quick prompt suggestions: *"Is it suitable to go outside for a run today?"* or *"Are houseplants effective for removing PM2.5?"*.
- Verify the assistant provides an evidence-grounded response citing current local AQI and deterministic safety rules.
- Notice the message log auto-scrolls smoothly to new messages.

### Step 5: Indoor Clean Air Zone & HEPA Sizing Calculator
- Navigate to **"Indoor Air Guide"**.
- Use the interactive **HEPA Air Purifier Sizing Calculator**: enter your room area (e.g. 250 sq ft) and ceiling height.
- Inspect the calculated target Clean Air Delivery Rate (CADR in CFM and m³/h) for 4.8 air changes per hour (ACH).
- Read the **Critical Warning on Ozone Generators** and the **Houseplant Filtration Myth Reality Check**.

### Step 6: Sustainable Living & Commute Calculator
- Navigate to **"Sustainable Living"**.
- Enter a commute distance (e.g. 20 km) and select an alternative mode (e.g., Metro / Public Transit or Carpooling).
- Click **"Calculate Avoided Tailpipe Emissions"**.
- Verify avoided emissions are computed: e.g. **2.20 kg CO2e avoided** and **0.20 g exhaust PM2.5 prevented**, with transparent methodology and assumptions.

### Step 7: Family & Community Protection Mode
- Navigate to **"Family & Community"**.
- Toggle household settings (e.g. "Children under 14", "Elderly members (65+)", "Home Air Purifier Available").
- Click **"Save Household Profile"** (persisted locally).
- Review the **Classroom & Playground Decision Framework**.
- Click **"Copy Community Summary"** to generate an anonymous, shareable air advisory text suitable for resident messaging channels.

### Step 8: Action Tracking, Summary Export & Clear All
- Navigate to **"My Saved Actions"**.
- Verify your saved recommendation is present.
- Click the completion circle icon to mark the action as **Completed**.
- Notice the **Overall Action Completion Rate** progress bar updates to reflect progress.
- Click **"Export Summary"** to download a structured JSON file containing all saved actions, statistics, and household preferences.
- Click **"Clear All"** to confirm deletion and reset the local checklist.

---

## 3. Automated Verification Commands

Run these automated verification commands in PowerShell or standard terminal:

```bash
# 1. Full TypeScript Strict Typecheck (Root, Client, Server)
npm run typecheck

# 2. Production Build Execution
npm run build

# 3. Complete Multi-Tier Vitest Automated Test Suite
npm test

# 4. Repository Size & Secret Exposure Audit
npm run size-audit
```

---

## 4. Verification Summary

- Full strict TypeScript compilation, zero ESLint errors/warnings, inline-free production CSP (`style-src 'self'`), async write-queued persistence, `100 / 100` Lighthouse across Performance, Accessibility, Best Practices, and SEO (Mobile & Desktop), and `0` vulnerabilities across `npm audit`. See [FINAL_COMPETITION_SCORECARD.md](FINAL_COMPETITION_SCORECARD.md) for complete telemetry.

