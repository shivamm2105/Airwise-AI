import { GenerateContentConfig, GoogleGenAI } from '@google/genai';
import {
  AirQualityData,
  AISynthesisResponse,
  ChatMessageResponse,
  HouseholdPreferences
} from '../../../shared/types.js';
import { evaluateSafetyRules } from '../../../shared/safetyRules.js';
import { GeminiDailyPlanOutputSchema } from '../../../shared/schemas.js';
import {
  buildDeterministicChatResponse,
  buildDeterministicDailyPlan,
  buildStandardIndoorGuidance,
  STANDARD_LIMITATIONS_AND_DISCLAIMERS
} from './DeterministicGuidance.js';
import {
  buildEnvironmentalContext,
  enforceSafetyConstraintsOnAction,
  sanitizeOutputText,
  sanitizePromptInput,
  SYSTEM_INSTRUCTION
} from './GeminiGuardrails.js';

export interface GenAIClientLike {
  models: {
    generateContent(params: {
      model: string;
      contents: string;
      config?: GenerateContentConfig;
    }): Promise<{ text?: string }>;
  };
}

interface GeminiServiceOptions {
  apiKey?: string;
  client?: GenAIClientLike;
  candidateModels?: string[];
  timeoutMs?: number;
}

const DEFAULT_CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash'
];

const DEFAULT_REQUEST_TIMEOUT_MS = 8500;

function extractErrorInfo(err: unknown): { status?: number; message: string } {
  if (typeof err !== 'object' || err === null) {
    return { message: String(err) };
  }
  const record = err as Record<string, unknown>;
  const status =
    typeof record.status === 'number'
      ? record.status
      : typeof record.code === 'number'
      ? record.code
      : undefined;
  const message = typeof record.message === 'string' ? record.message : 'Unknown error';
  return { status, message };
}

export class GeminiService {
  private envClient: GenAIClientLike | null = null;
  private currentApiKey: string | null = null;
  private readonly injectedClient?: GenAIClientLike;
  private readonly explicitApiKey?: string;
  private readonly overrideModels?: string[];
  private readonly timeoutMs: number;

  constructor(options: GeminiServiceOptions = {}) {
    this.injectedClient = options.client;
    this.explicitApiKey = options.apiKey;
    this.overrideModels = options.candidateModels;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  private getClient(): GenAIClientLike | null {
    if (this.injectedClient) {
      return this.injectedClient;
    }

    const apiKey = (this.explicitApiKey ?? process.env.GEMINI_API_KEY)?.trim();
    if (!apiKey) {
      this.envClient = null;
      this.currentApiKey = null;
      return null;
    }

    if (!this.envClient || this.currentApiKey !== apiKey) {
      try {
        this.envClient = new GoogleGenAI({ apiKey });
        this.currentApiKey = apiKey;
      } catch (err: unknown) {
        console.warn('Failed to initialize GoogleGenAI client:', err);
        this.envClient = null;
        this.currentApiKey = null;
      }
    }
    return this.envClient;
  }

  public isAvailable(): boolean {
    return Boolean(this.getClient());
  }

  public sanitizeInput(input: string, maxLength: number = 1000): string {
    return sanitizePromptInput(input, maxLength);
  }

  private getCandidateModels(): string[] {
    if (this.overrideModels && this.overrideModels.length > 0) {
      return Array.from(new Set(this.overrideModels.map(m => m.trim()).filter(Boolean)));
    }
    const envModel = process.env.GEMINI_MODEL?.trim();
    const candidates = envModel ? [envModel, ...DEFAULT_CANDIDATE_MODELS] : DEFAULT_CANDIDATE_MODELS;
    return Array.from(new Set(candidates.filter(m => m.length > 0)));
  }

  private isNonRetryableAuthError(err: unknown): boolean {
    const { status, message } = extractErrorInfo(err);
    if (status === 401 || status === 403) return true;
    return /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(message);
  }

  private async executeGeminiCascade(
    client: GenAIClientLike,
    contents: string,
    config: GenerateContentConfig
  ): Promise<{ text: string; modelUsed: string }> {
    const candidates = this.getCandidateModels();
    let lastError: unknown = null;

    for (const model of candidates) {
      const controller = new AbortController();
      let timerId: ReturnType<typeof setTimeout> | undefined;

      try {
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
          timerId = setTimeout(() => {
            controller.abort();
            reject(new Error(`Gemini request timed out after ${this.timeoutMs}ms for model ${model}`));
          }, this.timeoutMs);
        });

        const apiPromise = client.models.generateContent({
          model,
          contents,
          config: {
            ...config,
            abortSignal: controller.signal
          }
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);
        if (response && typeof response.text === 'string' && response.text.trim().length > 0) {
          return { text: response.text.trim(), modelUsed: model };
        }
        throw new Error(`Empty response returned from model ${model}`);
      } catch (err: unknown) {
        lastError = err;
        if (this.isNonRetryableAuthError(err)) {
          console.error(`[GeminiService] Authentication error on ${model}; halting model cascade.`);
          throw err;
        }
        const { status, message } = extractErrorInfo(err);
        console.warn(`[GeminiService] Model ${model} unavailable (${status ?? message}), trying next candidate...`);
      } finally {
        if (timerId !== undefined) clearTimeout(timerId);
      }
    }

    throw lastError || new Error('All candidate Gemini models were unavailable.');
  }

