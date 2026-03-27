'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function SettingsPage() {
  const [keys, setKeys] = useState({
    geminiKey: '',
    ttsProvider: 'elevenlabs',
    fishAudioKey: '',
    fishVoiceId: '',
    elevenLabsKey: '',
    elevenLabsVoiceId: '',
    elevenLabsAgentId: 'agent_4001kmrcsfkpfbdsgb049vbvw37f',
    useElevenLabsConnector: true,
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const [visible, setVisible] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem('taksh_api_keys');
    if (stored) {
      try { setKeys(prev => ({ ...prev, ...JSON.parse(stored) })); } catch {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('taksh_api_keys', JSON.stringify(keys));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (field, value) => {
    setKeys(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const testKey = async (type) => {
    setTesting(prev => ({ ...prev, [type]: true }));
    setTestResults(prev => ({ ...prev, [type]: null }));
    try {
      if (type === 'gemini') {
        const res = await fetch('/api/test-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'gemini', key: keys.geminiKey }),
        });
        const data = await res.json();
        setTestResults(prev => ({ ...prev, [type]: data.success ? 'ok' : 'fail' }));
      } else if (type === 'tts') {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Test.', provider: keys.ttsProvider }),
        });
        setTestResults(prev => ({ ...prev, [type]: res.ok ? 'ok' : 'fail' }));
      }
    } catch {
      setTestResults(prev => ({ ...prev, [type]: 'fail' }));
    }
    setTesting(prev => ({ ...prev, [type]: false }));
  };

  return (
    <div className="page" style={{ paddingTop: 48 }}>
      <Navbar />
      <div style={s.container}>
        <div style={s.header}>
          <h1 style={s.title}>Settings</h1>
          <p style={s.subtitle}>Configure API keys for AI and voice services.</p>
        </div>

        <div style={s.grid}>
          {/* Gemini */}
          <div className="card" style={s.section}>
            <div style={s.sectionHeader}>
              <div>
                <div style={s.sectionLabel}>GEMINI AI</div>
                <div style={s.sectionDesc}>Powers the AI tutor. Get a free key from Google AI Studio.</div>
              </div>
              <div style={s.headerActions}>
                {testResults.gemini && (
                  <span style={{ ...s.testBadge, color: testResults.gemini === 'ok' ? '#4ade80' : '#f87171', borderColor: testResults.gemini === 'ok' ? '#4ade8040' : '#f8717140' }}>
                    {testResults.gemini === 'ok' ? '● Connected' : '● Failed'}
                  </span>
                )}
                <button className="btn btn-sm" onClick={() => testKey('gemini')} disabled={testing.gemini}>
                  {testing.gemini ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
            <div style={s.fields}>
              <div style={s.field}>
                <label style={s.label}>API Key</label>
                <div style={s.inputWrap}>
                  <input className="input mono" type={visible.geminiKey ? 'text' : 'password'} value={keys.geminiKey} onChange={e => handleChange('geminiKey', e.target.value)} placeholder="AIzaSy..." style={{ ...s.fieldInput, flex: 1 }} />
                  <button className="btn btn-sm mono" onClick={() => setVisible(p => ({ ...p, geminiKey: !p.geminiKey }))} style={{ fontSize: 10, flexShrink: 0 }}>{visible.geminiKey ? 'HIDE' : 'SHOW'}</button>
                </div>
              </div>
            </div>
          </div>

          {/* ElevenLabs Agent */}
          <div className="card" style={s.section}>
            <div style={s.sectionHeader}>
              <div>
                <div style={s.sectionLabel}>ELEVENLABS VOICE AGENT</div>
                <div style={s.sectionDesc}>Powers the voice call with "Sir Ji" — your AI tutor agent.</div>
              </div>
            </div>

            {/* Connector vs Custom toggle */}
            <div style={s.providerPicker}>
              <button
                style={{ ...s.providerBtn, ...(keys.useElevenLabsConnector ? s.providerBtnA : {}) }}
                onClick={() => handleChange('useElevenLabsConnector', true)}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>Lovable Connector</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Uses linked ElevenLabs account</div>
              </button>
              <button
                style={{ ...s.providerBtn, ...(!keys.useElevenLabsConnector ? s.providerBtnA : {}) }}
                onClick={() => handleChange('useElevenLabsConnector', false)}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>Custom API Key</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Enter your own key</div>
              </button>
            </div>

            <div style={s.fields}>
              <div style={s.field}>
                <label style={s.label}>Agent ID</label>
                <input className="input mono" type="text" value={keys.elevenLabsAgentId} onChange={e => handleChange('elevenLabsAgentId', e.target.value)} placeholder="agent_..." style={s.fieldInput} />
              </div>

              {!keys.useElevenLabsConnector && (
                <div style={s.field}>
                  <label style={s.label}>API Key</label>
                  <div style={s.inputWrap}>
                    <input className="input mono" type={visible.elevenLabsKey ? 'text' : 'password'} value={keys.elevenLabsKey} onChange={e => handleChange('elevenLabsKey', e.target.value)} placeholder="sk_..." style={{ ...s.fieldInput, flex: 1 }} />
                    <button className="btn btn-sm mono" onClick={() => setVisible(p => ({ ...p, elevenLabsKey: !p.elevenLabsKey }))} style={{ fontSize: 10, flexShrink: 0 }}>{visible.elevenLabsKey ? 'HIDE' : 'SHOW'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TTS Provider */}
          <div className="card" style={s.section}>
            <div style={s.sectionHeader}>
              <div>
                <div style={s.sectionLabel}>TEXT-TO-SPEECH</div>
                <div style={s.sectionDesc}>Voice synthesis for web tutor. Choose a provider below.</div>
              </div>
              <div style={s.headerActions}>
                {testResults.tts && (
                  <span style={{ ...s.testBadge, color: testResults.tts === 'ok' ? '#4ade80' : '#f87171', borderColor: testResults.tts === 'ok' ? '#4ade8040' : '#f8717140' }}>
                    {testResults.tts === 'ok' ? '● Connected' : '● Failed'}
                  </span>
                )}
                <button className="btn btn-sm" onClick={() => testKey('tts')} disabled={testing.tts}>
                  {testing.tts ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
            <div style={s.providerPicker}>
              <button style={{ ...s.providerBtn, ...(keys.ttsProvider === 'elevenlabs' ? s.providerBtnA : {}) }} onClick={() => handleChange('ttsProvider', 'elevenlabs')}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>ElevenLabs</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Multilingual v2 · High quality</div>
              </button>
              <button style={{ ...s.providerBtn, ...(keys.ttsProvider === 'fish' ? s.providerBtnA : {}) }} onClick={() => handleChange('ttsProvider', 'fish')}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Fish Audio</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Low latency · Balanced</div>
              </button>
            </div>
            {keys.ttsProvider === 'elevenlabs' && (
              <div style={s.fields}>
                <div style={s.field}>
                  <label style={s.label}>API Key</label>
                  <div style={s.inputWrap}>
                    <input className="input mono" type={visible.elevenLabsKey ? 'text' : 'password'} value={keys.elevenLabsKey} onChange={e => handleChange('elevenLabsKey', e.target.value)} placeholder="sk_..." style={{ ...s.fieldInput, flex: 1 }} />
                    <button className="btn btn-sm mono" onClick={() => setVisible(p => ({ ...p, elevenLabsKey: !p.elevenLabsKey }))} style={{ fontSize: 10, flexShrink: 0 }}>{visible.elevenLabsKey ? 'HIDE' : 'SHOW'}</button>
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Voice ID <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span></label>
                  <input className="input mono" type="text" value={keys.elevenLabsVoiceId} onChange={e => handleChange('elevenLabsVoiceId', e.target.value)} placeholder="JBFqnCBsd6RMkjVDRZzb" style={s.fieldInput} />
                </div>
              </div>
            )}
            {keys.ttsProvider === 'fish' && (
              <div style={s.fields}>
                <div style={s.field}>
                  <label style={s.label}>API Key</label>
                  <div style={s.inputWrap}>
                    <input className="input mono" type={visible.fishAudioKey ? 'text' : 'password'} value={keys.fishAudioKey} onChange={e => handleChange('fishAudioKey', e.target.value)} placeholder="sk-..." style={{ ...s.fieldInput, flex: 1 }} />
                    <button className="btn btn-sm mono" onClick={() => setVisible(p => ({ ...p, fishAudioKey: !p.fishAudioKey }))} style={{ fontSize: 10, flexShrink: 0 }}>{visible.fishAudioKey ? 'HIDE' : 'SHOW'}</button>
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Voice ID <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span></label>
                  <input className="input mono" type="text" value={keys.fishVoiceId} onChange={e => handleChange('fishVoiceId', e.target.value)} placeholder="voice-id-here" style={s.fieldInput} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={s.footer}>
          <button className="btn btn-primary" onClick={handleSave} style={s.saveBtn}>
            {saved ? '✓ Saved' : 'Save Configuration'}
          </button>
          <span style={s.footerNote}>
            Keys are stored locally in your browser. They are sent to the server only when making API calls.
          </span>
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
  grid: { display: 'flex', flexDirection: 'column', gap: 1 },
  section: { padding: 0 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px', borderBottom: '1px solid #2a2a2a' },
  sectionLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#888', marginBottom: 2 },
  sectionDesc: { fontSize: 12, color: '#555' },
  headerActions: { display: 'flex', alignItems: 'center', gap: 8 },
  testBadge: { fontSize: 11, fontWeight: 600, padding: '2px 8px', border: '1px solid' },
  fields: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  inputWrap: { display: 'flex', gap: 4, alignItems: 'center' },
  label: { fontSize: 12, fontWeight: 500, color: '#ccc' },
  fieldInput: { fontSize: 12 },
  providerPicker: { display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #2a2a2a' },
  providerBtn: { padding: '14px 20px', background: 'transparent', border: 'none', borderRight: '1px solid #2a2a2a', cursor: 'pointer', textAlign: 'left', color: '#888', transition: 'all 100ms' },
  providerBtnA: { background: '#1a1a1a', color: '#fafafa', borderBottom: '2px solid #fafafa' },
  footer: { marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 },
  saveBtn: { padding: '10px 24px' },
  footerNote: { fontSize: 12, color: '#555' },
};
