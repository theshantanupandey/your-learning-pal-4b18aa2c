import React from 'react';
import { Send, Mic, Square } from 'lucide-react';

type Props = {
  input: string;
  onInputChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  isRecording: boolean;
  onToggleRecording: () => void;
};

export default function ChatInput({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  isRecording,
  onToggleRecording,
}: Props) {
  return (
    <div className="bg-card/80 backdrop-blur-xl border-t border-border p-4 sticky bottom-0">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Type your answer or ask a question..."
              disabled={isLoading || isRecording}
              className="w-full pl-4 pr-12 py-3.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isRecording}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleRecording}
            disabled={isLoading}
            className={`p-3.5 rounded-xl transition-all flex-shrink-0 disabled:opacity-50 ${
              isRecording
                ? 'bg-destructive/10 text-destructive animate-pulse'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
