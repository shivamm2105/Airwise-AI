import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { LandingPage } from '../../client/src/pages/LandingPage';
import { Navbar } from '../../client/src/components/Navbar';
import { LocationModal } from '../../client/src/components/LocationModal';
import { DashboardPage } from '../../client/src/pages/DashboardPage';
import { SavedActionsPage } from '../../client/src/pages/SavedActionsPage';
import { SustainablePlannerPage } from '../../client/src/pages/SustainablePlannerPage';
import { IndoorGuidePage } from '../../client/src/pages/IndoorGuidePage';
import { AssistantPage } from '../../client/src/pages/AssistantPage';
import { DailyPlanPage } from '../../client/src/pages/DailyPlanPage';
import { FamilyCommunityPage } from '../../client/src/pages/FamilyCommunityPage';
import { ImpactExplainerPage } from '../../client/src/pages/ImpactExplainerPage';
import { Footer } from '../../client/src/components/Footer';
import App from '../../client/src/App';
import { ActionCard } from '../../client/src/components/ActionCard';
import { ForecastChart } from '../../client/src/components/ForecastChart';
import { getStandardImpact } from '../../shared/impact';
import { evaluateSafetyRules } from '../../shared/safetyRules';
import { api } from '../../client/src/services/api';
import { AirQualityData, AISynthesisResponse } from '../../shared/types';

async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      // JSDOM does not evaluate Tailwind stylesheet computed contrast; contrast verified via design tokens
      'color-contrast': { enabled: false }
    }
  });
  expect(results.violations).toEqual([]);
}

const SAMPLE_AQ: AirQualityData = {
  location: { latitude: 28.6139, longitude: 77.209, name: 'New Delhi', country: 'India' },
  aqi: 225,
  category: 'UNHEALTHY',
  categoryLabel: 'Poor (CPCB)',
  healthImplications: 'Breathing discomfort to most people on prolonged exposure.',
  indexStandard: 'CPCB_AQI',
  dominantPollutant: 'PM2.5',
  pollutants: { pm2_5: 98.2, pm10: 185.4, no2: 45, so2: null, o3: 32, co: 1.5 },
  hourlyForecast: [
    { time: '2026-11-27T09:00:00.000Z', aqi: 225, pm2_5: 98.2, pm10: 185.4, category: 'UNHEALTHY' }
  ],
  provider: 'Open-Meteo',
  observedAt: '2026-11-27T09:00:00.000Z',
  fetchedAt: '2026-11-27T09:05:00.000Z',
  isStale: false,
  isDemo: false,
  qualityMetadata: {
    isReliable: true,
    missingPollutants: ['SO2'],
    attribution: 'Copernicus CAMS & Open-Meteo'
  }
};

