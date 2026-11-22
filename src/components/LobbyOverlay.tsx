import React, { useState, useRef, useEffect } from 'react';
import { PlayerProfile, RoomData } from '../types';
import { AVATAR_OPTIONS, AVATAR_NAMES } from '../constants';

interface LobbyOverlayProps {
  userProfile: PlayerProfile;
  onUpdateProfile: (prof: PlayerProfile) => void;
  openRooms: RoomData[];
  onJoinRoom: (code: string, studentName?: string) => void;
  onOpenTeacherFlow: () => void;
  onOpenGuide: () => void;
  onOpenModal: (kind: 'leaderboard' | 'analytics' | 'profile') => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  musicStyle: string;
  onCycleMusicStyle: () => void;
  onDeleteRoom: (code: string) => void;
  authUser: { uid: string; displayName: string | null; email: string | null; isAnonymous?: boolean } | null;
  authReady: boolean;
  anonAuthDisabled?: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
}

export default function LobbyOverlay({
  userProfile,
  onUpdateProfile,
  openRooms,
  onJoinRoom,
  onOpenTeacherFlow,
  onOpenGuide,
  onOpenModal,
  musicEnabled,
  onToggleMusic,
  musicStyle,
  onCycleMusicStyle,
  onDeleteRoom,
  authUser,
  authReady,
  anonAuthDisabled,
  onGoogleSignIn,
  onGoogleSignOut
}: LobbyOverlayProps) {
  const [studentNameInput, setStudentNameInput] = useState(userProfile.name === 'Siswa Pintar' ? '' : userProfile.name);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [nameRequiredHint, setNameRequiredHint] = useState(false);
  const studentNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile.name && userProfile.name !== 'Siswa Pintar') {
      setStudentNameInput(userProfile.name);
    }
  }, [userProfile.name]);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNameInput.trim()) return;
    if (userProfile.name !== studentNameInput.trim()) {
      onUpdateProfile({ ...userProfile, name: studentNameInput.trim() });
    }
    onJoinRoom(joinCodeInput, studentNameInput.trim());
  };

  const toggleNativeFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    } catch (_) {}
  };

  const accuracy = userProfile.totalAnswered > 0 ? Math.round((userProfile.totalCorrect / userProfile.totalAnswered) * 100) : 0;
  const musicTrackName = musicStyle === 'chill' ? '🎹 Fokus' : musicStyle === 'race' ? '🚀 Lomba' : '🎶 Ceria';

  return (
    <div id="lobby-overlay" className="fixed inset-0 z-30 flex flex-col justify-between p-3 sm:p-5 overflow-y-auto bg-gradient-to-b from-slate-950/65 via-slate-950/45 to-slate-950/85">
      {/* Header Lobi */}
      <header className="w-full max-w-6xl mx-auto glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-amber-500 flex items-center justify-center text-2xl shadow-lg">
            🎲
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-base sm:text-lg font-extrabold tracking-tight text-white">
                Ular Tangga Multiverse
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                FASE A – D • ∞ SOAL
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300">
              Papan Balok Bertingkat 3D • Layar Guru & Siswa Real-Time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onOpenGuide} className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-extrabold transition flex items-center gap-1.5">
            🗺️ <span>Alur</span>
          </button>
          <button onClick={() => onOpenModal('leaderboard')} className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-extrabold transition flex items-center gap-1.5">
            🏆 <span>Peringkat</span>
          </button>
          <button onClick={() => onOpenModal('analytics')} className="px-3 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-extrabold transition flex items-center gap-1.5">
            📊 <span>Analitik</span>
          </button>
          <button onClick={() => onOpenModal('profile')} className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5">
            <span>{userProfile.avatar}</span>
            <span className="max-w-[90px] truncate">{userProfile.name}</span>
          </button>
          <button onClick={onToggleMusic} className={`px-3 py-2 rounded-xl border text-xs font-extrabold transition flex items-center gap-1 ${musicEnabled ? 'bg-pink-500/25 hover:bg-pink-500/35 border-pink-400/50 text-pink-100' : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-400'}`}>
            🎵 <span>{musicEnabled ? 'Musik ON' : 'Musik OFF'}</span>
          </button>
          <button onClick={onCycleMusicStyle} className="px-2.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition">
            {musicTrackName}
          </button>
          <button onClick={toggleNativeFullscreen} className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition" title="Layar Penuh">
            ⛶
          </button>
          {authReady && (
            authUser ? (
              authUser.isAnonymous ? (
                <div className="flex items-center gap-1.5">
                  <span
                    className="px-2.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-extrabold flex items-center gap-1.5"
                    title="Sinkronisasi Cloud Real-Time aktif otomatis tanpa perlu login"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Cloud Aktif</span>
                  </span>
                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    className="px-2.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition hidden sm:flex items-center gap-1"
                    title="Opsional: Masuk dengan Google jika ingin riwayat kelas tersimpan permanen lintas HP"
                  >
                    <span>🔐</span>
                    <span>Google</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onGoogleSignOut}
                  className="px-2.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-extrabold transition flex items-center gap-1.5"
                  title={`Terhubung sebagai ${authUser.email || authUser.displayName || 'Google'}. Klik untuk keluar ke mode tamu.`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="max-w-[90px] truncate">{authUser.displayName?.split(' ')[0] || 'Cloud ON'}</span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-extrabold transition shadow flex items-center gap-1.5"
              >
                <span>🔐</span>
                <span>Login Google</span>
              </button>
            )
          )}
        </div>
      </header>

      {authReady && !authUser && anonAuthDisabled && (
        <div className="w-full max-w-6xl mx-auto mt-3 glass-panel-strong rounded-2xl px-4 py-2.5 border border-amber-400/40 flex flex-wrap items-center justify-between gap-2 shadow-xl">
          <div className="flex items-center gap-2 text-xs text-amber-100">
            <span>⚙️</span>
            <span>
              <strong>Aktifkan Anonymous Auth</strong> di Firebase Console (Authentication → Sign-in method → Anonymous → Enable) agar siswa & guru tersinkron tanpa login, atau gunakan Login Google sementara.
            </span>
          </div>
          <button
            type="button"
            onClick={onGoogleSignIn}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition shrink-0"
          >
            🔐 Login Google
          </button>
        </div>
      )}

      {/* Konten Tengah */}
      <main className="w-full max-w-6xl mx-auto my-auto py-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Portal Guru */}
          <section className="glass-panel-strong rounded-3xl p-5 border border-amber-400/30 shadow-2xl relative overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px] font-extrabold">
                  👩‍🏫 KHUSUS GURU / PENGAJAR
                </div>
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-white">
                  Buat Kelas & Layar Monitor Guru
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  Pilih <strong>Fase A–D (SD–SMP)</strong>, <strong>Mata Pelajaran</strong>, <strong>Materi</strong>, kelola soal dengan <strong>Generator AI</strong>, atur tema papan & warna ular, serta pantau pergerakan siswa secara real-time.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={onOpenTeacherFlow} className="flex-1 min-w-[220px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-orange-500/20 transition transform active:scale-[0.99] flex items-center justify-center gap-2">
                <span>👩‍🏫 Buat Kelas (Layar Guru)</span>
              </button>
            </div>
          </section>

          {/* Portal Siswa */}
          <section className="glass-panel-strong rounded-3xl p-5 border border-indigo-400/30 shadow-2xl">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-[11px] font-extrabold mb-1">
                  🎒 PORTAL PEMAIN / SISWA
                </div>
                <h2 className="font-display text-lg font-extrabold text-white">
                  Gabung ke Kelas Pembelajaran
                </h2>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Kapasitas ∞ Siswa</span>
            </div>

            <form onSubmit={handleJoinSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nama Siswa</label>
                <input
                  ref={studentNameRef}
                  type="text"
                  maxLength={24}
                  required
                  value={studentNameInput}
                  onChange={(e) => {
                    setStudentNameInput(e.target.value);
                    if (nameRequiredHint) setNameRequiredHint(false);
                  }}
                  placeholder="Ketik nama kamu..."
                  className={`w-full px-4 py-3 rounded-2xl bg-slate-950/90 border outline-none text-sm font-bold text-white placeholder:text-slate-500 transition ${nameRequiredHint ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-slate-700 focus:border-indigo-400'}`}
                />
                {nameRequiredHint && (
                  <p className="text-[11px] font-bold text-amber-300 mt-1">Ketik nama kamu terlebih dahulu lalu tekan Masuk.</p>
                )}
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Kode Kelas</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="ABCDEF"
                  className="w-full px-3 py-3 rounded-2xl bg-slate-950/90 border border-slate-700 focus:border-indigo-400 outline-none text-center font-mono text-base font-extrabold uppercase tracking-widest text-amber-300 placeholder:text-slate-600"
                />
              </div>
              <div className="sm:col-span-3 flex items-end">
                <button type="submit" className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 transition active:scale-[0.98]">
                  🚀 Masuk
                </button>
              </div>
              <div className="sm:col-span-12 pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pilih Karakter Bidak 3D</label>
                  <span className="text-[11px] font-extrabold text-indigo-300">{userProfile.avatar} {AVATAR_NAMES[userProfile.avatar]}</span>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                  {AVATAR_OPTIONS.map(av => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => onUpdateProfile({ ...userProfile, avatar: av })}
                      title={AVATAR_NAMES[av]}
                      className={`py-1.5 rounded-xl border text-base sm:text-lg flex items-center justify-center transition ${userProfile.avatar === av ? 'bg-indigo-500/30 border-indigo-400 scale-105 shadow-md' : 'bg-slate-950/80 border-slate-800 hover:border-slate-600'}`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </section>
        </div>

        {/* Kolom Kanan: Daftar Kelas Aktif */}
        <div className="lg:col-span-5 glass-panel-strong rounded-3xl p-5 border border-slate-700/70 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="font-display text-base font-extrabold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Kelas Aktif Real-Time
                </h3>
                <p className="text-[11px] text-slate-400">Klik kelas untuk langsung bergabung, atau hapus riwayat (khusus Guru).</p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-extrabold">{openRooms.length} Kelas</span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {openRooms.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-1.5">
                  <div className="text-2xl">🏫</div>
                  <div className="text-xs font-bold text-slate-300">Belum ada kelas aktif saat ini</div>
                  <div className="text-[11px] text-slate-500">Guru dapat menekan "Buat Kelas (Layar Guru)" untuk memulai sesi baru.</div>
                </div>
              ) : (
                openRooms.map(room => {
                  const studentCount = Object.values(room.players || {}).filter(p => p.role !== 'teacher').length;
                  const phaseMap: Record<string, { label: string; cls: string }> = {
                    waiting: { label: '⏳ Ruang Tunggu', cls: 'bg-amber-500/20 text-amber-200 border-amber-400/40' },
                    playing: { label: '🟢 Berlangsung', cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' },
                    paused: { label: '⏸️ Dijeda', cls: 'bg-amber-500/20 text-amber-200 border-amber-400/40' },
                    stopped: { label: '⏹️ Dihentikan', cls: 'bg-rose-500/20 text-rose-200 border-rose-400/40' },
                    finished: { label: '🏁 Selesai', cls: 'bg-purple-500/20 text-purple-200 border-purple-400/40' }
                  };
                  const st = phaseMap[room.phase] || phaseMap.waiting;

                  return (
                    <div key={room.code} className="p-3.5 rounded-2xl bg-slate-950/85 border border-slate-800 hover:border-indigo-400/50 transition flex items-center justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="px-2.5 py-0.5 rounded-lg bg-yellow-400 text-slate-950 font-mono text-xs font-black tracking-widest">{room.code}</span>
                          <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-extrabold ${st.cls}`}>{st.label}</span>
                        </div>
                        <div className="text-xs font-extrabold text-white truncate">{room.name || 'Kelas Edukasi'}</div>
                        <div className="text-[11px] text-slate-400 truncate">{room.grade} • {room.subject} • {studentCount} Siswa</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setJoinCodeInput(room.code);
                            const cleanName = studentNameInput.trim();
                            if (cleanName) {
                              onJoinRoom(room.code, cleanName);
                            } else {
                              setNameRequiredHint(true);
                              studentNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              studentNameRef.current?.focus();
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition"
                        >
                          Gabung
                        </button>
                        <button onClick={() => onDeleteRoom(room.code)} className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-400/30 text-rose-300 text-xs font-bold transition" title="Hapus Riwayat Kelas">
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Skor: {userProfile.totalScore} • Akurasi: {accuracy}%</span>
            <span>Putar kamera 3D dengan geser layar</span>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-6xl mx-auto text-center text-[11px] text-slate-400">
        Jawab soal Fase A–D (SD–SMP) tanpa batas (∞) untuk melompati balok bertingkat 3D menuju Petak 100!
      </footer>
    </div>
  );
}
