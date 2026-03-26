import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, PhoneOff, Phone } from 'lucide-react';
import { getGeminiKey, getFishAudioKey, getFishVoiceId, getVoiceModel } from '@/lib/apiKeys';
import { synthesizeSpeech, playAudioBlob } from '@/lib/fishAudio';
import VoiceOrb from '@/components/VoiceOrb';
import { motion } from 'framer-motion';

export default function VoiceTutor() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionPromiseRef = useRef<any>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const connect = async () => {
    const apiKey = getGeminiKey();
    if (!apiKey) {
      alert('A Gemini API key is required — it powers the AI conversation. The voice model setting only controls the text-to-speech output.');
      window.location.href = '/api';
      return;
    }
    const ai = new GoogleGenAI({ apiKey });
    setIsConnecting(true);
    setStatus('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      
      // Use AudioWorkletNode instead of deprecated ScriptProcessorNode
      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const input = inputs[0];
            if (!input || !input[0]) return true;
            
            const inputData = input[0];
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              let s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            
            const buffer = new Uint8Array(pcm16.buffer);
            let binary = '';
            for (let i = 0; i < buffer.byteLength; i++) {
              binary += String.fromCharCode(buffer[i]);
            }
            const base64Data = btoa(binary);
            
            this.port.postMessage(base64Data);
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await audioCtx.audioWorklet.addModule(workletUrl);
      
      const processor = new AudioWorkletNode(audioCtx, 'pcm-processor');
      processorRef.current = processor as any; // We only need it to disconnect later

      // Check voice model preference and Fish Audio availability
      const voiceModel = getVoiceModel();
      const fishKey = getFishAudioKey();
      const fishVoiceId = getFishVoiceId();
      const useFishAudio = voiceModel === 'fish_audio' && !!fishKey && !!fishVoiceId;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: useFishAudio ? [Modality.TEXT] : [Modality.AUDIO],
          ...(!useFishAudio && {
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
            },
          }),
          systemInstruction:
            'You are VidyAI, a friendly and patient NCERT tutor for Class 6-10 students in India. You are talking to a student over a phone call. Keep responses short, conversational, and engaging. Ask questions to check understanding. Do not use markdown or lists, just speak naturally. Start by asking for their name, class, and what subject they want to learn today.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            setStatus('listening');

            processor.port.onmessage = (e) => {
              if (isMuted || !sessionPromiseRef.current) return;
              
              const base64Data = e.data;
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session: any) => {
                  try {
                    // Only send if we still have a session reference, preventing sends after disconnect
                    if (sessionPromiseRef.current) {
                      session.sendRealtimeInput([{ mimeType: 'audio/pcm;rate=16000', data: base64Data }]);
                    }
                  } catch (err) {
                    console.error('Error sending audio data:', err);
                  }
                }).catch(() => {});
              }
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle native audio output (when not using Fish Audio)
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setStatus('speaking');
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const int16Array = new Int16Array(bytes.buffer);
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
              }
              playbackQueueRef.current.push(float32Array);
              playNextAudio();
            }

            if (message.serverContent?.interrupted) {
              playbackQueueRef.current = [];
              isPlayingRef.current = false;
              setStatus('listening');
            }

            // Handle text transcription & Fish Audio TTS
            const textContent = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (textContent) {
              setTranscript((prev) => [...prev, { role: 'model', text: textContent }]);

              // If Fish Audio is configured, use it for TTS
              if (useFishAudio) {
                setStatus('speaking');
                try {
                  const blob = await synthesizeSpeech(textContent, fishVoiceId, fishKey);
                  await playAudioBlob(blob);
                } catch (err) {
                  console.error('Fish Audio TTS error:', err);
                }
                setStatus('listening');
              }
            }
          },
          onerror: (error) => {
            console.error('Live API Error:', error);
            disconnect();
          },
          onclose: () => disconnect(),
        },
      });

      sessionPromiseRef.current = sessionPromise;
    } catch {
      setIsConnecting(false);
      setStatus('idle');
      alert('Could not access microphone or connect to AI.');
    }
  };

  const playNextAudio = () => {
    if (!audioContextRef.current || playbackQueueRef.current.length === 0) return;
    const audioCtx = audioContextRef.current;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const bufferData = playbackQueueRef.current.shift()!;
    const audioBuffer = audioCtx.createBuffer(1, bufferData.length, 24000);
    audioBuffer.getChannelData(0).set(bufferData);

    const src = audioCtx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(audioCtx.destination);

    const currentTime = audioCtx.currentTime;
    const startTime = Math.max(currentTime, nextPlayTimeRef.current);
    src.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;

    src.onended = () => {
      if (playbackQueueRef.current.length > 0) {
        playNextAudio();
      } else {
        isPlayingRef.current = false;
        setStatus('listening');
      }
    };
    isPlayingRef.current = true;
  };

  const disconnect = () => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then((session: any) => {
        try {
          if (session && typeof session.close === 'function') {
            session.close();
          }
        } catch (e) {
          console.error("Error closing session", e);
        }
      }).catch(() => {});
      sessionPromiseRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null; // Remove the event listener to immediately stop processing
      processorRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setStatus('idle');
    setTranscript([]);
    playbackQueueRef.current = [];
    nextPlayTimeRef.current = 0;
  };

  useEffect(() => () => disconnect(), []);

  return (
    <div className="flex flex-col items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex flex-col items-center gap-12 w-full max-w-md">
        {/* Orb */}
        <VoiceOrb isConnected={isConnected} isConnecting={isConnecting} status={status} />

        {/* Transcript */}
        <div className="w-full h-28 overflow-y-auto scrollbar-hide text-center space-y-2 px-4">
          {transcript.slice(-3).map((msg, idx) => (
            <motion.p
              key={idx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm ${msg.role === 'model' ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {msg.text}
            </motion.p>
          ))}
          {!isConnected && !isConnecting && (
            <p className="text-sm text-muted-foreground">Tap the button below to start.</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          {isConnected ? (
            <>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full transition-colors ${
                  isMuted ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={disconnect}
                className="p-5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors shadow-lg"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="p-5 bg-success text-success-foreground rounded-full hover:bg-success/90 transition-colors shadow-lg disabled:opacity-50"
            >
              <Phone className="w-7 h-7" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
