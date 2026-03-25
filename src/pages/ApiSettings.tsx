import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Key, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';
import { getApiKeys, saveApiKeys } from '@/lib/apiKeys';

export default function ApiSettings() {
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const keys = getApiKeys();
    setGeminiKey(keys.gemini);
  }, []);

  const handleSave = () => {
    saveApiKeys({ gemini: geminiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isConfigured = geminiKey.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link to="/" className="inline-flex items-center text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">API Configuration</h1>
          <p className="text-slate-500">
            Add your API keys below. Keys are stored locally in your browser and never sent to any server.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Google Gemini API</h2>
                <p className="text-sm text-slate-500">Powers both Web Tutor and Voice Tutor</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isConfigured
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {isConfigured ? 'Configured' : 'Not set'}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-3 pr-12 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Get your key from{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline hover:text-blue-700"
                >
                  Google AI Studio
                </a>
              </p>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Key</span>
              )}
            </button>
          </div>
        </div>

        {!isConfigured && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">API key required</p>
              <p className="text-sm text-amber-700 mt-1">
                You need a Gemini API key to use VidyAI. The Web Tutor and Voice Tutor won't work without it.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