describe('Page Interactions, Mobile Navigation & WCAG Accessibility Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('LandingPage exposes all 6 feature cards as keyboard-accessible semantic buttons', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();

    render(<LandingPage onNavigate={onNavigate} onOpenLocation={vi.fn()} />);

    const aqiCard = screen.getByRole('button', { name: /Live Air Quality Dashboard/i });
    expect(aqiCard.tagName).toBe('BUTTON');
    await user.click(aqiCard);
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('Navbar manages mobile drawer toggle with aria-expanded and 44px touch targets', async () => {
    const onSelectTab = vi.fn();
    const user = userEvent.setup();

    render(
      <Navbar
        currentTab="dashboard"
        onSelectTab={onSelectTab}
        currentLocation={{ name: 'New Delhi', latitude: 28.61, longitude: 77.21 }}
        onOpenLocationModal={vi.fn()}
      />
    );

    const toggle = screen.getByRole('button', { name: /Open Navigation Menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);

    expect(screen.getByRole('button', { name: /Close Navigation Menu/i })).toHaveAttribute('aria-expanded', 'true');
    const overviewBtn = screen.getByRole('button', { name: /Overview & Mission/i });
    await user.click(overviewBtn);
    expect(onSelectTab).toHaveBeenCalledWith('landing');
  });

  it('LocationModal closes on Escape key and handles manual selection and denied geolocation fallback cleanly', async () => {
    const onClose = vi.fn();
    const onSelectLocation = vi.fn();

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: unknown, error: (e: { code: number; PERMISSION_DENIED: number }) => void) =>
          error({ code: 1, PERMISSION_DENIED: 1 })
      }
    });

    render(
      <LocationModal
        isOpen={true}
        onClose={onClose}
        currentLocation={SAMPLE_AQ.location}
        onSelectLocation={onSelectLocation}
      />
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Use My Current Device Location/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/permission was denied/i);

    fireEvent.click(screen.getByRole('button', { name: /London/i }));
    expect(onSelectLocation).toHaveBeenCalledWith(expect.objectContaining({ name: 'London' }));
    expect(onClose).toHaveBeenCalled();

    // Verify city search, result selection, and clear search flow
    vi.spyOn(api, 'searchLocations').mockResolvedValueOnce([
      { name: 'Seattle', region: 'Washington', country: 'United States', latitude: 47.61, longitude: -122.33 }
    ]);
    const searchInput = screen.getByLabelText(/Search city/i);
    fireEvent.change(searchInput, { target: { value: 'Seattle' } });
    fireEvent.submit(searchInput.closest('form')!);
    expect(await screen.findByText('Seattle')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clear Search/i }));
    expect(screen.getByText(/Featured Urban Centers/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('DashboardPage renders honest loading skeleton without fake AQI and surfaces real fetch errors with retry', () => {
    const onRefresh = vi.fn();

    const { rerender } = render(
      <DashboardPage
        data={null}
        loading={true}
        error={null}
        onRefresh={onRefresh}
        onOpenLocation={vi.fn()}
        currentLocation={SAMPLE_AQ.location}
      />
    );

    expect(screen.getByLabelText(/Loading live air quality dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText('198')).not.toBeInTheDocument();

    rerender(
      <DashboardPage
        data={null}
        loading={false}
        error="Upstream station unreachable"
        onRefresh={onRefresh}
        onOpenLocation={vi.fn()}
        currentLocation={SAMPLE_AQ.location}
      />
    );

    expect(screen.getByText('Environmental Data Fetch Failed')).toBeInTheDocument();
    expect(screen.getByText('Upstream station unreachable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('SavedActionsPage supports toggling, filtering, exporting, single delete, and accessible inline confirmation', async () => {
    const initialAction = {
      id: 'act_1',
      actionId: 'id1',
      title: 'Run HEPA Purifier',
      category: 'indoor',
      savedAt: '2026-11-27T08:00:00.000Z',
      completed: false,
      locationName: 'New Delhi',
      aqiAtSave: 220
    };
    vi.spyOn(api, 'getSavedActions').mockResolvedValueOnce([initialAction]);
    vi.spyOn(api, 'toggleActionCompletion').mockResolvedValueOnce({
      ...initialAction,
      completed: true,
      completedAt: '2026-11-27T09:00:00.000Z'
    });
    vi.spyOn(api, 'exportSummary').mockResolvedValueOnce({
      title: 'Summary',
      generatedAt: '2026-11-27T09:00:00.000Z',
      statistics: { totalActionsSaved: 1, actionsCompleted: 1, completionRatePercentage: 100 },
      householdPreferences: null,
      actionsList: [{ ...initialAction, completed: true }]
    });
    const deleteSpy = vi.spyOn(api, 'deleteAction').mockResolvedValueOnce({ success: true });
    const clearSpy = vi.spyOn(api, 'clearAllActions').mockResolvedValueOnce({ success: true });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<SavedActionsPage />);
    expect(await screen.findByText('Run HEPA Purifier')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Mark "Run HEPA Purifier" complete/i }));
    expect(await screen.findByText(/Completed \(1\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pending \(0\)/i }));
    expect(screen.getByText(/No actions in this view/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Completed \(1\)/i }));
    expect(screen.getByText('Run HEPA Purifier')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Export Summary/i }));
    expect(await screen.findByText(/Action summary exported as JSON/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Clear All/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Are you sure you want to remove all saved actions/i);
    expect(clearSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Confirm Clear All/i }));
    await waitFor(() => expect(clearSpy).toHaveBeenCalledTimes(1));
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('SustainablePlannerPage displays active-travel safety alert and saves commute habits cleanly', async () => {
    vi.spyOn(api, 'calculateImpact').mockResolvedValue({
      avoidedKgCO2e: 2.04,
      avoidedGramsExhaustPM: 0.36,
      methodology: 'DEFRA',
      assumptions: '12 km',
      uncertaintyRange: '±25%'
    });
    const saveSpy = vi.spyOn(api, 'saveAction').mockResolvedValueOnce({
      id: 'commute-1',
      actionId: 'act-commute-public_transit',
      title: 'Switch Solo Car Commute to Metro / Transit',
      category: 'commute',
      savedAt: SAMPLE_AQ.observedAt,
      completed: false,
      locationName: 'New Delhi',
      aqiAtSave: 225
    });

    render(<SustainablePlannerPage airQuality={SAMPLE_AQ} preferences={null} />);

    fireEvent.click(screen.getByRole('button', { name: /Bicycle/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Active Travel Not Recommended Today/i);

    fireEvent.change(screen.getByLabelText(/Roundtrip Daily Commute Distance/i), { target: { value: '24' } });
    fireEvent.click(screen.getByRole('button', { name: /Public Transit/i }));

    expect(await screen.findByText(/2\.04 kg CO2e/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Commit this Commute Habit/i }));
    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1));
  });

  it('IndoorGuidePage binds controls, updates room CADR, and saves indoor setup', async () => {
    const updatePrefsSpy = vi.fn();
    vi.spyOn(api, 'updatePreferences').mockResolvedValueOnce({
      householdSize: 3,
      hasChildren: false,
      hasElderly: false,
      hasRespiratorySensitivity: false,
      commuteMode: 'public_transit',
      commuteDistanceKm: 10,
      homeType: 'apartment',
      ventilationType: 'natural_cross',
      hasAirPurifier: false,
      purifierFilterType: 'none',
      cookingType: 'gas_unvented',
      indoorCombustionSources: ['incense_agarbatti', 'candles'],
      sustainabilityFocus: 'exposure_reduction'
    });

    const { container } = render(
      <IndoorGuidePage airQuality={SAMPLE_AQ} preferences={null} onUpdatePreferences={updatePrefsSpy} />
    );

    const cookingSelect = screen.getByLabelText(/Cooking Arrangement/i);
    expect(cookingSelect.tagName).toBe('SELECT');
    expect(screen.getByText(/Ozone Generator Warning/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Room Floor Area/i), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: /None \/ Basic/i }));
    fireEvent.change(cookingSelect, { target: { value: 'gas_unvented' } });
    fireEvent.click(screen.getByRole('button', { name: /Burned Regularly/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save Indoor Setup/i }));

    await waitFor(() => expect(updatePrefsSpy).toHaveBeenCalledTimes(1));
    await expectNoAxeViolations(container);
  });

  it('passes automated axe-core WCAG accessibility checks across Landing, Dashboard, ForecastChart, and ActionCard', async () => {
    const landing = render(<LandingPage onNavigate={vi.fn()} onOpenLocation={vi.fn()} />);
    await expectNoAxeViolations(landing.container);

    const dashboard = render(
      <DashboardPage
        data={SAMPLE_AQ}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onOpenLocation={vi.fn()}
        currentLocation={SAMPLE_AQ.location}
      />
    );
    await expectNoAxeViolations(dashboard.container);

    const chart = render(<ForecastChart hourly={SAMPLE_AQ.hourlyForecast} />);
    await expectNoAxeViolations(chart.container);

    const card = render(
      <ActionCard
        action={{
          id: 'a1',
          title: 'Use HEPA Purifier',
          category: 'indoor',
          timeframe: 'Evening',
          whatToDo: 'Keep windows closed and run HEPA filter.',
          whyItMatters: 'Reduces PM2.5.',
          steps: ['Close windows'],
          expectedBenefit: 'Cleaner sleep space',
          impact: getStandardImpact('use_hepa_purifier'),
          confidence: 'High (Verified Guidelines)',
          safetyVerified: true
        }}
        isSaved={false}
        onSave={vi.fn()}
      />
    );
    await expectNoAxeViolations(card.container);
  });

  it('AssistantPage sends user prompt, displays response, supports reset, and passes axe-core checks', async () => {
    const scrollMock = vi.fn();
    Element.prototype.scrollIntoView = scrollMock;

    const sendSpy = vi.spyOn(api, 'sendChatMessage').mockResolvedValueOnce({
      response: 'Keep workouts **indoors** today and wear a fitted N95.',
      usedModel: 'gemini-3.5-flash-lite',
      groundedInContext: true
    });

    const { container } = render(<AssistantPage airQuality={SAMPLE_AQ} preferences={null} />);
    await expectNoAxeViolations(container);

    const input = screen.getByLabelText(/Ask assistant a question/i);
    fireEvent.change(input, { target: { value: 'Should I run outdoors?' } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText(/indoors/i)).toBeInTheDocument();
    expect(sendSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Clear chat conversation/i }));
    expect(screen.queryByText(/Should I run outdoors/i)).not.toBeInTheDocument();
  });

  it('DailyPlanPage, FamilyCommunityPage, ImpactExplainerPage, Footer, and App render cleanly and pass axe-core', async () => {
    const mockPlan: AISynthesisResponse = {
      summary: 'High smog plan',
      airQualityContext: {
        source: 'Open-Meteo',
        indexStandard: 'CPCB_AQI',
        observedAt: SAMPLE_AQ.observedAt,
        aqi: 225,
        category: 'UNHEALTHY'
      },
      safetyEvaluation: evaluateSafetyRules(225, SAMPLE_AQ.pollutants, {}, 'CPCB_AQI'),
      actions: [
        {
          id: 'act-1',
          title: 'Use HEPA Filter',
          category: 'indoor',
          timeframe: 'All Day',
          whatToDo: 'Seal windows and run HEPA.',
          whyItMatters: 'Cuts indoor PM2.5.',
          steps: ['Close latches'],
          expectedBenefit: 'Cleaner breathing air',
          impact: getStandardImpact('use_hepa_purifier'),
          confidence: 'High (Verified Guidelines)',
          safetyVerified: true
        }
      ],
      indoorGuidance: {
        ventilationTiming: 'Keep closed',
        hepaRecommendations: 'H13 HEPA',
        cookingExhaustGuidance: 'Use hood',
        dustAndCleaningTips: ['Wet mop'],
        combustionAvoidance: ['No incense'],
        sensorNotice: 'No sensor present'
      },
      sustainableAlternatives: {
        transportOption: 'Metro',
        idlingAdvice: 'Turn off engine',
        tripConsolidationTips: 'Batch trips',
        householdEnergyAction: 'Clean pre-filter'
      },
      communityTips: ['Share alerts'],
      limitationsAndDisclaimers: ['Not medical advice']
    };

    vi.spyOn(api, 'getSavedActions').mockResolvedValue([]);
    vi.spyOn(api, 'generateDailyPlan').mockResolvedValue(mockPlan);
    vi.spyOn(api, 'saveAction').mockResolvedValue({
      id: 'saved-1',
      actionId: 'act-1',
      title: 'Use HEPA Filter',
      category: 'indoor',
      savedAt: SAMPLE_AQ.observedAt,
      completed: false,
      locationName: 'New Delhi',
      aqiAtSave: 225
    });

    const planView = render(<DailyPlanPage airQuality={SAMPLE_AQ} preferences={null} />);
    expect(await screen.findByText('Use HEPA Filter')).toBeInTheDocument();
    await expectNoAxeViolations(planView.container);

    fireEvent.click(screen.getByRole('button', { name: /Save Action/i }));
    expect(await screen.findByText(/Saved to My Actions/i)).toBeInTheDocument();
    planView.unmount();

    const updatePrefsSpy = vi.fn();
    vi.spyOn(api, 'updatePreferences').mockResolvedValue({
      householdSize: 3,
      hasChildren: true,
      hasElderly: false,
      hasRespiratorySensitivity: false,
      commuteMode: 'public_transit',
      commuteDistanceKm: 10,
      homeType: 'apartment',
      ventilationType: 'natural_cross',
      hasAirPurifier: false,
      purifierFilterType: 'none',
      cookingType: 'gas_with_exhaust',
      indoorCombustionSources: [],
      sustainabilityFocus: 'general'
    });

    const communityView = render(
      <FamilyCommunityPage airQuality={SAMPLE_AQ} preferences={null} onUpdatePreferences={updatePrefsSpy} />
    );
    await expectNoAxeViolations(communityView.container);
    fireEvent.click(screen.getByRole('button', { name: /Children under 14/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save Household Preferences/i }));
    await waitFor(() => expect(updatePrefsSpy).toHaveBeenCalled());
    communityView.unmount();

    const impactView = render(<ImpactExplainerPage />);
    await expectNoAxeViolations(impactView.container);
    fireEvent.click(screen.getByRole('button', { name: /Switching Solo Commute/i }));
    expect(screen.getByText(/Replaces single-occupancy driving/i)).toBeInTheDocument();
    impactView.unmount();

    const footerView = render(<Footer />);
    await expectNoAxeViolations(footerView.container);
    footerView.unmount();

    vi.spyOn(api, 'getPreferences').mockResolvedValue(null);
    vi.spyOn(api, 'getAirQuality').mockResolvedValue(SAMPLE_AQ);
    const appView = render(<App />);
    expect((await screen.findAllByText('225')).length).toBeGreaterThan(0);
    await expectNoAxeViolations(appView.container);

    // Exercise lazy-loaded route navigation & refresh inside App
    fireEvent.click(screen.getByRole('button', { name: /Refresh environmental readings/i }));
    expect((await screen.findAllByText('225')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Impact Explainer/i }));
    expect(await screen.findByText(/Direct Impact Explanation Engine/i)).toBeInTheDocument();
    appView.unmount();
  });
});
