// Voice utilities — Web Speech API (STT) + TTS fallback
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
    console.error('Speech recognition error:', e.error);
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

// TTS — try Fish Audio, fallback to Web Speech Synthesis
export async function speak(text, options = {}) {
  if (typeof window === 'undefined') return;

  // Try Fish Audio first if API key available
  if (options.useFishAudio) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: options.voiceId }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = options.rate || 1;
        
        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.play().catch(() => resolve());
        });
      }
    } catch (e) {
      console.warn('Fish Audio TTS failed, falling back to Web Speech:', e);
    }
  }

  // Fallback: Web Speech Synthesis
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'en-IN';
    utterance.rate = options.rate || 0.95;
    utterance.pitch = options.pitch || 1.0;

    // Try to find an Indian English voice
    const voices = window.speechSynthesis.getVoices();
    const indianVoice = voices.find(v => v.lang === 'en-IN') ||
                        voices.find(v => v.lang.startsWith('en')) ||
                        voices[0];
    if (indianVoice) utterance.voice = indianVoice;

    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeechSupported() {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isTTSSupported() {
  if (typeof window === 'undefined') return false;
  return !!window.speechSynthesis;
}
