'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [mode, setMode] = useState('email'); // 'email' | 'phone'
  const [phone, setPhone] = useState('+91');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('input'); // input | otp
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          const userEmail = authData.user.email || (mode === 'phone' ? phone + '@phone.user' : email);
          const userName = authData.user.email || phone;
          await supabase.from('users').insert({
            id: authData.user.id,
            name: userName,
            email: userEmail,
            class_number: 9,
            board: 'CBSE',
            subjects: ['Science', 'Mathematics'],
          });
        }
      }
      window.location.href = '/tutor';
    } catch (e) {
      setError(e.message); setLoading(false);
    }
  };

  const identifier = mode === 'phone' ? phone : email;

  return (
    <div style={s.page}>
      <div style={s.card} className="card">
        <div style={s.mark} className="mono">T</div>
        <h1 style={s.title}>Taksh</h1>
        <p style={s.sub}>AI NCERT Tutor · Classes 6–10</p>

        {step === 'input' ? (
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
        ) : (
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

        {error && <div style={s.error}>{error}</div>}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: 360, padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
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
};
