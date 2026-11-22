import React from 'react';

interface SoundboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerSound: (soundKey: string, soundLabel: string) => void;
}

export default function SoundboardModal({ isOpen, onClose, onTriggerSound }: SoundboardModalProps) {
  if (!isOpen) return null;

  const soundboardItems = [
    { key: 'applause', label: '👏 Tepuk Tangan', desc: 'Merayakan jawaban benar siswa' },
    { key: 'cheer', label: '🎉 Sorak Sorai', desc: 'Fanfare kemenangan' },
    { key: 'tada', label: '🎺 Ta-Da!', desc: 'Kejutan & pencapaian hebat' },
    { key: 'boing', label: '🪃 Boing Lucu', desc: 'Suara melompat seru' },
    { key: 'laser', label: '✨ Bintang Cemerlang', desc: 'Kilatan semangat belajar' },
    { key: 'drumroll', label: '🥁 Drumroll', desc: 'Ketegangan sebelum pengumuman' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-panel-strong rounded-3xl border border-pink-400/40 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎹</span>
            <div>
              <h3 className="font-display text-base font-extrabold text-white">Soundboard Guru</h3>
              <p className="text-[11px] text-slate-400">Picu suara penyemangat secara real-time ke seluruh siswa di kelas.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">✕</button>
        </div>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {soundboardItems.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onTriggerSound(item.key, item.label);
              }}
              className="p-4 rounded-2xl bg-slate-900/90 hover:bg-pink-500/20 border border-slate-700 hover:border-pink-400 text-left transition transform active:scale-95 space-y-1.5 shadow-lg group"
            >
              <div className="text-xl group-hover:scale-110 transition-transform">{item.label.split(' ')[0]}</div>
              <div className="font-display text-xs sm:text-sm font-extrabold text-white">{item.label.split(' ').slice(1).join(' ')}</div>
              <p className="text-[10px] text-slate-400 leading-snug">{item.desc}</p>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-extrabold">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
