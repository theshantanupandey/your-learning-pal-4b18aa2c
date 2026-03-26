export async function POST(request) {
  try {
    const { text, voiceId } = await request.json();

    const apiKey = process.env.FISH_AUDIO_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'No Fish Audio API key configured' }, { status: 400 });
    }

    const payload = {
      text,
      reference_id: voiceId || process.env.FISH_AUDIO_VOICE_ID || undefined,
      format: 'mp3',
      latency: 'balanced',
    };

    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fish Audio error:', response.status, errorText);
      return Response.json({ error: 'TTS failed', details: errorText }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return Response.json({ error: 'TTS failed', details: error.message }, { status: 500 });
  }
}
