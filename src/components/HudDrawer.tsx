import React, { useState } from 'react';
import { RoomData } from '../types';

interface HudDrawerProps {
  isOpen: boolean;
  activeTab: 'players' | 'chat' | 'rank' | 'teacher';
  onClose: () => void;
  onSwitchTab: (tab: any) => void;
  room: RoomData | null;
  currentUserRole: 'teacher' | 'student';
  onSendChatMessage: (text: string) => void;
  onUpdateTeacherSettings: (grade: string, subject: string, topic: string) => void;
  onOpenAiStudio: () => void;
  onOpenSnakeCustomizer: () => void;
  onOpenBoardTheme: () => void;
  onOpenChangePin: () => void;
  globalLeaderboard: any[];
}

export default function HudDrawer({
  isOpen,
  activeTab,
  onClose,
  onSwitchTab,
  room,
  currentUserRole,
  onSendChatMessage,
  onUpdateTeacherSettings,
  onOpenAiStudio,
  onOpenSnakeCustomizer,
  onOpenBoardTheme,
  onOpenChangePin,
  globalLeaderboard
}: HudDrawerProps) {
  const [chatInput, setChatInput] = useState('');
  const [gradeVal, setGradeVal] = useState(room?.grade || 'Fase C');
  const [subjectVal, setSubjectVal] = useState(room?.subject || 'Matematika');
  const [topicVal, setTopicVal] = useState(room?.topic || '');

  if (!isOpen) return null;

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const handleTeacherSettingsSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTeacherSettings(gradeVal, subjectVal, topicVal);
  };

  const players = room ? Object.values(room.players || {}).filter(p => p.role !== 'teacher') : [];
  const sortedClassRank = [...players].sort((a, b) => (b.position - a.position) || (b.score - a.score));

  return (
    <div id="hud-drawer" className="fixed inset-y-0 right-0 z-40 w-full max-w-md glass-panel-strong border-l border-slate-700/80 shadow-2xl flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-display text-base font-extrabold text-white">Panel Kelas</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">✕</button>
      </div>

      <div className="px-4 pt-3 flex items-center gap-1.5 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => onSwitchTab('players')}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${activeTab === 'players' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          👥 Pemain
        </button>
        <button
          onClick={() => onSwitchTab('chat')}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          💬 Chat
        </button>
        <button
          onClick={() => onSwitchTab('rank')}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${activeTab === 'rank' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          🏆 Peringkat
        </button>
        {currentUserRole === 'teacher' && (
          <button
            onClick={() => onSwitchTab('teacher')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${activeTab === 'teacher' ? 'bg-amber-600 text-white' : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'}`}
          >
            👩‍🏫 Atur Kelas
          </button>
        )}
      </div>

      {/* Tab 1: Pemain */}
      {activeTab === 'players' && (
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Anggota Kelas Bergabung</span>
            <span className="font-extrabold text-indigo-300">{players.length} Pemain</span>
          </div>
          <div className="space-y-2">
            {players.length === 0 ? (
              <div className="text-xs text-slate-400 italic">Belum ada siswa yang bergabung.</div>
            ) : (
              players.map(p => (
                <div key={p.id} className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{p.avatar || '🦊'}</span>
                    <div>
                      <div className="text-xs font-extrabold text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-400">Petak {p.position || 1}/100</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-200 text-xs font-extrabold">{p.score || 0}p</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Chat */}
      {activeTab === 'chat' && (
        <div className="p-4 flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
            {(!room?.messages || room.messages.length === 0) ? (
              <div className="text-xs text-slate-500 italic text-center py-6">Belum ada pesan obrolan. Kirim salam atau semangat!</div>
            ) : (
              room.messages.map(m => (
                <div key={m.id} className={`p-2.5 rounded-2xl ${m.isSystem ? 'bg-slate-900/70 border border-slate-800 text-slate-300' : 'bg-indigo-950/60 border border-indigo-500/25 text-white'} text-xs`}>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-extrabold text-slate-200">{m.avatar || '💬'} {m.senderName}</span>
                    <span>{m.time || ''}</span>
                  </div>
                  <div>{m.text}</div>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => onSendChatMessage('Semangat teman-teman! 🔥')} className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 whitespace-nowrap">🔥 Semangat!</button>
            <button type="button" onClick={() => onSendChatMessage('Hore naik tangga! 🪜🎉')} className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 whitespace-nowrap">🪜 Naik!</button>
            <button type="button" onClick={() => onSendChatMessage('Aduh kena ular! 🐍😱')} className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 whitespace-nowrap">🐍 Kena Ular!</button>
            <button type="button" onClick={() => onSendChatMessage('Perisai Ilmu aktif! 🛡️')} className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 whitespace-nowrap">🛡️ Perisai!</button>
          </div>
          <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
            <input
              type="text"
              maxLength={140}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Tulis pesan kelas..."
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 focus:border-indigo-400 outline-none text-xs text-white"
            />
            <button type="submit" className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold">Kirim</button>
          </form>
        </div>
      )}

      {/* Tab 3: Peringkat */}
      {activeTab === 'rank' && (
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 mb-2">🏅 Klasemen Kelas Saat Ini</h4>
            <div className="space-y-2">
              {sortedClassRank.length === 0 ? (
                <div className="text-xs text-slate-400 italic">Belum ada data peringkat kelas.</div>
              ) : (
                sortedClassRank.map((p, idx) => (
                  <div key={p.id} className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-white">#{idx + 1} {p.avatar} {p.name}</span>
                    <span className="font-extrabold text-amber-300">Petak {p.position} • {p.score || 0}p</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300 mb-2">🌍 Papan Peringkat Global</h4>
            <div className="space-y-2">
              {globalLeaderboard.length === 0 ? (
                <div className="text-xs text-slate-400 italic">Mainkan kelas untuk mengisi peringkat global!</div>
              ) : (
                globalLeaderboard.slice(0, 10).map((g, idx) => (
                  <div key={g.id || idx} className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-white">#{idx + 1} {g.avatar || '🦊'} {g.name}</span>
                    <span className="font-extrabold text-indigo-300">{g.score || 0} Poin</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Atur Kelas (Guru) */}
      {activeTab === 'teacher' && currentUserRole === 'teacher' && (
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <form onSubmit={handleTeacherSettingsSave} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="text-xs font-extrabold text-amber-300">📚 Ubah Fase, Mata Pelajaran & Materi</div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Fase Pembelajaran</label>
              <select value={gradeVal} onChange={(e) => setGradeVal(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white">
                <option value="Fase A">Fase A (Kelas 1–2 SD)</option>
                <option value="Fase B">Fase B (Kelas 3–4 SD)</option>
                <option value="Fase C">Fase C (Kelas 5–6 SD)</option>
                <option value="Fase D">Fase D (Kelas 7–9 SMP)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Mata Pelajaran</label>
              <select value={subjectVal} onChange={(e) => setSubjectVal(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white">
                <option value="Matematika">Matematika</option>
                <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                <option value="IPA">IPA (Sains)</option>
                <option value="IPS">IPS</option>
                <option value="PPKn">PPKn</option>
                <option value="Bahasa Inggris">Bahasa Inggris</option>
                <option value="Campuran">Semua Mapel (Campuran)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Materi Pembelajaran</label>
              <input type="text" value={topicVal} onChange={(e) => setTopicVal(e.target.value)} placeholder="Contoh: Pecahan, Tata Surya..." className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-extrabold">
              💾 Terapkan ke Seluruh Siswa
            </button>
          </form>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="text-xs font-extrabold text-indigo-300">✨ Bank Soal & Generator AI</div>
            <button onClick={onOpenAiStudio} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold">
              Buka Studio Soal & Edit AI
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="text-xs font-extrabold text-pink-300">🐍 Warna & Motif Sisik Ular 3D</div>
            <button onClick={onOpenSnakeCustomizer} className="w-full py-2.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-pink-200 text-xs font-extrabold">
              🎨 Ganti Warna & Motif Sisik Ular
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="text-xs font-extrabold text-amber-300">🪵 Warna & Nuansa Papan 3D</div>
            <button onClick={onOpenBoardTheme} className="w-full py-2.5 rounded-xl bg-amber-600/25 hover:bg-amber-600/35 border border-amber-400/40 text-amber-100 text-xs font-extrabold">
              🪵 Ganti Nuansa Kayu / Grayscale
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="text-xs font-extrabold text-slate-200">🔐 Keamanan PIN Layar Guru</div>
            <p className="text-[11px] text-slate-400">PIN default adalah <code className="text-amber-300">sekarmelati</code> dan dapat Anda edit kapan saja.</p>
            <button onClick={onOpenChangePin} className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-extrabold">
              🔑 Edit / Ubah PIN Guru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
