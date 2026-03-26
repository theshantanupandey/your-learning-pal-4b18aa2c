'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function SettingsPage() {
  const [keys, setKeys] = useState({
    geminiKey: '',
    fishAudioKey: '',
    fishVoiceId: '',
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const [visible, setVisible] = useState({});

  // Load saved keys from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('taksh_api_keys');
    if (stored) {
      try { setKeys(JSON.parse(stored)); } catch {}
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
      } else if (type === 'fish') {
        setTestResults(prev => ({ ...prev, [type]: keys.fishAudioKey ? 'ok' : 'fail' }));
      }
    } catch {
      setTestResults(prev => ({ ...prev, [type]: 'fail' }));
    }

    setTesting(prev => ({ ...prev, [type]: false }));
  };

  const fields = [
    {
      group: 'GEMINI AI',
      description: 'Powers the AI tutor. Get a free key from Google AI Studio.',
      testType: 'gemini',
      items: [
        { key: 'geminiKey', label: 'API Key', placeholder: 'AIzaSy...', type: 'password' },
      ],
    },
    {
      group: 'FISH AUDIO TTS',
      description: 'Optional. High-quality voice synthesis. Falls back to browser TTS if not configured.',
      testType: 'fish',
      items: [
        { key: 'fishAudioKey', label: 'API Key', placeholder: 'sk-...', type: 'password' },
        { key: 'fishVoiceId', label: 'Voice ID', placeholder: 'voice-id-here' },
      ],
    },
  ];

  return (
    <div className="page" style={{ paddingTop: 48 }}>
      <Navbar />

      <div style={s.container}>
        <div style={s.header}>
          <h1 style={s.title}>Settings</h1>
          <p style={s.subtitle}>Configure API keys for AI, database, and voice services.</p>
        </div>

        <div style={s.grid}>
          {fields.map((group) => (
            <div key={group.group} className="card" style={s.section}>
              <div style={s.sectionHeader}>
                <div>
                  <div style={s.sectionLabel}>{group.group}</div>
                  <div style={s.sectionDesc}>{group.description}</div>
                </div>
                <div style={s.headerActions}>
                  {testResults[group.testType] && (
                    <span style={{
                      ...s.testBadge,
                      color: testResults[group.testType] === 'ok' ? '#4ade80' : '#f87171',
                      borderColor: testResults[group.testType] === 'ok' ? '#4ade8040' : '#f8717140',
                    }}>
                      {testResults[group.testType] === 'ok' ? '● Connected' : '● Failed'}
                    </span>
                  )}
                  <button
                    className="btn btn-sm"
                    onClick={() => testKey(group.testType)}
                    disabled={testing[group.testType]}
                  >
                    {testing[group.testType] ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </div>

              <div style={s.fields}>
                {group.items.map((item) => (
                  <div key={item.key} style={s.field}>
                    <label style={s.label}>{item.label}</label>
                    <div style={s.inputWrap}>
                      <input
                        className="input mono"
                        type={item.type === 'password' && !visible[item.key] ? 'password' : 'text'}
                        value={keys[item.key]}
                        onChange={e => handleChange(item.key, e.target.value)}
                        placeholder={item.placeholder}
                        style={{ ...s.fieldInput, flex: 1 }}
                      />
                      {item.type === 'password' && (
                        <button
                          className="btn btn-sm mono"
                          onClick={() => setVisible(p => ({ ...p, [item.key]: !p[item.key] }))}
                          style={{ fontSize: 10, flexShrink: 0 }}
                        >
                          {visible[item.key] ? 'HIDE' : 'SHOW'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '32px 24px 64px',
  },
  header: {
    marginBottom: 32,
    paddingBottom: 16,
    borderBottom: '1px solid #2a2a2a',
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  section: {
    padding: 0,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px 20px',
    borderBottom: '1px solid #2a2a2a',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#888',
    marginBottom: 2,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#555',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  testBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    border: '1px solid',
  },
  fields: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  inputWrap: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: '#ccc',
  },
  fieldInput: {
    fontSize: 12,
  },
  footer: {
    marginTop: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  saveBtn: {
    padding: '10px 24px',
  },
  footerNote: {
    fontSize: 12,
    color: '#555',
  },
};
