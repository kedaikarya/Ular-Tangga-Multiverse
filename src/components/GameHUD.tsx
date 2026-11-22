import React, { useState, useEffect } from 'react';
import { RoomData, PlayerProfile, PlayerPawn } from '../types';
import { SNAKE_COLOR_PRESETS } from '../constants';

interface GameHUDProps {
  room: RoomData | null;
  currentUserRole: 'teacher' | 'student';
  userProfile: PlayerProfile;
  hasStreakShield: boolean;
  isAnimatingMove: boolean;
  onLeaveRoom: () => void;
  onCopyCode: () => void;
  onResetCamera: (preset: 'isometric' | 'top' | 'follow') => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  musicStyle: string;
  onCycleMusicStyle: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onStartClass: () => void;
  onPauseClass: () => void;
  onStopClass: () => void;
  onRestartClass: () => void;
  onOpenTeacherDemo: () => void;
  onOpenAiStudio: () => void;
  onOpenSoundboard: () => void;
  onOpenLiveBoard2D: () => void;
  onOpenHudDrawer: (tab: any) => void;
  onCycleThemeMode: () => void;
  onOpenSnakeCustomizer: () => void;
  onOpenBoardTheme: () => void;
  onCycleElevation: () => void;
  onOpenChangePin: () => void;
  onEndClassPodium: () => void;
  onOpenQuizModal: () => void;
}

function sortStudentsByRank(list: PlayerPawn[]): PlayerPawn[] {
  return [...list].sort((a, b) => {
    const aFin = (a.finishOrder && a.finishOrder > 0) ? a.finishOrder : Number.MAX_SAFE_INTEGER;
    const bFin = (b.finishOrder && b.finishOrder > 0) ? b.finishOrder : Number.MAX_SAFE_INTEGER;
    if (aFin !== bFin) return aFin - bFin;
    if ((b.position || 1) !== (a.position || 1)) return (b.position || 1) - (a.position || 1);
    return (b.score || 0) - (a.score || 0);
  });
}

