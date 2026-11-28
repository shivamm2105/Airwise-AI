import React, { useState, useEffect } from 'react';
import { AirQualityData, HouseholdPreferences } from '@shared/types';
import { mergeHouseholdPreferences } from '@shared/preferences';
import { api } from '../services/api';
import { InlineFeedbackBanner } from '../components/InlineFeedbackBanner';
import { CommunityBriefingCard } from '../components/CommunityBriefingCard';
import { Users, GraduationCap, Sparkles, Check, Heart, Save, Info } from 'lucide-react';

interface FamilyCommunityPageProps {
  airQuality: AirQualityData | null;
  preferences: HouseholdPreferences | null;
  onUpdatePreferences: (prefs: HouseholdPreferences) => void;
}

const COMMUTE_MODES: readonly HouseholdPreferences['commuteMode'][] = [
  'public_transit',
  'car_alone',
  'carpool',
  'bicycle',
  'walk',
  'electric_vehicle',
  'work_from_home'
];

const SUSTAINABILITY_GOALS: readonly HouseholdPreferences['sustainabilityFocus'][] = [
  'exposure_reduction',
  'transport',
  'household_energy',
  'community',
  'general'
];

function isCommuteMode(value: string): value is HouseholdPreferences['commuteMode'] {
  return (COMMUTE_MODES as readonly string[]).includes(value);
}

function isSustainabilityFocus(value: string): value is HouseholdPreferences['sustainabilityFocus'] {
  return (SUSTAINABILITY_GOALS as readonly string[]).includes(value);
}

