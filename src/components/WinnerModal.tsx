import React from 'react';
import { RoomData } from '../types';

interface WinnerModalProps {
  isOpen: boolean;
  room: RoomData | null;
  onClose: () => void;
}

export default function WinnerModal({ isOpen, room, onClose }: WinnerModalProps) {
  if (!isOpen || !room) return null;

  const students = Object.values(room.players || {})
    .filter(p => p.role !== 'teacher')
    .sort((a, b) => (b.position - a.position) || (b.score - a.score));

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel-strong rounded-3xl border border-amber-400/50 p-6 text-center space-y-4 shadow-2xl">
        <div className="text-5xl animate-float">🏆</div>
        <h3 className="font-display text-2xl font-extrabold text-amber-300">Podium Juara Kelas!</h3>
        <div className="space-y-2 text-left">
          {students.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-900 text-xs text-slate-300 text-center">Belum ada siswa di papan peringkat.</div>
          ) : (
            students.slice(0, 5).map((p, idx) => (
              <div key={p.id} className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{medals[idx] || `#${idx + 1}`}</span>
                  <span className="text-lg">{p.avatar || '🦊'}</span>
                  <div>
                    <div className="text-xs font-extrabold text-white">{p.name}</div>
                    <div className="text-[11px] text-slate-400">Petak {p.position}/100 • {p.correctCount || 0} Benar</div>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-amber-300">{p.score || 0} Poin</span>
              </div>
            ))
          )}
        </div>
        <button onClick={onClose} className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold text-sm">
          Kembali ke Arena 3D
        </button>
      </div>
    </div>
  );
}
