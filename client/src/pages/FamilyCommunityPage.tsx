import React, { useState } from 'react';
import { AirQualityData, HouseholdPreferences } from '@shared/types';
import { api } from '../services/api';
import {
  Users,
  Share2,
  GraduationCap,
  Sparkles,
  Check,
  Heart,
  Save,
  Copy,
  Info
} from 'lucide-react';

interface FamilyCommunityPageProps {
  airQuality: AirQualityData | null;
  preferences: HouseholdPreferences | null;
  onUpdatePreferences: (prefs: HouseholdPreferences) => void;
}

export const FamilyCommunityPage: React.FC<FamilyCommunityPageProps> = ({
  airQuality,
  preferences,
  onUpdatePreferences
}) => {
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form State initialized from preferences
  const [householdSize, setHouseholdSize] = useState<number>(preferences?.householdSize || 3);
  const [hasChildren, setHasChildren] = useState<boolean>(preferences?.hasChildren || false);
  const [hasElderly, setHasElderly] = useState<boolean>(preferences?.hasElderly || false);
  const [hasRespiratorySensitivity, setHasRespiratorySensitivity] = useState<boolean>(
    preferences?.hasRespiratorySensitivity || false
  );
  const [commuteMode, setCommuteMode] = useState<HouseholdPreferences['commuteMode']>(
    preferences?.commuteMode || 'public_transit'
  );
  const [commuteDistanceKm, setCommuteDistanceKm] = useState<number>(
    preferences?.commuteDistanceKm || 10
  );
  const [sustainabilityFocus, setSustainabilityFocus] = useState<HouseholdPreferences['sustainabilityFocus']>(
    preferences?.sustainabilityFocus || 'general'
  );

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: HouseholdPreferences = {
      householdSize,
      hasChildren,
      hasElderly,
      hasRespiratorySensitivity,
      commuteMode,
      commuteDistanceKm,
      homeType: preferences?.homeType || 'apartment',
      ventilationType: preferences?.ventilationType || 'natural_cross',
      hasAirPurifier: preferences?.hasAirPurifier || false,
      purifierFilterType: preferences?.purifierFilterType || 'none',
      cookingType: preferences?.cookingType || 'gas_with_exhaust',
      indoorCombustionSources: preferences?.indoorCombustionSources || [],
      sustainabilityFocus
    };

    try {
      await api.updatePreferences(updated);
      onUpdatePreferences(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      alert('Unable to save preferences right now.');
    }
  };

  const generateShareableText = () => {
    const loc = airQuality?.location.name || 'Our City';
    const aqi = airQuality?.aqi ?? 'N/A';
    const standard = airQuality?.indexStandard || 'Standard';
    const cat = airQuality?.categoryLabel || 'Moderate';

    return `🌫️ AirWise AI Community Briefing for ${loc}:
• Status: ${cat} (AQI ${aqi} [${standard}])
• Key Advice: ${
      aqi !== 'N/A' && Number(aqi) > 150
        ? 'Hazardous outdoor air. Move children play & workouts indoors. Wear N95 respirators outdoors.'
        : 'Satisfactory air quality. Maintain good ventilation and choose low-emission commuting.'
    }
• Community Tip: Avoid vehicle engine idling outside schools and report unauthorized open biomass burning.
— Generated via AirWise AI (Evidence-Grounded Environmental Intelligence)`;
  };

  const handleCopyShareable = () => {
    const text = generateShareableText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6 py-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-navy-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Family & Community Protection Mode</span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Household lifestyle preferences, school safety guidelines, and neighborhood air awareness
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-navy-900 border border-slate-700/80 text-xs text-slate-400 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-300">Privacy Safeguard:</strong> AirWise AI does not collect medical histories, names, or individual clinical diagnoses. All preferences are stored strictly in your local storage to customize general lifestyle guidelines.
          </p>
        </div>
      </div>

      {/* Household Preferences Form */}
      <form onSubmit={handleSavePreferences} className="bg-navy-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Heart className="w-4 h-4 text-purple-400" />
            <span>Household Composition & Vulnerability Preferences</span>
          </h2>
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Preferences Saved!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          {/* Family Size */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
            <label htmlFor="household-size-input" className="font-semibold text-slate-300 block">Number of Household Members</label>
            <div className="flex items-center gap-3">
              <input
                id="household-size-input"
                aria-label="Number of Household Members"
                type="number"
                min="1"
                max="15"
                value={householdSize}
                onChange={e => setHouseholdSize(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 p-2 rounded-lg bg-navy-800 border border-slate-700 text-white font-bold text-base text-center"
              />
              <span className="text-slate-400">People in residence</span>
            </div>
          </div>

          {/* Vulnerable Groups */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2 sm:col-span-2">
            <label className="font-semibold text-slate-300 block">General Household Demographics</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setHasChildren(!hasChildren)}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                  hasChildren
                    ? 'bg-purple-950/80 border-purple-500 text-purple-300 font-bold'
                    : 'bg-navy-800 border-slate-700 text-slate-400'
                }`}
              >
                <span>Children under 14</span>
                {hasChildren && <Check className="w-3.5 h-3.5 text-purple-400" />}
              </button>

              <button
                type="button"
                onClick={() => setHasElderly(!hasElderly)}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                  hasElderly
                    ? 'bg-purple-950/80 border-purple-500 text-purple-300 font-bold'
                    : 'bg-navy-800 border-slate-700 text-slate-400'
                }`}
              >
                <span>Seniors (65+)</span>
                {hasElderly && <Check className="w-3.5 h-3.5 text-purple-400" />}
              </button>

              <button
                type="button"
                onClick={() => setHasRespiratorySensitivity(!hasRespiratorySensitivity)}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                  hasRespiratorySensitivity
                    ? 'bg-purple-950/80 border-purple-500 text-purple-300 font-bold'
                    : 'bg-navy-800 border-slate-700 text-slate-400'
                }`}
              >
                <span>Respiratory Sensitivity</span>
                {hasRespiratorySensitivity && <Check className="w-3.5 h-3.5 text-purple-400" />}
              </button>
            </div>
          </div>

          {/* Commute Mode */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
            <label htmlFor="commute-mode-select" className="font-semibold text-slate-300 block">Primary Commute Mode</label>
            <select
              id="commute-mode-select"
              aria-label="Primary Commute Mode"
              value={commuteMode}
              onChange={e => setCommuteMode(e.target.value as HouseholdPreferences['commuteMode'])}
              className="w-full p-2.5 rounded-lg bg-navy-800 border border-slate-700 text-white text-xs focus:border-purple-500 focus:outline-none"
            >
              <option value="public_transit">Public Transit (Metro / Bus)</option>
              <option value="car_alone">Private Car (Single Occupant)</option>
              <option value="carpool">Carpool / Shared Cab</option>
              <option value="bicycle">Bicycle / E-Bike</option>
              <option value="walk">Walking</option>
              <option value="work_from_home">Work from Home (Remote)</option>
            </select>
          </div>

          {/* Commute Distance */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
            <label htmlFor="commute-distance-input" className="font-semibold text-slate-300 block">Daily Commute Distance</label>
            <div className="flex items-center gap-3">
              <input
                id="commute-distance-input"
                aria-label="Daily Commute Distance in kilometers"
                type="number"
                min="0"
                max="100"
                value={commuteDistanceKm}
                onChange={e => setCommuteDistanceKm(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 p-2 rounded-lg bg-navy-800 border border-slate-700 text-white font-bold text-base text-center"
              />
              <span className="text-slate-400">km roundtrip</span>
            </div>
          </div>

          {/* Sustainability Focus */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
            <label htmlFor="sustainability-focus-select" className="font-semibold text-slate-300 block">Primary Sustainability Goal</label>
            <select
              id="sustainability-focus-select"
              aria-label="Primary Sustainability Goal"
              value={sustainabilityFocus}
              onChange={e => setSustainabilityFocus(e.target.value as HouseholdPreferences['sustainabilityFocus'])}
              className="w-full p-2.5 rounded-lg bg-navy-800 border border-slate-700 text-white text-xs focus:border-purple-500 focus:outline-none"
            >
              <option value="exposure_reduction">Personal Exposure Shielding</option>
              <option value="transport">Clean Transportation & Commuting</option>
              <option value="household_energy">Household Energy Efficiency</option>
              <option value="community">Community Clean Air Advocacy</option>
              <option value="general">Comprehensive General Living</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Household Preferences</span>
          </button>
        </div>
      </form>

      {/* Shareable Community Air Quality Briefing */}
      <div className="bg-navy-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
              Community Outreach
            </span>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-purple-400" />
              <span>Shareable Privacy-Safe Air Quality Card</span>
            </h2>
          </div>
          <button
            onClick={handleCopyShareable}
            className="px-4 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-semibold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-center"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Text Briefing</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 rounded-xl bg-navy-900/90 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-line leading-relaxed shadow-inner">
          {generateShareableText()}
        </div>
        <p className="text-[11px] text-slate-400">
          Privacy note: This briefing shares the city name and verified AQI, without revealing your precise home street or GPS coordinates. Perfect for parent WhatsApp groups, resident associations, and neighborhood noticeboards.
        </p>
      </div>

      {/* School & Neighborhood Habit Challenges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div className="p-5 rounded-2xl bg-navy-800/80 border border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-500/30">
              <GraduationCap className="w-4 h-4" />
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
              <Sparkles className="w-4 h-4" />
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
