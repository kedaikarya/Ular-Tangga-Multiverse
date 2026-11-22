import React, { useState, useEffect } from 'react';
import { QuestionItem } from '../types';
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from '../constants';

interface AiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  grade: string;
  subject: string;
  topic: string;
  questions: QuestionItem[];
  isGeneratingAi?: boolean;
  onGenerateAi: (grade: string, subject: string, topic: string) => Promise<void> | void;
  onSaveQuestion: (q: QuestionItem, editId?: string) => void;
  onDeleteQuestion: (id: string) => void;
}

export default function AiStudioModal({
  isOpen,
  onClose,
  grade,
  subject,
  topic,
  questions,
  isGeneratingAi = false,
  onGenerateAi,
  onSaveQuestion,
  onDeleteQuestion
}: AiStudioModalProps) {
  const [genGrade, setGenGrade] = useState(grade);
  const [genSubject, setGenSubject] = useState(subject === 'Campuran' ? 'IPAS' : subject);
  const [genTopic, setGenTopic] = useState(topic);

  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [qText, setQText] = useState('');
  const [opt0, setOpt0] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctIdx, setCorrectIdx] = useState(0);
  const [stepsVal, setStepsVal] = useState(3);
  const [expText, setExpText] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setGenGrade(grade || 'Fase C');
    setGenSubject(subject === 'Campuran' ? 'IPAS' : subject || 'IPAS');
    setGenTopic(topic || '');
  }, [isOpen, grade, subject, topic]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qObj: QuestionItem = {
      id: editId || ('q_' + Date.now()),
      grade: genGrade,
      subject: genSubject,
      topic: genTopic || 'Umum',
      question: qText.trim(),
      options: [opt0.trim(), opt1.trim(), opt2.trim(), opt3.trim()],
      correctIndex: Number(correctIdx),
      steps: Number(stepsVal),
      explanation: expText.trim()
    };
    onSaveQuestion(qObj, editId);
    resetForm();
  };

  const resetForm = () => {
    setEditId(undefined);
    setQText('');
    setOpt0('');
    setOpt1('');
    setOpt2('');
    setOpt3('');
    setCorrectIdx(0);
    setStepsVal(3);
    setExpText('');
  };

  const handleEdit = (q: QuestionItem) => {
    setEditId(q.id);
    setQText(q.question);
    setOpt0(q.options[0] || '');
    setOpt1(q.options[1] || '');
    setOpt2(q.options[2] || '');
    setOpt3(q.options[3] || '');
    setCorrectIdx(q.correctIndex);
    setStepsVal(q.steps || 3);
    setExpText(q.explanation || '');
  };

  const generatorSubjects = SUBJECT_OPTIONS.filter(s => s.value !== 'Campuran');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl glass-panel-strong rounded-3xl border border-indigo-400/40 shadow-2xl overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base sm:text-lg font-extrabold text-white">✨ Studio Soal Guru & Generator Gemini AI</h3>
            <p className="text-xs text-slate-400">Buat soal akurat sesuai Fase, Mapel, dan Materi menggunakan Gemini AI atau edit manual.</p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">✕</button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 space-y-3">
              <div className="text-xs font-extrabold text-indigo-200">🤖 Generator Soal Otomatis (Gemini AI)</div>
              <div className="grid grid-cols-2 gap-2">
                <select value={genGrade} onChange={(e) => setGenGrade(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white">
                  {GRADE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select value={genSubject} onChange={(e) => setGenSubject(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white">
                  {generatorSubjects.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                placeholder="Materi spesifik (misal: Rantai Makanan, Pecahan, Tata Surya)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white"
              />
              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={() => onGenerateAi(genGrade, genSubject, genTopic)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-wait text-white text-xs font-extrabold shadow-lg"
              >
                {isGeneratingAi ? '⏳ Gemini AI sedang menyusun 5 soal...' : '✨ Generate 5 Soal Gemini AI Sekarang'}
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-300">✍️ {editId ? 'Edit Soal' : 'Tambah Soal Manual'}</span>
                <button type="button" onClick={resetForm} className="text-[11px] text-slate-400 hover:text-white">Reset Form</button>
              </div>
              <textarea
                rows={2}
                required
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Tulis pertanyaan..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              ></textarea>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" required value={opt0} onChange={(e) => setOpt0(e.target.value)} placeholder="Pilihan A" className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white" />
                <input type="text" required value={opt1} onChange={(e) => setOpt1(e.target.value)} placeholder="Pilihan B" className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white" />
                <input type="text" required value={opt2} onChange={(e) => setOpt2(e.target.value)} placeholder="Pilihan C" className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white" />
                <input type="text" required value={opt3} onChange={(e) => setOpt3(e.target.value)} placeholder="Pilihan D" className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={correctIdx} onChange={(e) => setCorrectIdx(Number(e.target.value))} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-300">
                  <option value={0}>Kunci: Pilihan A</option>
                  <option value={1}>Kunci: Pilihan B</option>
                  <option value={2}>Kunci: Pilihan C</option>
                  <option value={3}>Kunci: Pilihan D</option>
                </select>
                <select value={stepsVal} onChange={(e) => setStepsVal(Number(e.target.value))} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-amber-300">
                  <option value={2}>Maju +2 Langkah</option>
                  <option value={3}>Maju +3 Langkah</option>
                  <option value={4}>Maju +4 Langkah</option>
                  <option value={5}>Maju +5 Langkah</option>
                  <option value={6}>Maju +6 Langkah</option>
                </select>
              </div>
              <input type="text" value={expText} onChange={(e) => setExpText(e.target.value)} placeholder="Pembahasan singkat..." className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white" />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold">
                💾 Simpan Soal ke Kelas
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-200">Daftar Soal Aktif Kelas</span>
              <span className="text-xs font-bold text-indigo-300">{questions.length} Soal (∞ Putaran)</span>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <div key={q.id || idx} className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-indigo-300 font-bold">
                    <span>{q.grade} • {q.subject} • {q.topic}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-white">{idx + 1}. {q.question}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => handleEdit(q)} className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-200 text-[11px] font-bold">Edit</button>
                      <button type="button" onClick={() => onDeleteQuestion(q.id)} className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-200 text-[11px] font-bold">Hapus</button>
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-300">Kunci: {q.options?.[q.correctIndex] || '-'} (+{q.steps || 3} langkah)</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
