// @vitest-environment jsdom
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
import { getStandardImpact } from '../../shared/impact';
import { evaluateSafetyRules } from '../../shared/safetyRules';
import { api } from '../../client/src/services/api';
import { AirQualityData, AISynthesisResponse } from '../../shared/types';

async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    rules: {
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
    attribution: 'Copernicus CAMS & Open-Meteo',
    notes: 'CPCB NAQI applied.'
  }
};

describe('Page Interactions, Mobile Navigation & WCAG Accessibility Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('LandingPage exposes hero CTAs and all 6 feature cards as semantic buttons', async () => {
    const onNavigate = vi.fn();
    const onOpenLocation = vi.fn();
    const user = userEvent.setup();

    const { container } = render(<LandingPage onNavigate={onNavigate} onOpenLocation={onOpenLocation} />);
    await expectNoAxeViolations(container);

    await user.click(screen.getByRole('button', { name: /Change Location/i }));
    expect(onOpenLocation).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Personalized Action Plan/i }));
    expect(onNavigate).toHaveBeenCalledWith('plan');

    const aqiCard = screen.getByRole('button', { name: /Live Air Quality Dashboard/i });
    expect(aqiCard.tagName).toBe('BUTTON');
    await user.click(aqiCard);
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('Navbar manages desktop tabs and mobile drawer toggle cleanly', async () => {
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
    await user.click(screen.getByRole('button', { name: /Overview & Mission/i }));
    expect(onSelectTab).toHaveBeenCalledWith('landing');
  });

  it('LocationModal handles Escape, geolocation grant/deny, search errors, clear search, and preset picks', async () => {
    const onClose = vi.fn();
    const onSelectLocation = vi.fn();

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: unknown, error: (e: { code: number; PERMISSION_DENIED: number; TIMEOUT: number }) => void) =>
          error({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 })
      }
    });

    const view = render(
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

    // Also cover successful geolocation
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: (pos: { coords: { latitude: number; longitude: number } }) => void) =>
          success({ coords: { latitude: 51.5074, longitude: -0.1278 } })
      }
    });
    fireEvent.click(screen.getByRole('button', { name: /Use My Current Device Location/i }));
    expect(onSelectLocation).toHaveBeenCalledWith(expect.objectContaining({ name: 'Your Current Location' }));

    // Also cover timeout, unsupported browser geolocation, search error, and direct search result selection
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: unknown, error: (e: { code: number; PERMISSION_DENIED: number; TIMEOUT: number }) => void) =>
          error({ code: 3, PERMISSION_DENIED: 1, TIMEOUT: 3 })
      }
    });
    fireEvent.click(screen.getByRole('button', { name: /Use My Current Device Location/i }));
    expect(await screen.findByText(/Location request timed out/i)).toBeInTheDocument();

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: undefined
    });
    fireEvent.click(screen.getByRole('button', { name: /Use My Current Device Location/i }));
    expect(await screen.findByText(/Geolocation is not supported/i)).toBeInTheDocument();

    // Search failure then valid result click
    vi.spyOn(api, 'searchLocations').mockRejectedValueOnce(new Error('Network timeout'));
    const searchInput = screen.getByLabelText(/Search city/i);
    fireEvent.change(searchInput, { target: { value: 'Paris' } });
    fireEvent.submit(searchInput.closest('form')!);
    expect(await screen.findByText(/Search request timed out/i)).toBeInTheDocument();

    vi.spyOn(api, 'searchLocations').mockResolvedValueOnce([]);
    fireEvent.change(searchInput, { target: { value: 'UnknownXYZ' } });
    fireEvent.submit(searchInput.closest('form')!);
    expect(await screen.findByText(/No matching environmental stations found/i)).toBeInTheDocument();

    vi.spyOn(api, 'searchLocations').mockResolvedValueOnce([
      { name: 'Seattle', region: 'Washington', country: 'United States', latitude: 47.61, longitude: -122.33 }
    ]);
    fireEvent.change(searchInput, { target: { value: 'Seattle' } });
    fireEvent.submit(searchInput.closest('form')!);
    expect(await screen.findByText('Seattle')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Seattle/i }));
    expect(onSelectLocation).toHaveBeenCalledWith(expect.objectContaining({ name: 'Seattle' }));

    fireEvent.click(screen.getByRole('button', { name: /Clear Search/i }));
    expect(screen.getByText(/Featured Urban Centers/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /London/i }));
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /Dismiss Location Dialog/i }));
    expect(onClose).toHaveBeenCalled();
    view.unmount();
  });

  it('DashboardPage renders loading skeleton, fatal error retry, demo/stale badges, and partial refresh warning', async () => {
    const onRefresh = vi.fn();
    const onNavigate = vi.fn();

    const { rerender, container } = render(
      <DashboardPage
        data={null}
        loading={true}
        error={null}
        onRefresh={onRefresh}
        onOpenLocation={vi.fn()}
        currentLocation={SAMPLE_AQ.location}
        onNavigate={onNavigate}
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
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    rerender(
      <DashboardPage
        data={{ ...SAMPLE_AQ, isDemo: true, isStale: true }}
        loading={false}
        error="Timeout during refresh"
        onRefresh={onRefresh}
        onOpenLocation={vi.fn()}
        currentLocation={SAMPLE_AQ.location}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByText('Deterministic Demo Data')).toBeInTheDocument();
    expect(screen.getByText('Cached (Stale)')).toBeInTheDocument();
    expect(screen.getByText(/Live refresh encountered an issue/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Personalized Daily Plan/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ask AI Assistant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Indoor Clean Air Zone/i }));
    expect(onNavigate).toHaveBeenCalledTimes(3);
    await expectNoAxeViolations(container);
  });

  it('SavedActionsPage handles load error, toggling, filtering, export, single delete, and Clear All inline confirm', async () => {
    vi.spyOn(api, 'getSavedActions').mockRejectedValueOnce(new Error('Storage read failed'));
    const errView = render(<SavedActionsPage />);
    expect(await screen.findByText(/Storage read failed/i)).toBeInTheDocument();
    errView.unmount();

    const actionOne = {
      id: 'act_1',
      actionId: 'id1',
      title: 'Run HEPA Purifier',
      category: 'indoor',
      savedAt: '2026-11-27T08:00:00.000Z',
      completed: false,
      locationName: 'New Delhi',
      aqiAtSave: 220
    };
    const actionTwo = { ...actionOne, id: 'act_2', actionId: 'id2', title: 'Wear N95 Respirator' };

    vi.spyOn(api, 'getSavedActions').mockResolvedValueOnce([actionOne, actionTwo]);
    vi.spyOn(api, 'toggleActionCompletion').mockResolvedValueOnce({
      ...actionOne,
      completed: true,
      completedAt: '2026-11-27T09:00:00.000Z'
    });
    vi.spyOn(api, 'exportSummary').mockResolvedValueOnce({
      title: 'Summary',
      generatedAt: '2026-11-27T09:00:00.000Z',
      statistics: { totalActionsSaved: 2, actionsCompleted: 1, completionRatePercentage: 50 },
      householdPreferences: null,
      actionsList: [actionOne, actionTwo]
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

    fireEvent.click(screen.getByRole('button', { name: /Pending \(1\)/i }));
    expect(screen.getByText('Wear N95 Respirator')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Delete action "Wear N95 Respirator"/i }));
    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith('act_2'));

    fireEvent.click(screen.getByRole('button', { name: /All \(1\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Export Summary/i }));
    expect(await screen.findByText(/Action summary exported as JSON/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Clear All/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Are you sure you want to remove all saved actions/i);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(clearSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Clear All/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm Clear All/i }));
    await waitFor(() => expect(clearSpy).toHaveBeenCalledTimes(1));
  });

  it('SustainablePlannerPage displays active-travel safety alert and handles commute saves & errors', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /Carpooling/i }));
    fireEvent.click(screen.getByRole('button', { name: /Walking/i }));
    fireEvent.click(screen.getByRole('button', { name: /Remote \/ WFH/i }));

    fireEvent.change(screen.getByLabelText(/Roundtrip Daily Commute Distance/i), { target: { value: '24' } });
    fireEvent.click(screen.getByRole('button', { name: /Public Transit/i }));

    expect(await screen.findByText(/2\.04 kg CO2e/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Commit this Commute Habit/i }));
    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1));

    // Cover save failure feedback branch cleanly
    saveSpy.mockRejectedValueOnce(new Error('Checklist storage busy'));
    fireEvent.click(screen.getByRole('button', { name: /Saved to My Actions/i }));
    expect(await screen.findByText(/Checklist storage busy/i)).toBeInTheDocument();
  });

  it('IndoorGuidePage binds CADR sizing slider, toggles, cooking setup, and saves profile', async () => {
    const updatePrefsSpy = vi.fn();
    vi.spyOn(api, 'updatePreferences')
      .mockResolvedValueOnce({
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
      })
      .mockRejectedValueOnce(new Error('Indoor save blocked'));

    const { container, unmount } = render(
      <IndoorGuidePage
        airQuality={{ ...SAMPLE_AQ, aqi: 85 }}
        preferences={{
          householdSize: 3,
          hasChildren: false,
          hasElderly: false,
          hasRespiratorySensitivity: false,
          commuteMode: 'public_transit',
          commuteDistanceKm: 10,
          homeType: 'apartment',
          ventilationType: 'natural_cross',
          hasAirPurifier: true,
          purifierFilterType: 'HEPA',
          cookingType: 'induction_electric',
          indoorCombustionSources: [],
          sustainabilityFocus: 'general'
        }}
        onUpdatePreferences={updatePrefsSpy}
      />
    );

    const cookingSelect = screen.getByLabelText(/Cooking Arrangement/i);
    fireEvent.change(screen.getByLabelText(/Room Floor Area/i), { target: { value: '300' } });
    expect(screen.getByText(/160 CFM/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /None \/ Basic/i }));
    fireEvent.click(screen.getByRole('button', { name: /HEPA Purifier/i }));
    fireEvent.change(cookingSelect, { target: { value: 'gas_unvented' } });
    fireEvent.click(screen.getByRole('button', { name: /Burned Regularly/i }));
    fireEvent.click(screen.getByRole('button', { name: /^None$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save Indoor Setup/i }));

    await waitFor(() => expect(updatePrefsSpy).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /Saved to Profile/i }));
    expect(await screen.findByText(/Indoor save blocked/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Dismiss notification/i }));
    expect(screen.queryByText(/Indoor save blocked/i)).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
    unmount();

    // Verify IndoorGuidePage with airQuality={null} default baseline
    const nullAqView = render(<IndoorGuidePage airQuality={null} preferences={null} />);
    expect(screen.getByText(/Measurement Transparency/i)).toBeInTheDocument();
    nullAqView.unmount();
  });

  it('AssistantPage sends user prompt, handles failure fallback cleanly, supports reset, and passes axe-core', async () => {
    Element.prototype.scrollIntoView = vi.fn();

    const sendSpy = vi
      .spyOn(api, 'sendChatMessage')
      .mockResolvedValueOnce({
        response: 'Keep workouts **indoors** today and wear a fitted N95.',
        usedModel: 'gemini-3.5-flash-lite',
        groundedInContext: true
      })
      .mockRejectedValueOnce(new Error('Assistant rate limit'));

    const { container } = render(<AssistantPage airQuality={SAMPLE_AQ} preferences={null} />);
    await expectNoAxeViolations(container);

    const input = screen.getByLabelText(/Ask assistant a question/i);
    fireEvent.change(input, { target: { value: 'Should I run outdoors?' } });
    fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText(/indoors/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Follow up question?' } });
    fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText(/Assistant rate limit/i)).toBeInTheDocument();
    expect(sendSpy).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: /Clear chat conversation/i }));
    expect(screen.queryByText(/Should I run outdoors/i)).not.toBeInTheDocument();
  });

  it('FamilyCommunityPage, CommunityBriefingCard, DailyPlanPage, ImpactExplainerPage, ActionCard, Footer, and App pass WCAG & interactive coverage', async () => {
    const emptyPlan = render(<DailyPlanPage airQuality={null} preferences={null} />);
    expect(screen.getByText(/Select a location to generate/i)).toBeInTheDocument();
    emptyPlan.unmount();

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
    vi.spyOn(api, 'generateDailyPlan').mockRejectedValueOnce(new Error('Plan failed')).mockResolvedValue(mockPlan);
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
    expect(await screen.findByText(/Plan failed/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(await screen.findByText('Use HEPA Filter')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Save Action/i }));
    expect(await screen.findByText(/Saved to My Actions/i)).toBeInTheDocument();
    planView.unmount();

    // FamilyCommunityPage & CommunityBriefingCard complete interaction coverage
    const writeTextMock = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Clipboard blocked'));
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock }
    });

    const updatePrefsSpy = vi.fn();
    vi.spyOn(api, 'updatePreferences')
      .mockResolvedValueOnce({
        householdSize: 5,
        hasChildren: true,
        hasElderly: true,
        hasRespiratorySensitivity: true,
        commuteMode: 'carpool',
        commuteDistanceKm: 18,
        homeType: 'apartment',
        ventilationType: 'natural_cross',
        hasAirPurifier: false,
        purifierFilterType: 'none',
        cookingType: 'gas_with_exhaust',
        indoorCombustionSources: [],
        sustainabilityFocus: 'transport'
      })
      .mockRejectedValueOnce(new Error('Preferences update failed'));

    const communityView = render(
      <FamilyCommunityPage
        airQuality={SAMPLE_AQ}
        preferences={{
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
          cookingType: 'gas_with_exhaust',
          indoorCombustionSources: [],
          sustainabilityFocus: 'general'
        }}
        onUpdatePreferences={updatePrefsSpy}
      />
    );
    await expectNoAxeViolations(communityView.container);
    fireEvent.change(screen.getByLabelText(/Number of Household Members/i), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Children under 14/i }));
    fireEvent.click(screen.getByRole('button', { name: /Seniors \(65\+\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Respiratory Sensitivity/i }));
    fireEvent.change(screen.getByLabelText(/Primary Commute Mode/i), { target: { value: 'carpool' } });
    fireEvent.change(screen.getByLabelText(/Daily Commute Distance/i), { target: { value: '18' } });
    fireEvent.change(screen.getByLabelText(/Primary Sustainability Goal/i), { target: { value: 'transport' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Household Preferences/i }));
    await waitFor(() => expect(updatePrefsSpy).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Save Household Preferences/i }));
    expect(await screen.findByText(/Preferences update failed/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Copy Text Briefing/i }));
    expect(await screen.findByText(/Copied to Clipboard/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Copied to Clipboard/i }));
    expect(await screen.findByText(/Clipboard blocked/i)).toBeInTheDocument();

    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: undefined
    });
    fireEvent.click(screen.getByRole('button', { name: /Copied to Clipboard|Copy Text Briefing/i }));
    expect(await screen.findByText(/Clipboard copy is not supported/i)).toBeInTheDocument();
    communityView.unmount();

    const impactView = render(<ImpactExplainerPage />);
    await expectNoAxeViolations(impactView.container);
    fireEvent.click(screen.getByRole('button', { name: /Switching Solo Commute/i }));
    expect(screen.getByText(/Replaces single-occupancy driving/i)).toBeInTheDocument();
    impactView.unmount();

    const cardView = render(
      <ActionCard action={mockPlan.actions[0]} isSaved={false} onSave={vi.fn()} />
    );
    await expectNoAxeViolations(cardView.container);
    cardView.unmount();

    const footerView = render(<Footer />);
    await expectNoAxeViolations(footerView.container);
    footerView.unmount();

    // App full route & location selection coverage
    vi.spyOn(api, 'getPreferences').mockResolvedValue(null);
    vi.spyOn(api, 'getAirQuality')
      .mockRejectedValueOnce(new Error('Initial offline blip'))
      .mockResolvedValue(SAMPLE_AQ);
    vi.spyOn(api, 'calculateImpact').mockResolvedValue({
      avoidedKgCO2e: 1.32,
      avoidedGramsExhaustPM: 0.24,
      methodology: 'DEFRA',
      assumptions: '12 km',
      uncertaintyRange: '±25%'
    });

    const appView = render(<App />);
    expect(await screen.findByText(/Initial offline blip/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    expect((await screen.findAllByText('225')).length).toBeGreaterThan(0);
    await expectNoAxeViolations(appView.container);

    // Open LocationModal via Navbar & select London
    fireEvent.click(screen.getByRole('button', { name: /Current location:/i }));
    expect(await screen.findByText(/Select Your Location/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /London/i }));

    // Exercise lazy tabs including preference fetch trigger
    for (const tabRegex of [
      /Daily Action Plan/i,
      /AI Assistant/i,
      /Indoor Air Guide/i,
      /Sustainable Living/i,
      /Family & Community/i,
      /My Saved Actions/i,
      /Impact Explainer/i,
      /AirWise/i
    ]) {
      const btn = screen.getAllByRole('button', { name: tabRegex })[0];
      fireEvent.click(btn);
    }
    expect(await screen.findByText(/Breathe Smarter\./i)).toBeInTheDocument();
    appView.unmount();
  });
});
