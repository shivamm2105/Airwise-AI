// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AQIBadge } from '../../client/src/components/AQIBadge';
import { ForecastChart } from '../../client/src/components/ForecastChart';
import { PollutantCard } from '../../client/src/components/PollutantCard';
import { SafetyAlertBanner } from '../../client/src/components/SafetyAlertBanner';
import { ImpactCard } from '../../client/src/components/ImpactCard';
import { getStandardImpact } from '../../shared/impact';
import { AQICategory, HourlyForecastPoint, SafetyEvaluation } from '../../shared/types';

describe('Frontend Component Tests', () => {
  describe('AQIBadge', () => {
    it('renders all 7 AQI categories cleanly in large and compact badges without color-only dependence', () => {
      const cases: Array<{ aqi: number | null; category: AQICategory; label: string; expectedText: RegExp }> = [
        { aqi: 30, category: 'GOOD', label: 'Good', expectedText: /Ideal conditions for outdoor ventilation/i },
        { aqi: 75, category: 'MODERATE', label: 'Moderate', expectedText: /Air quality is acceptable/i },
        { aqi: 125, category: 'UNHEALTHY_SENSITIVE', label: 'Sensitive', expectedText: /Children, elderly/i },
        { aqi: 175, category: 'UNHEALTHY', label: 'Unhealthy', expectedText: /elevated cardiovascular/i },
        { aqi: 250, category: 'VERY_UNHEALTHY', label: 'Very Unhealthy', expectedText: /Serious health risk/i },
        { aqi: 380, category: 'HAZARDOUS', label: 'Hazardous', expectedText: /Emergency health conditions/i },
        { aqi: null, category: 'UNKNOWN', label: 'Data Unavailable', expectedText: /currently compiling/i }
      ];

      for (const tc of cases) {
        const view = render(
          <AQIBadge
            aqi={tc.aqi}
            category={tc.category}
            categoryLabel={tc.label}
            standard="US_AQI"
            size="lg"
          />
        );
        expect(screen.getByText(tc.expectedText)).toBeInTheDocument();
        view.unmount();
      }

      render(
        <AQIBadge
          aqi={null}
          category="UNKNOWN"
          categoryLabel="Data Unavailable"
          standard="US_AQI"
          size="sm"
        />
      );
      expect(screen.getByText(/Data Unavailable/i)).toBeInTheDocument();
    });
  });

  describe('ForecastChart', () => {
    it('renders empty state gracefully and charts all AQI severity colors plus null/invalid points', () => {
      const empty = render(<ForecastChart hourly={[]} />);
      expect(screen.getByText(/Hourly forecast data is not provided/i)).toBeInTheDocument();
      empty.unmount();

      const hourly: HourlyForecastPoint[] = [
        { time: '2026-11-27T01:00:00.000Z', aqi: 35, pm2_5: 8, pm10: 15, category: 'GOOD' },
        { time: '2026-11-27T02:00:00.000Z', aqi: 80, pm2_5: 25, pm10: 50, category: 'MODERATE' },
        { time: '2026-11-27T03:00:00.000Z', aqi: 130, pm2_5: 45, pm10: 85, category: 'UNHEALTHY_SENSITIVE' },
        { time: '2026-11-27T04:00:00.000Z', aqi: 180, pm2_5: 75, pm10: 120, category: 'UNHEALTHY' },
        { time: '2026-11-27T05:00:00.000Z', aqi: 240, pm2_5: 130, pm10: 210, category: 'VERY_UNHEALTHY' },
        { time: '2026-11-27T06:00:00.000Z', aqi: 360, pm2_5: 210, pm10: 320, category: 'HAZARDOUS' },
        { time: 'invalid-iso-timestamp', aqi: null, pm2_5: null, pm10: null, category: 'UNKNOWN' }
      ];

      render(<ForecastChart hourly={hourly} />);
      expect(screen.getByRole('region', { name: /24-hour Air Quality Forecast Chart/i })).toBeInTheDocument();
      expect(screen.getByText('360')).toBeInTheDocument();
      expect(screen.getByText(/Air Quality Index: Unavailable/i)).toBeInTheDocument();
    });
  });

  describe('PollutantCard', () => {
    it('renders pollutant value, units, high benchmark badge, and null station placeholder', () => {
      const high = render(
        <PollutantCard
          name="PM2.5"
          fullName="Fine Particulate Matter"
          value={48.5}
          whoStandardLimit={15}
          description="Inhalable fine particles"
        />
      );
      expect(screen.getByText('48.5')).toBeInTheDocument();
      expect(screen.getByText('µg/m³')).toBeInTheDocument();
      expect(screen.getByText(/Ref: ≤15/i)).toBeInTheDocument();
      high.unmount();

      render(
        <PollutantCard
          name="SO2"
          fullName="Sulphur Dioxide"
          value={null}
          whoStandardLimit={40}
          description="Sulphur combustion gas"
        />
      );
      expect(screen.getByText('Not Reported by Station')).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('SafetyAlertBanner & ImpactCard', () => {
    const baseSafety: SafetyEvaluation = {
      severeSmogAlert: true,
      outdoorExerciseSafe: false,
      childrenOutdoorPlaySafe: false,
      respiratorTier: 'ESSENTIAL_N95_STRICT',
      respiratorGuidance: 'Wear properly fitted N95 respirators for all outdoor travel.',
      clothMaskWarning: 'Ordinary cloth masks do not filter fine PM2.5.',
      ventilationDecision: {
        recommended: false,
        reason: 'Keep windows and doors securely closed.'
      },
      airPurifierAdvice: {
        hepaRecommended: true,
        ozoneWarning: 'Do not use ozone generators.',
        houseplantRealityCheck: 'Houseplants cannot replace filtration.',
        diyFilterSafetyWarning: 'Use MERV-13 filters with thermal protection.'
      },
      urgentMedicalAdvisory: 'AirWise AI is an educational tool.',
      deterministicRulesApplied: ['RULE_SEVERE_SMOG_ALERT']
    };

    it('renders severe smog and normal non-severe variants cleanly', () => {
      const severe = render(<SafetyAlertBanner safety={baseSafety} />);
      expect(screen.getByText('Severe Smog Inversion Warning')).toBeInTheDocument();
      expect(screen.getByText('Keep Windows Closed')).toBeInTheDocument();
      severe.unmount();

      const mildSafety: SafetyEvaluation = {
        ...baseSafety,
        severeSmogAlert: false,
        outdoorExerciseSafe: true,
        ventilationDecision: { recommended: true, reason: 'Natural ventilation safe.' }
      };
      render(<SafetyAlertBanner safety={mildSafety} />);
      expect(screen.getByText('Natural Ventilation Safe')).toBeInTheDocument();
    });

    it('renders full and compact ImpactCard layouts clearly', () => {
      const impact = getStandardImpact('switch_to_transit', 10);
      const full = render(<ImpactCard impact={impact} compact={false} />);
      expect(screen.getByText(/Estimated Avoided Carbon:/i)).toBeInTheDocument();
      full.unmount();

      render(<ImpactCard impact={impact} compact={true} />);
      expect(screen.getByText('Personal Exposure Benefit')).toBeInTheDocument();
    });
  });
});
