import { Link } from 'react-router-dom';
import { BookOpen, Phone, Sparkles, GraduationCap, Settings } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-2xl mb-4">
            <GraduationCap className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">
            Welcome to <span className="text-blue-600">VidyAI</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Your personal NCERT tutor. Master concepts step-by-step with interactive chat or just give us a call!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Mode 1: Web Tutor */}
          <Link
            to="/web-tutor"
            className="group relative bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all duration-300 flex flex-col items-center text-center space-y-4 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Web Tutor</h2>
            <p className="text-slate-600">
              Interactive step-by-step learning, flashcards, and quizzes. Perfect for focused study sessions.
            </p>
            <div className="pt-4 w-full">
              <div className="w-full py-3 px-4 bg-slate-50 text-blue-600 font-medium rounded-xl group-hover:bg-blue-50 transition-colors">
                Start Learning
              </div>
            </div>
          </Link>

          {/* Mode 2: Voice Tutor */}
          <Link
            to="/voice-tutor"
            className="group relative bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:shadow-md hover:purple-300 transition-all duration-300 flex flex-col items-center text-center space-y-4 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Phone className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Voice Tutor</h2>
            <p className="text-slate-600">
              Hands-free learning! Just talk to your AI tutor like a real teacher over a simulated phone call.
            </p>
            <div className="pt-4 w-full">
              <div className="w-full py-3 px-4 bg-slate-50 text-purple-600 font-medium rounded-xl group-hover:bg-purple-50 transition-colors">
                Start Call
              </div>
            </div>
          </Link>
        </div>

        <div className="text-center">
          <Link
            to="/api"
            className="inline-flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors text-sm"
          >
            <Settings className="w-4 h-4" />
            <span>Configure API Keys</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
