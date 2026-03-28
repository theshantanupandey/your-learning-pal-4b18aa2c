'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const [callAgentId, setCallAgentId] = useState('agent_4001kmrcsfkpfbdsgb049vbvw37f');
  const [chatAgentId, setChatAgentId] = useState('agent_5801kmspe84efe7te6t0821sktpv');
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('taksh_api_keys');
    if (stored) {
      try {
        const keys = JSON.parse(stored);
        if (keys.callAgentId) setCallAgentId(keys.callAgentId);
        if (keys.chatAgentId) setChatAgentId(keys.chatAgentId);
      } catch {}
    }
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const handleSave = () => {
    localStorage.setItem('taksh_api_keys', JSON.stringify({ callAgentId, chatAgentId }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="page" style={{ paddingTop: 48 }}>
      <Navbar />
      <div style={s.container}>
        <div style={s.header}>
          <h1 style={s.title}>Settings</h1>
          <p style={s.subtitle}>Configure your AI tutor agent.</p>
        </div>

        {/* Account */}
        <div className="card" style={s.section}>
          <div style={s.sectionHeader}>
            <div>
              <div style={s.sectionLabel}>ACCOUNT</div>
              <div style={s.sectionDesc}>{user?.phone || 'Not signed in'}</div>
            </div>
            <button className="btn btn-sm" onClick={handleLogout} style={{ color: '#f87171' }}>Sign Out</button>
          </div>
        </div>

        {/* ElevenLabs Agents */}
        <div className="card" style={{ ...s.section, marginTop: 1 }}>
          <div style={s.sectionHeader}>
            <div>
              <div style={s.sectionLabel}>ELEVENLABS AGENTS</div>
              <div style={s.sectionDesc}>Separate agents for chat and voice calls.</div>
            </div>
          </div>
          <div style={s.fields}>
            <div style={s.field}>
              <label style={s.label}>Voice Call Agent ID</label>
              <input className="input mono" type="text" value={callAgentId} onChange={e => setCallAgentId(e.target.value)} placeholder="agent_..." style={s.fieldInput} />
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Default: agent_4001kmrcsfkpfbdsgb049vbvw37f (Sir Ji - Voice)</div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Chat Agent ID</label>
              <input className="input mono" type="text" value={chatAgentId} onChange={e => setChatAgentId(e.target.value)} placeholder="agent_..." style={s.fieldInput} />
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Default: agent_5801kmspe84efe7te6t0821sktpv (Chat Tutor)</div>
            </div>
          </div>
        </div>

        <div style={s.footer}>
          <button className="btn btn-primary" onClick={handleSave} style={s.saveBtn}>
            {saved ? '✓ Saved' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' },
  header: { marginBottom: 32, paddingBottom: 16, borderBottom: '1px solid #2a2a2a' },
  title: { fontSize: 20, fontWeight: 600, marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888' },
  section: { padding: 0 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px', borderBottom: '1px solid #2a2a2a' },
  sectionLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#888', marginBottom: 2 },
  sectionDesc: { fontSize: 12, color: '#555' },
  fields: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 500, color: '#ccc' },
  fieldInput: { fontSize: 12 },
  footer: { marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 },
  saveBtn: { padding: '10px 24px' },
};
