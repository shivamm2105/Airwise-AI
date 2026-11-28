/**
 * AirWise AI — Direct Impact Explanation Engine
 * Evaluates Personal Exposure Reduction vs. Environmental Emission Reduction.
 * Provides transparent methodologies, explicit assumptions, and honest uncertainty disclosures.
 */

import { ImpactAssessment } from './types.js';

type AlternativeCommuteMode = 'public_transit' | 'carpool' | 'bicycle' | 'walk' | 'work_from_home';

interface TransportEmissionCalculationParams {
  distanceKm: number;
  originalMode: 'car_alone';
  alternativeMode: AlternativeCommuteMode;
}

export type StandardRecommendationType =
  | 'stay_indoors_hazardous'
  | 'wear_n95_respirator'
  | 'use_hepa_purifier'
  | 'close_windows_severe'
  | 'switch_to_transit'
  | 'trip_consolidation'
  | 'avoid_engine_idling'
  | 'avoid_indoor_incense';

const MODE_AVOIDANCE_FACTORS: Record<AlternativeCommuteMode, { co2GramsPerKm: number; pmGramsPerKm: number }> = {
  work_from_home: { co2GramsPerKm: 170, pmGramsPerKm: 0.03 },
  bicycle: { co2GramsPerKm: 170, pmGramsPerKm: 0.03 },
  walk: { co2GramsPerKm: 170, pmGramsPerKm: 0.03 },
  public_transit: { co2GramsPerKm: 110, pmGramsPerKm: 0.02 },
  carpool: { co2GramsPerKm: 85, pmGramsPerKm: 0.015 }
};

/**
 * Computes avoided transport tailpipe emissions against a single-occupant petrol car baseline
 * (~170 g CO2e/vehicle-km, ~0.03 g exhaust PM2.5/km via UK DEFRA / IPCC benchmarks).
 */
export function calculateAvoidedTransportEmissions(
  params: TransportEmissionCalculationParams
): {
  avoidedKgCO2e: number;
  avoidedGramsExhaustPM: number;
  methodology: string;
  assumptions: string;
  uncertaintyRange: string;
} {
  const km = Math.max(0, params.distanceKm);
  const factors = MODE_AVOIDANCE_FACTORS[params.alternativeMode];

  const avoidedKgCO2e = Number(((km * factors.co2GramsPerKm) / 1000).toFixed(2));
  const avoidedGramsExhaustPM = Number((km * factors.pmGramsPerKm).toFixed(2));

  return {
    avoidedKgCO2e,
    avoidedGramsExhaustPM,
    methodology:
      'Calculated using standard passenger transport emission factors (average petrol passenger car ~170g CO2e/km vs alternative mode occupancy allocation based on UK DEFRA / IPCC transport benchmarks).',
    assumptions: `Assumes roundtrip distance of ${km} km replacing a standard single-occupant light-duty passenger vehicle under mixed urban driving conditions. Actual emissions vary based on vehicle efficiency, fuel type, driving speed, and transit grid electricity source.`,
    uncertaintyRange: 'Estimated uncertainty: ±25% depending on vehicle age, congestion level, and transit occupancy.'
  };
}

const STATIC_IMPACTS: Record<
  Exclude<StandardRecommendationType, 'switch_to_transit' | 'trip_consolidation'>,
  ImpactAssessment
