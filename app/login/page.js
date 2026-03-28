'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const CLASSES = [6, 7, 8, 9, 10];
const BOARDS = ['CBSE', 'ICSE', 'State Board'];
const SUBJECTS = ['Science', 'Mathematics', 'Social Science', 'English', 'Hindi'];

export default function LoginPage() {
  const [mode, setMode] = useState('email');
  const [phone, setPhone] = useState('+91');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('input'); // input | otp | onboarding
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Onboarding fields
  const [authUser, setAuthUser] = useState(null);
  const [name, setName] = useState('');
  const [classNumber, setClassNumber] = useState(9);
  const [board, setBoard] = useState('CBSE');
  const [selectedSubjects, setSelectedSubjects] = useState(['Science', 'Mathematics']);

  const sendOtp = async () => {
    setLoading(true); setError('');
    try {
      if (mode === 'phone') {
        if (phone.length < 10) { setError('Enter a valid phone number'); setLoading(false); return; }
        const { error: err } = await supabase.auth.signInWithOtp({ phone });
        if (err) { setError(err.message); setLoading(false); return; }
      } else {
        if (!email || !email.includes('@')) { setError('Enter a valid email'); setLoading(false); return; }
        const { error: err } = await supabase.auth.signInWithOtp({ email });
        if (err) { setError(err.message); setLoading(false); return; }
      }
      setStep('otp'); setLoading(false);
    } catch (e) {
      setError(e.message); setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 4) { setError('Enter the OTP'); return; }
    setLoading(true); setError('');
    try {
      const verifyPayload = mode === 'phone'
        ? { phone, token: otp, type: 'sms' }
        : { email, token: otp, type: 'email' };
      const { data: authData, error: err } = await supabase.auth.verifyOtp(verifyPayload);
      if (err) { setError(err.message); setLoading(false); return; }

      if (authData?.user) {
        const { data: existing } = await supabase.from('users').select('id').eq('id', authData.user.id).single();
        if (!existing) {
          // New user — go to onboarding
          setAuthUser(authData.user);
          setStep('onboarding');
          setLoading(false);
          return;
        }
      }
      window.location.href = '/tutor';
    } catch (e) {
      setError(e.message); setLoading(false);
    }
  };

  const toggleSubject = (sub) => {
    setSelectedSubjects(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const completeOnboarding = async () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (selectedSubjects.length === 0) { setError('Select at least one subject'); return; }
    setLoading(true); setError('');
    try {
      const userEmail = authUser.email || (mode === 'phone' ? phone + '@phone.user' : email);
      await supabase.from('users').insert({
        id: authUser.id,
        name: name.trim(),
        email: userEmail,
        class_number: classNumber,
        board,
        subjects: selectedSubjects,
      });
      window.location.href = '/tutor';
    } catch (e) {
      setError(e.message); setLoading(false);
    }
  };

  const identifier = mode === 'phone' ? phone : email;

  return (
    <div style={s.page}>
      <div style={s.card} className="card">
        <div style={s.mark} className="mono">A</div>
        <h1 style={s.title}>Alakh AI</h1>
        <p style={s.sub}>AI NCERT Tutor · Classes 6–10</p>

        {step === 'input' && (
          <>
            <div style={s.toggle}>
              <button
                style={mode === 'email' ? s.toggleActive : s.toggleBtn}
                onClick={() => { setMode('email'); setError(''); }}
              >Email</button>
              <button
                style={mode === 'phone' ? s.toggleActive : s.toggleBtn}
                onClick={() => { setMode('phone'); setError(''); }}
              >Phone</button>
            </div>

            {mode === 'phone' ? (
              <>
                <label style={s.label}>Phone Number</label>
                <input
                  className="input mono"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  style={s.input}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                />
              </>
            ) : (
              <>
                <label style={s.label}>Email Address</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={s.input}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                />
              </>
            )}

            <button className="btn btn-primary" onClick={sendOtp} disabled={loading} style={s.btn}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <label style={s.label}>Enter OTP sent to {identifier}</label>
            <input
              className="input mono"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              style={{ ...s.input, textAlign: 'center', fontSize: 24, letterSpacing: '0.3em' }}
              onKeyDown={e => e.key === 'Enter' && verifyOtp()}
              autoFocus
            />
            <button className="btn btn-primary" onClick={verifyOtp} disabled={loading} style={s.btn}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button className="btn" onClick={() => { setStep('input'); setOtp(''); setError(''); }} style={{ ...s.btn, marginTop: 0 }}>
              ← Back
            </button>
          </>
        )}

        {step === 'onboarding' && (
          <>
            <div style={s.onboardSection}>
              <label style={s.label}>What's your name?</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                style={s.input}
                autoFocus
              />
            </div>

            <div style={s.onboardSection}>
              <label style={s.label}>Class</label>
              <div style={s.optionRow}>
                {CLASSES.map(c => (
                  <button
                    key={c}
                    className="mono"
                    style={classNumber === c ? s.optionActive : s.optionBtn}
                    onClick={() => setClassNumber(c)}
                  >{c}</button>
                ))}
              </div>
            </div>

            <div style={s.onboardSection}>
              <label style={s.label}>Board</label>
              <div style={s.optionRow}>
                {BOARDS.map(b => (
                  <button
                    key={b}
                    style={board === b ? s.optionActive : s.optionBtn}
                    onClick={() => setBoard(b)}
                  >{b}</button>
                ))}
              </div>
            </div>

            <div style={s.onboardSection}>
              <label style={s.label}>Subjects (select one or more)</label>
              <div style={{ ...s.optionRow, flexWrap: 'wrap' }}>
                {SUBJECTS.map(sub => (
                  <button
                    key={sub}
                    style={selectedSubjects.includes(sub) ? s.optionActive : s.optionBtn}
                    onClick={() => toggleSubject(sub)}
                  >{sub}</button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" onClick={completeOnboarding} disabled={loading} style={s.btn}>
              {loading ? 'Setting up...' : 'Start Learning →'}
            </button>
            <button className="btn" onClick={() => { setStep('otp'); setError(''); }} style={{ ...s.btn, marginTop: 0 }}>
              ← Back
            </button>
          </>
        )}

        {error && <div style={s.error}>{error}</div>}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: 380, padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  mark: { width: 48, height: 48, background: '#fafafa', color: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: 600, marginBottom: 2 },
  sub: { fontSize: 12, color: '#555', marginBottom: 32 },
  label: { fontSize: 12, color: '#888', alignSelf: 'flex-start', marginBottom: 4, marginTop: 12 },
  input: { width: '100%', fontSize: 14 },
  btn: { width: '100%', marginTop: 12, padding: '10px 0' },
  error: { marginTop: 12, fontSize: 12, color: '#f87171', textAlign: 'center' },
  toggle: { display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #333', marginBottom: 8 },
  toggleBtn: { flex: 1, padding: '6px 16px', fontSize: 12, background: 'transparent', color: '#888', border: 'none', cursor: 'pointer' },
  toggleActive: { flex: 1, padding: '6px 16px', fontSize: 12, background: '#fafafa', color: '#0a0a0a', border: 'none', cursor: 'pointer', fontWeight: 600 },
  onboardSection: { width: '100%', marginTop: 8 },
  optionRow: { display: 'flex', gap: 6, marginTop: 4 },
  optionBtn: { padding: '6px 14px', fontSize: 12, background: 'transparent', color: '#888', border: '1px solid #333', cursor: 'pointer', borderRadius: 4 },
  optionActive: { padding: '6px 14px', fontSize: 12, background: '#fafafa', color: '#0a0a0a', border: '1px solid #fafafa', cursor: 'pointer', borderRadius: 4, fontWeight: 600 },
};