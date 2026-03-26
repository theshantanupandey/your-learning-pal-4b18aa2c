const STORAGE_KEY = 'vidyai_api_keys';

export type VoiceModel = 'gemini' | 'fish_audio';

export type ApiKeyConfig = {
  gemini: string;
  fishAudio: string;
  fishVoiceId: string;
  voiceModel: VoiceModel;
};

const defaults: ApiKeyConfig = {
  gemini: '',
  fishAudio: '',
  fishVoiceId: '',
  voiceModel: 'gemini',
};

export function getApiKeys(): ApiKeyConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaults, ...JSON.parse(stored) };
  } catch {}
  return { ...defaults };
}

export function saveApiKeys(keys: Partial<ApiKeyConfig>) {
  const current = getApiKeys();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...keys }));
}

export function getGeminiKey(): string {
  return getApiKeys().gemini || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';
}

export function getFishAudioKey(): string {
  return getApiKeys().fishAudio || '';
}

export function getFishVoiceId(): string {
  return getApiKeys().fishVoiceId || '';
}

export function getVoiceModel(): VoiceModel {
  return getApiKeys().voiceModel || 'gemini';
}