export const FamilyCommunityPage: React.FC<FamilyCommunityPageProps> = ({
  airQuality,
  preferences,
  onUpdatePreferences
}) => {
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const [householdSize, setHouseholdSize] = useState<number>(preferences?.householdSize ?? 3);
  const [hasChildren, setHasChildren] = useState<boolean>(preferences?.hasChildren ?? false);
  const [hasElderly, setHasElderly] = useState<boolean>(preferences?.hasElderly ?? false);
  const [hasRespiratorySensitivity, setHasRespiratorySensitivity] = useState<boolean>(
    preferences?.hasRespiratorySensitivity ?? false
  );
  const [commuteMode, setCommuteMode] = useState<HouseholdPreferences['commuteMode']>(
    preferences?.commuteMode ?? 'public_transit'
  );
  const [commuteDistanceKm, setCommuteDistanceKm] = useState<number>(
    preferences?.commuteDistanceKm ?? 10
  );
  const [sustainabilityFocus, setSustainabilityFocus] = useState<HouseholdPreferences['sustainabilityFocus']>(
    preferences?.sustainabilityFocus ?? 'general'
  );

  useEffect(() => {
    if (!preferences) return;
    setHouseholdSize(preferences.householdSize);
    setHasChildren(preferences.hasChildren);
    setHasElderly(preferences.hasElderly);
    setHasRespiratorySensitivity(preferences.hasRespiratorySensitivity);
    setCommuteMode(preferences.commuteMode);
    setCommuteDistanceKm(preferences.commuteDistanceKm);
    setSustainabilityFocus(preferences.sustainabilityFocus);
  }, [preferences]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const updated = mergeHouseholdPreferences(preferences, {
      householdSize: Math.min(20, Math.max(1, householdSize)),
      hasChildren,
      hasElderly,
      hasRespiratorySensitivity,
      commuteMode,
      commuteDistanceKm: Math.min(200, Math.max(0, commuteDistanceKm)),
      sustainabilityFocus
    });

    try {
      const saved = await api.updatePreferences(updated);
      onUpdatePreferences(saved);
      setFeedback({ variant: 'success', message: 'Household preferences saved and applied.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to save preferences right now.';
      setFeedback({ variant: 'error', message: msg });
    }
  };

  return (
    <div className="space-y-6 py-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-navy-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Family &amp; Community Protection Mode</span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Household lifestyle preferences, school safety guidelines, and neighborhood air awareness
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-navy-900 border border-slate-700/80 text-xs text-slate-400 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong className="text-slate-300">Privacy Safeguard:</strong> AirWise AI does not collect medical histories, names, or individual clinical diagnoses. All preferences are stored strictly in your local storage to customize general lifestyle guidelines.
          </p>
        </div>
      </div>

      {feedback && (
        <InlineFeedbackBanner
          variant={feedback.variant}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      {/* Household Preferences Form */}
      <form
        onSubmit={handleSavePreferences}
        className="bg-navy-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Heart className="w-4 h-4 text-purple-400" aria-hidden="true" />
            <span>Household Composition &amp; Vulnerability Preferences</span>
          </h2>
          {feedback?.variant === 'success' && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" aria-hidden="true" /> Preferences Saved!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          {/* Family Size */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
            <label htmlFor="household-size-input" className="font-semibold text-slate-300 block">
              Number of Household Members
            </label>
            <div className="flex items-center gap-3">
              <input
                id="household-size-input"
                aria-label="Number of Household Members"
                type="number"
                min="1"
                max="20"
                value={householdSize}
                onChange={e => setHouseholdSize(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                className="w-20 p-2 rounded-lg bg-navy-800 border border-slate-700 text-white font-bold text-base text-center"
              />
              <span className="text-slate-400">People in residence</span>
            </div>
          </div>

          {/* Vulnerable Groups */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2 sm:col-span-2">
            <span id="demographics-group-label" className="font-semibold text-slate-300 block">
              General Household Demographics
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="group" aria-labelledby="demographics-group-label">
              <button
                type="button"
                aria-pressed={hasChildren}
                onClick={() => setHasChildren(!hasChildren)}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${hasChildren
                  ? 'bg-purple-950/80 border-purple-500 text-purple-300 font-bold'
                  : 'bg-navy-800 border-slate-700 text-slate-400'
                  }`}
              >
                <span>Children under 14</span>
                {hasChildren && <Check className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />}
              </button>

              <button
                type="button"
                aria-pressed={hasElderly}
                onClick={() => setHasElderly(!hasElderly)}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${hasElderly
                  ? 'bg-purple-950/80 border-purple-500 text-purple-300 font-bold'
                  : 'bg-navy-800 border-slate-700 text-slate-400'
                  }`}
              >
                <span>Seniors (65+)</span>
                {hasElderly && <Check className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />}
              </button>

              <button
                type="button"
                aria-pressed={hasRespiratorySensitivity}
                onClick={() => setHasRespiratorySensitivity(!hasRespiratorySensitivity)}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${hasRespiratorySensitivity
                  ? 'bg-purple-950/80 border-purple-500 text-purple-300 font-bold'
                  : 'bg-navy-800 border-slate-700 text-slate-400'
                  }`}
              >
                <span>Respiratory Sensitivity</span>
                {hasRespiratorySensitivity && <Check className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {/* Commute Mode */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
            <label htmlFor="commute-mode-select" className="font-semibold text-slate-300 block">
              Primary Commute Mode
            </label>
            <select
              id="commute-mode-select"
              aria-label="Primary Commute Mode"
              value={commuteMode}
              onChange={e => {
                if (isCommuteMode(e.target.value)) setCommuteMode(e.target.value);
              }}
              className="w-full p-2.5 rounded-lg bg-navy-800 border border-slate-700 text-white text-xs focus:border-purple-500"
            >
              <option value="public_transit">Public Transit (Metro / Bus)</option>
              <option value="car_alone">Private Car (Single Occupant)</option>
              <option value="carpool">Carpool / Shared Cab</option>
              <option value="bicycle">Bicycle / E-Bike</option>
              <option value="walk">Walking</option>
              <option value="electric_vehicle">Electric Vehicle</option>
              <option value="work_from_home">Work from Home (Remote)</option>
            </select>
          </div>

          {/* Commute Distance */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
            <label htmlFor="commute-distance-input" className="font-semibold text-slate-300 block">
              Daily Commute Distance
            </label>
            <div className="flex items-center gap-3">
              <input
                id="commute-distance-input"
                aria-label="Daily Commute Distance in kilometers"
                type="number"
                min="0"
                max="200"
                value={commuteDistanceKm}
                onChange={e => setCommuteDistanceKm(Math.min(200, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                className="w-20 p-2 rounded-lg bg-navy-800 border border-slate-700 text-white font-bold text-base text-center"
              />
              <span className="text-slate-400">km roundtrip</span>
            </div>
          </div>

          {/* Sustainability Focus */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
            <label htmlFor="sustainability-focus-select" className="font-semibold text-slate-300 block">
              Primary Sustainability Goal
            </label>
            <select
              id="sustainability-focus-select"
              aria-label="Primary Sustainability Goal"
              value={sustainabilityFocus}
              onChange={e => {
                if (isSustainabilityFocus(e.target.value)) setSustainabilityFocus(e.target.value);
              }}
              className="w-full p-2.5 rounded-lg bg-navy-800 border border-slate-700 text-white text-xs focus:border-purple-500"
            >
              <option value="exposure_reduction">Personal Exposure Shielding</option>
              <option value="transport">Clean Transportation &amp; Commuting</option>
              <option value="household_energy">Household Energy Efficiency</option>
              <option value="community">Community Clean Air Advocacy</option>
              <option value="general">Comprehensive General Living</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-colors"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span>Save Household Preferences</span>
          </button>
        </div>
      </form>

      {/* Shareable Community Air Quality Briefing */}
      <CommunityBriefingCard
        airQuality={airQuality}
        onErrorFeedback={message => setFeedback({ variant: 'error', message })}
      />

      {/* School & Neighborhood Habit Challenges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div className="p-5 rounded-2xl bg-navy-800/80 border border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-500/30">
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-white">School Playground Protocol</h3>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Children breathe 50% more air per pound of body weight than adults, and their narrower airways make them disproportionately vulnerable to bronchial spasms during winter smog.
          </p>
          <ul className="space-y-1.5 text-slate-300 text-[11px]">
            <li>• <strong>AQI &gt; 150:</strong> School sports and outdoor recess must be moved to gymnasiums or classrooms.</li>
            <li>• <strong>Anti-Idling School Gates:</strong> Prohibit parent vehicle idling while waiting outside pickup zones.</li>
            <li>• <strong>Classroom Sealing:</strong> Keep classroom windows facing arterial streets closed during morning arrival hours.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-navy-800/80 border border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-950 text-teal-400 border border-teal-500/30">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-white">Neighborhood Habit Challenge</h3>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Tangible collective actions that reduce community-level toxic emissions:
          </p>
          <ul className="space-y-1.5 text-slate-300 text-[11px]">
            <li>• <strong>Zero Waste Combustion:</strong> Report open leaf burning or dumpster fires to municipal hotlines.</li>
            <li>• <strong>Carpool Pods:</strong> Group school drop-offs with 2 nearby families to eliminate 40 redundant car trips per month.</li>
            <li>• <strong>Check on Elderly Neighbors:</strong> Remind older adults with cardiovascular vulnerabilities to stay indoors during morning smog peaks.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
