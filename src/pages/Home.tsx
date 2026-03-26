import { Link } from 'react-router-dom';
import { BookOpen, Phone, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ProgressCard from '@/components/ProgressCard';

const modes = [
  {
    to: '/web-tutor',
    icon: BookOpen,
    title: 'Web Tutor',
    description: 'Interactive step-by-step lessons with flashcards and quizzes.',
    cta: 'Start Learning',
  },
  {
    to: '/voice-tutor',
    icon: Phone,
    title: 'Voice Tutor',
    description: 'Talk to your AI tutor hands-free with a cloned voice.',
    cta: 'Start Call',
  },
];

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-16">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-4"
      >
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
          Vidy<span className="text-primary">AI</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Your personal NCERT tutor. Master concepts step-by-step with chat or voice.
        </p>
      </motion.div>

      {/* Progress Card */}
      <ProgressCard />

      {/* Mode Cards */}
      <div className="grid sm:grid-cols-2 gap-5">
        {modes.map(({ to, icon: Icon, title, description, cta }, i) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.1 }}
          >
            <Link
              to={to}
              className="group block bg-card rounded-2xl p-7 border border-border shadow-card hover:shadow-hover transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1.5">{title}</h2>
              <p className="text-sm text-muted-foreground mb-5">{description}</p>
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                {cta}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
