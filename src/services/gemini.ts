import type { Env } from '../env.js';
import { MAIN_SYSTEM, PROFILE_ANALYSIS } from '../prompts.js';

interface GeminiPart {
  text: string;
}
interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}
interface GeminiResponse {
  candidates?: { content?: GeminiContent; finishReason?: string }[];
  error?: { message: string };
  usageMetadata?: unknown;
}

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
];

function apiUrl(model: string, key: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

async function callApi(url: string, payload: unknown): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as GeminiResponse;
  if (json.error) {
    throw new Error(`Gemini error: ${json.error.message}`);
  }

  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    return 'Не удалось сформировать ответ. Попробуйте переформулировать запрос.';
  }
  return text;
}

/** Turn free-form taste description into a structured profile string. */
export async function analyzeProfile(env: Env, text: string): Promise<string> {
  const payload = {
    contents: [{ role: 'user', parts: [{ text: `${PROFILE_ANALYSIS}\n\nТекст: ${text}` }] }],
  };
  return callApi(apiUrl(env.MODEL_FAST, env.GEMINI_API_KEY), payload);
}

export interface RecommendationInput {
  profile: string;
  location: string;
  history: GeminiContent[];
  prompt: string;
}

/** Main recommendation call: profile + history + Google Search grounding. */
export async function generateRecommendation(
  env: Env,
  { profile, location, history, prompt }: RecommendationInput,
): Promise<string> {
  const systemPrompt = `${MAIN_SYSTEM}\n👤 Профиль: ${profile}\n📍 Локация: ${location}`;

  const payload = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Принято. Жду запрос.' }] },
      ...history,
      { role: 'user', parts: [{ text: prompt }] },
    ],
    tools: [{ google_search: {} }],
    safetySettings: SAFETY_SETTINGS,
  };

  return callApi(apiUrl(env.MODEL_SMART, env.GEMINI_API_KEY), payload);
}
