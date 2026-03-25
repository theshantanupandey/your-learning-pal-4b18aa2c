import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function VoiceTutor() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<{role: string, text: string}[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionPromiseRef = useRef<any>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const connect = async () => {
    setIsConnecting(true);
    try {
      // 1. Get Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      } });
      mediaStreamRef.current = stream;

      // 2. Setup Audio Context
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // 3. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }, // Friendly voice
          },
          systemInstruction: "You are VidyAI, a friendly and patient NCERT tutor for Class 6-10 students in India. You are talking to a student over a phone call. Keep your responses short, conversational, and engaging. Ask questions to check their understanding. Do not use markdown or lists, just speak naturally. Start by asking for their name, class, and what subject they want to learn today.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            
            // Start sending audio
            processor.onaudioprocess = (e) => {
              if (isMuted) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32 to Int16
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              
              // Base64 encode
              const buffer = new Uint8Array(pcm16.buffer);
              let binary = '';
              for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session: any) => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Convert Int16 to Float32
              const int16Array = new Int16Array(bytes.buffer);
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
              }
              
              playbackQueueRef.current.push(float32Array);
              playNextAudio();
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              playbackQueueRef.current = [];
              isPlayingRef.current = false;
            }

            // Handle Transcriptions
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
              const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
              if (text) setTranscript(prev => [...prev, { role: 'model', text }]);
            }
            
            // Note: The Live API doesn't always send input transcription back in the same way,
            // but if it does, it would be handled here.
          },
          onerror: (error) => {
            console.error("Live API Error:", error);
            disconnect();
          },
          onclose: () => {
            disconnect();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to connect:", error);
      setIsConnecting(false);
      alert("Could not access microphone or connect to AI. Please check permissions.");
    }
  };

  const playNextAudio = () => {
    if (!audioContextRef.current || playbackQueueRef.current.length === 0) return;
    
    const audioCtx = audioContextRef.current;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const bufferData = playbackQueueRef.current.shift()!;
    const audioBuffer = audioCtx.createBuffer(1, bufferData.length, 24000); // Output is 24kHz
    audioBuffer.getChannelData(0).set(bufferData);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    const currentTime = audioCtx.currentTime;
    const startTime = Math.max(currentTime, nextPlayTimeRef.current);
    
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;

    source.onended = () => {
      if (playbackQueueRef.current.length > 0) {
        playNextAudio();
      } else {
        isPlayingRef.current = false;
      }
    };
    
    isPlayingRef.current = true;
  };

  const disconnect = () => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then((session: any) => session.close());
      sessionPromiseRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setTranscript([]);
    playbackQueueRef.current = [];
    nextPlayTimeRef.current = 0;
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-white">
      <header className="p-6 flex items-center justify-between">
        <Link to="/" className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-slate-300" />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-semibold">Voice Tutor</h1>
          <p className="text-sm text-slate-400">
            {isConnected ? 'Call in progress' : isConnecting ? 'Connecting...' : 'Ready to call'}
          </p>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-12">
        
        {/* Avatar / Visualizer */}
        <div className="relative">
          <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${
            isConnected 
              ? 'bg-purple-600 shadow-[0_0_60px_rgba(147,51,234,0.5)]' 
              : 'bg-slate-800'
          }`}>
            {isConnected ? (
              <div className="flex space-x-2 items-center h-16">
                <div className="w-2 bg-white rounded-full animate-[bounce_1s_infinite_0ms] h-8" />
                <div className="w-2 bg-white rounded-full animate-[bounce_1s_infinite_200ms] h-16" />
                <div className="w-2 bg-white rounded-full animate-[bounce_1s_infinite_400ms] h-12" />
                <div className="w-2 bg-white rounded-full animate-[bounce_1s_infinite_600ms] h-6" />
              </div>
            ) : (
              <Phone className="w-16 h-16 text-slate-600" />
            )}
          </div>
          
          {/* Pulse rings when connected */}
          {isConnected && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-purple-500 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
              <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
            </>
          )}
        </div>

        {/* Transcript Area (Optional, good for debugging/accessibility) */}
        <div className="w-full max-w-md h-32 overflow-y-auto text-center space-y-2 px-4 scrollbar-hide">
          {transcript.slice(-2).map((msg, idx) => (
            <p key={idx} className={`text-sm ${msg.role === 'model' ? 'text-purple-300' : 'text-slate-400'}`}>
              {msg.text}
            </p>
          ))}
          {!isConnected && !isConnecting && (
            <p className="text-slate-500">Tap the phone button to start learning.</p>
          )}
        </div>

      </main>

      <footer className="p-8 pb-12 flex justify-center items-center space-x-8">
        {isConnected ? (
          <>
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-5 rounded-full transition-colors ${
                isMuted ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            
            <button 
              onClick={disconnect}
              className="p-6 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
            
            <button 
              className="p-5 bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 transition-colors"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          </>
        ) : (
          <button 
            onClick={connect}
            disabled={isConnecting}
            className="p-6 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Phone className="w-8 h-8" />
          </button>
        )}
      </footer>
    </div>
  );
}
