import React from 'react';
import { RoomData } from '../types';
import { LADDERS, SNAKES } from '../constants';

interface LiveBoard2DModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomData | null;
  currentUserId: string;
}

export default function LiveBoard2DModal({
  isOpen,
  onClose,
  room,
  currentUserId
}: LiveBoard2DModalProps) {
  if (!isOpen || !room) return null;

  const players = Object.values(room.players || {}).filter(p => p.role !== 'teacher');
  const sortedStudents = [...players].sort((a, b) => (b.position - a.position) || (b.score - a.score));

  // Build 10 rows from top (row 9: 100..91) down to bottom (row 0: 1..10)
  const rows: number[][] = [];
  for (let row = 9; row >= 0; row--) {
    const rowTiles: number[] = [];
    for (let col = 0; col < 10; col++) {
      const tileNum = row % 2 === 0 ? row * 10 + col + 1 : row * 10 + (10 - col);
      rowTiles.push(tileNum);
    }
    rows.push(rowTiles);
  }

  const playersByTile: Record<number, typeof players> = {};
  players.forEach(p => {
    const pos = p.position || 1;
    if (!playersByTile[pos]) playersByTile[pos] = [];
    playersByTile[pos].push(p);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl glass-panel-strong rounded-3xl border border-indigo-400/40 shadow-2xl overflow-hidden my-auto max-h-[94dvh] flex flex-col">
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <span>🗺️ Papan & Monitor Real-Time (2D)</span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold">
                LIVE • {players.length} Siswa
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {room.grade} • {room.subject} • Kode: <strong className="text-amber-300 font-mono">{room.code}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="p-3 sm:p-4 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* Grid Papan 10x10 */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-10 gap-0.5 sm:gap-1 p-1.5 rounded-2xl bg-slate-950 border border-slate-800 aspect-square w-full max-w-[440px] mx-auto">
              {rows.flat().map(tileNum => {
                const ladderTo = LADDERS[tileNum];
                const snakeTo = SNAKES[tileNum];
                const occupants = playersByTile[tileNum] || [];
                const isPeak = tileNum === 100;
                const isStart = tileNum === 1;

                let cellBg = 'bg-slate-900/90 border-slate-800 text-slate-400';
                if (isPeak) cellBg = 'bg-amber-400/25 border-amber-400 text-amber-200';
                else if (isStart) cellBg = 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200';
                else if (ladderTo) cellBg = 'bg-teal-950/80 border-emerald-500/40 text-emerald-300';
                else if (snakeTo) cellBg = 'bg-rose-950/80 border-rose-500/40 text-rose-300';

                return (
                  <div
                    key={tileNum}
                    className={`relative rounded-md sm:rounded-lg border flex flex-col items-center justify-between p-0.5 text-[9px] sm:text-[10px] font-bold overflow-hidden ${cellBg}`}
                    title={`Petak ${tileNum}${ladderTo ? ` (Naik ke ${ladderTo})` : ''}${snakeTo ? ` (Turun ke ${snakeTo})` : ''}`}
                  >
                    <div className="w-full flex items-center justify-between leading-none px-0.5">
                      <span>{tileNum}</span>
                      {ladderTo && <span className="text-[8px]">🪜</span>}
                      {snakeTo && <span className="text-[8px]">🐍</span>}
                    </div>

                    {occupants.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-0.5 leading-none my-auto">
                        {occupants.slice(0, 3).map(occ => (
                          <span
                            key={occ.id}
                            className={`text-xs sm:text-sm drop-shadow ${occ.id === currentUserId ? 'ring-1 ring-yellow-300 rounded-full bg-indigo-600/80' : ''}`}
                            title={`${occ.name} (Petak ${occ.position})`}
                          >
                            {occ.avatar}
                          </span>
                        ))}
                        {occupants.length > 3 && (
                          <span className="text-[8px] font-black text-amber-300">+{occupants.length - 3}</span>
                        )}
                      </div>
                    )}

                    {ladderTo && occupants.length === 0 && (
                      <span className="text-[7px] sm:text-[8px] text-emerald-400 leading-none">↑{ladderTo}</span>
                    )}
                    {snakeTo && occupants.length === 0 && (
                      <span className="text-[7px] sm:text-[8px] text-rose-400 leading-none">↓{snakeTo}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[10px] text-slate-400">
              <span>🪜 Tangga Naik</span>
              <span>🐍 Ular Turun</span>
              <span>👑 Petak 100 Puncak</span>
            </div>
          </div>

          {/* Klasemen & Log Real-Time */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="text-xs font-extrabold text-amber-300 flex items-center justify-between">
                <span>🏆 Klasemen Siswa Real-Time</span>
                <span className="text-[11px] text-slate-400">{sortedStudents.length} Aktif</span>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {sortedStudents.length === 0 ? (
                  <div className="text-[11px] text-slate-500 italic py-3 text-center">
                    Belum ada siswa bergabung. Bagikan kode <strong className="text-amber-300">{room.code}</strong>!
                  </div>
                ) : (
                  sortedStudents.map((p, idx) => (
                    <div
                      key={p.id}
                      className={`px-2.5 py-2 rounded-xl border flex items-center justify-between text-xs ${p.id === currentUserId ? 'bg-indigo-500/20 border-indigo-400/60' : 'bg-slate-900/90 border-slate-800'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-extrabold text-slate-400 w-4">{idx + 1}.</span>
                        <span className="text-base">{p.avatar}</span>
                        <span className="font-bold text-white truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-extrabold text-[11px]">
                          Petak {p.position || 1}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-300">{p.score || 0}p</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 flex-1">
              <div className="text-xs font-extrabold text-sky-300">📡 Log Langkah Terkini</div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[11px]">
                {(!room.activityLog || room.activityLog.length === 0) ? (
                  <div className="text-slate-500 italic">Menunggu aktivitas siswa...</div>
                ) : (
                  room.activityLog.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-1">
                      <span className="text-slate-200">{item.text}</span>
                      <span className="text-slate-500 shrink-0">{item.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