> = {
  stay_indoors_hazardous: {
    personalExposureBenefit: {
      rating: 'Critical',
      explanation:
        'Directly prevents high-volume inhalation of outdoor fine particulate matter (PM2.5) and toxic combustion gases by substituting outdoor physical exertion with a sheltered indoor environment.',
      pathways: [
        'Deep alveolar lung deposition avoided',
        'Reduced cardiac strain during peak pollution events',
        'Lower exposure to airborne polycyclic aromatic hydrocarbons'
      ],
      evidenceStatus: 'Established Environmental Health Principle'
    },
    environmentalEmissionBenefit: {
      rating: 'None (Self-protection)',
      explanation:
        'Staying indoors is a personal exposure shielding behavior. It protects your biological health but does not reduce outdoor air pollution or source emissions in your city.',
      isCommunityScaled: false,
      methodology: 'Qualitative distinction between personal protective shielding and environmental emission abatement.',
      uncertaintyNotice: 'Individual personal dose reduction depends on building envelope air-tightness and indoor air filtration.'
    }
  },
  wear_n95_respirator: {
    personalExposureBenefit: {
      rating: 'Substantial',
      explanation:
        'A properly fitted NIOSH-approved N95 or EN149 FFP2 respirator filters at least 95% of airborne particles down to 0.3 microns, significantly mitigating fine particulate matter (PM2.5) exposure during necessary transit.',
      pathways: [
        'Filters airborne particulate matter, soot, and road dust',
        'Reduces acute airway inflammation and coughing'
      ],
      evidenceStatus: 'Established Environmental Health Principle'
    },
    environmentalEmissionBenefit: {
      rating: 'None (Self-protection)',
      explanation:
        'Respirators are personal protective equipment (PPE). They shield the individual wearer but have zero effect on tailpipe emissions, industrial smoke, or regional air quality.',
      isCommunityScaled: false,
      methodology: 'Qualitative safety distinction.',
      uncertaintyNotice: 'Efficacy is strictly conditional upon an airtight facial seal. Gaps or facial hair reduce effective filtration.'
    }
  },
  use_hepa_purifier: {
    personalExposureBenefit: {
      rating: 'Substantial',
      explanation:
        'True HEPA air filtration removes at least 99.97% of airborne particles ≥0.3 microns that penetrate the building envelope, creating a clean air sanctuary inside the home.',
      pathways: [
        'Clears ambient indoor PM2.5, allergen particles, and settled smoke residue',
        'Lowers nighttime respiratory stress and improves sleep recovery'
      ],
      evidenceStatus: 'Established Environmental Health Principle'
    },
    environmentalEmissionBenefit: {
      rating: 'Minor Personal Footprint',
      explanation:
        'Purifiers clean indoor air. Running electrical devices consumes grid electricity; using energy-efficient models (e.g., brushless DC motors) minimizes indirect power plant emissions.',
      isCommunityScaled: false,
      methodology: 'Indoor air cleaning mechanics vs grid power consumption.',
      uncertaintyNotice: 'Clean air delivery rate (CADR) must match room volume (ACH ≥ 4-5 recommended).'
    }
  },
  close_windows_severe: {
    personalExposureBenefit: {
      rating: 'Substantial',
      explanation:
        'Prevents severe outdoor winter smog and vehicular plumes from freely infiltrating indoor living spaces through natural draft airflow.',
      pathways: [
        'Maintains indoor PM2.5 levels at 30-60% below outdoor ambient concentrations',
        'Shields vulnerable family members during peak morning traffic hours'
      ],
      evidenceStatus: 'Established Environmental Health Principle'
    },
    environmentalEmissionBenefit: {
      rating: 'None (Self-protection)',
      explanation: 'A passive building envelope barrier. It contains no emission reduction mechanism.',
      isCommunityScaled: false,
      methodology: 'Building envelope infiltration dynamics.',
      uncertaintyNotice: 'Sealing efficacy depends on window weatherstripping and door draft sweeps.'
    }
  },
  avoid_engine_idling: {
    personalExposureBenefit: {
      rating: 'Moderate',
      explanation:
        'Eliminates the dense micro-plume of toxic carbon monoxide (CO), nitrogen oxides (NOx), and unburned hydrocarbons that accumulates around stationary idling vehicles.',
      pathways: ['Protects children and pedestrians waiting near vehicle tailpipes'],
      evidenceStatus: 'Established Environmental Health Principle'
    },
    environmentalEmissionBenefit: {
      rating: 'Minor Personal Footprint',
      explanation:
        'Idling burns approximately 1.0 to 1.8 liters of fuel per hour without producing mobility, generating unnecessary greenhouse gases and toxic localized street-level emissions.',
      isCommunityScaled: true,
      estimatedKgCO2eAvoided: 0.15,
      methodology: 'Engine idling fuel consumption factor: ~2.3 kg CO2 per liter of gasoline combusted.',
      uncertaintyNotice: 'Varies with engine displacement and air-conditioning compressor load.'
    }
  },
  avoid_indoor_incense: {
    personalExposureBenefit: {
      rating: 'Substantial',
      explanation:
        'Burning incense sticks, agarbatti, or scented paraffin candles in enclosed rooms emits high concentrations of ultrafine particles (PM0.1), benzene, and polycyclic aromatic hydrocarbons directly into living spaces.',
      pathways: [
        'Direct elimination of primary indoor combustion source',
        'Prevents acute bronchial irritation in asthmatics and children'
      ],
      evidenceStatus: 'Established Environmental Health Principle'
    },
    environmentalEmissionBenefit: {
      rating: 'Minor Personal Footprint',
      explanation:
        'Reduces localized particulate generation and smoke odor without requiring mechanical filtration or electrical energy.',
      isCommunityScaled: false,
      methodology: 'Indoor source cessation analysis.',
      uncertaintyNotice: 'Indoor concentration reduction varies with room volume and baseline air exchange rate.'
    }
  }
};

