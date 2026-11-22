import React from 'react';

interface TeacherDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemoQuiz: () => void;
  isSimRunning: boolean;
  onToggleSim: () => void;
  onClearDemoPlayers: () => void;
}

export default function TeacherDemoModal({
  isOpen,
  onClose,
  onStartDemoQuiz,
  isSimRunning,
  onToggleSim,
  onClearDemoPlayers
}: TeacherDemoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-panel-strong rounded-3xl border border-sky-400/40 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎮</span>
            <div>
              <h3 className="font-display text-base font-extrabold text-white">Demo Permainan (Layar Guru)</h3>
              <p className="text-[11px] text-slate-400">Peragakan cara bermain di proyektor kelas sebelum atau saat sesi berlangsung.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">✕</button>
        </div>

        <div className="p-5 space-y-3.5 text-xs">
          <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-400/35 space-y-2">
            <div className="font-display text-sm font-extrabold text-indigo-200">🧠 1. Peragaan Jawab Soal & Langkah Bidak 3D</div>
            <p className="text-slate-300 leading-relaxed">
              Menampilkan jendela soal seperti di layar siswa dan menggerakkan bidak <strong>🎯 Demo Guru</strong> secara langsung di atas balok bertingkat 3D.
            </p>
            <button type="button" onClick={onStartDemoQuiz} className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-extrabold shadow-lg transition">
              🎯 Coba Jawab Soal & Gerakkan Bidak Demo
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-sky-500/15 border border-sky-400/35 space-y-2">
            <div className="font-display text-sm font-extrabold text-sky-200">🤖 2. Simulasi Otomatis Siswa 3D</div>
            <p className="text-slate-300 leading-relaxed">
              Menghadirkan 3 siswa simulasi (Alya, Bima, Citra) yang otomatis menjawab soal, melompat antar petak, menaiki Tangga/Lift, dan menuruni Ular/Perosotan.
            </p>
            <button type="button" onClick={onToggleSim} className="w-full py-2.5 px-4 rounded-xl bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/50 text-sky-100 font-extrabold transition">
              {isSimRunning ? '⏹️ Hentikan Simulasi Otomatis' : '▶️ Jalankan Simulasi Otomatis'}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
            <button type="button" onClick={onClearDemoPlayers} className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 font-extrabold transition">
              🧹 Bersihkan Bidak Demo
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold transition">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
