import React, { useState } from 'react';
import { AirQualityData, HouseholdPreferences } from '@shared/types';
import { api } from '../services/api';
import {
  Home,
  Wind,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle,
  Sparkles,
  Info
} from 'lucide-react';

interface IndoorGuidePageProps {
  airQuality: AirQualityData | null;
  preferences: HouseholdPreferences | null;
  onUpdatePreferences?: (prefs: HouseholdPreferences) => void;
}

export const IndoorGuidePage: React.FC<IndoorGuidePageProps> = ({ airQuality, preferences, onUpdatePreferences }) => {
  const [roomSizeSqFt, setRoomSizeSqFt] = useState<number>(200);
  const [hasHEPA, setHasHEPA] = useState<boolean>(preferences?.hasAirPurifier ?? true);
  const [cookingType, setCookingType] = useState<string>(
    preferences?.cookingType === 'induction_electric'
      ? 'induction'
      : preferences?.cookingType === 'gas_unvented'
      ? 'gas_unvented'
      : preferences?.cookingType === 'biomass_chulha'
      ? 'biomass'
      : 'gas_exhaust'
  );
  const [usesIncense, setUsesIncense] = useState<boolean>(
    (preferences?.indoorCombustionSources?.length ?? 0) > 0
  );
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Compute recommended CADR (Clean Air Delivery Rate)
  // CADR (cfm) = (Room Volume in cu ft * ACH) / 60
  // Standard ceiling height 8 ft -> Room Volume = roomSizeSqFt * 8
  // Recommended ACH = 4 (for pollution protection)
  const roomVolumeCuFt = roomSizeSqFt * 8;
  const recommendedCADR = Math.round((roomVolumeCuFt * 4) / 60);

  const outdoorAQI = airQuality?.aqi ?? 150;
  const isOutdoorSevere = outdoorAQI > 150;

  const handleSaveIndoorProfile = async () => {
    const updatedCooking =
      cookingType === 'induction'
        ? 'induction_electric'
        : cookingType === 'gas_unvented'
        ? 'gas_unvented'
        : cookingType === 'biomass'
        ? 'biomass_chulha'
        : 'gas_with_exhaust';

    const updatedPrefs: HouseholdPreferences = {
      householdSize: preferences?.householdSize || 3,
      hasChildren: preferences?.hasChildren || false,
      hasElderly: preferences?.hasElderly || false,
      hasRespiratorySensitivity: preferences?.hasRespiratorySensitivity || false,
      commuteMode: preferences?.commuteMode || 'public_transit',
      commuteDistanceKm: preferences?.commuteDistanceKm || 10,
      homeType: preferences?.homeType || 'apartment',
      ventilationType: preferences?.ventilationType || 'natural_cross',
      hasAirPurifier: hasHEPA,
      purifierFilterType: hasHEPA ? 'HEPA' : 'none',
      cookingType: updatedCooking,
      indoorCombustionSources: usesIncense ? ['incense_agarbatti', 'candles'] : [],
      sustainabilityFocus: preferences?.sustainabilityFocus || 'exposure_reduction'
    };

    try {
      const res = await api.updatePreferences(updatedPrefs);
      if (onUpdatePreferences) onUpdatePreferences(res);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      alert('Unable to save indoor profile right now.');
    }
  };

  return (
    <div className="space-y-6 py-4 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-navy-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Indoor Air Quality & Clean Air Zone Guide</span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Source control, mechanical HEPA filtration, and outdoor-aware ventilation
            </p>
          </div>
        </div>

        {/* Sensor Honesty Disclaimer */}
        <div className="mt-4 p-3 rounded-xl bg-navy-900 border border-slate-700/80 text-xs text-slate-400 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-300">Measurement Transparency:</strong> Without dedicated calibrated indoor sensors in your living room, AirWise AI provides verified structural guidelines and particle mitigation principles. We never fabricate exact numerical indoor AQI readings from outdoor weather models alone.
          </p>
        </div>
      </div>

      {/* Interactive Room & Device Configuration */}
      <div className="bg-navy-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>Interactive Room & Appliance Sizing</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Room Size */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
            <label htmlFor="room-size-range" className="font-semibold text-slate-300 block">Room Floor Area</label>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-teal-400">{roomSizeSqFt}</span>
              <span className="text-slate-400">sq. ft. (~{Math.round(roomSizeSqFt * 0.093)} m²)</span>
            </div>
            <input
              id="room-size-range"
              aria-label="Room Floor Area in square feet"
              type="range"
              min="100"
              max="600"
              step="50"
              value={roomSizeSqFt}
              onChange={e => setRoomSizeSqFt(Number(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
          </div>

          {/* Air Purifier */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
            <label className="font-semibold text-slate-300 block">Existing Air Purifier</label>
            <div className="flex gap-2">
              <button
                onClick={() => setHasHEPA(true)}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${
                  hasHEPA
                    ? 'bg-emerald-600 text-white'
                    : 'bg-navy-800 text-slate-400 border border-slate-700'
                }`}
              >
                HEPA Purifier
              </button>
              <button
                onClick={() => setHasHEPA(false)}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${
                  !hasHEPA
                    ? 'bg-amber-600 text-white'
                    : 'bg-navy-800 text-slate-400 border border-slate-700'
                }`}
              >
                None / Basic
              </button>
            </div>
            <span className="text-[11px] text-slate-400 block">
              {hasHEPA ? 'True H13/H14 particle filter' : 'No mechanical particle filtration'}
            </span>
          </div>

          {/* Cooking Setup */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
            <label className="font-semibold text-slate-300 block">Cooking Arrangement</label>
            <select
              value={cookingType}
              onChange={e => setCookingType(e.target.value)}
              className="w-full p-2 rounded-lg bg-navy-800 border border-slate-700 text-white text-xs focus:border-teal-500 focus:outline-none"
            >
              <option value="induction">Electric Induction (Cleanest)</option>
              <option value="gas_exhaust">Gas Stove with Exhaust Hood</option>
              <option value="gas_unvented">Gas Stove (No Range Hood)</option>
              <option value="biomass">Biomass / Chulha (High Smoke)</option>
            </select>
            <span className="text-[11px] text-slate-400 block">
              {cookingType === 'induction' ? 'Zero combustion byproducts' : 'Generates fine NO2 and soot'}
            </span>
          </div>

          {/* Indoor Combustion Sources */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
            <label className="font-semibold text-slate-300 block">Incense or Candles?</label>
            <div className="flex gap-2">
              <button
                onClick={() => setUsesIncense(false)}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${
                  !usesIncense
                    ? 'bg-emerald-600 text-white'
                    : 'bg-navy-800 text-slate-400 border border-slate-700'
                }`}
              >
                None
              </button>
              <button
                onClick={() => setUsesIncense(true)}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${
                  usesIncense
                    ? 'bg-rose-700 text-white'
                    : 'bg-navy-800 text-slate-400 border border-slate-700'
                }`}
              >
                Burned Regularly
              </button>
            </div>
            <span className="text-[11px] text-slate-400 block">
              {usesIncense ? 'High source of ultrafine soot' : 'Combustion sources eliminated'}
            </span>
          </div>
        </div>

        {/* Purifier Sizing Recommendation Result */}
        <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-teal-300 text-sm block">
              Recommended Purifier Capacity for your Room:
            </span>
            <p className="text-slate-300 mt-0.5">
              To achieve 4 Air Changes per Hour (ACH) in a {roomSizeSqFt} sq. ft. room with standard 8 ft ceilings:
            </p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-navy-900 border border-teal-500/40 text-center shrink-0">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Target CADR</span>
            <span className="text-xl font-extrabold text-teal-400">
              &ge; {recommendedCADR} CFM
            </span>
            <span className="text-[10px] text-slate-400 block">(~{Math.round(recommendedCADR * 1.7)} m³/h)</span>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSaveIndoorProfile}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-colors"
          >
            {savedSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                <span>Saved to Profile!</span>
              </>
            ) : (
              <span>Save Indoor Setup to Household Profile</span>
            )}
          </button>
        </div>
      </div>

      {/* Key Indoor Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* Module 1: Ventilation Strategy */}
        <div className="p-5 rounded-2xl bg-navy-800/80 border border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-950 text-sky-400 border border-sky-500/30">
              <Wind className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Outdoor-Aware Ventilation Protocol</h3>
          </div>

          <p className="text-slate-300 leading-relaxed">
            {isOutdoorSevere
              ? 'Outdoor air quality is currently hazardous/unhealthy. Keep all windows and balcony doors firmly closed. Natural draft infiltration will degrade indoor air within 30 minutes.'
              : 'Outdoor conditions are currently moderate. You may open opposing windows for a brief 15-20 minute cross-ventilation burst around midday to purge accumulated carbon dioxide (CO2).'}
          </p>

          <div className="p-3 rounded-xl bg-navy-900 border border-slate-800 space-y-1.5 text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Use door sweeps or rolled draft stoppers to block hallway smoke draft.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Never open windows during morning rush-hour temperature inversion.</span>
            </div>
          </div>
        </div>

        {/* Module 2: HEPA Filter Maintenance */}
        <div className="p-5 rounded-2xl bg-navy-800/80 border border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">HEPA Maintenance & Placement</h3>
          </div>

          <p className="text-slate-300 leading-relaxed">
            True mechanical HEPA filters capture &ge;99.97% of particles down to 0.3 microns. Clean airflow requires regular upkeep.
          </p>

          <ul className="space-y-1.5 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
              <span><strong>Pre-filter Mesh:</strong> Vacuum or wash every 2-4 weeks to capture coarse hair and pet dander.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
              <span><strong>True HEPA Core:</strong> Replace every 6-12 months. Do not wash true HEPA paper with water as it damages the micro-fiber weave.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
              <span><strong>Device Placement:</strong> Place at least 2 feet away from walls and curtains in the primary breathing zone.</span>
            </li>
          </ul>
        </div>

        {/* Module 3: Cooking & Kitchen Source Control */}
        <div className="p-5 rounded-2xl bg-navy-800/80 border border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-500/30">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Cooking Exhaust & Kitchen Hygiene</h3>
          </div>

          <p className="text-slate-300 leading-relaxed">
            Frying, deep boiling, and unvented gas stoves generate rapid PM2.5 spikes often exceeding 300 µg/m³ along with hazardous nitrogen dioxide.
          </p>

          <div className="p-3 rounded-xl bg-navy-900 border border-slate-800 space-y-1.5 text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Turn on range hood on maximum 1 minute before ignition and run 5 min after.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Isolate the kitchen by keeping adjacent living room doors closed while cooking.</span>
            </div>
          </div>
        </div>

        {/* Module 4: Crucial Safety Warnings (Ozone & Houseplants) */}
        <div className="p-5 rounded-2xl bg-navy-800/80 border border-rose-900/40 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-950 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Critical Health & Appliance Warnings</h3>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40">
              <strong className="text-rose-300 block mb-0.5">⚠️ Ozone Generator Warning:</strong>
              Never purchase or operate ozone generators or ionizing cleaners that release ozone gas. Ozone damages pulmonary airway linings, triggers asthma, and does not safely capture particulate matter.
            </div>

            <div className="p-3 rounded-xl bg-navy-900 border border-slate-800">
              <strong className="text-amber-300 block mb-0.5">🌿 Houseplant Reality Check:</strong>
              While plants are visually pleasant, scientific peer-reviewed chamber experiments confirm that common houseplants cannot measurably lower fine particulate smog (PM2.5) in living rooms. Do not rely on plants as substitutes for true HEPA filters.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
