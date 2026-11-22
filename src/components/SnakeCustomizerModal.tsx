import React from 'react';
import { SNAKE_COLOR_PRESETS, SNAKE_PATTERN_PRESETS } from '../constants';

interface SnakeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  snakeStyleConfig: {
    colorPreset: string;
    customHex: string;
    patternPreset: string;
  };
  onChangeSnakeStyle: (config: { colorPreset: string; customHex: string; patternPreset: string }) => void;
}

export default function SnakeCustomizerModal({
  isOpen,
  onClose,
  snakeStyleConfig,
  onChangeSnakeStyle
}: SnakeCustomizerModalProps) {
  if (!isOpen) return null;

  const currentPreset = SNAKE_COLOR_PRESETS[snakeStyleConfig.colorPreset] || { name: 'Kustom' };
  const currentPattern = SNAKE_PATTERN_PRESETS[snakeStyleConfig.patternPreset] || { name: 'Sisik Berlian' };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg glass-panel-strong rounded-3xl border border-pink-400/40 shadow-2xl overflow-hidden my-auto">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🐍</span>
            <div>
              <h3 className="font-display text-base font-extrabold text-white">Warna & Motif Sisik Ular 3D</h3>
              <p className="text-[11px] text-slate-400">Perubahan langsung tampil di papan 3D & tersinkronisasi ke seluruh siswa.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">✕</button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">1. Pilih Warna Utama Ular</label>
              <span className="text-[11px] font-extrabold text-amber-300">{currentPreset.name}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(SNAKE_COLOR_PRESETS).map(([key, item]) => {
                const isSelected = snakeStyleConfig.colorPreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChangeSnakeStyle({ ...snakeStyleConfig, colorPreset: key })}
                    className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition ${isSelected ? 'bg-pink-500/20 border-pink-400 text-white shadow-md' : 'bg-slate-950/85 border-slate-800 hover:border-slate-600 text-slate-300'}`}
                  >
                    <span className="w-5 h-5 rounded-full border border-white/70 shrink-0" style={{ background: item.swatch }}></span>
                    <span className="text-[11px] font-extrabold truncate">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-extrabold text-slate-200">Warna Kustom Bebas</div>
              <div className="text-[11px] text-slate-400">Pilih warna apa saja sesuai selera</div>
            </div>
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 cursor-pointer">
              <input
                type="color"
                value={snakeStyleConfig.customHex || '#ffffff'}
                onChange={(e) => onChangeSnakeStyle({ ...snakeStyleConfig, colorPreset: 'custom', customHex: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-[11px] font-bold text-slate-200">{(snakeStyleConfig.customHex || '#ffffff').toUpperCase()}</span>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">2. Pilih Motif Sisik Ular</label>
              <span className="text-[11px] font-extrabold text-pink-300">{currentPattern.name}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(SNAKE_PATTERN_PRESETS).map(([key, item]) => {
                const isSelected = snakeStyleConfig.patternPreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChangeSnakeStyle({ ...snakeStyleConfig, patternPreset: key })}
                    className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition ${isSelected ? 'bg-indigo-500/25 border-indigo-400 text-white shadow-md' : 'bg-slate-950/85 border-slate-800 hover:border-slate-600 text-slate-300'}`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-[11px] font-extrabold truncate">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold shadow-lg transition">
              ✅ Selesai & Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
