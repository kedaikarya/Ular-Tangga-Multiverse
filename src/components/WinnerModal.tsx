import React, { useState, useEffect } from 'react';
import { RoomData } from '../types';

interface WinnerModalProps {
  isOpen: boolean;
  room: RoomData | null;
  isTeacher?: boolean;
  onClose: () => void;
  onRestartClass?: () => void;
}

export default function WinnerModal({ isOpen, room, isTeacher, onClose, onRestartClass }: WinnerModalProps) {
  const [confirmRestart, setConfirmRestart] = useState(false);

  useEffect(() => {
    if (!isOpen) setConfirmRestart(false);
  }, [isOpen]);

  if (!isOpen || !room) return null;

  const students = Object.values(room.players || {})
    .filter(p => p.role !== 'teacher')
    .sort((a, b) => {
      const aFin = (a.finishOrder && a.finishOrder > 0) ? a.finishOrder : Number.MAX_SAFE_INTEGER;
      const bFin = (b.finishOrder && b.finishOrder > 0) ? b.finishOrder : Number.MAX_SAFE_INTEGER;
      if (aFin !== bFin) return aFin - bFin;
      if ((b.position || 1) !== (a.position || 1)) return (b.position || 1) - (a.position || 1);
      return (b.score || 0) - (a.score || 0);
    });

  const medals = ['🥇', '🥈', '🥉'];

  const handleRestart = () => {
    if (!onRestartClass) return;
    if (!confirmRestart) {
      setConfirmRestart(true);
      return;
    }
    setConfirmRestart(false);
    onRestartClass();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel-strong rounded-3xl border border-amber-400/50 p-6 text-center space-y-4 shadow-2xl">
        <div className="text-5xl animate-float">🏆</div>
        <h3 className="font-display text-2xl font-extrabold text-amber-300">Podium Juara Kelas!</h3>
        <div className="space-y-2 text-left max-h-[45dvh] overflow-y-auto pr-1">
          {students.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-900 text-xs text-slate-300 text-center">Belum ada siswa di papan peringkat.</div>
          ) : (
            students.slice(0, 8).map((p, idx) => (
              <div key={p.id} className={`p-3 rounded-2xl border flex items-center justify-between ${p.position >= 100 ? 'bg-emerald-500/15 border-emerald-400/40' : 'bg-slate-900/90 border-slate-800'}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg shrink-0">{medals[idx] || `#${idx + 1}`}</span>
                  <span className="text-lg shrink-0">{p.avatar || '🦊'}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white truncate">
                      {p.name} {p.position >= 100 ? <span className="text-emerald-300">(Finish{p.finishOrder ? ` #${p.finishOrder}` : ''})</span> : ''}
                    </div>
                    <div className="text-[11px] text-slate-400">Petak {p.position}/100 • {p.correctCount || 0} Benar</div>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-amber-300 shrink-0">{p.score || 0} Poin</span>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col gap-2">
          {isTeacher && onRestartClass && (
            <button
              type="button"
              onClick={handleRestart}
              className={`w-full py-3 rounded-2xl font-extrabold text-sm shadow-lg transition ${
                confirmRestart
                  ? 'bg-amber-400 text-slate-950 animate-pulse'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950'
              }`}
            >
              {confirmRestart ? '❓ Klik Sekali Lagi untuk Mulai Ulang Semua Bidak' : '🔄 Mulai Ulang Permainan (Reset ke Petak 1)'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm"
          >
            Kembali ke Arena 3D
          </button>
        </div>
      </div>
    </div>
  );
}
