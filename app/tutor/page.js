'use client';
import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import NCERT_SYLLABUS from '@/lib/ncert-syllabus';
import { startListening, stopListening, speak, stopSpeaking, isSpeechSupported } from '@/lib/voice';

export default function TutorPage() {
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
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

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
  const recRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleTopicSelect = (cls, sub, ch, topic) => {
    const ctx = { classNumber: cls, subject: sub, chapterName: ch.name, chapterNumber: ch.chapter, topicName: topic };
    setTopicContext(ctx);
    setSelectedTopic(topic);
    setMessages([{ role: 'tutor', content: `Let's learn "${topic}" — ${sub}, Class ${cls}, Ch ${ch.chapter}: ${ch.name}.` }]);
    setPanel('none'); setQuizResult(null); setFlashcards([]); setQuizQs([]);
    sendMessage(`Explain "${topic}" from "${ch.name}" step by step.`, ctx, []);
  };

  const sendMessage = async (text, ctx, hist) => {
    const msg = text || input;
    if (!msg.trim()) return;
    const context = ctx || topicContext;
    const current = hist || messages;
    const updated = [...current, { role: 'student', content: msg }];
    setMessages(updated); setInput(''); setIsLoading(true); setInterimTranscript('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: updated.slice(-10), topicContext: context }),
      });
      const data = await res.json();
      const reply = data.response || data.error || 'No response received.';
      setMessages(prev => [...prev, { role: 'tutor', content: reply }]);
      if (isVoiceMode) await speak(reply.replace(/[*#_`]/g, ''), { rate: 0.95 });
    } catch (err) { setMessages(prev => [...prev, { role: 'tutor', content: 'Network error. Please check your connection.' }]); }
    setIsLoading(false);
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening(recRef.current); setIsListening(false);
      if (interimTranscript.trim()) sendMessage(interimTranscript.trim());
    } else {
      setIsListening(true); setInterimTranscript('');
      recRef.current = startListening((t, f) => { setInterimTranscript(t); if (f) { stopListening(recRef.current); setIsListening(false); sendMessage(t.trim()); } }, () => setIsListening(false));
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
              <div style={s.emptyMark} className="mono">T</div>
              <h2 style={s.emptyH}>Taksh</h2>
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
                  <div style={s.msgLabel} className="mono">{m.role === 'student' ? 'YOU' : 'TAKSH'}</div>
                  <div style={s.msgText} dangerouslySetInnerHTML={{ __html: fmtMd(m.content) }} />
                </div>
              ))}
              {isLoading && (
                <div style={{ ...s.msg, ...s.msgTutor }} className="fade-in">
                  <div style={s.msgLabel} className="mono">TAKSH</div>
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
              {isListening && interimTranscript && <div style={s.transcript} className="mono">{interimTranscript}</div>}
              <input className="input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={isListening ? 'Listening...' : 'Ask anything...'} disabled={isLoading} style={{ flex: 1 }} />
              {isSpeechSupported() && <button style={{ ...s.micBtn, ...(isListening ? s.micBtnA : {}) }} onClick={toggleVoice}>{isListening ? '■' : '●'}</button>}
              <button className="btn btn-primary" onClick={() => sendMessage()} disabled={isLoading || !input.trim()} style={{ padding: '8px 16px' }}>→</button>
            </div>
            <div style={s.inputFoot}>
              <label style={s.voiceLabel}><input type="checkbox" checked={isVoiceMode} onChange={e => { setIsVoiceMode(e.target.checked); if (!e.target.checked) stopSpeaking(); }} style={{ marginRight: 6 }} />Voice responses</label>
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

  inputArea: { borderTop: '1px solid #2a2a2a', background: '#0a0a0a', padding: '12px 24px' },
  chips: { display: 'flex', gap: 4, marginBottom: 8 },
  inputRow: { display: 'flex', gap: 4, alignItems: 'center', position: 'relative' },
  transcript: { position: 'absolute', bottom: '100%', left: 0, right: 0, padding: '6px 12px', background: '#1a1a1a', borderTop: '1px solid #2a2a2a', fontSize: 12, color: '#888' },
  micBtn: { width: 36, height: 36, border: '1px solid #2a2a2a', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#888', cursor: 'pointer' },
  micBtnA: { background: '#2a1a1a', borderColor: '#f8717140', color: '#f87171' },
  inputFoot: { display: 'flex', justifyContent: 'flex-end', marginTop: 6 },
  voiceLabel: { fontSize: 12, color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center' },

  rightPanel: { width: 360, background: '#0a0a0a', borderLeft: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  panelHead: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2a2a' },
  panelEmpty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 13 },

  fcWrap: { flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  fc: { flex: 1, maxHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'pointer', textAlign: 'center' },
  fcText: { fontSize: 14, lineHeight: 1.6, flex: 1, display: 'flex', alignItems: 'center' },
  fcHint: { fontSize: 10, color: '#555', letterSpacing: '0.08em', marginTop: 12 },
  fcNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },

  quizWrap: { flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 },
  qCard: { padding: 16 },
  optBtn: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: '1px solid #2a2a2a', background: '#111', color: '#ccc', fontSize: 12, cursor: 'pointer', textAlign: 'left', marginBottom: 4, transition: 'all 100ms' },
  optSel: { background: '#1a1a1a', borderColor: '#555', color: '#fafafa' },
  optLetter: { width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', border: '1px solid #2a2a2a', fontSize: 10, fontWeight: 600, flexShrink: 0 },
  scoreBox: { padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  resultRow: { padding: '8px 12px', borderLeft: '2px solid', background: '#111', marginBottom: 4 },
};
