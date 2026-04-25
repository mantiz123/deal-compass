import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CheckCircle2, XCircle, ArrowLeft, RotateCcw, Sparkles } from 'lucide-react';
import { useSubmitQuiz } from '@/hooks/useAcademy';
import { cn } from '@/lib/utils';

interface QuizRunnerProps {
  lessonId: string;
  xpReward: number;
  questions: {
    id: string;
    question: string;
    options: any;
    correct_index: number;
    explanation: string | null;
  }[];
  onPassed: () => void;
  onBackToLesson: () => void;
}

export function QuizRunner({
  lessonId,
  xpReward,
  questions,
  onPassed,
  onBackToLesson,
}: QuizRunnerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{
    passed: boolean;
    score_percent: number;
    correct_count: number;
    total_questions: number;
  } | null>(null);
  const submit = useSubmitQuiz();

  const current = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const progressPercent = ((currentIdx + (selected !== null ? 1 : 0)) / questions.length) * 100;

  const handleNext = async () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);

    if (isLast) {
      const res = await submit.mutateAsync({
        lessonId,
        answers: newAnswers,
        questions,
        xpReward,
      });
      setResult(res);
      if (res.passed) onPassed();
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleRetry = () => {
    setCurrentIdx(0);
    setAnswers([]);
    setSelected(null);
    setResult(null);
  };

  if (questions.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">No hay preguntas en este quiz.</p>
    );
  }

  // Result screen
  if (result) {
    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-3">
          {result.passed ? (
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
          ) : (
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
          )}
          <h2 className="text-2xl font-bold text-foreground">
            {result.passed ? '¡Lección Completada!' : 'Necesitas mejorar'}
          </h2>
          <div className="space-y-1">
            <p className="text-4xl font-bold text-foreground">{result.score_percent}%</p>
            <p className="text-sm text-muted-foreground">
              {result.correct_count} de {result.total_questions} correctas
            </p>
          </div>
          {result.passed && (
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
              <Sparkles className="h-4 w-4" />
              <span className="font-bold">+{xpReward} XP ganados</span>
            </div>
          )}
        </div>

        {/* Review */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Revisión
          </h3>
          {questions.map((q, i) => {
            const userAns = answers[i];
            const isCorrect = userAns === q.correct_index;
            const opts = Array.isArray(q.options) ? q.options : [];
            return (
              <Card key={q.id} className={cn('p-4', isCorrect ? 'border-success/30' : 'border-destructive/30')}>
                <div className="flex items-start gap-2 mb-2">
                  {isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  )}
                  <p className="text-sm font-medium text-foreground">{q.question}</p>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Tu respuesta: <span className="font-semibold">{opts[userAns] ?? '—'}</span>
                </p>
                {!isCorrect && (
                  <p className="text-xs text-success ml-6 mt-1">
                    Correcta: <span className="font-semibold">{opts[q.correct_index]}</span>
                  </p>
                )}
                {q.explanation && (
                  <p className="text-xs text-muted-foreground ml-6 mt-2 italic">
                    {q.explanation}
                  </p>
                )}
              </Card>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button onClick={onBackToLesson} variant="outline" className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Lección
          </Button>
          {!result.passed && (
            <Button onClick={handleRetry} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Question screen
  const opts = Array.isArray(current.options) ? current.options : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Pregunta {currentIdx + 1} de {questions.length}
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">{current.question}</h3>

        <RadioGroup
          value={selected?.toString() ?? ''}
          onValueChange={(v) => setSelected(parseInt(v, 10))}
          className="space-y-2"
        >
          {opts.map((option: string, idx: number) => (
            <div
              key={idx}
              className={cn(
                'flex items-center space-x-3 rounded-lg border border-border p-4 cursor-pointer transition-colors',
                selected === idx ? 'border-primary bg-primary/5' : 'hover:bg-secondary/50'
              )}
              onClick={() => setSelected(idx)}
            >
              <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} />
              <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer text-sm">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="flex gap-2">
        <Button onClick={onBackToLesson} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button onClick={handleNext} disabled={selected === null || submit.isPending} className="flex-1">
          {isLast ? 'Enviar Quiz' : 'Siguiente'}
        </Button>
      </div>
    </div>
  );
}
