import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Flashcard = { front: string; back: string };

type Props = {
  cards: Flashcard[];
};

export default function FlashcardDeck({ cards }: Props) {
  const [current, setCurrent] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const prev = () => {
    setCurrent((c) => Math.max(0, c - 1));
    setIsFlipped(false);
  };
  const next = () => {
    setCurrent((c) => Math.min(cards.length - 1, c + 1));
    setIsFlipped(false);
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${current}-${isFlipped}`}
          initial={{ opacity: 0, rotateY: isFlipped ? 90 : -90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => setIsFlipped(!isFlipped)}
          className="h-56 bg-muted rounded-2xl border border-border p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-elevated transition-shadow"
        >
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            {isFlipped ? 'Answer' : 'Term'}
          </span>
          <p className={`font-medium ${isFlipped ? 'text-base text-foreground/80' : 'text-lg text-foreground'}`}>
            {isFlipped ? cards[current].back : cards[current].front}
          </p>
          <span className="text-xs text-muted-foreground mt-auto">Tap to flip</span>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between px-2">
        <button
          onClick={prev}
          disabled={current === 0}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-medium text-muted-foreground">
          {current + 1} / {cards.length}
        </span>
        <button
          onClick={next}
          disabled={current === cards.length - 1}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
