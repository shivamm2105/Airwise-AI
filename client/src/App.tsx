import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { AirQualityData, HouseholdPreferences, LocationCoordinates } from '@shared/types';
import { api, isAbortError } from './services/api';
import { Navbar, NavTab } from './components/Navbar';
import { Footer } from './components/Footer';
import { DEFAULT_LOCATION } from './constants/locations';
import { DashboardPage } from './pages/DashboardPage';

const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const AssistantPage = lazy(() => import('./pages/AssistantPage').then(m => ({ default: m.AssistantPage })));
const DailyPlanPage = lazy(() => import('./pages/DailyPlanPage').then(m => ({ default: m.DailyPlanPage })));
const IndoorGuidePage = lazy(() => import('./pages/IndoorGuidePage').then(m => ({ default: m.IndoorGuidePage })));
const SustainablePlannerPage = lazy(() =>
  import('./pages/SustainablePlannerPage').then(m => ({ default: m.SustainablePlannerPage }))
);
const ImpactExplainerPage = lazy(() =>
  import('./pages/ImpactExplainerPage').then(m => ({ default: m.ImpactExplainerPage }))
);
const FamilyCommunityPage = lazy(() =>
  import('./pages/FamilyCommunityPage').then(m => ({ default: m.FamilyCommunityPage }))
);
const SavedActionsPage = lazy(() =>
  import('./pages/SavedActionsPage').then(m => ({ default: m.SavedActionsPage }))
);
const LocationModal = lazy(() => import('./components/LocationModal').then(m => ({ default: m.LocationModal })));

const RouteFallback: React.FC = () => (
  <div className="py-24 text-center text-xs text-slate-400" role="status" aria-live="polite">
    Loading section...
  </div>
);

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates>(DEFAULT_LOCATION);
  const [locationModalOpen, setLocationModalOpen] = useState<boolean>(false);

  // Never initialize fake pollution measurements as live readings; DashboardPage reserves layout height to prevent CLS
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<HouseholdPreferences | null>(null);
  const [preferencesRequested, setPreferencesRequested] = useState<boolean>(false);

  useEffect(() => {
    if (
      preferencesRequested ||
      currentTab === 'dashboard' ||
      currentTab === 'landing' ||
      currentTab === 'impact' ||
      currentTab === 'saved'
    ) {
      return;
    }

    setPreferencesRequested(true);
    api
      .getPreferences()
      .then(p => {
        if (p) setPreferences(p);
      })
      .catch(() => {
        // Non-fatal: defaults will apply until preferences are saved
      });
  }, [currentTab, preferencesRequested]);

  const loadAirQuality = useCallback(async (loc: LocationCoordinates, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAirQuality(
        {
          latitude: loc.latitude,
          longitude: loc.longitude,
          city: loc.name
        },
        signal
      );
      setAirQuality(data);
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      const msg = err instanceof Error ? err.message : 'Unable to connect to air quality service.';
      setError(msg);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadAirQuality(currentLocation, controller.signal);
    return () => controller.abort();
  }, [currentLocation, loadAirQuality]);

  const handleSelectLocation = useCallback((loc: LocationCoordinates) => {
    setAirQuality(null);
    setCurrentLocation(loc);
  }, []);

  const handleOpenLocationModal = useCallback(() => setLocationModalOpen(true), []);
  const handleCloseLocationModal = useCallback(() => setLocationModalOpen(false), []);
  const handleRefresh = useCallback(() => {
    loadAirQuality(currentLocation);
  }, [currentLocation, loadAirQuality]);

  return (
    <div className="min-h-screen flex flex-col bg-navy-900 text-slate-100 selection:bg-teal-500 selection:text-white">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentLocation={currentLocation}
        onOpenLocationModal={handleOpenLocationModal}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4" id="main-content">
        {currentTab === 'dashboard' ? (
          <DashboardPage
            data={airQuality}
            loading={loading}
            error={error}
            onRefresh={handleRefresh}
            onOpenLocation={handleOpenLocationModal}
            currentLocation={currentLocation}
            onNavigate={setCurrentTab}
          />
        ) : (
          <Suspense fallback={<RouteFallback />}>
            {currentTab === 'landing' && (
              <LandingPage
                onNavigate={setCurrentTab}
                onOpenLocation={handleOpenLocationModal}
              />
            )}

            {currentTab === 'plan' && (
              <DailyPlanPage airQuality={airQuality} preferences={preferences} />
            )}

            {currentTab === 'assistant' && (
              <AssistantPage airQuality={airQuality} preferences={preferences} />
            )}

            {currentTab === 'indoor' && (
              <IndoorGuidePage
                airQuality={airQuality}
                preferences={preferences}
                onUpdatePreferences={setPreferences}
              />
            )}

            {currentTab === 'sustainable' && (
              <SustainablePlannerPage airQuality={airQuality} preferences={preferences} />
            )}

            {currentTab === 'impact' && <ImpactExplainerPage />}

            {currentTab === 'community' && (
              <FamilyCommunityPage
                airQuality={airQuality}
                preferences={preferences}
                onUpdatePreferences={setPreferences}
              />
            )}

            {currentTab === 'saved' && <SavedActionsPage />}
          </Suspense>
        )}
      </main>

      <Footer />

      {locationModalOpen && (
        <Suspense fallback={null}>
          <LocationModal
            isOpen={locationModalOpen}
            onClose={handleCloseLocationModal}
            currentLocation={currentLocation}
            onSelectLocation={handleSelectLocation}
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
