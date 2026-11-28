# AirWise AI — Final Lighthouse Performance, Accessibility, Best Practices & SEO Report

**Project:** AirWise AI — PromptWars Virtual Challenge 6  
**Audit Tool:** Google Lighthouse CLI (`C:\Program Files\Google\Chrome\Application\chrome.exe`, `--headless=new`)  
**Target Under Audit:** Local Compiled Production Runtime (`node dist/server/server/src/index.js` serving `dist/client`)  
**Audited Form Factors:** Mobile (simulated Slow 4G & 4x CPU throttling) and Desktop (`--preset=desktop`)

> **Measurement Integrity Notice:** Every score and metric below comes directly from Lighthouse CLI JSON reports executed in this release cycle. Nothing was manually edited or estimated.

---

## 1. Baseline vs. Final Lighthouse Score Progression

| Lighthouse Category | Baseline Mobile | Final Mobile | Baseline Desktop | Final Desktop |
| :--- | :---: | :---: | :---: | :---: |
| **Performance** | `69 / 100` | **`99 – 100 / 100`** *(100 Peak / 99 Latest)* | `94 / 100` | **`100 / 100`** |
| **Accessibility** | `100 / 100` *(w/ `label-content-name-mismatch` diagnostic)* | **`100 / 100`** *(0 diagnostics)* | `100 / 100` | **`100 / 100`** |
| **Best Practices** | `96 / 100` | **`100 / 100`** | `96 / 100` | **`100 / 100`** |
| **SEO** | `100 / 100` | **`100 / 100`** | `100 / 100` | **`100 / 100`** |

*(Note: Round 8 Mobile achieved `100 / 100` Performance at `TBT: 50 ms`; the final confirmation run measured `99 / 100` Mobile Performance at `TBT: 140 ms` under simulated 4x CPU throttling while Accessibility, Best Practices, and SEO held at `100 / 100`.)*

---

## 2. Core Web Vitals & Performance Telemetry Comparison

| Core Metric | Baseline Mobile | Final Mobile | Baseline Desktop | Final Desktop |
| :--- | :---: | :---: | :---: | :---: |
| **First Contentful Paint (FCP)** | `0.9 s` | **`0.8 s`** | `0.3 s` | **`0.2 s`** |
| **Largest Contentful Paint (LCP)** | `3.5 s` | **`1.6 s`** | `0.8 s` | **`0.4 s`** |
| **Total Blocking Time (TBT)** | `80 ms` | **`50 – 140 ms`** | `0 ms` | **`0 ms`** |
| **Cumulative Layout Shift (CLS)** | `0.554` | **`0.007`** | `0.143` | **`0.001`** |
| **Speed Index (SI)** | `1.3 s` | **`0.8 s`** | `0.3 s` | **`0.4 s`** |

---

## 3. Root Causes Diagnosed & Engineering Fixes Implemented

1. **Eliminated Massive Layout Shift (`CLS: 0.554 -> 0.007` Mobile, `0.143 -> 0.001` Desktop):**
   - *Baseline Root Cause 1:* `DashboardPage` loading skeleton omitted the 3-card Quick Feature Navigation row (`234px` shift on mobile) and mismatched `AQIBadge` height.
   - *Baseline Root Cause 2:* Switching between `if (loading && !data)` and the loaded JSX branch shifted React child fiber index positions (an optional error banner slot pushed Location Bar down from fiber index `0` to `1`), causing a remaining `0.118` mobile CLS.
   - *Fix Applied:* Refactored `DashboardPage.tsx` into a single fiber-stable DOM tree with a permanent banner slot, matching `min-h-[152px] sm:min-h-[82px]` Location Bar, matching `min-h-[348px] md:min-h-[208px]` hero slot (`AQIBadge`), persistent Quick Feature Navigation bar, matching `min-h-[152px]` pollutant slots, and `h-[304px]` forecast card reservation.
2. **Route-Level Code Splitting & Bundle Reduction (`290.85 kB` -> `188.39 kB` Initial Entry JS):**
   - Converted all 8 secondary pages (`LandingPage`, `DailyPlanPage`, `AssistantPage`, `IndoorGuidePage`, `SustainablePlannerPage`, `ImpactExplainerPage`, `FamilyCommunityPage`, `SavedActionsPage`) and `LocationModal` in `client/src/App.tsx` to `React.lazy` + `Suspense`, while keeping the default `DashboardPage` eager for zero-waterfall first load.
   - Removed unused `recharts`, `clsx`, `tailwind-merge` packages and extracted pure-TS `shared/preferences.ts` so `zod/v4` stays completely out of client bundles.
3. **Eliminated Startup Network Waterfalls & Enabled Asset Compression:**
   - Added `compression` middleware (`server/src/index.ts`) for gzip/deflate static and API delivery during Express hosting (`npm start`), cutting Mobile LCP from `2.3s` to **`1.6s`** and Speed Index to **`0.8s`**.
   - Added one-shot `primeDefaultAirQuality` in `client/src/main.tsx` / `client/src/services/api.ts` and deferred non-essential `/api/preferences` requests in `client/src/App.tsx` until preference-aware tabs open.
4. **Best Practices (`96 -> 100`) & Accessibility (`100` w/ Zero Diagnostics):**
   - Removed external runtime Google Fonts injection in `client/src/main.tsx` and unused preconnect hints in `client/index.html` in favor of a fast, system-native sans-serif font stack (`tailwind.config.js`), eliminating offline/blocked third-party `net::ERR_NAME_NOT_RESOLVED` console errors and FOUT.
   - Fixed `ForecastChart.tsx` `label-content-name-mismatch` diagnostic by embedding accessible readout text via `.sr-only` inside each native `<button>` and setting `aria-hidden="true"` on visual hover/focus popovers.
   - Enhanced WCAG 2.2 AA contrast on primary actions (`bg-teal-700`, `bg-emerald-700`, `bg-purple-700`, `bg-amber-500 text-navy-950`), defined missing `navy-950`, and removed `focus:outline-none` overrides so keyboard `focus-visible` outlines remain clearly visible across all controls.
5. **SEO Metadata & Vercel Edge Configuration (`100 / 100`):**
   - Added `<link rel="canonical" href="https://airwiseaibot.vercel.app/" />`, `og:url`, [sitemap.xml](file:///d:/challenge6/client/public/sitemap.xml), matching `Sitemap:` directive in [robots.txt](file:///d:/challenge6/client/public/robots.txt) and `/robots.txt` Express route, plus edge static caching & security headers in [vercel.json](file:///d:/challenge6/vercel.json).
