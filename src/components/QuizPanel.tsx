import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

type Question = {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
};

type Props = {
  questions: Question[];
  onSubmit: (score: number, total: number) => void;
  isLoading: boolean;
};

export default function QuizPanel({ questions, onSubmit, isLoading }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    let score = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswerIndex) score++;
    });
    onSubmit(score, questions.length);
  };

  return (
    <div className="space-y-6">
      {questions.map((q, qIdx) => (
        <div key={qIdx} className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            {qIdx + 1}. {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((opt, oIdx) => {
              const isSelected = answers[qIdx] === oIdx;
              const isCorrect = q.correctAnswerIndex === oIdx;

              let cls =
                'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ';

              if (submitted) {
                if (isCorrect) cls += 'bg-success/10 border-success/30 text-success';
                else if (isSelected && !isCorrect)
                  cls += 'bg-destructive/10 border-destructive/30 text-destructive';
                else cls += 'bg-muted border-border text-muted-foreground opacity-50';
              } else {
                if (isSelected) cls += 'bg-primary/10 border-primary/30 text-primary';
                else cls += 'bg-card border-border text-foreground hover:bg-muted';
              }

              return (
                <button
                  key={oIdx}
                  disabled={submitted}
                  onClick={() => setAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                  className={cls}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    {submitted && isCorrect && <CheckCircle className="w-4 h-4" />}
                    {submitted && isSelected && !isCorrect && <XCircle className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}
          </div>
          {submitted && (
            <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Explanation:</span>{' '}
              {q.explanation}
            </div>
          )}
        </div>
      ))}

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length !== questions.length || isLoading}
          className="w-full py-3 bg-foreground text-background font-medium rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-40"
        >
          Submit Answers
        </button>
      )}
    </div>
  );
}
