import React from 'react';

interface FlowGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  storedPin: string;
}

export default function FlowGuideModal({ isOpen, onClose, storedPin }: FlowGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl glass-panel-strong rounded-3xl border border-sky-400/40 shadow-2xl overflow-hidden my-auto">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold text-white">🗺️ Alur Penggunaan Layar Guru & Pemain</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">✕</button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 space-y-2">
            <div className="font-display text-sm font-extrabold text-amber-300">👩‍🏫 Alur 5 Tahap Guru</div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-200 leading-relaxed">
              <li>Klik <strong>Buat Kelas (Layar Guru)</strong> lalu masukkan PIN (default: <code className="text-amber-300">{storedPin}</code>).</li>
              <li>Tentukan <strong>Fase (A–D), Mata Pelajaran, Materi</strong> & tema 3D.</li>
              <li>Bagikan <strong>Kode Kelas 6 Huruf</strong> dari Ruang Tunggu ke siswa.</li>
              <li>Tekan <strong>▶️ Mulai Kelas</strong>, serta atur <strong>⏸️ Jeda</strong> atau <strong>⏹️ Hentikan</strong> kapan saja.</li>
              <li>Gunakan <strong>🎮 Demo Permainan</strong>, ubah nuansa papan/ular, edit soal AI, atau akhiri ke <strong>🏁 Podium</strong>.</li>
            </ol>
          </div>
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 space-y-2">
            <div className="font-display text-sm font-extrabold text-indigo-300">🎒 Alur 5 Tahap Pemain / Siswa</div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-200 leading-relaxed">
              <li>Isi <strong>Nama Siswa</strong>, pilih karakter, dan masukkan <strong>Kode Kelas</strong> di lobi.</li>
              <li>Menunggu aba-aba mulai dari Guru di Ruang Tunggu.</li>
              <li>Tekan <strong>🧠 Jawab Soal Maju (∞)</strong> setiap giliran melangkah.</li>
              <li>3 jawaban benar beruntun mengaktifkan <strong>🛡️ Perisai Ilmu</strong>.</li>
              <li>Pantau <strong>🏆 Peringkat</strong>, <strong>👥 Pemain</strong>, & interaksi lewat <strong>💬 Chat</strong>.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
