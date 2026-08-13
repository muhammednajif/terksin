/* eslint-disable @typescript-eslint/no-explicit-any */
const AI_SERVER_URL = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:3099';

export interface AIResponse {
  conversationId: string;
  error?: string;
  retryable?: boolean;
  data?: {
    responseType: 'clarification' | 'recommendations' | 'complete_plan' | 'modification' | 'warning' | 'error';
    message: string;
    preferences?: Record<string, any>;
    missingInformation?: string[];
    recommendations?: any[];
    plan?: any;
    warnings?: string[];
    sourcesUsed?: string[];
  };
}

export async function sendChatMessage(
  message: string,
  conversationId?: string,
  history?: { role: string; content: string }[]
): Promise<AIResponse> {
  const res = await fetch(`${AI_SERVER_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message, history }),
    signal: AbortSignal.timeout(120000),
  });
  return res.json();
}

export function sendChatMessageStream(
  message: string,
  onChunk: (text: string) => void,
  onDone: (final: any) => void,
  onError: (err: string) => void,
  conversationId?: string,
): AbortController {
  const controller = new AbortController();

  fetch(`${AI_SERVER_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversation_id: conversationId, stream: true }),
    signal: controller.signal,
  }).then(async (response) => {
    const reader = response.body?.getReader();
    if (!reader) { onError('No response stream'); return; }
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.error) { onError(parsed.message || 'Stream error'); return; }
          if (parsed.done && parsed.final) {
            onDone(parsed.final);
            return;
          }
          if (parsed.content) onChunk(parsed.content);
        } catch {}
      }
    }
  }).catch(err => {
    if (err.name !== 'AbortError') onError('Connection failed');
  });

  return controller;
}

export async function searchTreks(params: {
  location?: string;
  difficulty?: string;
  duration?: string;
  terrain?: string;
  budget?: number;
  maxBudget?: number;
  experience?: string;
}) {
  const res = await fetch(`${AI_SERVER_URL}/api/ai/tools/search-treks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(10000),
  });
  return res.json();
}

export async function getWeather(latitude: number, longitude: number, date?: string) {
  const res = await fetch(`${AI_SERVER_URL}/api/ai/tools/weather`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: latitude, lng: longitude, date }),
    signal: AbortSignal.timeout(8000),
  });
  return res.json();
}

export async function calculateBudget(travelers: number, trekPrice: number) {
  const res = await fetch(`${AI_SERVER_URL}/api/ai/tools/budget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ travelers, trekPrice }),
    signal: AbortSignal.timeout(5000),
  });
  return res.json();
}

export async function getPackingList(trek: any, weather: any) {
  const res = await fetch(`${AI_SERVER_URL}/api/ai/tools/packing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trek, weather }),
    signal: AbortSignal.timeout(5000),
  });
  return res.json();
}

export async function getSafetyAssessment(trek: any, weather: any, experience: string) {
  const res = await fetch(`${AI_SERVER_URL}/api/ai/tools/safety`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trek, weather, experience }),
    signal: AbortSignal.timeout(5000),
  });
  return res.json();
}

export async function checkAiHealth() {
  try {
    const res = await fetch(`${AI_SERVER_URL}/api/ai/health`, { signal: AbortSignal.timeout(3000) });
    return await res.json();
  } catch {
    return { status: 'unreachable', treksCount: 0, hasApiKey: false, provider: 'ollama', ollama: false, modelInstalled: false };
  }
}
