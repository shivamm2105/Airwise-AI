import React, { useState } from 'react';
import { AirQualityData } from '@shared/types';
import { Share2, Copy, Check } from 'lucide-react';

interface CommunityBriefingCardProps {
  airQuality: AirQualityData | null;
  onErrorFeedback: (message: string) => void;
}

export const CommunityBriefingCard: React.FC<CommunityBriefingCardProps> = ({
  airQuality,
  onErrorFeedback
}) => {
  const [copied, setCopied] = useState(false);

  const loc = airQuality?.location.name || 'Our City';
  const aqi = airQuality?.aqi ?? 'N/A';
  const standard = airQuality?.indexStandard || 'Standard';
  const cat = airQuality?.categoryLabel || 'Moderate';

  const shareableText = `🌫️ AirWise AI Community Briefing for ${loc}:
• Status: ${cat} (AQI ${aqi} [${standard}])
• Key Advice: ${aqi !== 'N/A' && Number(aqi) > 150
    ? 'Hazardous outdoor air. Move children play & workouts indoors. Wear N95 respirators outdoors.'
    : 'Satisfactory air quality. Maintain good ventilation and choose low-emission commuting.'}
• Community Tip: Avoid vehicle engine idling outside schools and report unauthorized open biomass burning.
— Generated via AirWise AI (Evidence-Grounded Environmental Intelligence)`;

  const handleCopyShareable = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shareableText);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        onErrorFeedback('Clipboard copy is not supported in this environment.');
      }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : 'Unable to access clipboard permissions.';
      onErrorFeedback(detail);
    }
  };

  return (
    <div className="bg-navy-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
            Community Outreach
          </span>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-purple-400" aria-hidden="true" />
            <span>Shareable Privacy-Safe Air Quality Card</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={handleCopyShareable}
          className="px-4 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-semibold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-center"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Copy Text Briefing</span>
            </>
          )}
        </button>
      </div>

      <div className="p-4 rounded-xl bg-navy-900/90 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-line leading-relaxed shadow-inner">
        {shareableText}
      </div>
      <p className="text-[11px] text-slate-400">
        Privacy note: This briefing shares the city name and verified AQI, without revealing your precise home street or GPS coordinates. Perfect for parent WhatsApp groups, resident associations, and neighborhood noticeboards.
      </p>
    </div>
  );
};
