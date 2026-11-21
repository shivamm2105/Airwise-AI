import React from 'react';
import { Wind, Shield, Database, Lock, AlertCircle, HeartHandshake } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-950 border-t border-slate-800/80 text-slate-400 text-xs py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        {/* Col 1: Product Mission */}
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Wind className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">AirWise AI</span>
          </div>
          <p className="text-slate-300 font-medium mb-2">Breathe Smarter. Live Healthier. Choose Greener.</p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Intelligent urban air quality assistant developed for PromptWars Virtual Challenge 6. Grounding Generative AI with verified environmental measurements and deterministic safety rules.
          </p>
        </div>

        {/* Col 2: Data Sources & Integrity */}
        <div>
          <div className="flex items-center gap-1.5 text-white font-bold mb-3 text-xs uppercase tracking-wider">
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span>Environmental Integrity</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-400">
            <li>• Atmospheric Data: Copernicus CAMS & Open-Meteo</li>
            <li>• Standards: US EPA AQI & Indian CPCB NAQI</li>
            <li>• Zero Hallucination: Missing pollutants kept null</li>
            <li>• Dual Impact: Exposure shielding vs Emission cuts</li>
          </ul>
        </div>

        {/* Col 3: AI Architecture & Safety */}
        <div>
          <div className="flex items-center gap-1.5 text-white font-bold mb-3 text-xs uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Architecture & Safety</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-400">
            <li>• Model: Google Gemini API (Official GenAI SDK)</li>
            <li>• Deterministic Rules: Smog & N95 constraints</li>
            <li>• Prompt Injection Defense & Input Sanitization</li>
            <li>• Evidence-Grounded Recommendations</li>
          </ul>
        </div>

        {/* Col 4: Privacy & Medical Notice */}
        <div>
          <div className="flex items-center gap-1.5 text-white font-bold mb-3 text-xs uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <span>Privacy & Ethics</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-400">
            <li>• Zero Sensitive Health Data Collection</li>
            <li>• Anonymous Coordinates & Manual City Entry</li>
            <li>• Exportable Local Persistence</li>
            <li>• WCAG 2.2 AA Accessible Design</li>
          </ul>
        </div>
      </div>

      {/* Medical Advisory Box */}
      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-2.5 max-w-3xl">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Public Health Notice:</strong> AirWise AI provides environmental health education, exposure mitigation guidance, and sustainability planning. It is not a clinical medical diagnostic service. If you experience severe shortness of breath, chest constriction, or acute wheezing, contact local emergency healthcare services immediately.
          </p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
          <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
          <span>PromptWars Virtual Challenge 6</span>
        </div>
      </div>
    </footer>
  );
};

