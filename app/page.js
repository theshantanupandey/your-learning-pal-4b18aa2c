'use client';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function LandingPage() {
  return (
    <div className="page">
      <Navbar />

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.tag} className="badge mono">NCERT · CLASSES 6–10</div>
          <h1 style={s.h1}>
            AI tutor that teaches,<br />not just answers.
          </h1>
          <p style={s.sub}>
            Step-by-step explanations. Voice conversations. Flashcards and quizzes.
            Like having a patient teacher on call, 24/7.
          </p>
          <div style={s.actions}>
            <Link href="/tutor" className="btn btn-primary" style={s.cta}>Start Learning</Link>
            <Link href="/call" className="btn" style={s.cta}>Call Tutor</Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={s.statsBar}>
        {[
          { n: '5', l: 'Classes' },
          { n: '50+', l: 'Chapters' },
          { n: '500+', l: 'Topics' },
          { n: '24/7', l: 'Available' },
        ].map((st, i) => (
          <div key={i} style={s.statCell}>
            <div style={s.statNum} className="mono">{st.n}</div>
            <div style={s.statLabel}>{st.l}</div>
          </div>
        ))}
      </section>

      {/* ── Modes ── */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel} className="mono">MODES</div>
          <div style={s.modesGrid}>
            <Link href="/tutor" style={{ textDecoration: 'none' }}>
              <div className="card" style={s.modeCard}>
                <div style={s.modeHeader}>
                  <span style={s.modeNum} className="mono">01</span>
                  <span style={s.modeName}>Web Tutor</span>
                </div>
                <p style={s.modeDesc}>
                  Chat or speak with your AI tutor. Pick any NCERT topic — it explains step by step, then tests you with flashcards and quizzes.
                </p>
                <div style={s.modeTags}>
                  <span className="badge">Voice</span>
                  <span className="badge">Chat</span>
                  <span className="badge">Flashcards</span>
                  <span className="badge">Quiz</span>
                </div>
              </div>
            </Link>
            <Link href="/call" style={{ textDecoration: 'none' }}>
              <div className="card" style={s.modeCard}>
                <div style={s.modeHeader}>
                  <span style={s.modeNum} className="mono">02</span>
                  <span style={s.modeName}>Call Tutor</span>
                </div>
                <p style={s.modeDesc}>
                  Just call. Talk naturally with your AI tutor over voice, like calling a real teacher. It listens, explains, and quizzes you.
                </p>
                <div style={s.modeTags}>
                  <span className="badge">Voice-first</span>
                  <span className="badge">Remembers you</span>
                  <span className="badge">Transcript</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel} className="mono">HOW IT WORKS</div>
          <div style={s.stepsGrid}>
            {[
              { n: '01', t: 'Pick a topic', d: 'Choose your class, subject, and chapter from the NCERT syllabus.' },
              { n: '02', t: 'AI explains', d: 'Step-by-step explanations with analogies, like a real teacher.' },
              { n: '03', t: 'Test yourself', d: 'Flashcards to revise, then a quiz to test understanding.' },
              { n: '04', t: 'Adapt', d: 'Scored well? Move on. Struggled? AI re-explains until you master it.' },
            ].map((step, i) => (
              <div key={i} className="card" style={s.stepCard}>
                <div style={s.stepNum} className="mono">{step.n}</div>
                <div style={s.stepTitle}>{step.t}</div>
                <div style={s.stepDesc}>{step.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Classes ── */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <div style={s.sectionLabel} className="mono">CHOOSE CLASS</div>
          <div style={s.classGrid}>
            {[6, 7, 8, 9, 10].map(c => (
              <Link key={c} href={`/tutor?class=${c}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={s.classCard}>
                  <div style={s.className} className="mono">Class {c}</div>
                  <div style={s.classSub}>Science · Mathematics{c >= 9 ? ' · SST' : ''}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <span style={s.footerLogo} className="mono">Taksh</span>
          <span style={s.footerText}>AI NCERT Tutor · Classes 6–10 · PW Hackathon</span>
        </div>
      </footer>
    </div>
  );
}

const s = {
  hero: {
    paddingTop: 48,
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid #2a2a2a',
  },
  heroInner: {
    maxWidth: 640,
    padding: '80px 24px',
    textAlign: 'center',
  },
  tag: { margin: '0 auto 24px', display: 'inline-block' },
  h1: {
    fontSize: 'clamp(32px, 5vw, 48px)',
    fontWeight: 600,
    lineHeight: 1.15,
    letterSpacing: '-0.03em',
    marginBottom: 16,
  },
  sub: {
    fontSize: 15,
    color: '#888',
    lineHeight: 1.6,
    maxWidth: 480,
    margin: '0 auto 32px',
  },
  actions: {
    display: 'flex',
    gap: 1,
    justifyContent: 'center',
  },
  cta: { padding: '12px 32px', fontSize: 14 },

  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    borderBottom: '1px solid #2a2a2a',
  },
  statCell: {
    padding: '24px 16px',
    textAlign: 'center',
    borderRight: '1px solid #2a2a2a',
  },
  statNum: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },

  section: {
    borderBottom: '1px solid #2a2a2a',
  },
  sectionInner: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '48px 24px',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#555',
    marginBottom: 24,
  },

  modesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 1,
  },
  modeCard: {
    padding: '24px',
  },
  modeHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 12,
  },
  modeNum: {
    fontSize: 11,
    color: '#555',
  },
  modeName: {
    fontSize: 18,
    fontWeight: 600,
  },
  modeDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 1.6,
    marginBottom: 16,
  },
  modeTags: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },

  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 1,
  },
  stepCard: {
    padding: '24px',
  },
  stepNum: {
    fontSize: 11,
    color: '#555',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 1.5,
  },

  classGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 1,
  },
  classCard: {
    padding: '24px',
    textAlign: 'center',
  },
  className: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 4,
  },
  classSub: {
    fontSize: 11,
    color: '#555',
  },

  footer: {
    padding: '24px',
    borderTop: '1px solid #2a2a2a',
  },
  footerInner: {
    maxWidth: 960,
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLogo: {
    fontSize: 14,
    fontWeight: 600,
  },
  footerText: {
    fontSize: 12,
    color: '#555',
  },
};