/**
 * Standardized impact generator distinguishing exposure shielding vs environmental emission abatement.
 */
export function getStandardImpact(
  recommendationType: StandardRecommendationType,
  distanceKm: number = 10
): ImpactAssessment {
  if (recommendationType === 'switch_to_transit') {
    const calc = calculateAvoidedTransportEmissions({
      distanceKm,
      originalMode: 'car_alone',
      alternativeMode: 'public_transit'
    });
    return {
      personalExposureBenefit: {
        rating: 'Moderate',
        explanation:
          'Traveling inside enclosed, ventilated buses or underground metro trains frequently reduces direct prolonged tailpipe breathing compared to sitting in congested single-occupancy vehicle queues with open vents.',
        pathways: ['Reduced localized in-cabin vehicular tailpipe exposure'],
        evidenceStatus: 'Observational Evidence'
      },
      environmentalEmissionBenefit: {
        rating: 'Significant Clean Alternative',
        explanation: `Replaces single-occupancy driving with shared high-capacity transit, directly preventing tailpipe emissions on crowded arterial roads. Avoids approximately ${calc.avoidedKgCO2e} kg CO2e and ${calc.avoidedGramsExhaustPM} g of exhaust PM per trip.`,
        isCommunityScaled: true,
        estimatedKgCO2eAvoided: calc.avoidedKgCO2e,
        methodology: calc.methodology,
        uncertaintyNotice: calc.uncertaintyRange
      }
    };
  }

  if (recommendationType === 'trip_consolidation') {
    const calc = calculateAvoidedTransportEmissions({
      distanceKm: Math.round(distanceKm * 0.4),
      originalMode: 'car_alone',
      alternativeMode: 'work_from_home'
    });
    return {
      personalExposureBenefit: {
        rating: 'Moderate',
        explanation:
          'Combining errands eliminates cold-engine starts and reduces overall hours spent traversing high-traffic roadside corridors during pollution spikes.',
        pathways: ['Lower cumulative roadside exposure duration'],
        evidenceStatus: 'Observational Evidence'
      },
      environmentalEmissionBenefit: {
        rating: 'Tangible Household Reduction',
        explanation: `Eliminates redundant vehicle kilometers and avoids catalytic converter cold-start emission spikes. Saves ~${calc.avoidedKgCO2e} kg CO2e per consolidated excursion.`,
        isCommunityScaled: false,
        estimatedKgCO2eAvoided: calc.avoidedKgCO2e,
        methodology: 'Cold-start reduction and vehicle-kilometer elimination calculation.',
        uncertaintyNotice: 'Actual fuel saving depends on trip chaining route efficiency.'
      }
    };
  }

  return STATIC_IMPACTS[recommendationType];
}
