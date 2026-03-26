import { Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type RecentSession = {
  topic: string;
  classLevel: string;
  subject: string;
  timestamp: number;
};

const STORAGE_KEY = 'vidyai_last_session';

export function saveLastSession(session: Omit<RecentSession, 'timestamp'>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, timestamp: Date.now() }));
}

export function getLastSession(): RecentSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export default function ProgressCard() {
  const session = getLastSession();

  if (!session) return null;

  const timeAgo = getTimeAgo(session.timestamp);

  return (
    <Link
      to="/web-tutor"
      className="block bg-card rounded-2xl border border-border p-5 shadow-card hover:shadow-hover transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Continue: {session.topic}</p>
            <p className="text-xs text-muted-foreground">
              Class {session.classLevel} · {session.subject} · {timeAgo}
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
