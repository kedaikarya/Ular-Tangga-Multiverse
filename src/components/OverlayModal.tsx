import React, { useState, useEffect } from 'react';
import { PlayerProfile } from '../types';
import { AVATAR_OPTIONS, AVATAR_NAMES } from '../constants';

interface OverlayModalProps {
  isOpen: boolean;
  kind: 'leaderboard' | 'analytics' | 'profile' | null;
  onClose: () => void;
  userProfile: PlayerProfile;
  onUpdateProfile: (prof: PlayerProfile) => void;
  globalLeaderboard: any[];
}

export default function OverlayModal({
  isOpen,
  kind,
  onClose,
  userProfile,
  onUpdateProfile,
  globalLeaderboard
}: OverlayModalProps) {
  const [profileNameInput, setProfileNameInput] = useState(userProfile.name);

  useEffect(() => {
    if (isOpen) {
      setProfileNameInput(userProfile.name);
    }
  }, [isOpen, userProfile.name]);

  if (!isOpen || !kind) return null;

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNameInput.trim()) return;
    onUpdateProfile({ ...userProfile, name: profileNameInput.trim() });
    onClose();
  };

  const accuracy = userProfile.totalAnswered > 0 ? Math.round((userProfile.totalCorrect / userProfile.totalAnswered) * 100) : 0;
  const subjEntries = Object.entries(userProfile.subjectStats || {});

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl glass-panel-strong rounded-3xl border border-slate-700 shadow-2xl overflow-hidden my-auto">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold text-white">
            {kind === 'leaderboard' ? '🏆 Papan Peringkat Global' : kind === 'analytics' ? '📊 Analitik Belajar Siswa' : '🦊 Profil & Karakter Bidak'}
          </h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">✕</button>
        </div>

        <div className="p-5 max-h-[75dvh] overflow-y-auto">
          {kind === 'leaderboard' && (
            <div className="space-y-2">
              {globalLeaderboard.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">Belum ada catatan skor. Ayo mulai bermain!</div>
              ) : (
                globalLeaderboard.map((g, i) => (
                  <div key={g.id || i} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-extrabold text-white">#{i + 1} {g.avatar || '🦊'} {g.name}</span>
                    <span className="font-extrabold text-amber-300">{g.score || 0} Poin • {g.wins || 0} Menang</span>
                  </div>
                ))
              )}
            </div>
          )}

          {kind === 'analytics' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-slate-400">Total Soal</div>
                  <div className="font-display text-lg font-extrabold text-white mt-1">{userProfile.totalAnswered || 0}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-slate-400">Akurasi</div>
                  <div className="font-display text-lg font-extrabold text-emerald-300 mt-1">{accuracy}%</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-slate-400">Total Poin</div>
                  <div className="font-display text-lg font-extrabold text-amber-300 mt-1">{userProfile.totalScore || 0}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-extrabold text-slate-300">Performa per Mata Pelajaran</div>
                {subjEntries.length === 0 ? (
                  <div className="text-slate-400 italic">Belum ada riwayat jawaban per mata pelajaran.</div>
                ) : (
                  subjEntries.map(([sName, st]: [string, any]) => {
                    const pct = st.answered > 0 ? Math.round((st.correct / st.answered) * 100) : 0;
                    return (
                      <div key={sName} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                        <div className="flex justify-between font-bold">
                          <span className="text-white">{sName}</span>
                          <span className="text-indigo-300">{st.correct}/{st.answered} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {kind === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Nama Tampilan</label>
                <input
                  type="text"
                  maxLength={24}
                  required
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1.5">Pilih Karakter Bidak 3D</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map(av => (
                    <button
                      key={av}
                      type="button"
                      title={AVATAR_NAMES[av]}
                      onClick={() => onUpdateProfile({ ...userProfile, avatar: av })}
                      className={`p-2.5 rounded-2xl border text-xl flex items-center justify-center transition ${userProfile.avatar === av ? 'bg-indigo-500/30 border-indigo-400 scale-105' : 'bg-slate-900 border-slate-800'}`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold">💾 Simpan Profil</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
