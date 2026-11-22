import React, { useState } from 'react';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateClass: (config: {
    className: string;
    grade: string;
    subject: string;
    topic: string;
    themeMode: 'classic' | 'modern';
    autoAi: boolean;
  }) => void;
}

export default function CreateClassModal({ isOpen, onClose, onCreateClass }: CreateClassModalProps) {
  const [className, setClassName] = useState('Kelas Fase C - Cerdas Cermat');
  const [grade, setGrade] = useState('Fase C');
  const [subject, setSubject] = useState('Matematika');
  const [topic, setTopic] = useState('Operasi Hitung & Pecahan');
  const [themeMode, setThemeMode] = useState<'classic' | 'modern'>('classic');
  const [autoAi, setAutoAi] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateClass({
      className,
      grade,
      subject,
      topic,
      themeMode,
      autoAi
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg glass-panel-strong rounded-3xl border border-amber-400/40 shadow-2xl overflow-hidden my-auto">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">Langkah 2 • Konfigurasi Guru</span>
            <h3 className="font-display text-lg font-extrabold text-white">Pengaturan Kelas Baru</h3>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nama Kelas</label>
            <input
              type="text"
              maxLength={32}
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 focus:border-amber-400 outline-none text-sm font-bold text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fase Pembelajaran</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs font-bold text-white">
                <option value="Fase A">Fase A (Kelas 1–2 SD)</option>
                <option value="Fase B">Fase B (Kelas 3–4 SD)</option>
                <option value="Fase C">Fase C (Kelas 5–6 SD)</option>
                <option value="Fase D">Fase D (Kelas 7–9 SMP)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Mata Pelajaran</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs font-bold text-white">
                <option value="Matematika">Matematika</option>
                <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                <option value="IPA">IPA (Sains)</option>
                <option value="IPS">IPS</option>
                <option value="PPKn">PPKn</option>
                <option value="Bahasa Inggris">Bahasa Inggris</option>
                <option value="Campuran">Campuran Semua Mapel</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Materi Pembelajaran</label>
            <input
              type="text"
              maxLength={48}
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: Pecahan, Ekosistem, Tata Surya..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 focus:border-amber-400 outline-none text-sm font-bold text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tema Arena 3D</label>
              <select value={themeMode} onChange={(e) => setThemeMode(e.target.value as any)} className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs font-bold text-white">
                <option value="classic">🐍🪜 Ular & Tangga (Klasik)</option>
                <option value="modern">🛝🛗 Perosotan & Lift (Modern)</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 cursor-pointer">
                <input type="checkbox" checked={autoAi} onChange={(e) => setAutoAi(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                <span className="text-xs font-extrabold text-indigo-200">✨ Auto-Generate Soal AI</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-extrabold">Batal</button>
            <button type="submit" className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-extrabold shadow-lg">
              🚀 Buka Layar Guru
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