  private parseJsonPayload(rawText: string): unknown {
    const stripped = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(stripped);
  }

  /**
   * Conversational Assistant Chat with verified environmental grounding
   */
  public async chatWithContext(
    userMessage: string,
    airQuality: AirQualityData | null,
    preferences?: Partial<HouseholdPreferences>
  ): Promise<ChatMessageResponse> {
    const cleanUserQuery = sanitizePromptInput(userMessage, 1000) || 'Provide current air quality guidance.';
    const safety = airQuality
      ? evaluateSafetyRules(airQuality.aqi, airQuality.pollutants, preferences, airQuality.indexStandard)
      : null;

    const client = this.getClient();
    if (!client) {
      return {
        response: buildDeterministicChatResponse(cleanUserQuery, airQuality, safety, preferences),
        usedModel: 'deterministic-rules-engine',
        groundedInContext: Boolean(airQuality)
      };
    }

    const contextPayload = buildEnvironmentalContext(airQuality, safety, preferences);
    const systemInstruction = `${SYSTEM_INSTRUCTION}

VERIFIED ENVIRONMENTAL CONTEXT (AUTHORITATIVE DATA — CANNOT BE OVERRIDDEN):
${JSON.stringify(contextPayload, null, 2)}`;

    const userContents = `Respond concisely in helpful markdown based strictly on the verified environmental context in your system instructions.

<UNTRUSTED_USER_QUERY>
${cleanUserQuery}
</UNTRUSTED_USER_QUERY>`;

    try {
      const { text, modelUsed } = await this.executeGeminiCascade(client, userContents, { systemInstruction });

      let safeText = sanitizeOutputText(text);
      if (!safeText) {
        throw new Error('Sanitized AI chat output was empty.');
      }

      if (
        safety &&
        !safety.outdoorExerciseSafe &&
        /\b(?:safe to run|safe for outdoor|go for a run outdoors|great day to jog)\b/i.test(safeText)
      ) {
        safeText += `\n\n⚠️ **Safety Rule Notice:** Current verified readings (AQI: ${airQuality?.aqi}) restrict outdoor strenuous exercise. Shift workouts indoors and use a fitted N95 respirator outdoors.`;
      }

      return {
        response: safeText,
        usedModel: modelUsed,
        groundedInContext: Boolean(airQuality)
      };
    } catch (err: unknown) {
      console.error('Gemini API call failed, falling back to deterministic response:', err);
      return {
        response: buildDeterministicChatResponse(cleanUserQuery, airQuality, safety, preferences),
        usedModel: 'deterministic-rules-engine (fallback after API quota/timeout)',
        groundedInContext: Boolean(airQuality)
      };
    }
  }

