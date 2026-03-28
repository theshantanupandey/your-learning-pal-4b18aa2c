'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // phone | otp
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    if (phone.length < 10) { setError('Enter a valid phone number'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOtp({ phone });
    if (err) { setError(err.message); setLoading(false); return; }
    setStep('otp'); setLoading(false);
  };

  const verifyOtp = async () => {
    if (otp.length < 4) { setError('Enter the OTP'); return; }
    setLoading(true); setError('');
    const { data: authData, error: err } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    if (err) { setError(err.message); setLoading(false); return; }
    
    // Create user profile if first login
    if (authData?.user) {
      const { data: existing } = await supabase.from('users').select('id').eq('id', authData.user.id).single();
      if (!existing) {
        await supabase.from('users').insert({
          id: authData.user.id,
          name: phone,
          email: phone + '@phone.user',
          class_number: 9,
          board: 'CBSE',
          subjects: ['Science', 'Mathematics'],
        });
      }
    }
    window.location.href = '/tutor';
  };

  return (
    <div style={s.page}>
      <div style={s.card} className="card">
        <div style={s.mark} className="mono">T</div>
        <h1 style={s.title}>Taksh</h1>
        <p style={s.sub}>AI NCERT Tutor · Classes 6–10</p>

        {step === 'phone' ? (
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
            <button className="btn btn-primary" onClick={sendOtp} disabled={loading} style={s.btn}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <label style={s.label}>Enter OTP sent to {phone}</label>
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
            <button className="btn" onClick={() => { setStep('phone'); setOtp(''); setError(''); }} style={{ ...s.btn, marginTop: 0 }}>
              ← Change Number
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
};
