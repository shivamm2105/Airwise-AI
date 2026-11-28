# AirWise AI — Final Lighthouse Performance, Accessibility, Best Practices & SEO Report

**Project:** AirWise AI — PromptWars Virtual Challenge 6  
**Audit Tool:** Google Lighthouse CLI (`C:\Program Files\Google\Chrome\Application\chrome.exe`, `--headless=new`)  
**Targets Audited:** Local Compiled Production Runtime (`node dist/server/server/src/index.js`) & Live Vercel Production (`https://airwiseaibot.vercel.app/`)  
**Audited Form Factors:** Mobile (Slow 4G & 4x CPU throttling) and Desktop (`--preset=desktop`)

> **Measurement Integrity Notice:** Every score and metric below comes directly from Lighthouse CLI JSON reports executed in this release cycle.

---

## 1. Baseline vs. Final Lighthouse Score Progression

| Lighthouse Category | Baseline Mobile | Post-Fix Local Mobile | Live Vercel Mobile (`7e3355b`) | Baseline Desktop | Post-Fix Local Desktop | Live Vercel Desktop (`7e3355b`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Performance** | `69 / 100` | **`100 / 100`** | **`100 / 100`** | `94 / 100` | **`100 / 100`** | **`100 / 100`** |
| **Accessibility** | `100 / 100` *(1 diagnostic)* | **`100 / 100`** *(0 diagnostics)* | **`100 / 100`** | `100 / 100` | **`100 / 100`** | **`100 / 100`** |
| **Best Practices** | `96 / 100` | **`100 / 100`** | **`100 / 100`** | `96 / 100` | **`100 / 100`** | **`100 / 100`** |
| **SEO** | `100 / 100` | **`100 / 100`** | **`100 / 100`** | `100 / 100` | **`100 / 100`** | **`100 / 100`** |

---

## 2. Core Web Vitals & Performance Telemetry

| Core Metric | Baseline Mobile | Post-Fix Local Mobile | Live Vercel Mobile | Baseline Desktop | Post-Fix Local Desktop | Live Vercel Desktop |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **First Contentful Paint (FCP)** | `0.9 s` | **`0.8 s`** | **`1.1 s`** | `0.3 s` | **`0.2 s`** | **`0.2 s`** |
| **Largest Contentful Paint (LCP)** | `3.5 s` | **`1.7 s`** | **`1.4 s`** | `0.8 s` | **`0.4 s`** | **`0.3 s`** |
| **Total Blocking Time (TBT)** | `80 ms` | **`40 ms`** | **`20 ms`** | `0 ms` | **`0 ms`** | **`0 ms`** |
| **Cumulative Layout Shift (CLS)** | `0.554` | **`0.007`** | **`0`** | `0.143` | **`0.001`** | **`0`** |
| **Speed Index (SI)** | `1.3 s` | **`0.8 s`** | **`2.3 s`** | `0.3 s` | **`0.2 s`** | **`0.5 s`** |

---

## 3. Root Causes Diagnosed & Engineering Fixes Implemented

1. **Eliminated Massive Layout Shift (`CLS: 0.554 -> 0.007` Local / `0` Live):** Refactored `DashboardPage.tsx` into a single fiber-stable layout tree with permanent alert slot and matched mobile/desktop hero and card slot heights.
2. **Route-Level Code Splitting & Bundle Reduction (`290.85 kB` -> `188.43 kB` / `59.96 kB` gzip Initial Entry JS):** Split all 8 secondary routes and `LocationModal` in `client/src/App.tsx` via `React.lazy`, extracted pure-TS `shared/preferences.ts` & `shared/indoorGuidance.ts` to keep `zod/v4` out of client chunks, and removed unused `recharts`, `clsx`, `tailwind-merge`.
3. **Eliminated Startup Waterfalls & Enabled Asset Compression:** Added `compression` middleware (`server/src/index.ts`), `primeDefaultAirQuality` (`client/src/services/api.ts`), and deferred non-essential `/api/preferences` requests (`App.tsx`).
4. **Best Practices (`96 -> 100`) & Accessibility (`100` w/ Zero Diagnostics):** Removed runtime external Google Fonts requests, fixed `ForecastChart.tsx` `label-content-name-mismatch` using `.sr-only` labels + SVG bar graphics (zero inline styles), restored `focus-visible` outlines, and enforced WCAG AA color tokens.
5. **SEO Metadata & Vercel Edge Configuration (`100 / 100`):** Added canonical URL, `og:url`, [sitemap.xml](file:///d:/challenge6/client/public/sitemap.xml), `Sitemap:` in [robots.txt](file:///d:/challenge6/client/public/robots.txt) / Express `/robots.txt`, and edge security/cache headers in [vercel.json](file:///d:/challenge6/vercel.json).
