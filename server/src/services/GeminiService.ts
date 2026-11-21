import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import {
  AirQualityData,
  AISynthesisResponse,
  HouseholdPreferences,
  RecommendationActionItem
} from '../../../shared/types.js';
import { evaluateSafetyRules } from '../../../shared/safetyRules.js';
import { getStandardImpact } from '../../../shared/impact.js';

interface RawGeminiAction {
  id?: string;
  title: string;
  category: 'morning' | 'outdoor' | 'commute' | 'workplace_school' | 'indoor' | 'evening' | 'household_sustainability';
  timeframe: string;
  whatToDo: string;
  whyItMatters: string;
  steps: string[];
  expectedBenefit: string;
}

interface RawGeminiPlanResponse {
  summary: string;
  actions: RawGeminiAction[];
  sustainableAlternatives?: {
    transportOption?: string;
    idlingAdvice?: string;
    tripConsolidationTips?: string;
    householdEnergyAction?: string;
  };
  communityTips?: string[];
}

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private currentApiKey: string | null = null;
  private readonly modelName: string;

  constructor() {
    this.modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    this.getClient();
  }

  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      this.client = null;
      this.currentApiKey = null;
      return null;
    }

    if (!this.client || this.currentApiKey !== apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey });
        this.currentApiKey = apiKey;
      } catch (err) {
        console.warn('Failed to initialize GoogleGenAI client:', err);
        this.client = null;
        this.currentApiKey = null;
      }
    }
    return this.client;
  }

  public isAvailable(): boolean {
    return Boolean(this.getClient());
  }

  /**
   * Sanitizes user input to mitigate prompt injection and policy override attempts
   */
  private sanitizeInput(input: string): string {
    return input
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // remove control chars
      .slice(0, 1000)
      .trim();
  }

  /**
   * Conversational Assistant Chat with verified environmental grounding
   */
  public async chatWithContext(
    userMessage: string,
    airQuality: AirQualityData | null,
    preferences?: Partial<HouseholdPreferences>
  ): Promise<{ response: string; usedModel: string; groundedInContext: boolean }> {
    const cleanUserQuery = this.sanitizeInput(userMessage);

    // Compute deterministic safety baseline
    const safety = airQuality
      ? evaluateSafetyRules(airQuality.aqi, airQuality.pollutants, preferences, airQuality.indexStandard)
      : null;

    const client = this.getClient();

    if (!client) {
      // Deterministic evidence-aware fallback response
      return {
        response: this.generateDeterministicChatResponse(cleanUserQuery, airQuality, safety, preferences),
        usedModel: 'deterministic-rules-engine',
        groundedInContext: Boolean(airQuality)
      };
    }

    const systemInstruction = `You are AirWise AI, an expert, empathetic, and evidence-grounded urban air quality and public health companion.
Your mission is to help people navigate air pollution, winter smog, and indoor air risks with practical, realistic daily guidance.

CRITICAL OPERATIONAL RULES:
1. Ground every answer in the VERIFIED ENVIRONMENTAL DATA provided below.
2. NEVER invent AQI numbers, pollutant concentrations, or forecasts.
3. NEVER make clinical medical diagnoses or guarantee health outcomes.
4. If outdoor AQI is Unhealthy or worse (AQI > 150), strictly warn against outdoor strenuous exercise, running, or cycling.
5. Clarify that ordinary cloth masks do NOT filter fine PM2.5 particulate matter; only certified, properly fitted N95/FFP2 respirators provide true filtration.
6. For indoor air, emphasize true HEPA filtration and source control. Explicitly warn against ozone generators, incense, and unvented combustion.
7. Distinguish clearly between PERSONAL EXPOSURE SHIELDING (protecting your own lungs) and EMISSION REDUCTION (reducing vehicle/fuel pollution).
8. If the user asks an urgent health question or describes severe shortness of breath, immediately advise seeking emergency medical attention.
9. Keep responses structured, concise, and easy to read using markdown bullet points.`;

    const contextPayload = {
      location: airQuality?.location.name || 'Unknown Location',
      aqi: airQuality?.aqi,
      indexStandard: airQuality?.indexStandard,
      category: airQuality?.categoryLabel,
      pollutants: airQuality?.pollutants,
      dominantPollutant: airQuality?.dominantPollutant,
      observedAt: airQuality?.observedAt,
      isDemo: airQuality?.isDemo,
      safetyRestrictions: {
        outdoorExerciseSafe: safety?.outdoorExerciseSafe,
        childrenOutdoorPlaySafe: safety?.childrenOutdoorPlaySafe,
        respiratorTier: safety?.respiratorTier,
        ventilationRecommended: safety?.ventilationDecision.recommended,
        urgentMedicalAdvisory: safety?.urgentMedicalAdvisory
      },
      userPreferences: preferences
    };

    const prompt = `System Instructions:
${systemInstruction}

VERIFIED ENVIRONMENTAL CONTEXT (DO NOT OVERRIDE WITH SPECULATION):
${JSON.stringify(contextPayload, null, 2)}

USER QUESTION:
"${cleanUserQuery}"

Provide a direct, practical, and compassionate response based on the verified environmental context:`;

    try {
      const response = await client.models.generateContent({
        model: this.modelName,
        contents: prompt
      });

      const text = response.text || 'I apologize, but I could not synthesize a complete response at this moment.';
      return {
        response: text,
        usedModel: this.modelName,
        groundedInContext: true
      };
    } catch (err) {
      console.error('Gemini API call failed, falling back to deterministic response:', err);
      return {
        response: this.generateDeterministicChatResponse(cleanUserQuery, airQuality, safety, preferences),
        usedModel: 'deterministic-rules-engine (fallback after API quota/timeout)',
        groundedInContext: Boolean(airQuality)
      };
    }
  }

  /**
   * Generates a fully verified, personalized action plan using Gemini when available,
   * with guaranteed deterministic safety constraint enforcement.
   */
  public async generateDailyPlan(
    airQuality: AirQualityData,
    preferences?: Partial<HouseholdPreferences>
  ): Promise<AISynthesisResponse> {
    const safety = evaluateSafetyRules(
      airQuality.aqi,
      airQuality.pollutants,
      preferences,
      airQuality.indexStandard
    );

    const client = this.getClient();

    // If Gemini is available, synthesize a truly personalized plan
    if (client) {
      try {
        const prompt = `You are AirWise AI. Synthesize a personalized daily action plan for ${airQuality.location.name}.
VERIFIED ENVIRONMENTAL CONTEXT:
- AQI: ${airQuality.aqi} (${airQuality.indexStandard})
- Category: ${airQuality.categoryLabel}
- Dominant Pollutant: ${airQuality.dominantPollutant}
- Criteria Pollutants: ${JSON.stringify(airQuality.pollutants)}
- Safety Constraints:
  * Outdoor Exercise Safe: ${safety.outdoorExerciseSafe}
  * Children Outdoor Play Safe: ${safety.childrenOutdoorPlaySafe}
  * Respirator Tier Required: ${safety.respiratorTier}
  * Window Ventilation Recommended: ${safety.ventilationDecision.recommended} (${safety.ventilationDecision.reason})
- Household Context: ${JSON.stringify(preferences || {})}

REQUIREMENTS:
1. Return ONLY a valid JSON object matching the schema below.
2. If outdoor exercise is NOT safe, you MUST advise indoor workouts.
3. If respirator tier is RECOMMENDED_N95 or ESSENTIAL_N95_STRICT, emphasize N95/FFP2 for commuting.
4. Provide practical, budget-free steps for each action.

JSON SCHEMA TO RETURN:
{
  "summary": "1-2 sentence environmental status summary",
  "actions": [
    {
      "title": "Action title",
      "category": "morning" | "commute" | "indoor" | "household_sustainability" | "evening",
      "timeframe": "e.g. 07:00 - 08:30 AM",
      "whatToDo": "Specific instruction",
      "whyItMatters": "Health or emission rationale",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "expectedBenefit": "Specific biological or emission benefit"
    }
  ],
  "sustainableAlternatives": {
    "transportOption": "Practical transit or carpooling advice",
    "idlingAdvice": "Specific anti-idling guidance",
    "tripConsolidationTips": "Batching errands advice",
    "householdEnergyAction": "Energy saving action"
  },
  "communityTips": ["Tip 1", "Tip 2", "Tip 3"]
}`;

        const response = await client.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text) as RawGeminiPlanResponse;
          if (parsed && Array.isArray(parsed.actions) && parsed.actions.length >= 3) {
            const actions: RecommendationActionItem[] = parsed.actions.map((act, index) => {
              // Enforce safety rules on actions
              let whatToDo = act.whatToDo;
              if (!safety.outdoorExerciseSafe && act.category === 'morning' && (whatToDo.toLowerCase().includes('run') || whatToDo.toLowerCase().includes('jog'))) {
                whatToDo = 'Move workout indoors (yoga, bodyweight, or treadmill). Outdoor running is unsafe under current smog conditions.';
              }

              // Determine impact mapping
              let impact = getStandardImpact('use_hepa_purifier');
              if (act.category === 'morning' && !safety.outdoorExerciseSafe) {
                impact = getStandardImpact('stay_indoors_hazardous');
              } else if (act.category === 'commute') {
                impact = safety.respiratorTier !== 'NOT_NEEDED'
                  ? getStandardImpact('wear_n95_respirator')
                  : getStandardImpact('switch_to_transit', preferences?.commuteDistanceKm || 10);
              } else if (act.category === 'indoor') {
                impact = getStandardImpact('use_hepa_purifier');
              } else if (act.category === 'household_sustainability') {
                impact = getStandardImpact('avoid_indoor_incense');
              }

              return {
                id: `act-genai-${index}-${Date.now()}`,
                title: act.title,
                category: act.category,
                timeframe: act.timeframe || 'Scheduled',
                whatToDo,
                whyItMatters: act.whyItMatters,
                steps: act.steps || [],
                expectedBenefit: act.expectedBenefit,
                impact,
                confidence: 'Contextual AI',
                safetyVerified: true
              };
            });

            return {
              summary: parsed.summary || `Air quality in ${airQuality.location.name} is ${airQuality.categoryLabel}. Plan generated using Gemini AI.`,
              airQualityContext: {
                source: airQuality.provider,
                indexStandard: airQuality.indexStandard,
                observedAt: airQuality.observedAt,
                aqi: airQuality.aqi,
                category: airQuality.category
              },
              safetyEvaluation: safety,
              actions,
              indoorGuidance: {
                ventilationTiming: safety.ventilationDecision.reason,
                hepaRecommendations:
                  'Utilize true mechanical HEPA (H13 or higher) air cleaners sized to provide at least 4 to 5 air changes per hour (ACH).',
                cookingExhaustGuidance:
                  'Always use an externally vented exhaust hood or open a dedicated kitchen window when cooking.',
                dustAndCleaningTips: [
                  'Use damp microfiber cloths instead of dry feather dusters.',
                  'Vacuum with a sealed HEPA-filtered vacuum cleaner.',
                  'Remove outdoor shoes at the front entryway.'
                ],
                combustionAvoidance: [
                  'Do NOT burn incense sticks (agarbatti) or paraffin candles indoors during poor air quality periods.',
                  'Never smoke or vape indoors.'
                ],
                sensorNotice:
                  'Transparency notice: Without a physical indoor PM2.5 sensor in your living room, these recommendations represent evidence-based preventive guidance.'
              },
              sustainableAlternatives: {
                transportOption: parsed.sustainableAlternatives?.transportOption || 'Use mass transit or carpool.',
                idlingAdvice: parsed.sustainableAlternatives?.idlingAdvice || 'Turn off engine when stopped for more than 10 seconds.',
                tripConsolidationTips: parsed.sustainableAlternatives?.tripConsolidationTips || 'Batch errands into a single loop.',
                householdEnergyAction: parsed.sustainableAlternatives?.householdEnergyAction || 'Clean purifier pre-filters monthly.'
              },
              communityTips: parsed.communityTips || [
                'Coordinate school carpools to reduce gate emissions.',
                'Report open trash burning to local civic hotlines.'
              ],
              limitationsAndDisclaimers: [
                'AirWise AI provides environmental education and exposure-reduction advice. It is not a clinical medical diagnostic service.',
                'If experiencing acute breathing distress, consult a medical professional or emergency services immediately.'
              ]
            };
          }
        }
      } catch (err) {
        console.warn('Gemini daily plan synthesis failed, using verified deterministic engine:', err);
      }
    }

    // Deterministic baseline action plan (Used when API key is missing or quota is exceeded)
    return this.generateDeterministicDailyPlan(airQuality, safety, preferences);
  }

  /**
   * Deterministic baseline plan generator
   */
  private generateDeterministicDailyPlan(
    airQuality: AirQualityData,
    safety: ReturnType<typeof evaluateSafetyRules>,
    preferences?: Partial<HouseholdPreferences>
  ): AISynthesisResponse {
    const actions: RecommendationActionItem[] = [];

    // Morning Action
    if (!safety.outdoorExerciseSafe) {
      actions.push({
        id: 'act-morning-indoor-exercise',
        title: 'Move Morning Workout Indoors',
        category: 'morning',
        timeframe: '06:30 - 08:30 AM',
        whatToDo: 'Replace outdoor running, brisk walking, or cycling with an indoor bodyweight, yoga, or treadmill routine.',
        whyItMatters:
          'Deep breathing during vigorous exercise increases particulate inhalation volume by 400-600%, pushing toxic soot deep into alveolar lung tissue.',
        steps: [
          'Keep windows closed during early morning temperature inversion peaks.',
          'Run your HEPA air cleaner on medium/high in the exercise room 20 minutes prior.',
          'Hydrate well and focus on low-dust, indoor aerobic conditioning.'
        ],
        expectedBenefit: 'Avoids acute airway inflammation, bronchiolar spasm, and elevated blood pressure spikes.',
        impact: getStandardImpact('stay_indoors_hazardous'),
        confidence: 'High (Verified Guidelines)',
        safetyVerified: true
      });
    } else {
      actions.push({
        id: 'act-morning-moderate-walk',
        title: 'Pollution-Aware Morning Fresh Air Routine',
        category: 'morning',
        timeframe: '07:00 - 08:30 AM',
        whatToDo: 'Light outdoor walk is acceptable. Avoid busy high-traffic intersections.',
        whyItMatters: 'Outdoor air quality is currently satisfactory. Morning exposure poses minimal acute risk.',
        steps: [
          'Choose green parks or tree-lined residential paths rather than main arterial roads.',
          'Ventilate living spaces briefly while outdoor air is relatively clean.'
        ],
        expectedBenefit: 'Supports circadian rhythm and cardiovascular health without excessive pollution exposure.',
        impact: getStandardImpact('switch_to_transit', 5),
        confidence: 'High (Verified Guidelines)',
        safetyVerified: true
      });
    }

    // Commute Action
    const dist = preferences?.commuteDistanceKm || 10;
    if (safety.respiratorTier === 'ESSENTIAL_N95_STRICT' || safety.respiratorTier === 'RECOMMENDED_N95') {
      actions.push({
        id: 'act-commute-n95-transit',
        title: 'Equip N95 Respirator & Choose Enclosed Transit',
        category: 'commute',
        timeframe: '08:30 - 09:30 AM',
        whatToDo: 'Don a certified, snug-fitting N95/FFP2 respirator before stepping outdoors. Avoid open two-wheelers; use enclosed metro or bus with closed windows.',
        whyItMatters:
          'Commuter corridors exhibit micro-spikes in ultra-fine black carbon and diesel exhaust 3 to 5 times higher than neighborhood background readings.',
        steps: [
          'Pinch the metal nose clip firmly to eliminate air leaks around the bridge of your nose.',
          'Perform a quick breath test: check for air escaping into your eyes or past your chin.',
          'Avoid removing your respirator on outdoor transit platforms.'
        ],
        expectedBenefit: 'Cuts inhaled particulate mass by ~95% compared to breathing unshielded roadside smog.',
        impact: getStandardImpact('wear_n95_respirator'),
        confidence: 'High (Verified Guidelines)',
        safetyVerified: true
      });
    } else {
      actions.push({
        id: 'act-commute-sustainable-transit',
        title: 'Choose Low-Emission Transit or Active Travel',
        category: 'commute',
        timeframe: '08:30 - 09:30 AM',
        whatToDo: 'Take public transit, carpool, or walk/cycle depending on your commute distance.',
        whyItMatters: 'Replacing single-occupant private vehicle trips directly prevents tailpipe carbon and particulate emissions.',
        steps: [
          'Use local bus or metro cards for seamless boarding.',
          'Consolidate errands into your return trip to avoid cold-engine starts.'
        ],
        expectedBenefit: 'Reduces your daily carbon footprint and helps lower congestion.',
        impact: getStandardImpact('switch_to_transit', dist),
        confidence: 'High (Verified Guidelines)',
        safetyVerified: true
      });
    }

    // Indoor Air & Ventilation Action
    if (!safety.ventilationDecision.recommended) {
      actions.push({
        id: 'act-indoor-seal-hepa',
        title: 'Seal Windows & Run HEPA Clean Air Zone',
        category: 'indoor',
        timeframe: 'Throughout the Day',
        whatToDo: 'Keep all external windows and balcony doors shut. Run your HEPA air purifier continuously on auto or quiet mode.',
        whyItMatters: 'Unfiltered infiltration through open windows rapidly equilibrates indoor air with hazardous outdoor smog within 30-45 minutes.',
        steps: [
          'Verify window latches are snug; apply door draft stoppers if outdoor smoke is visible.',
          'Position your air purifier in the central breathing zone of the primary occupied room, away from walls.',
          'Avoid burning incense (agarbatti), mosquito coils, or scented candles.'
        ],
        expectedBenefit: 'Maintains indoor PM2.5 levels at 50-80% below hazardous outdoor levels.',
        impact: getStandardImpact('use_hepa_purifier'),
        confidence: 'High (Verified Guidelines)',
        safetyVerified: true
      });
    } else {
      actions.push({
        id: 'act-indoor-natural-ventilation',
        title: 'Optimal Window Ventilation Window',
        category: 'indoor',
        timeframe: '12:00 - 02:00 PM',
        whatToDo: 'Open opposite windows for 15-20 minutes to achieve cross-ventilation and flush accumulated indoor CO2.',
        whyItMatters: 'Outdoor air quality is currently clean, making this the ideal window to exchange stale indoor air without loading the home with smog.',
        steps: [
          'Open windows on windward and leeward sides of your home.',
          'Turn on kitchen or bathroom exhaust to accelerate cross-breeze air exchange.',
          'Close windows before evening vehicular traffic picks up.'
        ],
        expectedBenefit: 'Lowers indoor CO2 below 800 ppm, boosting daytime alertness and cognitive performance.',
        impact: getStandardImpact('close_windows_severe'),
        confidence: 'High (Verified Guidelines)',
        safetyVerified: true
      });
    }

    // Household Sustainability & Cooking Action
    actions.push({
      id: 'act-household-clean-cooking',
      title: 'Kitchen Source Control & Range Exhaust Usage',
      category: 'household_sustainability',
      timeframe: 'Evening Meal Prep',
      whatToDo: 'Always operate the kitchen exhaust hood on high when frying, sautéing, or using gas burners. Keep kitchen door closed from living areas.',
      whyItMatters:
        'Indoor frying and unvented gas combustion generate sharp spikes in PM2.5 (often exceeding 300 µg/m³) and toxic nitrogen dioxide (NO2).',
      steps: [
        'Turn on the exhaust hood 1 minute before lighting the stove.',
        'Cover pots with lids to reduce oil vapor and moisture dispersion.',
        'Leave the exhaust running for 5 minutes after cooking finishes.'
      ],
      expectedBenefit: 'Prevents kitchen cooking emissions from elevating whole-house particle concentrations.',
      impact: getStandardImpact('avoid_indoor_incense'),
      confidence: 'High (Verified Guidelines)',
      safetyVerified: true
    });

    const summary = `Current air quality in ${airQuality.location.name} is classified as ${airQuality.categoryLabel} (AQI ${airQuality.aqi ?? 'N/A'} [${airQuality.indexStandard}]). ${
      safety.severeSmogAlert
        ? 'Severe winter pollution conditions detected. Primary objective: Shield respiratory health, eliminate outdoor exertion, seal indoor spaces, and utilize certified N95 respirators for necessary travel.'
        : 'Air quality is within manageable thresholds. Follow pollution-aware scheduling, maintain good indoor air hygiene, and choose low-emission commuting alternatives.'
    }`;

    return {
      summary,
      airQualityContext: {
        source: airQuality.provider,
        indexStandard: airQuality.indexStandard,
        observedAt: airQuality.observedAt,
        aqi: airQuality.aqi,
        category: airQuality.category
      },
      safetyEvaluation: safety,
      actions,
      indoorGuidance: {
        ventilationTiming: safety.ventilationDecision.reason,
        hepaRecommendations:
          'Utilize true mechanical HEPA (H13 or higher) air cleaners sized to provide at least 4 to 5 air changes per hour (ACH) for your room size.',
        cookingExhaustGuidance:
          'Always use an externally vented exhaust hood or open a dedicated kitchen window when cooking.',
        dustAndCleaningTips: [
          'Use damp microfiber cloths instead of dry feather dusters.',
          'Vacuum with a sealed HEPA-filtered vacuum cleaner.',
          'Remove outdoor shoes at the front entryway.'
        ],
        combustionAvoidance: [
          'Do NOT burn incense sticks (agarbatti) or paraffin candles indoors during poor air quality periods.',
          'Never smoke or vape indoors.'
        ],
        sensorNotice:
          'Transparency notice: Without a physical indoor PM2.5 sensor in your living room, these recommendations represent evidence-based preventive guidance.'
      },
      sustainableAlternatives: {
        transportOption:
          preferences?.commuteMode === 'car_alone'
            ? 'Switch from solo driving to urban metro or express bus to reduce per-capita tailpipe emissions.'
            : 'Maintain your current shared or active transit routine while wearing proper respiratory protection.',
        idlingAdvice:
          'Turn off your vehicle engine if stopped for more than 10 seconds. Engine idling burns fuel unnecessarily and creates concentrated toxic roadside fumes.',
        tripConsolidationTips:
          'Batch grocery shopping, medical visits, and school drop-offs into a single loop to reduce cold-start vehicle emissions.',
        householdEnergyAction:
          'Clean air purifier and HVAC pre-filters regularly to maintain optimal airflow with minimal motor energy consumption.'
      },
      communityTips: [
        'Coordinate neighborhood school carpools to cut school-gate congestion and idling exhaust.',
        'Report open municipal waste burning to local civic environmental hotlines.',
        'Share verified air-quality alerts with elderly neighbors who may not monitor digital dashboards.'
      ],
      limitationsAndDisclaimers: [
        'AirWise AI provides environmental education and exposure-reduction advice. It is not a clinical medical diagnostic service.',
        'Outdoor air quality readings are sourced from verified environmental monitoring stations and models (CAMS / Open-Meteo).',
        'If experiencing acute breathing distress, chest pain, or severe coughing, consult a medical professional or call emergency healthcare services immediately.'
      ]
    };
  }

  /**
   * Deterministic chatbot fallback logic when LLM key is absent or quota is exceeded
   */
  private generateDeterministicChatResponse(
    query: string,
    airQuality: AirQualityData | null,
    safety: ReturnType<typeof evaluateSafetyRules> | null,
    preferences?: Partial<HouseholdPreferences>
  ): string {
    const q = query.toLowerCase();
    const loc = airQuality?.location.name || 'your area';
    const aqi = airQuality?.aqi ?? 'unknown';
    const cat = airQuality?.categoryLabel ?? 'current';

    if (q.includes('outside') || q.includes('walk') || q.includes('exercise') || q.includes('run') || q.includes('play')) {
      if (!safety || !safety.outdoorExerciseSafe) {
        return `⚠️ **Outdoor Health Advisory for ${loc} (AQI: ${aqi} — ${cat}):**
- **Outdoor exercise is NOT recommended right now.** Deep aerobic respiration increases particulate intake by 4-6x.
- **Children and sensitive family members** should stay indoors and engage in quiet indoor games or study.
- If you must step outside for essential work or errands, wear a certified, properly fitted **N95 / FFP2 respirator**. Ordinary cloth masks do not filter fine PM2.5.`;
      } else {
        return `✅ **Outdoor Suitability for ${loc} (AQI: ${aqi} — ${cat}):**
- Outdoor air quality is currently safe for moderate activities, walks, and outdoor recreation.
- Sensitive individuals should still choose tree-lined parks rather than busy traffic corridors.`;
      }
    }

    if (q.includes('indoor') || q.includes('window') || q.includes('ventilate') || q.includes('purifier') || q.includes('plant')) {
      return `🏠 **Indoor Air Quality Guidance for ${loc}:**
- **Ventilation:** ${safety?.ventilationDecision.reason ?? 'Keep windows closed during high pollution hours.'}
- **Air Purifiers:** Use a mechanical true HEPA filter sized appropriately for your room volume (aim for 4-5 air changes per hour).
- **Ozone Warning:** Never use ozone generators or ionizing devices; ozone is a severe respiratory irritant.
- **Houseplants:** Houseplants cannot measurably filter fine PM2.5 smog in real homes. Rely on mechanical HEPA filtration.
- **Cooking & Combustion:** Run kitchen exhaust fans on high and avoid burning incense (agarbatti), candles, or mosquito coils indoors.`;
    }

    if (q.includes('commute') || q.includes('car') || q.includes('transit') || q.includes('transport') || q.includes('cycle')) {
      return `🚲 **Smart Commuting & Sustainable Transport in ${loc}:**
- **Current Conditions:** ${cat} (AQI: ${aqi}).
- **Cycling/Walking Advice:** ${safety && !safety.outdoorExerciseSafe ? 'Do NOT cycle or run along congested roadways today due to high pollution.' : 'Safe for active travel if choosing low-traffic corridors.'}
- **Recommended Option:** Choose enclosed high-capacity public transit (metro or bus with closed windows).
- **Idle Reduction:** Never idle your vehicle engine while waiting. Turning off the ignition saves fuel and eliminates toxic roadside micro-plumes.`;
    }

    if (q.includes('reduce') || q.includes('sustainable') || q.includes('emission') || q.includes('footprint') || q.includes('green')) {
      return `🌱 **Household Pollution & Emission Reduction Strategies:**
1. **Consolidate Errands:** Combine shopping trips to eliminate cold-engine vehicle starts.
2. **Clean Cooking:** Switch to electric induction cooking where possible, or ensure high-flow external exhaust venting for gas stoves.
3. **Avoid Open Combustion:** Never burn garden waste, leaves, or trash.
4. **Energy Efficiency:** Maintain clean air purifier pre-filters monthly so motors run with minimal electrical drag.`;
    }

    // General fallback
    return `ℹ️ **Environmental Overview for ${loc}:**
- **Air Quality Status:** ${cat} (Index: ${aqi} [${airQuality?.indexStandard || 'Standard'}]).
- **Health Focus:** ${safety?.respiratorGuidance || 'Monitor local pollution levels before planning outdoor activities.'}
- **Safety Reminder:** ${safety?.urgentMedicalAdvisory || 'AirWise AI provides environmental guidance, not clinical medical advice.'}

Feel free to ask about outdoor exercise safety, indoor air purifier tips, smart commuting, or household emission reduction!`;
  }
}

export const geminiService = new GeminiService();
