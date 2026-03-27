'use client';
import { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { startListening, stopListening, speak, stopSpeaking, isSpeechSupported, getGeminiKey } from '@/lib/voice';

export default function CallPage() {
  const [state, setState] = useState('idle'); // idle | ringing | active | ended
  const [messages, setMessages] = useState([]);
  const [interim, setInterim] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [userName, setUserName] = useState('');
  const [isNew, setIsNew] = useState(true);
  const [callLogs, setCallLogs] = useState([]);

  const recRef = useRef(null);
  const timerRef = useRef(null);
  const msgsRef = useRef([]);
  const stateRef = useRef('idle');

  useEffect(() => { msgsRef.current = messages; }, [messages]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    if (state === 'active') { timerRef.current = setInterval(() => setDuration(d => d + 1), 1000); }
    return () => clearInterval(timerRef.current);
  }, [state]);

  // Load past call logs
  useEffect(() => {
    try {
      const stored = localStorage.getItem('taksh_call_logs');
      if (stored) setCallLogs(JSON.parse(stored));
    } catch {}
  }, []);

  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const add = (role, content) => {
    setMessages(p => {
      const u = [...p, { role, content, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }];
      msgsRef.current = u;
      return u;
    });
  };

  // Speak using Fish Audio API (falls back to browser TTS if no key)
  const speakAPI = async (text) => {
    setSpeaking(true);
    const clean = text.replace(/[*#_`]/g, '').replace(/\n+/g, '. ');
    await speak(clean, { useFishAudio: true, rate: 0.95 });
    setSpeaking(false);
  };

  const startCall = async () => {
    setState('ringing');
    setMessages([]);
    setDuration(0);
    setTimeout(async () => {
      setState('active');
      const g = isNew
        ? "Hello! I'm Taksh, your AI tutor. What's your name?"
        : `Hello ${userName}! What would you like to learn today?`;
      add('tutor', g);
      await speakAPI(g);
      startVoice();
    }, 2000);
  };

  const endCall = () => {
    setState('ended');
    stopListening(recRef.current);
    stopSpeaking();
    clearInterval(timerRef.current);

    // Save call log to localStorage
    if (msgsRef.current.length > 0) {
      const log = {
        id: Date.now(),
        date: new Date().toISOString(),
        duration: duration,
        messageCount: msgsRef.current.length,
        transcript: msgsRef.current.map(m => ({
          role: m.role,
          content: m.content,
          time: m.time,
        })),
        summary: msgsRef.current
          .filter(m => m.role === 'student')
          .map(m => m.content)
          .slice(0, 3)
          .join(', ') || 'No student messages',
      };

      const updated = [log, ...callLogs].slice(0, 50); // Keep last 50 calls
      setCallLogs(updated);
      localStorage.setItem('taksh_call_logs', JSON.stringify(updated));
    }
  };

  const startVoice = () => {
    if (muted) return;
    recRef.current = startListening(
      (t, f) => {
        setInterim(t);
        if (f && t.trim()) { setInterim(''); handleMsg(t.trim()); }
      },
      () => {
        if (stateRef.current === 'active' && !muted) {
          setTimeout(() => { if (msgsRef.current.length > 0) startVoice(); }, 800);
        }
      },
      'en-IN'
    );
  };

  const handleMsg = async (text) => {
    stopListening(recRef.current);
    add('student', text);

    // Name flow
    if (isNew && !userName && msgsRef.current.length <= 3) {
      const name = text.replace(/my name is|i am|i'm|mera naam|main/gi, '').trim();
      setUserName(name);
      setIsNew(false);
      const r = `Nice to meet you, ${name}. What class are you in, and what topic do you want to learn?`;
      add('tutor', r);
      await speakAPI(r);
      startVoice();
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: msgsRef.current.slice(-8), topicContext: null, apiKey: getGeminiKey(), voiceMode: true }),
      });
      const data = await res.json();
      add('tutor', data.response);
      await speakAPI(data.response);
    } catch {
      const err = 'Sorry, can you say that again?';
      add('tutor', err);
      await speakAPI(err);
    }
    startVoice();
  };

  const toggleMute = () => {
    if (muted) { setMuted(false); startVoice(); }
    else { setMuted(true); stopListening(recRef.current); }
  };

  return (
    <div className="page" style={{ paddingTop: 48 }}>
      <Navbar />
      <div style={s.wrap}>
        {/* Phone */}
        <div style={s.phoneWrap}>
          <div style={s.phone} className="card">
            <div style={s.barTop} className="mono">
              <span>Taksh</span>
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {state === 'idle' && (
              <div style={s.center}>
                <div style={s.mark} className="mono">T</div>
                <div style={s.name}>Taksh</div>
                <div style={s.sub}>AI NCERT Tutor</div>
                <div style={s.hint}>Tap to start a voice lesson</div>
                <button style={s.callBtn} onClick={startCall} />
                <div style={s.callLabel} className="mono">CALL</div>
              </div>
            )}

            {state === 'ringing' && (
              <div style={s.center}>
                <div style={{ ...s.mark, animation: 'pulse 1s ease-in-out infinite' }} className="mono">T</div>
                <div style={s.name}>Taksh</div>
                <div style={{ ...s.sub, color: '#4ade80' }} className="mono">CONNECTING...</div>
                <button style={s.endBtn} onClick={endCall} />
              </div>
            )}

            {state === 'active' && (
              <div style={s.activeWrap}>
                <div style={s.activeHead}>
                  <div style={{ ...s.markSm, marginRight: 12 }} className="mono">T</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Taksh</div>
                    <div className="mono" style={{ fontSize: 12, color: '#4ade80' }}>{fmt(duration)}</div>
                  </div>
                </div>
                <div style={s.waveArea}>
                  {speaking ? (
                    <div style={s.wave}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} style={{ ...s.waveBar, animationDelay: `${i * 0.04}s` }} />
                      ))}
                    </div>
                  ) : (
                    <div className="mono" style={{ fontSize: 12, color: muted ? '#f87171' : '#4ade80' }}>
                      {muted ? '● MUTED' : interim ? `● ${interim}` : '● LISTENING'}
                    </div>
                  )}
                </div>
                <div style={s.controls}>
                  <button style={{ ...s.ctrlBtn, color: muted ? '#f87171' : '#ccc' }} onClick={toggleMute}>
                    <div style={s.ctrlIcon}>{muted ? '✕' : '●'}</div>
                    <span className="mono" style={{ fontSize: 10 }}>{muted ? 'UNMUTE' : 'MUTE'}</span>
                  </button>
                  <button style={s.endBtn} onClick={endCall} />
                  <button style={s.ctrlBtn}>
                    <div style={s.ctrlIcon}>◉</div>
                    <span className="mono" style={{ fontSize: 10 }}>SPEAKER</span>
                  </button>
                </div>
              </div>
            )}

            {state === 'ended' && (
              <div style={s.center}>
                <div style={s.mark} className="mono">T</div>
                <div style={s.name}>Call Ended</div>
                <div style={s.sub} className="mono">{fmt(duration)}</div>
                <button style={s.callBtn} onClick={startCall} />
                <div style={s.callLabel} className="mono">CALL AGAIN</div>
              </div>
            )}
          </div>
        </div>

        {/* Transcript */}
        <div style={s.transcript}>
          <div style={s.tHead}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#555' }}>TRANSCRIPT</span>
            <span className="mono" style={{ fontSize: 11, color: '#333' }}>
              {messages.length > 0 ? `${messages.length} messages` : ''}
            </span>
          </div>
          {messages.length === 0 ? (
            <div style={s.tEmpty}>Transcript appears here once the call starts.</div>
          ) : (
            <div style={s.tList}>
              {messages.map((m, i) => (
                <div key={i} style={s.tMsg}>
                  <div style={s.tMsgHead}>
                    <span className="mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: m.role === 'tutor' ? '#888' : '#555' }}>
                      {m.role === 'tutor' ? 'TAKSH' : 'YOU'}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: '#333' }}>{m.time}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>{m.content}</p>
                </div>
              ))}
            </div>
          )}
          {!isSpeechSupported() && (
            <div style={s.warn}>Voice recognition requires Chrome.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { display: 'flex', height: 'calc(100vh - 48px)', overflow: 'hidden' },
  phoneWrap: { flex: '0 0 400px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, borderRight: '1px solid #2a2a2a' },
  phone: { width: 320, height: 580, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  barTop: { padding: '10px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#555', borderBottom: '1px solid #2a2a2a' },

  center: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 24 },
  mark: { width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', color: '#0a0a0a', fontSize: 32, fontWeight: 700, marginBottom: 16 },
  name: { fontSize: 18, fontWeight: 600 },
  sub: { fontSize: 12, color: '#555' },
  hint: { fontSize: 12, color: '#333', marginTop: 8, marginBottom: 32 },
  callBtn: { width: 56, height: 56, background: '#4ade80', border: 'none', cursor: 'pointer', marginTop: 16 },
  endBtn: { width: 56, height: 56, background: '#f87171', border: 'none', cursor: 'pointer', marginTop: 16 },
  callLabel: { fontSize: 10, color: '#555', marginTop: 8, letterSpacing: '0.08em' },

  activeWrap: { flex: 1, display: 'flex', flexDirection: 'column', padding: 16 },
  activeHead: { display: 'flex', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #2a2a2a' },
  markSm: { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', color: '#0a0a0a', fontSize: 18, fontWeight: 700 },
  waveArea: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  wave: { display: 'flex', alignItems: 'center', gap: 2, height: 40 },
  waveBar: { width: 3, background: '#fafafa', animation: 'waveform 0.6s ease-in-out infinite alternate' },
  controls: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '16px 0' },
  ctrlBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#ccc' },
  ctrlIcon: { width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #2a2a2a', fontSize: 14 },

  transcript: { flex: 1, display: 'flex', flexDirection: 'column', background: '#0d0d0d' },
  tHead: { padding: '12px 24px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tEmpty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 13 },
  tList: { flex: 1, overflowY: 'auto', padding: 0 },
  tMsg: { padding: '12px 24px', borderBottom: '1px solid #1a1a1a' },
  tMsgHead: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  warn: { margin: 16, padding: '8px 12px', border: '1px solid #fbbf2440', background: '#1a1a0a', color: '#fbbf24', fontSize: 12 },
};