export default function GameHUD({
  room,
  currentUserRole,
  userProfile,
  hasStreakShield,
  isAnimatingMove,
  onLeaveRoom,
  onCopyCode,
  onResetCamera,
  musicEnabled,
  onToggleMusic,
  musicStyle,
  onCycleMusicStyle,
  soundEnabled,
  onToggleSound,
  onStartClass,
  onPauseClass,
  onStopClass,
  onRestartClass,
  onOpenTeacherDemo,
  onOpenAiStudio,
  onOpenSoundboard,
  onOpenLiveBoard2D,
  onOpenHudDrawer,
  onCycleThemeMode,
  onOpenSnakeCustomizer,
  onOpenBoardTheme,
  onCycleElevation,
  onOpenChangePin,
  onEndClassPodium,
  onOpenQuizModal
}: GameHUDProps) {
  const [hudMinimized, setHudMinimized] = useState(false);
  const [showMobileTeacherTools, setShowMobileTeacherTools] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  useEffect(() => {
    if (!confirmRestart) return;
    const timer = setTimeout(() => setConfirmRestart(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmRestart]);

  useEffect(() => {
    setConfirmRestart(false);
  }, [room?.code, room?.phase]);

  if (!room) return null;

  const isTeacher = currentUserRole === 'teacher';
  const me = room.players?.[userProfile.id] || { position: 1, score: 0, correctCount: 0, finishOrder: 0 };
  const isPlayerFinished = (me.position || 1) >= 100;

  const students = sortStudentsByRank(
    Object.values(room.players || {}).filter(p => p.role !== 'teacher')
  );
  const finishedCount = students.filter(p => (p.position || 1) >= 100).length;

  const leader = students[0];
  const latestLog = room.activityLog?.[0];

  const phaseLabels: Record<string, string> = {
    waiting: '⏳ Tunggu',
    playing: '🟢 Aktif',
    paused: '⏸️ Jeda',
    stopped: '⏹️ Stop',
    finished: '🏁 Selesai'
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

  const handleRestartClick = () => {
    if (!confirmRestart) {
      setConfirmRestart(true);
      return;
    }
    setConfirmRestart(false);
    setShowMobileTeacherTools(false);
    onRestartClass();
  };

  const musicTrackLabel = musicStyle === 'chill' ? '🎹 Fokus' : musicStyle === 'race' ? '🚀 Lomba' : '🎶 Ceria';
  const snakeSwatch =
    room.snakeStyle?.colorPreset === 'custom'
      ? room.snakeStyle?.customHex || '#22c55e'
      : SNAKE_COLOR_PRESETS[room.snakeStyle?.colorPreset || 'green']?.swatch || '#16a34a';
  const themeLabel = room.themeMode === 'modern' ? '🛝 Perosotan & Lift' : '🐍 Ular & Tangga';
  const elevationLabel =
    room.elevationStyle === 'terraced'
      ? '🏔️ Terasering'
      : room.elevationStyle === 'pyramid'
      ? '🔺 Piramida'
      : '🧱 Baris Variatif';

  const studentButtonLabel =
    room.phase === 'waiting'
      ? '⏳ Tunggu Guru...'
      : room.phase === 'paused'
      ? '⏸️ Dijeda Guru'
      : room.phase === 'stopped'
      ? '⏹️ Dihentikan Guru'
      : room.phase === 'finished'
      ? '🏁 Sesi Selesai'
      : isPlayerFinished
      ? `🏆 Finish di Petak 100${me.finishOrder ? ` (#${me.finishOrder})` : '!'}`
      : isAnimatingMove
      ? '🏃 Melangkah...'
      : '🧠 Jawab Soal (∞)';

  const studentHintLabel =
    room.phase === 'waiting'
      ? 'Guru sedang menyiapkan kelas. Bersiaplah!'
      : room.phase === 'paused'
      ? 'Tunggu Guru menekan tombol Lanjutkan.'
      : room.phase === 'stopped'
      ? 'Permainan sedang dihentikan sementara oleh Guru.'
      : room.phase === 'finished'
      ? 'Sesi kelas selesai. Tunggu Guru menekan Mulai Ulang jika bermain lagi.'
      : isPlayerFinished
      ? 'Hebat! Kamu sudah sampai Petak 100. Pemain lain masih melanjutkan permainan.'
      : 'Jawab soal benar untuk melangkah maju di papan 3D!';

  return (
    <div id="game-hud" className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2 sm:p-4">
      {/* =================================================================
          1. BILAH ATAS + TIKER MONITOR RINGKAS UNTUK SMARTPHONE
         ================================================================= */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          {/* Kiri: Keluar + Kode + Role + Fase */}
          <div className="glass-panel rounded-2xl px-2 sm:px-3 py-1.5 flex items-center gap-1.5 sm:gap-2 shadow-xl">
            <button
              type="button"
              onClick={onLeaveRoom}
              className="px-2 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-[11px] sm:text-xs font-extrabold transition"
              title="Keluar Kelas"
            >
              ←<span className="hidden sm:inline"> Keluar</span>
            </button>
            <button
              type="button"
              onClick={onCopyCode}
              className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 border border-yellow-200 text-slate-950 font-mono shadow-md transition active:scale-95 flex items-center gap-1.5"
              title="Klik untuk Salin Kode Kelas"
            >
              <span className="hidden sm:inline text-[11px] font-black uppercase tracking-wider text-slate-900">KODE:</span>
              <span className="text-sm sm:text-xl font-black tracking-[0.16em] text-slate-950 select-all">{room.code}</span>
              <span className="text-xs sm:text-sm">📋</span>
            </button>
            <span className={`px-2 py-1 rounded-xl text-[10px] sm:text-[11px] font-extrabold border ${isTeacher ? 'bg-amber-500/20 border-amber-400/40 text-amber-200' : 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200'}`}>
              {isTeacher ? '👩‍🏫' : '🎒'}<span className="hidden md:inline"> {isTeacher ? 'Layar Guru' : 'Layar Pemain'}</span>
            </span>
            <span className="px-2 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] sm:text-[11px] font-extrabold tabular-nums">
              {phaseLabels[room.phase] || '⏳ Tunggu'}
            </span>
          </div>

          {/* Tengah (Desktop): Info Mapel & Materi */}
          <div className="hidden xl:flex glass-panel rounded-2xl px-3.5 py-2 items-center gap-2 shadow-xl">
            <span className="text-sm">📚</span>
            <span className="text-xs font-extrabold text-white truncate max-w-xs">
              {room.grade} • {room.subject} • {room.topic}
            </span>
            {!isTeacher && hasStreakShield && (
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 text-[11px] font-extrabold">
                🛡️ Perisai
              </span>
            )}
            {finishedCount > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 text-[11px] font-extrabold">
                🏆 {finishedCount} Finish
              </span>
            )}
          </div>

          {/* Kanan: Kamera, Papan 2D, Audio, Zen */}
          <div className="glass-panel rounded-2xl px-1.5 sm:px-2.5 py-1 flex items-center gap-1 shadow-xl">
            <button
              type="button"
              onClick={onOpenLiveBoard2D}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-400/50 text-indigo-100 text-[11px] font-extrabold transition flex items-center gap-1"
              title="Lihat Papan Live 2D & Pantauan Siswa"
            >
              <span>🗺️</span>
              <span className="hidden sm:inline">Live 2D</span>
            </button>
            <button type="button" onClick={() => onResetCamera('follow')} className="px-2 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition" title="Kamera Fokus Bidak">
              🎯<span className="hidden md:inline"> Fokus</span>
            </button>
            <button type="button" onClick={() => onResetCamera('isometric')} className="px-2 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition" title="Sudut 3D Penuh">
              📐<span className="hidden md:inline"> 3D</span>
            </button>
            <button type="button" onClick={() => onResetCamera('top')} className="hidden sm:inline-flex px-2 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition" title="Tampak Atas">
              ⬆️<span className="hidden md:inline"> Atas</span>
            </button>
            <button type="button" onClick={onToggleMusic} className={`p-1.5 rounded-xl border text-[11px] font-extrabold transition ${musicEnabled ? 'bg-pink-500/25 border-pink-400/50 text-pink-100' : 'bg-slate-800/90 border-slate-700 text-slate-400'}`} title="Musik Latar">
              {musicEnabled ? '🎵' : '🔇'}
            </button>
            <button type="button" onClick={onCycleMusicStyle} className="hidden lg:inline-flex px-2 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition">
              {musicTrackLabel}
            </button>
            <button type="button" onClick={onToggleSound} className="p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold transition" title="Efek Suara">
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <button type="button" onClick={toggleNativeFullscreen} className="hidden sm:inline-flex p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold transition" title="Layar Penuh">
              ⛶
            </button>
            <button
              type="button"
              onClick={() => setHudMinimized(m => !m)}
              className={`px-2 py-1.5 rounded-xl border text-[11px] font-extrabold transition ${hudMinimized ? 'bg-amber-500 text-slate-950 border-amber-300' : 'bg-slate-800/90 border-slate-700 text-slate-200'}`}
              title={hudMinimized ? 'Tampilkan Kontrol' : 'Sembunyikan UI agar Papan 3D Penuh'}
            >
              {hudMinimized ? '👁️ UI' : '👁️'}
            </button>
          </div>
        </div>

        {/* Tiker Monitor Real-Time KHUSUS LAYAR KECIL / SMARTPHONE (< lg) — Tidak menutupi papan 3D! */}
        {!hudMinimized && (
          <div className="lg:hidden flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl glass-panel border border-amber-400/30 shadow-lg text-[11px]">
            <button
              type="button"
              onClick={onOpenLiveBoard2D}
              className="flex-1 min-w-0 flex items-center gap-2 text-left"
            >
              <span className="shrink-0 font-extrabold text-amber-300">📡 {students.length} Siswa</span>
              <span className="text-slate-400">•</span>
              <span className="truncate text-slate-200 font-semibold">
                {leader
                  ? `${leader.position >= 100 ? '🏆 ' : '#1 '}${leader.avatar} ${leader.name} (Petak ${leader.position})`
                  : latestLog
                  ? latestLog.text
                  : `${room.grade} • ${room.subject}`}
              </span>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              {!isTeacher && hasStreakShield && (
                <span className="px-1.5 py-0.5 rounded-lg bg-cyan-500/25 text-cyan-200 text-[10px] font-extrabold">🛡️</span>
              )}
              <button
                type="button"
                onClick={onOpenLiveBoard2D}
                className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-extrabold"
              >
                Pantau 2D
              </button>
              <button
                type="button"
                onClick={() => onOpenHudDrawer(isTeacher ? 'players' : 'rank')}
                className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-extrabold"
              >
                List
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================
          2. MONITOR REAL-TIME GURU KHUSUS DESKTOP (lg:) — Kiri Tengah
         ================================================================= */}
      {isTeacher && !hudMinimized && (
        <aside className="hidden lg:flex pointer-events-auto w-72 max-h-[54dvh] glass-panel-strong rounded-3xl p-3.5 border border-amber-400/30 shadow-2xl flex-col gap-2.5 my-auto">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                📡 Monitor Real-Time
              </h3>
              <p className="text-[11px] text-slate-300">
                {students.length} peserta{finishedCount > 0 ? ` • 🏆 ${finishedCount} finish` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={onOpenLiveBoard2D} className="px-2 py-1 rounded-xl bg-indigo-500/25 hover:bg-indigo-500/35 border border-indigo-400/40 text-indigo-200 text-[11px] font-extrabold transition" title="Buka Papan 2D">
                🗺️ 2D
              </button>
              <button type="button" onClick={() => onOpenHudDrawer('teacher')} className="px-2 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[11px] font-extrabold transition" title="Pengaturan Kelas">
                ⚙️
              </button>
            </div>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-36 pr-1">
            {students.length === 0 ? (
              <div className="text-[11px] text-slate-400 italic py-2">Menunggu siswa bergabung dengan kode <strong className="text-amber-300">{room.code}</strong>...</div>
            ) : (
              students.map((p, i) => (
                <div key={p.id} className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-[11px] ${p.position >= 100 ? 'bg-emerald-500/15 border-emerald-400/40' : 'bg-slate-900/90 border-slate-800'}`}>
                  <span className="font-bold text-white truncate">
                    {p.position >= 100 ? `🏆${p.finishOrder ? `#${p.finishOrder}` : ''} ` : `${i + 1}. `}{p.avatar} {p.name}
                  </span>
                  <span className="font-extrabold text-amber-300 shrink-0 tabular-nums">Petak {p.position} • {p.score || 0}p</span>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-800">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Log Langkah Siswa</div>
            <div className="space-y-1 max-h-24 overflow-y-auto text-[11px] text-slate-300 pr-1">
              {(!room.activityLog || room.activityLog.length === 0) ? (
                <div className="text-slate-500 italic">Menunggu aktivitas siswa...</div>
              ) : (
                room.activityLog.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2 text-[11px]">
                    <span className="text-slate-200">{item.text}</span>
                    <span className="text-slate-500 shrink-0">{item.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      )}

      {/* =================================================================
          3. BILAH BAWAH HUD (KOMPAK DI SMARTPHONE, LENGKAP DI DESKTOP)
         ================================================================= */}
      {!hudMinimized ? (
        <div className="w-full max-w-6xl mx-auto pointer-events-auto flex flex-col gap-1.5">
          {/* Laci Ekstra Menu Guru di Smartphone */}
          {isTeacher && showMobileTeacherTools && (
            <div className="lg:hidden glass-panel-strong rounded-2xl p-2.5 border border-amber-400/35 shadow-2xl grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-[11px]">
              <button type="button" onClick={handleRestartClick} className={`p-2 rounded-xl border font-extrabold ${confirmRestart ? 'bg-amber-400 text-slate-950 border-amber-200 animate-pulse' : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'}`}>
                {confirmRestart ? '❓ Yakin Reset?' : '🔄 Mulai Ulang'}
              </button>
              <button type="button" onClick={() => { setShowMobileTeacherTools(false); onOpenTeacherDemo(); }} className="p-2 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-200 font-extrabold">🎮 Demo</button>
              <button type="button" onClick={() => { setShowMobileTeacherTools(false); onOpenAiStudio(); }} className="p-2 rounded-xl bg-indigo-600 text-white font-extrabold">✨ Soal AI</button>
              <button type="button" onClick={() => { setShowMobileTeacherTools(false); onOpenHudDrawer('teacher'); }} className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-extrabold">📚 Mapel</button>
              <button type="button" onClick={() => { setShowMobileTeacherTools(false); onCycleThemeMode(); }} className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 font-extrabold">{room.themeMode === 'modern' ? '🛝 Lift' : '🐍 Tema'}</button>
              <button type="button" onClick={() => { setShowMobileTeacherTools(false); onOpenSnakeCustomizer(); }} className="p-2 rounded-xl bg-pink-500/20 border border-pink-400/40 text-pink-200 font-extrabold">🎨 Ular</button>
              <button type="button" onClick={() => { setShowMobileTeacherTools(false); onOpenBoardTheme(); }} className="p-2 rounded-xl bg-amber-600/25 border border-amber-400/45 text-amber-100 font-extrabold">🪵 Papan</button>
              <button type="button" onClick={() => { setShowMobileTeacherTools(false); onCycleElevation(); }} className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 font-extrabold">🧱 Elevasi</button>
              <button type="button" onClick={() => { setShowMobileTeacherTools(false); onOpenChangePin(); }} className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-extrabold">🔑 PIN</button>
              <button type="button" onClick={() => { setShowMobileTeacherTools(false); onOpenHudDrawer('chat'); }} className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-extrabold">💬 Chat</button>
              <button type="button" onClick={() => { setShowMobileTeacherTools(false); onEndClassPodium(); }} className="p-2 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 font-extrabold">🏁 Podium</button>
            </div>
          )}

          {isTeacher ? (
            <div className="glass-panel-strong rounded-2xl sm:rounded-3xl p-2 sm:p-3 border border-amber-400/35 shadow-2xl">
              {/* Tampilan Smartphone (< lg): 1 Baris Kompak & Scrollable */}
              <div className="flex lg:hidden items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
                {room.phase === 'waiting' ? (
                  <button type="button" onClick={onStartClass} className="shrink-0 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-extrabold shadow">
                    ▶️ Mulai
                  </button>
                ) : room.phase === 'finished' ? (
                  <button type="button" onClick={handleRestartClick} className={`shrink-0 px-3 py-2 rounded-xl text-xs font-extrabold shadow ${confirmRestart ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950'}`}>
                    {confirmRestart ? '❓ Yakin?' : '🔄 Mulai Ulang'}
                  </button>
                ) : (
                  <button type="button" onClick={onPauseClass} className="shrink-0 px-3 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-extrabold shadow">
                    {room.phase === 'playing' ? '⏸️ Jeda' : '▶️ Lanjut'}
                  </button>
                )}
                {room.phase !== 'waiting' && room.phase !== 'finished' && (
                  <button
                    type="button"
                    onClick={handleRestartClick}
                    className={`shrink-0 px-2.5 py-2 rounded-xl border text-xs font-extrabold ${confirmRestart ? 'bg-amber-400 text-slate-950 border-amber-200 animate-pulse' : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'}`}
                    title="Mulai Ulang Permainan dari Petak 1"
                  >
                    {confirmRestart ? '❓ Yakin' : '🔄'}
                  </button>
                )}
                {room.phase !== 'finished' && (
                  <button type="button" onClick={onStopClass} className="shrink-0 px-2.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold" title="Hentikan Sementara">
                    ⏹️
                  </button>
                )}
                <button type="button" onClick={onOpenLiveBoard2D} className="shrink-0 px-2.5 py-2 rounded-xl bg-indigo-500/25 border border-indigo-400/45 text-indigo-100 text-xs font-extrabold">
                  🗺️ 2D
                </button>
                <button type="button" onClick={onOpenSoundboard} className="shrink-0 px-2.5 py-2 rounded-xl bg-pink-500/20 border border-pink-400/40 text-pink-200 text-xs font-extrabold">
                  🎹
                </button>
                <button type="button" onClick={() => onOpenHudDrawer('players')} className="shrink-0 px-2.5 py-2 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-200 text-xs font-extrabold">
                  👥 {students.length}
                </button>
                <button type="button" onClick={() => onOpenHudDrawer('chat')} className="shrink-0 px-2.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-extrabold">
                  💬
                </button>
                <button
                  type="button"
                  onClick={() => setShowMobileTeacherTools(s => !s)}
                  className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-extrabold ${showMobileTeacherTools ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-800 border-slate-700 text-slate-100'}`}
                >
                  ⚙️ Menu
                </button>
              </div>

              {/* Tampilan Desktop (lg:) */}
              <div className="hidden lg:flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {room.phase === 'waiting' ? (
                    <button type="button" onClick={onStartClass} className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-sm font-extrabold shadow-lg transition">
                      ▶️ Mulai Kelas
                    </button>
                  ) : room.phase === 'finished' ? (
                    <button type="button" onClick={handleRestartClick} className={`px-4 py-2.5 rounded-2xl text-sm font-extrabold shadow-lg transition ${confirmRestart ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950'}`}>
                      {confirmRestart ? '❓ Klik Lagi untuk Mulai Ulang' : '🔄 Mulai Ulang'}
                    </button>
                  ) : (
                    <button type="button" onClick={onPauseClass} className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-extrabold shadow-lg transition">
                      {room.phase === 'playing' ? '⏸️ Jeda' : '▶️ Lanjutkan'}
                    </button>
                  )}
                  {room.phase !== 'finished' && (
                    <button type="button" onClick={onStopClass} className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-extrabold shadow-lg transition">
                      ⏹️ Hentikan
                    </button>
                  )}
                  {room.phase !== 'waiting' && room.phase !== 'finished' && (
                    <button
                      type="button"
                      onClick={handleRestartClick}
                      className={`px-3.5 py-2.5 rounded-2xl border text-xs font-extrabold shadow-lg transition ${confirmRestart ? 'bg-amber-400 text-slate-950 border-amber-200 animate-pulse' : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/40 text-emerald-200'}`}
                      title="Kembalikan semua bidak ke Petak 1 dan mulai ronde baru"
                    >
                      {confirmRestart ? '❓ Yakin Mulai Ulang?' : '🔄 Mulai Ulang'}
                    </button>
                  )}
                  <button type="button" onClick={onOpenTeacherDemo} className="px-3.5 py-2.5 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-extrabold shadow-lg transition">
                    🎮 Demo Permainan
                  </button>
                  <button type="button" onClick={onOpenSoundboard} className="px-3.5 py-2.5 rounded-2xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-pink-200 text-xs font-extrabold shadow-lg transition flex items-center gap-1.5">
                    🎹 <span>Soundboard</span>
                  </button>
                  <button type="button" onClick={onOpenAiStudio} className="px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-lg transition">
                    ✨ Soal & AI
                  </button>
                  <button type="button" onClick={() => onOpenHudDrawer('teacher')} className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-extrabold transition">
                    📚 Ubah Mapel & Materi
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={onCycleThemeMode} className="px-3 py-2.5 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 text-xs font-extrabold transition">
                    {themeLabel}
                  </button>
                  <button type="button" onClick={onOpenSnakeCustomizer} className="px-3 py-2.5 rounded-2xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-pink-200 text-xs font-extrabold transition flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border border-white/80 inline-block" style={{ background: snakeSwatch }}></span>
                    <span>🎨 Warna Ular</span>
                  </button>
                  <button type="button" onClick={onOpenBoardTheme} className="px-3 py-2.5 rounded-2xl bg-amber-600/25 hover:bg-amber-600/35 border border-amber-400/45 text-amber-100 text-xs font-extrabold transition flex items-center gap-1.5">
                    <span>🌈</span>
                    <span>Warna Papan</span>
                  </button>
                  <button type="button" onClick={onCycleElevation} className="px-3 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-extrabold transition">
                    {elevationLabel}
                  </button>
                  <button type="button" onClick={onOpenChangePin} className="px-3 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-extrabold transition">
                    🔑 Ubah PIN
                  </button>
                  <button type="button" onClick={() => onOpenHudDrawer('chat')} className="px-3 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-extrabold transition">
                    💬 Chat
                  </button>
                  <button type="button" onClick={onEndClassPodium} className="px-3 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-extrabold transition">
                    🏁 Podium
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Bilah Pemain / Siswa (Super Kompak di Smartphone) */
            <div className="glass-panel-strong rounded-2xl sm:rounded-3xl p-2 sm:p-3 border border-indigo-400/35 shadow-2xl flex items-center justify-between gap-2 sm:gap-3">
              {/* Statistik Pribadi */}
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <div className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">Petak</div>
                  <div className="font-display text-xs sm:text-lg font-extrabold text-amber-300 tabular-nums">{me.position || 1}<span className="hidden sm:inline"> / 100</span></div>
                </div>
                <div className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">Skor</div>
                  <div className="font-display text-xs sm:text-lg font-extrabold text-emerald-300 tabular-nums">{me.score || 0}</div>
                </div>
                <div className="hidden md:block px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Benar</div>
                  <div className="font-display text-lg font-extrabold text-indigo-300 tabular-nums">{me.correctCount || 0}</div>
                </div>
              </div>

              {/* Tombol Utama Jawab Soal */}
              <div className="flex-1 min-w-0 flex flex-col items-center">
                <button
                  type="button"
                  disabled={isAnimatingMove || room.phase !== 'playing' || isPlayerFinished}
                  onClick={onOpenQuizModal}
                  className={`w-full max-w-sm py-2.5 sm:py-3.5 px-3 sm:px-6 rounded-xl sm:rounded-2xl font-display font-extrabold text-xs sm:text-base shadow-xl transition transform active:scale-[0.98] truncate ${
                    isPlayerFinished
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-emerald-500/25 cursor-default'
                      : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-indigo-500/30'
                  }`}
                >
                  {studentButtonLabel}
                </button>
                <span className="hidden sm:inline text-[11px] text-slate-300 mt-1 text-center">
                  {studentHintLabel}
                </span>
              </div>

              {/* Aksi Sekunder */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button type="button" onClick={onOpenLiveBoard2D} className="px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-indigo-500/25 hover:bg-indigo-500/35 border border-indigo-400/40 text-indigo-100 text-xs font-extrabold transition" title="Papan 2D">
                  🗺️<span className="hidden md:inline"> 2D</span>
                </button>
                <button type="button" onClick={() => onOpenHudDrawer('rank')} className="px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-extrabold transition" title="Peringkat">
                  🏆<span className="hidden md:inline"> Peringkat</span>
                </button>
                <button type="button" onClick={() => onOpenHudDrawer('players')} className="hidden sm:inline-flex px-3 py-2.5 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-extrabold transition">
                  👥<span className="hidden md:inline"> Pemain</span>
                </button>
                <button type="button" onClick={() => onOpenHudDrawer('chat')} className="px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-extrabold transition" title="Chat">
                  💬<span className="hidden md:inline"> Chat</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full flex justify-center pointer-events-auto pb-1">
          <button
            type="button"
            onClick={() => setHudMinimized(false)}
            className="px-4 py-2 rounded-full glass-panel-strong border border-amber-400/50 text-amber-200 text-xs font-extrabold shadow-xl"
          >
            ▴ Tampilkan Kontrol & Monitor
          </button>
        </div>
      )}
    </div>
  );
}
