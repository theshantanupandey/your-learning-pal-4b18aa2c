import ReactMarkdown from 'react-markdown';
import { Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

type Props = {
  role: 'user' | 'model';
  text: string;
  audioUrl?: string;
  onSpeak?: () => void;
};

export default function ChatMessage({ role, text, audioUrl, onSpeak }: Props) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-card border border-border text-card-foreground rounded-bl-md shadow-card'
        }`}
      >
        {isUser ? (
          <div className="space-y-2">
            {audioUrl && <audio controls src={audioUrl} className="max-w-full h-10" />}
            {text !== '🎤 Audio message' && <p className="whitespace-pre-wrap text-sm">{text}</p>}
            {text === '🎤 Audio message' && !audioUrl && <p className="whitespace-pre-wrap text-sm">{text}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:text-card-foreground prose-strong:text-card-foreground prose-headings:text-card-foreground prose-pre:bg-foreground/5 prose-pre:text-card-foreground">
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
            {onSpeak && (
              <button
                onClick={onSpeak}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Listen
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
