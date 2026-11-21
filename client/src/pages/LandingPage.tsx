import React from 'react';
import {
  Wind,
  ShieldAlert,
  Bot,
  Home,
  Bike,
  Scale,
  Users,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { NavTab } from '../components/Navbar';

interface LandingPageProps {
  onNavigate: (tab: NavTab) => void;
  onOpenLocation: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenLocation }) => {
  return (
    <div className="space-y-16 py-6">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-navy-800 via-navy-900 to-navy-950 border border-slate-800 p-8 sm:p-12 lg:p-16 shadow-2xl">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-bold tracking-wide uppercase mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PromptWars Challenge 6 • Production-Ready GenAI Assistant</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
            Breathe Smarter. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
              Live Healthier.
            </span>{' '}
            Choose Greener.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            AirWise AI transforms complex atmospheric measurements into actionable, evidence-aware daily routines. Grounded in real environmental sensor data, deterministic public health safety rules, and Google Gemini GenAI.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-navy-950 font-extrabold text-sm shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>Check Real-Time Air Quality</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('plan')}
              className="px-6 py-3.5 rounded-xl bg-navy-800 hover:bg-slate-800 border border-slate-700 text-white font-bold text-sm flex items-center gap-2 transition-all"
            >
              <span>Personalized Action Plan</span>
            </button>

            <button
              onClick={onOpenLocation}
              className="px-4 py-3.5 rounded-xl text-teal-300 hover:text-white font-medium text-sm flex items-center gap-1.5 transition-colors"
            >
              <span>Change Location</span>
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="mt-10 pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Copernicus & Open-Meteo Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Deterministic Safety Rules Engine</span>
            </div>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Grounded Gemini GenAI</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Severe Winter Smog & Urban Pollution Awareness */}
      <section className="bg-navy-800/60 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl">
        <div className="max-w-3xl mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block mb-1">
            Environmental Reality
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Understanding Severe Winter Smog & Temperature Inversion
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            During winter months across urban hubs, nocturnal thermal radiation cools the ground faster than upper atmospheric layers, trapping vehicular soot, road dust, and industrial smoke beneath a thermal ceiling.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-navy-900/80 border border-slate-700/60">
            <div className="w-10 h-10 rounded-xl bg-rose-950/80 text-rose-400 flex items-center justify-center mb-3">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">PM2.5 Lung Deposition</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Particles smaller than 2.5 microns penetrate deep into lung alveoli and enter the bloodstream. Exercising outdoors during high PM2.5 levels multiplies inhaled dose by 4-6x.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-navy-900/80 border border-slate-700/60">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 text-amber-400 flex items-center justify-center mb-3">
              <Wind className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">Ventilation Paradox</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Opening windows during hazardous outdoor smog pulls toxic particles indoors within 30 minutes. Infiltration must be controlled with targeted ventilation windows and true HEPA filtration.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-navy-900/80 border border-slate-700/60">
            <div className="w-10 h-10 rounded-xl bg-teal-950/80 text-teal-400 flex items-center justify-center mb-3">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">Personal vs Systemic Impact</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Wearing an N95 respirator protects your lungs but doesn’t reduce city emissions. Switching from solo driving to mass transit prevents tailpipe emissions. AirWise AI clearly distinguishes both.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Core Feature Pillars */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block mb-1">
            Complete Toolkit
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            How AirWise AI Protects Your Household
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Engineered to guide families and communities with scientific rigor and transparent AI synthesis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div
            onClick={() => onNavigate('dashboard')}
            className="p-6 rounded-2xl bg-navy-800/80 border border-slate-700 hover:border-teal-500/60 cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Wind className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-teal-300">
              Live Air Quality Dashboard
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Real-time AQI with regional standards (US EPA & Indian CPCB), PM2.5, PM10, NO2, SO2, O3, CO, and 24-hour hourly trend forecasts.
            </p>
          </div>

          {/* Feature 2 */}
          <div
            onClick={() => onNavigate('plan')}
            className="p-6 rounded-2xl bg-navy-800/80 border border-slate-700 hover:border-teal-500/60 cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300">
              Low-Emission Daily Routines
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Time-bracketed action schedules for morning exercise, clean commuting, workplace protection, and evening indoor air care.
            </p>
          </div>

          {/* Feature 3 */}
          <div
            onClick={() => onNavigate('assistant')}
            className="p-6 rounded-2xl bg-navy-800/80 border border-slate-700 hover:border-teal-500/60 cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-sky-300">
              Personalized AI Assistant
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ask contextual questions about outdoor safety, school activities, masks, and purifier configurations grounded in verified environmental readings.
            </p>
          </div>

          {/* Feature 4 */}
          <div
            onClick={() => onNavigate('indoor')}
            className="p-6 rounded-2xl bg-navy-800/80 border border-slate-700 hover:border-teal-500/60 cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Home className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300">
              Indoor Air Quality Guide
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              HEPA purifier sizing, cooking exhaust rules, dust management, filter replacement cycles, and clear warnings against harmful ozone generators.
            </p>
          </div>

          {/* Feature 5 */}
          <div
            onClick={() => onNavigate('sustainable')}
            className="p-6 rounded-2xl bg-navy-800/80 border border-slate-700 hover:border-teal-500/60 cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bike className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-300">
              Sustainable Living Planner
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Calculate tailpipe CO2 and PM avoided by choosing mass transit, carpooling, or trip chaining, with transparent calculation methodologies.
            </p>
          </div>

          {/* Feature 6 */}
          <div
            onClick={() => onNavigate('community')}
            className="p-6 rounded-2xl bg-navy-800/80 border border-slate-700 hover:border-teal-500/60 cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300">
              Family & Community Mode
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Protect children, seniors, and asthmatic family members. Generate privacy-safe shareable air quality briefings for your neighborhood.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Target User Personas */}
      <section className="bg-navy-900 border border-slate-800 rounded-3xl p-8 sm:p-10">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Designed for Diverse Urban Needs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-navy-800/60 border border-slate-700/60">
            <span className="font-bold text-teal-400 text-sm block mb-1">Parents & Families</span>
            <p className="text-slate-300 leading-relaxed">
              Determine when school playgrounds are safe, how to protect toddlers during morning commutes, and create clean indoor play sanctuaries.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-navy-800/60 border border-slate-700/60">
            <span className="font-bold text-emerald-400 text-sm block mb-1">Daily Commuters</span>
            <p className="text-slate-300 leading-relaxed">
              Select enclosed transport corridors during pollution spikes and verify proper N95 respirator fit to prevent roadside exhaust inhalation.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-navy-800/60 border border-slate-700/60">
            <span className="font-bold text-amber-400 text-sm block mb-1">Seniors & Vulnerable</span>
            <p className="text-slate-300 leading-relaxed">
              Receive cautious guidance for cardiovascular and respiratory sensitivities without collecting private medical records.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-navy-800/60 border border-slate-700/60">
            <span className="font-bold text-sky-400 text-sm block mb-1">Eco-Conscious Citizens</span>
            <p className="text-slate-300 leading-relaxed">
              Track actionable footprint reductions, avoid engine idling, and lead neighborhood clean-air awareness initiatives.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

