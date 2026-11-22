import React, { useState } from 'react';

interface TeacherPinModalProps {
  isOpen: boolean;
  mode: 'verify' | 'change' | 'delete_room';
  storedPin: string;
  onClose: () => void;
  onSuccessVerify: () => void;
  onChangePinSuccess: (newPin: string) => void;
  onDeleteRoomSuccess: () => void;
}

export default function TeacherPinModal({
  isOpen,
  mode,
  storedPin,
  onClose,
  onSuccessVerify,
  onChangePinSuccess,
  onDeleteRoomSuccess
}: TeacherPinModalProps) {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'change') {
      if (oldPin !== storedPin) {
        setErrorMsg('PIN Guru lama tidak sesuai.');
        return;
      }
      if (newPin.length < 4) {
        setErrorMsg('PIN baru minimal 4 karakter.');
        return;
      }
      if (newPin !== confirmPin) {
        setErrorMsg('Konfirmasi PIN baru tidak cocok.');
        return;
      }
      onChangePinSuccess(newPin);
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      return;
    }

    if (newPin !== storedPin) {
      setErrorMsg('PIN Guru salah. Silakan periksa kembali.');
      return;
    }

    setNewPin('');
    if (mode === 'delete_room') {
      onDeleteRoomSuccess();
    } else {
      onSuccessVerify();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel-strong rounded-3xl border border-amber-400/40 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🔐</span>
            <h3 className="font-display text-base font-extrabold text-white">
              {mode === 'change' ? 'Ubah PIN Rahasia Guru' : mode === 'delete_room' ? 'Konfirmasi PIN Guru — Hapus Kelas' : 'Verifikasi PIN Layar Guru'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            {mode === 'change'
              ? 'Masukkan PIN Lama lalu tentukan PIN Baru (4–20 karakter).'
              : mode === 'delete_room'
              ? 'Masukkan PIN Rahasia Guru untuk menghapus riwayat kelas ini.'
              : 'Masukkan PIN Rahasia Guru untuk membuka Layar Guru & mengelola kelas.'}
          </p>

          {mode === 'change' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">PIN Guru Lama</label>
              <input
                type="password"
                maxLength={20}
                required
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                placeholder="•••••••••••"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 focus:border-amber-400 outline-none text-center font-mono text-base font-extrabold tracking-[0.18em] text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {mode === 'change' ? 'PIN Guru Baru' : 'PIN Rahasia Guru'}
            </label>
            <input
              type="password"
              minLength={4}
              maxLength={20}
              required
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="•••••••••••"
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 focus:border-amber-400 outline-none text-center font-mono text-base font-extrabold tracking-[0.18em] text-white"
            />
          </div>

          {mode === 'change' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Konfirmasi PIN Baru</label>
              <input
                type="password"
                maxLength={20}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="•••••••••••"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 focus:border-amber-400 outline-none text-center font-mono text-base font-extrabold tracking-[0.18em] text-white"
              />
            </div>
          )}

          {errorMsg && (
            <div className="text-xs font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-3 py-2 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-extrabold">Batal</button>
            <button type="submit" className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-extrabold shadow-lg">
              {mode === 'change' ? '💾 Simpan PIN Baru' : mode === 'delete_room' ? '🗑️ Hapus Kelas' : '🔓 Verifikasi PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
