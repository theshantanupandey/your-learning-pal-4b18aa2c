// Voice utilities — Web Speech API (STT) + API-based TTS (Fish Audio / ElevenLabs)

export function startListening(onResult, onEnd, lang = 'en-IN') {
  if (typeof window === 'undefined') return null;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Web Speech API not supported');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onresult = (event) => {
    let transcript = '';
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }
    onResult(transcript, isFinal);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  recognition.onerror = (e) => {
    if (e.error !== 'no-speech' && e.error !== 'aborted') {
      console.error('Speech recognition error:', e.error);
    }
    if (onEnd) onEnd();
  };

  recognition.start();
  return recognition;
}

export function stopListening(recognition) {
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
  }
}

// Read stored API keys from localStorage
function getStoredKeys() {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('taksh_api_keys');
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

// TTS — sends stored API key to server
export async function speak(text, options = {}) {
  if (typeof window === 'undefined') return;

  const keys = getStoredKeys();
  const provider = keys.ttsProvider || 'fish';

  // Pick the right API key and voice ID based on provider
  let apiKey, voiceId;
  if (provider === 'elevenlabs') {
    apiKey = keys.elevenLabsKey || '';
    voiceId = options.voiceId || keys.elevenLabsVoiceId || '';
  } else {
    apiKey = keys.fishAudioKey || '';
    voiceId = options.voiceId || keys.fishVoiceId || '';
  }

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, provider, voiceId, apiKey }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = options.rate || 1;

      if (typeof window !== 'undefined') {
        window.__takshAudio = audio;
      }

      return new Promise((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); window.__takshAudio = null; resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); window.__takshAudio = null; resolve(); };
        audio.play().catch(() => resolve());
      });
    } else {
      const err = await res.json().catch(() => ({}));
      console.warn('TTS request failed:', res.status, err.error || '');
    }
  } catch (e) {
    console.warn('TTS failed:', e.message);
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.__takshAudio) {
    window.__takshAudio.pause();
    window.__takshAudio = null;
  }
}

export function isSpeechSupported() {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Helper to get stored Gemini key for chat API calls
export function getGeminiKey() {
  const keys = getStoredKeys();
  return keys.geminiKey || '';
}
