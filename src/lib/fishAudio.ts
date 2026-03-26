export async function synthesizeSpeech(
  text: string,
  voiceId: string,
  apiKey: string
): Promise<Blob> {
  const response = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      reference_id: voiceId,
      model: 'fishaudio-32b', // Required by newer V1 API
      format: 'mp3',
      latency: 'balanced',
    }),
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || JSON.stringify(errorData);
    } catch {
      // Ignore JSON parse errors if the response isn't JSON
    }
    throw new Error(`Fish Audio TTS failed (${response.status}): ${errorMessage}`);
  }

  return response.blob();
}

export function playAudioBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    audio.play();
  });
}