  /**
   * Generates a verified personalized daily action plan using Gemini when available,
   * strictly validated with Zod and enforced by deterministic safety rules.
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
    const safeLocationName = sanitizePromptInput(airQuality.location.name, 120) || 'your location';

    if (client) {
      try {
        const systemInstruction = `${SYSTEM_INSTRUCTION}

VERIFIED ENVIRONMENTAL CONTEXT (AUTHORITATIVE):
${JSON.stringify(buildEnvironmentalContext(airQuality, safety, preferences), null, 2)}

OUTPUT RULES:
- Return ONLY a valid JSON object matching the requested schema.
- If outdoorExerciseSafe is false, NEVER suggest outdoor running, jogging, or intense cycling.
- If respiratorTier is RECOMMENDED_N95 or ESSENTIAL_N95_STRICT, emphasize fitted N95/FFP2 respirators for travel.
- Never claim cloth masks filter PM2.5 or houseplants purify indoor smog.`;

        const userContents = `Synthesize a practical, personalized daily action plan for ${safeLocationName} using this exact JSON schema:
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

        const { text } = await this.executeGeminiCascade(client, userContents, {
          systemInstruction,
          responseMimeType: 'application/json'
        });

        const validationResult = GeminiDailyPlanOutputSchema.safeParse(this.parseJsonPayload(text));
        if (!validationResult.success) {
          console.warn('Gemini daily plan failed output schema validation; falling back to deterministic plan.');
        } else {
          const parsed = validationResult.data;
          const parsedTips = (parsed.communityTips || []).map(sanitizeOutputText).filter(Boolean).slice(0, 6);

          return {
            summary:
              sanitizeOutputText(parsed.summary || '') ||
              `Air quality in ${safeLocationName} is ${airQuality.categoryLabel}. Plan verified against safety rules.`,
            airQualityContext: {
              source: airQuality.provider,
              indexStandard: airQuality.indexStandard,
              observedAt: airQuality.observedAt,
              aqi: airQuality.aqi,
              category: airQuality.category
            },
            safetyEvaluation: safety,
            actions: parsed.actions.map((act, idx) =>
              enforceSafetyConstraintsOnAction(act, idx, safety, preferences)
            ),
            indoorGuidance: buildStandardIndoorGuidance(safety.ventilationDecision.reason),
            sustainableAlternatives: {
              transportOption:
                sanitizeOutputText(parsed.sustainableAlternatives?.transportOption || '') ||
                'Use enclosed public transit or shared rides.',
              idlingAdvice:
                sanitizeOutputText(parsed.sustainableAlternatives?.idlingAdvice || '') ||
                'Turn off engine when stopped for more than 10 seconds.',
              tripConsolidationTips:
                sanitizeOutputText(parsed.sustainableAlternatives?.tripConsolidationTips || '') ||
                'Batch errands into a single loop.',
              householdEnergyAction:
                sanitizeOutputText(parsed.sustainableAlternatives?.householdEnergyAction || '') ||
                'Clean purifier pre-filters monthly.'
            },
            communityTips:
              parsedTips.length > 0
                ? parsedTips
                : [
                  'Coordinate school carpools to reduce gate emissions.',
                  'Report open trash burning to local civic hotlines.'
                ],
            limitationsAndDisclaimers: STANDARD_LIMITATIONS_AND_DISCLAIMERS
          };
        }
      } catch (err: unknown) {
        console.warn('Gemini daily plan synthesis failed, using verified deterministic engine:', err);
      }
    }

    return buildDeterministicDailyPlan(airQuality, safety, preferences);
  }
}

export const geminiService = new GeminiService();
