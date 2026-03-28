'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import NCERT_SYLLABUS from '@/lib/ncert-syllabus';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function TutorClient() {
  const searchParams = useSearchParams();
  const initialClass = searchParams.get('class') || '9';

  const [selectedClass, setSelectedClass] = useState(initialClass);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicContext, setTopicContext] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [panel, setPanel] = useState('none');
  const [flashcards, setFlashcards] = useState([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(new Set());

  const [quizQs, setQuizQs] = useState([]);
  const [quizAs, setQuizAs] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const endRef = useRef(null);
  const sessionIdRef = useRef(null);
  const chatHistoryRef = useRef([]); // conversation history for AI
  const abortRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Save message to DB
  const saveMessage = useCallback(async (role, content) => {
    if (!sessionIdRef.current) return;
    try {
      await supabase.from('messages').insert({
        session_id: sessionIdRef.current,
        role,
        content,
        content_type: 'text',
      });
    } catch {}
  }, []);

  // Create session in DB
  const createSession = useCallback(async (topicId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('sessions').insert({
        user_id: user.id,
        topic_id: topicId,
        mode: 'chat',
        status: 'in_progress',
      }).select('id').single();
      if (data) sessionIdRef.current = data.id;
    } catch {}
  }, []);

  // Build student context for system prompt
  const buildStudentContext = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { is_new_student: true };
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (!profile) return { is_new_student: true };

      const ctx = {
        is_new_student: false,
        student_name: profile.name,
        student_class: profile.class_number,
        student_board: profile.board || 'CBSE',
        student_subjects: (profile.subjects || []).join(', '),
      };

      if (topicContext) {
        ctx.current_topic = topicContext.topicName;
        ctx.last_chapter = topicContext.chapterName;
      }

      // Get last session info
      const { data: lastSession } = await supabase.from('sessions')
        .select('*, topics(*)')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);
      if (lastSession?.[0]?.topics) {
        ctx.last_topic = lastSession[0].topics.topic_name;
        ctx.last_chapter = lastSession[0].topics.chapter_name;
      }

      return ctx;
    } catch {
      return { is_new_student: true };
    }
  }, [topicContext]);

  // Stream chat from Lovable AI via edge function
  const streamChat = useCallback(async (userMessage, currentMessages) => {
    // Build the messages array for the API
    const apiMessages = currentMessages
      .filter(m => m.role === 'student' || m.role === 'tutor')
      .map(m => ({
        role: m.role === 'student' ? 'user' : 'assistant',
        content: m.content,
      }));

    // Add the new user message
    apiMessages.push({ role: 'user', content: userMessage });

    const studentContext = await buildStudentContext();

    const controller = new AbortController();
    abortRef.current = controller;

    const chatUrl = `${SUPABASE_URL}/functions/v1/chat`;
    const resp = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ messages: apiMessages, studentContext }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${resp.status}`);
    }

    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantSoFar = '';
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') { streamDone = true; break; }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantSoFar += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'tutor' && last?._streaming) {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
              }
              return [...prev, { role: 'tutor', content: assistantSoFar, _streaming: true }];
            });
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    // Flush remaining
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) assistantSoFar += content;
        } catch {}
      }
    }

    // Finalize the message (remove _streaming flag)
    if (assistantSoFar) {
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 && m._streaming ? { role: 'tutor', content: assistantSoFar } : m
      ));
    }

    return assistantSoFar;
  }, [buildStudentContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleTopicSelect = async (cls, sub, ch, topic) => {
    const ctx = { classNumber: cls, subject: sub, chapterName: ch.name, chapterNumber: ch.chapter, topicName: topic };
    setTopicContext(ctx);
    setSelectedTopic(topic);
    const initialMsg = { role: 'tutor', content: `Chalo "${topic}" padhte hain — ${sub}, Class ${cls}, Ch ${ch.chapter}: ${ch.name}.` };
    setMessages([initialMsg]);
    chatHistoryRef.current = [initialMsg];
    setPanel('none'); setQuizResult(null); setFlashcards([]); setQuizQs([]);

    // Find topic in DB for session creation
    try {
      const { data: topics } = await supabase.from('topics')
        .select('id')
        .eq('class_number', parseInt(cls))
        .eq('subject', sub)
        .eq('chapter_number', ch.chapter)
        .limit(1);
      if (topics?.length) await createSession(topics[0].id);
    } catch {}

    sendMessage(`Explain "${topic}" from "${ch.name}", Class ${cls} ${sub}, step by step.`, ctx, [initialMsg]);
  };

  const sendMessage = async (text, ctx, hist) => {
    const msg = text || input;
    if (!msg.trim() || isLoading) return;
    const currentMessages = hist || messages;
    const updated = [...currentMessages, { role: 'student', content: msg }];
    setMessages(updated);
    setInput('');
    setIsLoading(true);

    saveMessage('student', msg);

    try {
      const aiResponse = await streamChat(msg, currentMessages);
      if (aiResponse) {
        saveMessage('tutor', aiResponse);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Chat error:', err);
        setMessages(prev => [...prev, { role: 'tutor', content: `Error: ${err.message}. Please try again.` }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const genFlashcards = async () => {
    if (!topicContext) return; setPanel('flashcards'); setIsLoading(true);
    try { const r = await fetch('/api/flashcards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topicContext }) }); const d = await r.json(); setFlashcards(d.flashcards); setCardIdx(0); setFlipped(new Set()); } catch { setFlashcards([]); }
    setIsLoading(false);
  };

  const genQuiz = async () => {
    if (!topicContext) return; setPanel('quiz'); setQuizLoading(true); setQuizResult(null); setQuizAs({});
    try { const r = await fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', topicContext }) }); const d = await r.json(); setQuizQs(d.questions); } catch { setQuizQs([]); }
    setQuizLoading(false);
  };

  const submitQuiz = async () => {
    if (Object.keys(quizAs).length < quizQs.length) return; setQuizLoading(true);
    try {
      const r = await fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'evaluate', questions: quizQs, answers: quizQs.map((_, i) => quizAs[i] ?? -1), topicContext }) });
      const d = await r.json(); setQuizResult(d);
      setMessages(prev => [...prev, { role: 'tutor', content: `Quiz: ${d.score}% (${d.correct}/${d.total}). ${d.feedback}` }]);
    } catch {}
    setQuizLoading(false);
  };

  const syllabus = NCERT_SYLLABUS[selectedClass] || {};
  const subjects = Object.keys(syllabus);

  return (
    <div className="page" style={{ paddingTop: 48 }}>
      <Navbar />
      <div style={s.wrap}>
        {/* Sidebar */}
        {sidebarOpen && (
          <aside style={s.sidebar}>
            <div style={s.sideHead}>
              <span style={s.sideTitle} className="mono">SYLLABUS</span>
              <button style={s.closeBtn} onClick={() => setSidebarOpen(false)}>✕</button>
            </div>
            <div style={s.classPicker}>
              {['6','7','8','9','10'].map(c => (
                <button key={c} style={{ ...s.classBtn, ...(selectedClass === c ? s.classBtnA : {}) }} className="mono" onClick={() => { setSelectedClass(c); setSelectedSubject(null); setSelectedChapter(null); }}>{c}</button>
              ))}
            </div>
            <div style={s.tree}>
              {subjects.map(sub => (
                <div key={sub}>
                  <button style={{ ...s.treeRow, ...(selectedSubject === sub ? s.treeRowA : {}) }} onClick={() => setSelectedSubject(selectedSubject === sub ? null : sub)}>
                    <span>{sub}</span><span style={{ color: '#555' }}>{selectedSubject === sub ? '−' : '+'}</span>
                  </button>
                  {selectedSubject === sub && syllabus[sub].map(ch => (
                    <div key={ch.chapter}>
                      <button style={{ ...s.treeRow, ...s.treeCh, ...(selectedChapter === ch.chapter ? s.treeRowA : {}) }} onClick={() => setSelectedChapter(selectedChapter === ch.chapter ? null : ch.chapter)}>
                        <span style={s.chLabel}>Ch {ch.chapter}: {ch.name}</span><span style={{ color: '#555', flexShrink: 0 }}>{selectedChapter === ch.chapter ? '−' : '+'}</span>
                      </button>
                      {selectedChapter === ch.chapter && ch.topics.map((t, ti) => (
                        <button key={ti} style={{ ...s.treeRow, ...s.treeTopic, ...(selectedTopic === t ? s.treeTopicA : {}) }} onClick={() => handleTopicSelect(selectedClass, sub, ch, t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Chat */}
        <main style={s.main}>
          {!sidebarOpen && <button style={s.openSide} onClick={() => setSidebarOpen(true)} className="btn btn-sm">☰ Syllabus</button>}

          {messages.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyMark} className="mono">A</div>
              <h2 style={s.emptyH}>Alakh AI</h2>
              <p style={s.emptyP}>Select a topic from the syllabus, or type what you want to learn.</p>
              <div style={s.hints}>
                {['Explain photosynthesis', 'What are integers?', 'French Revolution'].map(h => (
                  <button key={h} className="btn btn-sm" onClick={() => sendMessage(h)}>{h}</button>
                ))}
              </div>
            </div>
          ) : (
            <div style={s.msgs}>
              {messages.map((m, i) => (
                <div key={i} style={{ ...s.msg, ...(m.role === 'student' ? s.msgStudent : s.msgTutor) }} className="fade-in">
                  <div style={s.msgLabel} className="mono">{m.role === 'student' ? 'YOU' : 'ALAKH SIR'}</div>
                  <div style={s.msgText} dangerouslySetInnerHTML={{ __html: fmtMd(m.content) }} />
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'tutor' && (
                <div style={{ ...s.msg, ...s.msgTutor }} className="fade-in">
                  <div style={s.msgLabel} className="mono">ALAKH SIR</div>
                  <div style={s.dots}><span style={{ ...s.dot, animationDelay: '0s' }} /><span style={{ ...s.dot, animationDelay: '0.15s' }} /><span style={{ ...s.dot, animationDelay: '0.3s' }} /></div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}

          <div style={s.inputArea}>
            {topicContext && (
              <div style={s.chips}>
                <button className="btn btn-sm" onClick={genFlashcards}>Flashcards</button>
                <button className="btn btn-sm" onClick={genQuiz}>Quiz</button>
              </div>
            )}
            <div style={s.inputRow}>
              <input className="input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask anything..." disabled={isLoading} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={() => sendMessage()} disabled={isLoading || !input.trim()} style={{ padding: '8px 16px' }}>→</button>
            </div>
          </div>
        </main>

        {/* Right Panel */}
        {panel !== 'none' && (
          <aside style={s.rightPanel}>
            <div style={s.panelHead}>
              <span style={s.sideTitle} className="mono">{panel === 'flashcards' ? 'FLASHCARDS' : 'QUIZ'}</span>
              <button style={s.closeBtn} onClick={() => setPanel('none')}>✕</button>
            </div>

            {panel === 'flashcards' && (
              <div style={s.fcWrap}>
                {flashcards.length > 0 ? (
                  <>
                    <div className="card" style={s.fc} onClick={() => { const n = new Set(flipped); if (n.has(cardIdx)) n.delete(cardIdx); else n.add(cardIdx); setFlipped(n); }}>
                      <div className="badge mono" style={{ marginBottom: 12 }}>{flashcards[cardIdx]?.difficulty}</div>
                      <div style={s.fcText}>{flipped.has(cardIdx) ? flashcards[cardIdx]?.back : flashcards[cardIdx]?.front}</div>
                      <div style={s.fcHint} className="mono">{flipped.has(cardIdx) ? 'ANSWER' : 'TAP TO REVEAL'}</div>
                    </div>
                    <div style={s.fcNav}>
                      <button className="btn btn-sm" disabled={cardIdx === 0} onClick={() => setCardIdx(i => i - 1)}>← Prev</button>
                      <span className="mono" style={{ fontSize: 12, color: '#555' }}>{cardIdx + 1}/{flashcards.length}</span>
                      <button className="btn btn-sm" disabled={cardIdx >= flashcards.length - 1} onClick={() => setCardIdx(i => i + 1)}>Next →</button>
                    </div>
                  </>
                ) : <div style={s.panelEmpty}>{isLoading ? 'Generating...' : 'No flashcards'}</div>}
              </div>
            )}

            {panel === 'quiz' && (
              <div style={s.quizWrap}>
                {quizLoading ? <div style={s.panelEmpty}>Generating quiz...</div> : quizResult ? (
                  <div>
                    <div style={s.scoreBox} className="card"><span className="mono" style={{ fontSize: 28, fontWeight: 700 }}>{quizResult.score}%</span><span style={{ fontSize: 12, color: '#888' }}>{quizResult.correct}/{quizResult.total} correct</span></div>
                    <p style={{ fontSize: 13, color: '#888', margin: '12px 0', lineHeight: 1.5 }}>{quizResult.feedback}</p>
                    {quizResult.results.map((r, i) => (
                      <div key={i} style={{ ...s.resultRow, borderLeftColor: r.isCorrect ? '#4ade80' : '#f87171' }}>
                        <div style={{ fontSize: 13, marginBottom: 4 }}>{r.question}</div>
                        <div style={{ fontSize: 12, color: r.isCorrect ? '#4ade80' : '#f87171' }}>{r.isCorrect ? '✓ Correct' : `✗ ${r.correctAnswer}`}</div>
                      </div>
                    ))}
                    <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={genQuiz}>Retake</button>
                  </div>
                ) : quizQs.map((q, qi) => (
                  <div key={qi} className="card" style={s.qCard}>
                    <div className="mono" style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Q{qi + 1}</div>
                    <div style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{q.question}</div>
                    {q.options.map((o, oi) => (
                      <button key={oi} style={{ ...s.optBtn, ...(quizAs[qi] === oi ? s.optSel : {}) }} onClick={() => setQuizAs(p => ({ ...p, [qi]: oi }))}>
                        <span className="mono" style={s.optLetter}>{String.fromCharCode(65 + oi)}</span>{o}
                      </button>
                    ))}
                  </div>
                ))}
                {quizQs.length > 0 && !quizResult && !quizLoading && (
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={submitQuiz} disabled={Object.keys(quizAs).length < quizQs.length}>Submit ({Object.keys(quizAs).length}/{quizQs.length})</button>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function fmtMd(t) {
  if (!t) return '';
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/`(.*?)`/g,'<code style="font-family:IBM Plex Mono,monospace;font-size:12px;background:#1a1a1a;padding:1px 4px;border:1px solid #2a2a2a">$1</code>')
    .replace(/^### (.*$)/gm,'<h4 style="margin:8px 0 4px;font-size:14px;font-weight:600">$1</h4>')
    .replace(/^## (.*$)/gm,'<h3 style="margin:12px 0 4px;font-size:15px;font-weight:600">$1</h3>')
    .replace(/^\d+\. (.*$)/gm,'<div style="padding-left:16px;margin:2px 0">· $1</div>')
    .replace(/^- (.*$)/gm,'<div style="padding-left:16px;margin:2px 0">· $1</div>')
    .replace(/\n\n/g,'<br/><br/>').replace(/\n/g,'<br/>');
}

const s = {
  wrap: { display: 'flex', height: 'calc(100vh - 48px)', overflow: 'hidden' },
  sidebar: { width: 300, background: '#0a0a0a', borderRight: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  sideHead: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2a2a' },
  sideTitle: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#555' },
  closeBtn: { fontSize: 14, color: '#555', background: 'none', border: 'none', cursor: 'pointer' },
  classPicker: { display: 'flex', borderBottom: '1px solid #2a2a2a' },
  classBtn: { flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#555', cursor: 'pointer', borderRight: '1px solid #2a2a2a', background: 'transparent', transition: 'all 100ms' },
  classBtnA: { background: '#1a1a1a', color: '#fafafa' },
  tree: { flex: 1, overflowY: 'auto' },
  treeRow: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', border: 'none', borderBottom: '1px solid #1a1a1a', background: 'transparent', color: '#ccc', fontSize: 13, cursor: 'pointer', textAlign: 'left', transition: 'background 100ms' },
  treeRowA: { background: '#1a1a1a' },
  treeCh: { paddingLeft: 24, fontSize: 12, color: '#888' },
  chLabel: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 },
  treeTopic: { paddingLeft: 36, fontSize: 12, color: '#666', justifyContent: 'flex-start' },
  treeTopicA: { background: '#222', color: '#fafafa' },
  openSide: { position: 'absolute', top: 8, left: 8, zIndex: 10 },

  main: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: '#111' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyMark: { width: 48, height: 48, background: '#fafafa', color: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, marginBottom: 8 },
  emptyH: { fontSize: 20, fontWeight: 600 },
  emptyP: { fontSize: 13, color: '#555', textAlign: 'center', maxWidth: 320 },
  hints: { display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 },

  msgs: { flex: 1, overflowY: 'auto', padding: '16px 0' },
  msg: { padding: '12px 24px', borderBottom: '1px solid #1a1a1a' },
  msgStudent: { background: '#0d0d0d' },
  msgTutor: { background: '#111' },
  msgLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: '#555', marginBottom: 6 },
  msgText: { fontSize: 13, lineHeight: 1.7, color: '#ddd' },
  dots: { display: 'flex', gap: 4, padding: '4px 0' },
  dot: { width: 6, height: 6, background: '#555', animation: 'pulse 1s ease-in-out infinite', display: 'inline-block' },

  inputArea: { borderTop: '1px solid #2a2a2a', padding: '12px 24px 16px', background: '#0d0d0d' },
  chips: { display: 'flex', gap: 4, marginBottom: 8 },
  inputRow: { display: 'flex', gap: 4, alignItems: 'center' },

  rightPanel: { width: 360, borderLeft: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0a0a' },
  panelHead: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2a2a' },
  panelEmpty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 13, padding: 32 },

  fcWrap: { flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' },
  fc: { padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, cursor: 'pointer', textAlign: 'center' },
  fcText: { fontSize: 15, lineHeight: 1.6, flex: 1, display: 'flex', alignItems: 'center' },
  fcHint: { fontSize: 10, color: '#555', marginTop: 16, letterSpacing: '0.08em' },
  fcNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },

  quizWrap: { flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 },
  scoreBox: { padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  resultRow: { padding: '10px 12px', borderLeft: '3px solid', marginBottom: 4, background: '#111' },
  qCard: { padding: 16 },
  optBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid #2a2a2a', background: 'transparent', color: '#ccc', fontSize: 13, cursor: 'pointer', marginBottom: 4, textAlign: 'left', transition: 'all 100ms' },
  optSel: { background: '#1a1a1a', borderColor: '#fafafa', color: '#fafafa' },
  optLetter: { fontSize: 11, color: '#555', width: 20 },
};
