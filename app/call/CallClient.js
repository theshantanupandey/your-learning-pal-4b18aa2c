'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useConversation } from '@elevenlabs/react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

const AGENT_ID = 'agent_4001kmrcsfkpfbdsgb049vbvw37f';

export default function CallPage() {
  const router = useRouter();
  const [state, setState] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  const timerRef = useRef(null);
  const msgsRef = useRef([]);
  const stateRef = useRef('idle');
  const sessionIdRef = useRef(null);
  const transcriptEndRef = useRef(null);

  useEffect(() => { msgsRef.current = messages; }, [messages]);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Onboarding enforcement
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        const { data: profile } = await supabase.from('users').select('id').eq('id', user.id).single();
        if (!profile) { router.push('/login'); return; }
        setProfileChecked(true);
      } catch {
        router.push('/login');
      }
    })();
  }, [router]);

  useEffect(() => {
    if (state === 'active') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [state]);

  const add = useCallback((role, content) => {
    setMessages(p => {
      const u = [...p, { role, content, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }];
      msgsRef.current = u;
      return u;
    });
    if (sessionIdRef.current) {
      supabase.from('messages').insert({
        session_id: sessionIdRef.current,
        role: role === 'student' ? 'student' : 'tutor',
        content,
        content_type: 'text',
      }).then(() => {});
    }
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      setState('active');
    },
    onDisconnect: () => {
      if (stateRef.current !== 'idle') {
        setState('ended');
      }
      clearInterval(timerRef.current);
      if (sessionIdRef.current) {
        supabase.from('sessions').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', sessionIdRef.current).then(() => {});
      }
    },
    onMessage: (message) => {
      // Handle multiple ElevenLabs message shapes
      if (message.type === 'user_transcript') {
        const text = message.user_transcription_event?.user_transcript;
        if (text) add('student', text);
      } else if (message.type === 'agent_response') {
        const text = message.agent_response_event?.agent_response;
        if (text) add('tutor', text);
      }
      // Fallback: source-based parsing
      if (message.source === 'user' && message.message) {
        add('student', message.message);
      } else if (message.source === 'ai' && message.message) {
        add('tutor', message.message);
      }
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error);
      add('tutor', 'Connection error. Please try again.');
      setState('ended');
      clearInterval(timerRef.current);
    },
    clientTools: {
      get_student_profile: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return JSON.stringify({ error: 'Not logged in' });
          const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
          return JSON.stringify(data || { id: user.id, phone: user.phone });
        } catch (e) { return JSON.stringify({ error: e.message }); }
      },
      get_chapter_progress: async (params) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return JSON.stringify({ error: 'Not logged in' });
          let q = supabase.from('chapter_progress').select('*').eq('user_id', user.id);
          if (params?.subject) q = q.eq('subject', params.subject);
          if (params?.class_number) q = q.eq('class_number', params.class_number);
          const { data } = await q;
          return JSON.stringify(data || []);
        } catch (e) { return JSON.stringify({ error: e.message }); }
      },
      get_session_history: async (params) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return JSON.stringify({ error: 'Not logged in' });
          let q = supabase.from('sessions').select('*, topics(*)').eq('user_id', user.id).order('started_at', { ascending: false }).limit(params?.limit || 10);
          const { data } = await q;
          return JSON.stringify(data || []);
        } catch (e) { return JSON.stringify({ error: e.message }); }
      },
    },
  });

  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const startCall = async () => {
    setState('ringing');
    setMessages([]);
    setDuration(0);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: topics } = await supabase.from('topics').select('id').limit(1);
        const topicId = topics?.[0]?.id;
        if (topicId) {
          const { data } = await supabase.from('sessions').insert({
            user_id: user.id,
            topic_id: topicId,
            mode: 'call',
            status: 'in_progress',
          }).select('id').single();
          if (data) sessionIdRef.current = data.id;
        }
      }

      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: 'webrtc',
      });
    } catch (err) {
      console.error('Failed to start:', err);
      setState('idle');
      alert('Could not start call. Check microphone permissions.');
    }
  };

  const endCall = async () => {
    setState('ended');
    clearInterval(timerRef.current);
    try { await conversation.endSession(); } catch {}
  };

  const toggleMute = () => {
    setMuted(m => !m);
    try { conversation.setVolume({ volume: muted ? 1 : 0 }); } catch {}
  };

  const isSpeaking = conversation.isSpeaking;

  if (!profileChecked) {
    return (
      <div className="page" style={{ paddingTop: 48 }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 48px)', color: '#555' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingTop: 48 }}>
      <Navbar />
      <div style={s.wrap}>
        {/* Phone */}
        <div style={s.phoneWrap}>
          <div style={s.phone} className="card">
            <div style={s.barTop} className="mono">
              <span>Alakh AI</span>
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {state === 'idle' && (
              <div style={s.center}>
                <div style={s.mark} className="mono">A</div>
                <div style={s.name}>Alakh AI</div>
                <div style={s.sub}>AI NCERT Tutor</div>
                <div style={s.hint}>Tap to start a voice lesson</div>
                <button style={s.callBtn} onClick={startCall} />
                <div style={s.callLabel} className="mono">CALL</div>
              </div>
            )}

            {state === 'ringing' && (
              <div style={s.center}>
                <div style={{ ...s.mark, animation: 'pulse 1s ease-in-out infinite' }} className="mono">A</div>
                <div style={s.name}>Alakh AI</div>
                <div style={{ ...s.sub, color: '#4ade80' }} className="mono">CONNECTING...</div>
                <button style={s.endBtn} onClick={endCall} />
              </div>
            )}

            {state === 'active' && (
              <div style={s.activeWrap}>
                <div style={s.activeHead}>
                  <div style={{ ...s.markSm, marginRight: 12 }} className="mono">A</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Alakh AI</div>
                    <div className="mono" style={{ fontSize: 12, color: '#4ade80' }}>{fmt(duration)}</div>
                  </div>
                </div>
                <div style={s.waveArea}>
                  {isSpeaking ? (
                    <div style={s.wave}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} style={{ ...s.waveBar, animationDelay: `${i * 0.04}s` }} />
                      ))}
                    </div>
                  ) : (
                    <div className="mono" style={{ fontSize: 12, color: muted ? '#f87171' : '#4ade80' }}>
                      {muted ? '● MUTED' : '● LISTENING'}
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
                <div style={s.mark} className="mono">A</div>
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
                      {m.role === 'tutor' ? 'ALAKH AI' : 'YOU'}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: '#333' }}>{m.time}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>{m.content}</p>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
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
};
