import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Check, AlertTriangle, Volume2 } from 'lucide-react';
import { getApiKeys, saveApiKeys } from '@/lib/apiKeys';

type KeyField = {
  id: string;
  label: string;
  sublabel: string;
  placeholder: string;
  helpUrl?: string;
  helpText?: string;
  icon: typeof Key;
};

const fields: KeyField[] = [
  {
    id: 'gemini',
    label: 'Google Gemini API',
    sublabel: 'Powers AI tutoring (chat & voice)',
    placeholder: 'AIzaSy...',
    helpUrl: 'https://aistudio.google.com/apikey',
    helpText: 'Google AI Studio',
    icon: Key,
  },
  {
    id: 'fishAudio',
    label: 'Fish Audio API',
    sublabel: 'Cloned voice TTS for Voice Tutor',
    placeholder: 'sk-...',
    helpUrl: 'https://fish.audio/dashboard',
    helpText: 'Fish Audio Dashboard',
    icon: Volume2,
  },
  {
    id: 'fishVoiceId',
    label: 'Fish Audio Voice ID',
    sublabel: 'The cloned voice model to use',
    placeholder: 'e.g. a1b2c3d4...',
    helpUrl: 'https://fish.audio/dashboard',
    helpText: 'Fish Audio Dashboard',
    icon: Volume2,
  },
];

export default function ApiSettings() {
  const [keys, setKeys] = useState(getApiKeys());
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKeys(getApiKeys());
  }, []);

  const handleSave = () => {
    saveApiKeys(keys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const allConfigured = keys.gemini.trim().length > 0 && keys.fishAudio.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">API Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Keys are stored locally in your browser and never sent to any server.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field) => {
          const value = keys[field.id as keyof typeof keys] || '';
          const isSet = value.trim().length > 0;
          const isVisible = showKeys[field.id];

          return (
            <div
              key={field.id}
              className="bg-card rounded-2xl border border-border shadow-card overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <field.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{field.label}</h2>
                    <p className="text-xs text-muted-foreground">{field.sublabel}</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isSet
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {isSet ? 'Set' : 'Missing'}
                </span>
              </div>

              <div className="px-5 py-4 space-y-2">
                <div className="relative">
                  <input
                    type={isVisible ? 'text' : 'password'}
                    value={value}
                    onChange={(e) =>
                      setKeys((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border bg-muted text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  <button
                    onClick={() =>
                      setShowKeys((prev) => ({ ...prev, [field.id]: !prev[field.id] }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {field.helpUrl && (
                  <p className="text-xs text-muted-foreground">
                    Get yours from{' '}
                    <a
                      href={field.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80"
                    >
                      {field.helpText}
                    </a>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved!
          </>
        ) : (
          'Save All Keys'
        )}
      </button>

      {!allConfigured && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Keys required</p>
            <p className="text-xs text-destructive/80 mt-0.5">
              Both Gemini and Fish Audio keys are needed for full functionality.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
