import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AQIBadge } from '../../client/src/components/AQIBadge';
import { PollutantCard } from '../../client/src/components/PollutantCard';
import { SafetyAlertBanner } from '../../client/src/components/SafetyAlertBanner';
import { ImpactCard } from '../../client/src/components/ImpactCard';
import { getStandardImpact } from '../../shared/impact';
import { SafetyEvaluation } from '../../shared/types';

describe('Frontend Component Tests', () => {
  describe('AQIBadge', () => {
    it('renders numerical value, textual category label, and standard without relying on color alone', () => {
      render(
        <AQIBadge
          aqi={175}
          category="UNHEALTHY"
          categoryLabel="Unhealthy"
          standard="US_AQI"
          size="lg"
        />
      );

      expect(screen.getByText('175')).toBeInTheDocument();
      expect(screen.getByText('Unhealthy Air Quality')).toBeInTheDocument();
      expect(screen.getByText('US AQI')).toBeInTheDocument();
    });

    it('renders "Data Unavailable" when aqi is null', () => {
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

  describe('PollutantCard', () => {
    it('renders pollutant value, units, and benchmark limit', () => {
      render(
        <PollutantCard
          name="PM2.5"
          fullName="Fine Particulate Matter"
          value={48.5}
          whoStandardLimit={15}
          description="Inhalable fine particles"
        />
      );

      expect(screen.getByText('PM2.5')).toBeInTheDocument();
      expect(screen.getByText('48.5')).toBeInTheDocument();
      expect(screen.getByText('µg/m³')).toBeInTheDocument();
      expect(screen.getByText(/Ref: ≤15/i)).toBeInTheDocument();
    });

    it('displays "Not Reported by Station" when value is null without displaying fake 0', () => {
      render(
        <PollutantCard
          name="SO2"
          fullName="Sulphur Dioxide"
          value={null}
          whoStandardLimit={40}
          description="Sulphur combustion gas"
        />
      );

      expect(screen.getByText('SO2')).toBeInTheDocument();
      expect(screen.getByText('Not Reported by Station')).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('SafetyAlertBanner', () => {
    it('displays severe smog alert and respirator advice when smog is active', () => {
      const mockSafety: SafetyEvaluation = {
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
        urgentMedicalAdvisory: 'AirWise AI is an educational tool. For urgent breathing difficulty call emergency services.',
        deterministicRulesApplied: ['RULE_SEVERE_SMOG_ALERT']
      };

      render(<SafetyAlertBanner safety={mockSafety} />);

      expect(screen.getByText('Severe Smog Inversion Warning')).toBeInTheDocument();
      expect(screen.getByText(/Wear properly fitted N95 respirators/i)).toBeInTheDocument();
      expect(screen.getByText(/Ordinary cloth masks do not filter fine PM2.5/i)).toBeInTheDocument();
      expect(screen.getByText('Keep Windows Closed')).toBeInTheDocument();
    });
  });

  describe('ImpactCard', () => {
    it('renders both Personal Exposure Benefit and Environmental Emission Benefit', () => {
      const impact = getStandardImpact('switch_to_transit', 10);
      render(<ImpactCard impact={impact} compact={false} />);

      expect(screen.getByText('Personal Exposure Benefit')).toBeInTheDocument();
      expect(screen.getByText('Environmental Emission Benefit')).toBeInTheDocument();
      expect(screen.getByText(/Estimated Avoided Carbon:/i)).toBeInTheDocument();
    });
  });
});
