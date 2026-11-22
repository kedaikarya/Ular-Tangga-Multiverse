import React, { useState } from 'react';
import { QuestionItem } from '../types';

interface QuizModalProps {
  isOpen: boolean;
  isDemo: boolean;
  grade: string;
  subject: string;
  question: QuestionItem | null;
  onClose: () => void;
  onAnswerSubmit: (isCorrect: boolean, steps: number) => void;
}

export default function QuizModal({
  isOpen,
  isDemo,
  grade,
  subject,
  question,
  onClose,
  onAnswerSubmit
}: QuizModalProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  if (!isOpen || !question) return null;

  const handleSelectOption = (idx: number) => {
    if (answered) return;
    setSelectedIdx(idx);
    setAnswered(true);
    const correct = idx === question.correctIndex;
    setIsCorrect(correct);
  };

  const handleContinue = () => {
    onAnswerSubmit(isCorrect, question.steps || 3);
    setSelectedIdx(null);
    setAnswered(false);
    setIsCorrect(false);
  };

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl glass-panel-strong rounded-3xl border border-indigo-400/40 shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950/90 to-purple-950/90 border-b border-indigo-400/25 flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 text-xs font-extrabold">
            {isDemo ? '🎮 DEMO GURU • ' : ''}{grade} • {subject}
          </span>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/25 border border-amber-400/40 text-amber-200 text-xs font-extrabold">
              Bobot: +{question.steps || 3} Langkah
            </span>
            {isDemo && (
              <button type="button" onClick={onClose} className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold" title="Tutup Demo">✕</button>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <h3 className="font-display text-base sm:text-lg font-extrabold text-white leading-relaxed">
            {question.question}
          </h3>

          <div className="grid grid-cols-1 gap-2.5">
            {question.options.map((opt, idx) => {
              let btnClass = 'w-full p-3.5 rounded-2xl bg-slate-900/90 hover:bg-indigo-500/20 border border-slate-700 hover:border-indigo-400 text-left text-xs sm:text-sm font-bold text-white flex items-center gap-3 transition';
              if (answered) {
                if (idx === question.correctIndex) {
                  btnClass = 'w-full p-3.5 rounded-2xl bg-emerald-500/25 border-2 border-emerald-400 text-left text-xs sm:text-sm font-extrabold text-emerald-100 flex items-center gap-3';
                } else if (idx === selectedIdx && !isCorrect) {
                  btnClass = 'w-full p-3.5 rounded-2xl bg-rose-500/25 border-2 border-rose-400 text-left text-xs sm:text-sm font-extrabold text-rose-100 flex items-center gap-3';
                } else {
                  btnClass += ' opacity-50';
                }
              }
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={answered}
                  onClick={() => handleSelectOption(idx)}
                  className={btnClass}
                >
                  <span className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-extrabold text-indigo-300 shrink-0">{letters[idx]}</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {answered && (
            <div className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-1.5 ${isCorrect ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100' : 'bg-rose-500/15 border-rose-400/40 text-rose-100'}`}>
              <div className={`font-extrabold text-sm ${isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
                {isCorrect ? `🎉 Jawaban Benar! Maju +${question.steps || 3} Langkah!` : '❌ Kurang Tepat! Bidak bertahan di tempat.'}
              </div>
              <p className="text-slate-200 leading-relaxed">
                {question.explanation || 'Terus berlatih untuk meningkatkan pemahamanmu!'}
              </p>
            </div>
          )}

          {answered && (
            <div className="flex justify-end pt-1">
              <button onClick={handleContinue} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-lg">
                🚀 Gerakkan Bidak 3D!
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
