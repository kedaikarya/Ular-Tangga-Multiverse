import React from 'react';
import { BOARD_COLOR_THEMES } from '../constants';

interface BoardThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardColorTheme: string;
  onSelectBoardTheme: (themeKey: any) => void;
}

export default function BoardThemeModal({
  isOpen,
  onClose,
  boardColorTheme,
  onSelectBoardTheme
}: BoardThemeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg glass-panel-strong rounded-3xl border border-amber-400/40 shadow-2xl overflow-hidden my-auto">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🪵</span>
            <div>
              <h3 className="font-display text-base font-extrabold text-white">Warna & Nuansa Papan 3D</h3>
              <p className="text-[11px] text-slate-400">Pilih tampilan papan 3D. Perubahan langsung tersinkronisasi ke layar siswa.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">✕</button>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <div className="grid grid-cols-1 gap-2.5">
            {Object.entries(BOARD_COLOR_THEMES).map(([key, item]) => {
              const isSelected = boardColorTheme === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectBoardTheme(key)}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3.5 transition ${isSelected ? 'bg-amber-500/20 border-amber-400 shadow-lg' : 'bg-slate-950/85 border-slate-800 hover:border-slate-600'}`}
                >
                  <span className="w-11 h-11 rounded-2xl border-2 border-white/70 shrink-0 flex items-center justify-center text-xl shadow-md" style={{ background: item.swatch }}>
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-extrabold text-white">{item.name}</span>
                      {isSelected && <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">AKTIF</span>}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold shadow-lg transition">
              ✅ Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
