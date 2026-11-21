import React, { useState, useEffect } from 'react';
import { AirQualityData, HouseholdPreferences, LocationCoordinates } from '@shared/types';
import { api } from './services/api';
import { Navbar, NavTab } from './components/Navbar';
import { Footer } from './components/Footer';
import { LocationModal } from './components/LocationModal';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AssistantPage } from './pages/AssistantPage';
import { DailyPlanPage } from './pages/DailyPlanPage';
import { IndoorGuidePage } from './pages/IndoorGuidePage';
import { SustainablePlannerPage } from './pages/SustainablePlannerPage';
import { ImpactExplainerPage } from './pages/ImpactExplainerPage';
import { FamilyCommunityPage } from './pages/FamilyCommunityPage';
import { SavedActionsPage } from './pages/SavedActionsPage';

// Default initial location: New Delhi (Urban smog case study)
const DEFAULT_LOCATION: LocationCoordinates = {
  name: 'New Delhi',
  region: 'Delhi',
  country: 'India',
  latitude: 28.6139,
  longitude: 77.2090,
  timezone: 'Asia/Kolkata'
};

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates>(DEFAULT_LOCATION);
  const [locationModalOpen, setLocationModalOpen] = useState<boolean>(false);

  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<HouseholdPreferences | null>(null);

  // Fetch initial preferences
  useEffect(() => {
    api.getPreferences()
      .then(p => {
        if (p) setPreferences(p);
      })
      .catch(() => {
        // Fallback or memory
      });
  }, []);

  // Fetch air quality data whenever location changes
  const loadAirQuality = async (loc: LocationCoordinates) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAirQuality({
        latitude: loc.latitude,
        longitude: loc.longitude,
        city: loc.name
      });
      setAirQuality(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to air quality service.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAirQuality(currentLocation);
  }, [currentLocation.latitude, currentLocation.longitude]);

  const handleSelectLocation = (loc: LocationCoordinates) => {
    setCurrentLocation(loc);
  };

  return (
    <div className="min-h-screen flex flex-col bg-navy-900 text-slate-100 selection:bg-teal-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentLocation={currentLocation}
        onOpenLocationModal={() => setLocationModalOpen(true)}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4" id="main-content">
        {currentTab === 'landing' && (
          <LandingPage
            onNavigate={setCurrentTab}
            onOpenLocation={() => setLocationModalOpen(true)}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardPage
            data={airQuality}
            loading={loading}
            error={error}
            onRefresh={() => loadAirQuality(currentLocation)}
            onOpenLocation={() => setLocationModalOpen(true)}
            currentLocation={currentLocation}
            onNavigate={setCurrentTab}
          />
        )}

        {currentTab === 'plan' && (
          <DailyPlanPage
            airQuality={airQuality}
            preferences={preferences}
          />
        )}

        {currentTab === 'assistant' && (
          <AssistantPage
            airQuality={airQuality}
            preferences={preferences}
          />
        )}

        {currentTab === 'indoor' && (
          <IndoorGuidePage
            airQuality={airQuality}
            preferences={preferences}
            onUpdatePreferences={setPreferences}
          />
        )}

        {currentTab === 'sustainable' && (
          <SustainablePlannerPage
            airQuality={airQuality}
            preferences={preferences}
          />
        )}

        {currentTab === 'impact' && (
          <ImpactExplainerPage />
        )}

        {currentTab === 'community' && (
          <FamilyCommunityPage
            airQuality={airQuality}
            preferences={preferences}
            onUpdatePreferences={setPreferences}
          />
        )}

        {currentTab === 'saved' && (
          <SavedActionsPage />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Location Modal */}
      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        currentLocation={currentLocation}
        onSelectLocation={handleSelectLocation}
      />
    </div>
  );
};

export default App;

