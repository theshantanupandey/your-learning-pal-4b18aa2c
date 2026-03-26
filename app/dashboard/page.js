'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function DashboardPage() {
  const [callLogs, setCallLogs] = useState([]);
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('taksh_call_logs');
      if (stored) setCallLogs(JSON.parse(stored));
    } catch {}
  }, []);

  const fmtDur = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const fmtDate = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const clearLogs = () => {
    localStorage.removeItem('taksh_call_logs');
    setCallLogs([]);
  };

  const stats = [
    { label: 'TOPICS DONE', value: '12/48', color: '#4ade80' },
    { label: 'AVG SCORE', value: '78%', color: '#fafafa' },
    { label: 'STREAK', value: '5 days', color: '#fbbf24' },
    { label: 'CALLS', value: `${callLogs.length}`, color: '#60a5fa' },
  ];

  const subjects = [
    { name: 'Science', done: 8, total: 20 },
    { name: 'Mathematics', done: 4, total: 18 },
    { name: 'Social Science', done: 0, total: 10 },
  ];

  const quizzes = [
    { topic: 'Photosynthesis', subject: 'Science', cls: 9, score: 80, when: '2h ago', ok: true },
    { topic: 'Linear Equations', subject: 'Mathematics', cls: 8, score: 60, when: '1d ago', ok: false },
    { topic: 'French Revolution', subject: 'Social Science', cls: 9, score: 90, when: '2d ago', ok: true },
    { topic: 'Atoms and Molecules', subject: 'Science', cls: 9, score: 45, when: '3d ago', ok: false },
    { topic: 'Polynomials', subject: 'Mathematics', cls: 9, score: 85, when: '4d ago', ok: true },
  ];

  const weak = [
    { topic: 'Linear Equations in One Variable', ch: 'Ch 2', subject: 'Mathematics', cls: 8 },
    { topic: 'Atoms and Molecules', ch: 'Ch 3', subject: 'Science', cls: 9 },
    { topic: 'Chemical Properties of Metals', ch: 'Ch 3', subject: 'Science', cls: 10 },
  ];

  return (
    <div className="page" style={{ paddingTop: 48 }}>
      <Navbar />
      <div style={s.container}>
        <div style={s.header}>
          <h1 style={s.title}>Dashboard</h1>
          <p style={s.sub}>Your learning progress across NCERT subjects.</p>
        </div>

        {/* Stats */}
        <div style={s.statsGrid}>
          {stats.map((st, i) => (
            <div key={i} className="card" style={s.statCard}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: '#555', marginBottom: 8 }}>{st.label}</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: st.color }}>{st.value}</div>
            </div>
          ))}
        </div>

        <div style={s.grid}>
          {/* Subject Progress */}
          <div className="card" style={s.section}>
            <div className="mono" style={s.secLabel}>SUBJECT PROGRESS</div>
            <div style={s.subjectList}>
              {subjects.map((sub, i) => {
                const pct = Math.round((sub.done / sub.total) * 100);
                return (
                  <div key={i} style={s.subjectRow}>
                    <div style={s.subjectInfo}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{sub.name}</span>
                      <span className="mono" style={{ fontSize: 12, color: '#555' }}>{sub.done}/{sub.total}</span>
                    </div>
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFill, width: `${pct}%` }} />
                    </div>
                    <div className="mono" style={{ fontSize: 12, color: '#888', minWidth: 36, textAlign: 'right' }}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weak Areas */}
          <div className="card" style={s.section}>
            <div className="mono" style={s.secLabel}>NEEDS REVIEW</div>
            <div style={s.weakList}>
              {weak.map((w, i) => (
                <div key={i} style={s.weakRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{w.topic}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>{w.subject} · Class {w.cls} · {w.ch}</div>
                  </div>
                  <a href={`/tutor?class=${w.cls}`} className="btn btn-sm">Revisit</a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Call Logs */}
        <div className="card" style={{ ...s.section, marginTop: 1 }}>
          <div style={s.secLabelRow}>
            <span className="mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: '#555' }}>
              CALL LOGS ({callLogs.length})
            </span>
            {callLogs.length > 0 && (
              <button className="btn btn-sm mono" onClick={clearLogs} style={{ fontSize: 10 }}>Clear All</button>
            )}
          </div>
          {callLogs.length === 0 ? (
            <div style={s.emptyLogs}>
              <div style={{ color: '#333', fontSize: 13 }}>No call logs yet.</div>
              <div style={{ color: '#2a2a2a', fontSize: 12, marginTop: 4 }}>Start a call from the Call page — transcripts will appear here automatically.</div>
            </div>
          ) : (
            <div>
              {callLogs.map((log, i) => (
                <div key={log.id}>
                  <div
                    style={s.logRow}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div style={s.logLeft}>
                      <div className="mono" style={{ fontSize: 12, color: '#888', width: 48, flexShrink: 0 }}>{fmtDur(log.duration)}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>Call #{callLogs.length - i}</div>
                        <div style={{ fontSize: 11, color: '#555' }}>{log.messageCount} messages · {fmtDate(log.date)}</div>
                      </div>
                    </div>
                    <div style={s.logRight}>
                      <span className="mono" style={{ fontSize: 11, color: '#555' }}>
                        {expandedLog === log.id ? '▲ HIDE' : '▼ TRANSCRIPT'}
                      </span>
                    </div>
                  </div>

                  {expandedLog === log.id && (
                    <div style={s.logTranscript}>
                      {log.transcript.map((m, mi) => (
                        <div key={mi} style={s.logMsg}>
                          <span className="mono" style={{
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            color: m.role === 'tutor' ? '#888' : '#555',
                            minWidth: 48,
                          }}>
                            {m.role === 'tutor' ? 'TAKSH' : 'YOU'}
                          </span>
                          <span style={{ fontSize: 12, color: '#aaa', flex: 1, lineHeight: 1.5 }}>{m.content}</span>
                          <span className="mono" style={{ fontSize: 10, color: '#333', flexShrink: 0 }}>{m.time}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quiz History */}
        <div className="card" style={{ ...s.section, marginTop: 1 }}>
          <div className="mono" style={s.secLabel}>RECENT QUIZZES</div>
          <div style={s.table}>
            <div style={s.tableHead}>
              <span style={{ flex: 2 }}>TOPIC</span>
              <span style={{ flex: 1 }}>SUBJECT</span>
              <span style={{ flex: 0.5 }}>CLASS</span>
              <span style={{ flex: 0.5 }}>SCORE</span>
              <span style={{ flex: 0.7 }}>WHEN</span>
              <span style={{ flex: 0.5 }}>STATUS</span>
            </div>
            {quizzes.map((q, i) => (
              <div key={i} style={s.tableRow}>
                <span style={{ flex: 2, fontWeight: 500 }}>{q.topic}</span>
                <span style={{ flex: 1, color: '#888' }}>{q.subject}</span>
                <span style={{ flex: 0.5, color: '#888' }} className="mono">{q.cls}</span>
                <span style={{ flex: 0.5, fontWeight: 600, color: q.score >= 70 ? '#4ade80' : q.score >= 50 ? '#fbbf24' : '#f87171' }} className="mono">{q.score}%</span>
                <span style={{ flex: 0.7, color: '#555' }}>{q.when}</span>
                <span style={{ flex: 0.5 }}>
                  <span className="badge mono" style={{ color: q.ok ? '#4ade80' : '#f87171', borderColor: q.ok ? '#4ade8030' : '#f8717130' }}>
                    {q.ok ? 'PASS' : 'FAIL'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { maxWidth: 960, margin: '0 auto', padding: '24px 24px 64px' },
  header: { marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #2a2a2a' },
  title: { fontSize: 20, fontWeight: 600, marginBottom: 4 },
  sub: { fontSize: 13, color: '#555' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 1 },
  statCard: { padding: '20px 16px' },

  grid: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 1 },
  section: { padding: 0 },
  secLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: '#555', padding: '12px 16px', borderBottom: '1px solid #2a2a2a' },
  secLabelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #2a2a2a' },

  subjectList: { padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 },
  subjectRow: { display: 'flex', alignItems: 'center', gap: 12 },
  subjectInfo: { width: 140, display: 'flex', justifyContent: 'space-between', flexShrink: 0 },
  barTrack: { flex: 1, height: 4, background: '#1a1a1a' },
  barFill: { height: '100%', background: '#fafafa', transition: 'width 600ms ease-out' },

  weakList: { display: 'flex', flexDirection: 'column' },
  weakRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1a1a1a' },

  // Call Logs
  emptyLogs: { padding: '32px 16px', textAlign: 'center' },
  logRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1a1a1a', cursor: 'pointer', transition: 'background 100ms' },
  logLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logRight: { display: 'flex', alignItems: 'center' },
  logTranscript: { background: '#0d0d0d', borderBottom: '1px solid #2a2a2a', maxHeight: 300, overflowY: 'auto' },
  logMsg: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 16px 8px 76px', borderBottom: '1px solid #111' },

  // Quiz table
  table: { display: 'flex', flexDirection: 'column' },
  tableHead: { display: 'flex', gap: 8, padding: '8px 16px', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: '#555', borderBottom: '1px solid #2a2a2a', fontFamily: "'IBM Plex Mono', monospace" },
  tableRow: { display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid #1a1a1a', fontSize: 13, alignItems: 'center' },
};
