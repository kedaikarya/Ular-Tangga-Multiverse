/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, ensureAnonymousAuth, signInWithGoogle, signOutFirebase } from './firebase';
import {
  addActivityLogInFirestore,
  addChatMessageInFirestore,
  clearDemoPlayersInFirestore,
  createRoomInFirestore,
  deleteQuestionInFirestore,
  deleteRoomInFirestore,
  fetchGlobalLeaderboardFromFirestore,
  fetchRoomFromFirestore,
  joinRoomInFirestore,
  replaceQuestionsInFirestore,
  restartRoomInFirestore,
  saveQuestionInFirestore,
  saveQuestionsBatchInFirestore,
  subscribeToRoomRealtime,
  subscribeToTeacherRooms,
  syncUserProfileToFirestore,
  triggerSoundboardInFirestore,
  updateRoomMetaInFirestore,
  upsertPlayerInFirestore
} from './services/firestoreRooms';
import { PlayerProfile, RoomData, QuestionItem } from './types';
import { STORAGE_KEYS, DEFAULT_TEACHER_PIN, PAWN_COLORS, LADDERS, SNAKES, getFilteredSeedQuestions } from './constants';
import { playSoundEffect, startBackgroundMusic, stopAndDisposeBackgroundMusic } from './utils/audio';

import ThreeCanvas from './components/ThreeCanvas';
import LobbyOverlay from './components/LobbyOverlay';
import GameHUD from './components/GameHUD';
import HudDrawer from './components/HudDrawer';
import TeacherPinModal from './components/TeacherPinModal';
import CreateClassModal from './components/CreateClassModal';
import QuizModal from './components/QuizModal';
import AiStudioModal from './components/AiStudioModal';
import FlowGuideModal from './components/FlowGuideModal';
import OverlayModal from './components/OverlayModal';
import WinnerModal from './components/WinnerModal';
import TeacherDemoModal from './components/TeacherDemoModal';
import SnakeCustomizerModal from './components/SnakeCustomizerModal';
import BoardThemeModal from './components/BoardThemeModal';
import SoundboardModal from './components/SoundboardModal';
import LiveBoard2DModal from './components/LiveBoard2DModal';

export default function App() {
  const [userProfile, setUserProfile] = useState<PlayerProfile>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) return parsed;
      }
    } catch (_) {}
    return {
      id: 'usr_' + Math.random().toString(36).substring(2, 10),
      name: 'Siswa Pintar',
      avatar: '🦊',
      color: PAWN_COLORS[Math.floor(Math.random() * PAWN_COLORS.length)],
      totalScore: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      gamesWon: 0,
      subjectStats: {}
    };
  });

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [anonAuthDisabled, setAnonAuthDisabled] = useState(false);
  const [cloudLeaderboard, setCloudLeaderboard] = useState<Array<{ id: string; name: string; avatar: string; score: number; wins: number }>>([]);
  const [openRooms, setOpenRooms] = useState<Record<string, RoomData>>({});
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'teacher' | 'student'>('student');

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicStyle, setMusicStyle] = useState('adventure');

  const [visualThemeMode, setVisualThemeMode] = useState<'classic' | 'modern'>('classic');
  const [boardElevationStyle, setBoardElevationStyle] = useState<'stepped' | 'terraced' | 'pyramid'>('stepped');
  const [boardColorTheme, setBoardColorTheme] = useState<'rainbow' | 'wood' | 'grayscale' | 'bamboo' | 'marble'>('rainbow');
  const [snakeStyleConfig, setSnakeStyleConfig] = useState({
    colorPreset: 'green',
    customHex: '#ffffff',
    patternPreset: 'diamond'
  });

  const [cameraPreset, setCameraPreset] = useState<'isometric' | 'top' | 'follow'>('isometric');
  const [cameraTrigger, setCameraTrigger] = useState(0);

  // Modals state
  const [isTeacherPinModalOpen, setIsTeacherPinModalOpen] = useState(false);
  const [teacherPinMode, setTeacherPinMode] = useState<'verify' | 'change' | 'delete_room'>('verify');
  const [pendingDeleteCode, setPendingDeleteCode] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFlowGuideOpen, setIsFlowGuideOpen] = useState(false);
  const [overlayModalKind, setOverlayModalKind] = useState<'leaderboard' | 'analytics' | 'profile' | null>(null);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [isTeacherDemoModalOpen, setIsTeacherDemoModalOpen] = useState(false);
  const [isSnakeModalOpen, setIsSnakeModalOpen] = useState(false);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [isLiveBoard2DOpen, setIsLiveBoard2DOpen] = useState(false);

  const [isHudDrawerOpen, setIsHudDrawerOpen] = useState(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'players' | 'chat' | 'rank' | 'teacher'>('players');

  // Quiz modal state
  const [activeQuiz, setActiveQuiz] = useState<{
    isOpen: boolean;
    isDemo: boolean;
    playerId: string;
    question: QuestionItem | null;
  }>({
    isOpen: false,
    isDemo: false,
    playerId: '',
    question: null
  });

  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: string }>>([]);
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [isAnimatingMove, setIsAnimatingMove] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [consecutiveCorrectCount, setConsecutiveCorrectCount] = useState(0);
  const [hasStreakShield, setHasStreakShield] = useState(false);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const studentAskedHistoryRef = useRef<Record<string, Set<string>>>({});
  const simIntervalRef = useRef<any>(null);
  const isRefillingQuestionsRef = useRef(false);

  // Refs to prevent stale closures inside SSE/Firestore callbacks & intervals
  const firebaseUserRef = useRef<User | null>(null);
  firebaseUserRef.current = firebaseUser;
  const openRoomsRef = useRef(openRooms);
  openRoomsRef.current = openRooms;
  const currentRoomIdRef = useRef(currentRoomId);
  currentRoomIdRef.current = currentRoomId;
  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const visualThemeModeRef = useRef(visualThemeMode);
  visualThemeModeRef.current = visualThemeMode;
  const hasStreakShieldRef = useRef(hasStreakShield);
  hasStreakShieldRef.current = hasStreakShield;
  const isSimRunningRef = useRef(isSimRunning);
  isSimRunningRef.current = isSimRunning;
  const isAnimatingMoveRef = useRef(isAnimatingMove);
  isAnimatingMoveRef.current = isAnimatingMove;
  const prevPhaseRef = useRef<string | null>(null);
  const lastSoundboardTsRef = useRef<number>(0);
  const hasSeenInitialMetaRef = useRef<boolean>(false);
  const triedAutoAnonRef = useRef<boolean>(false);
  const anonAuthDisabledRef = useRef<boolean>(false);
  anonAuthDisabledRef.current = anonAuthDisabled;

  const cloneRoom = (room: RoomData): RoomData => ({
    ...room,
    players: { ...(room.players || {}) },
    messages: [...(room.messages || [])],
    activityLog: [...(room.activityLog || [])],
    questions: [...(room.questions || [])]
  });

  const syncVisualsFromRoom = (room: Partial<RoomData>) => {
    if (room.themeMode) setVisualThemeMode(room.themeMode);
    if (room.snakeStyle) setSnakeStyleConfig(room.snakeStyle);
    if (room.boardTheme) setBoardColorTheme(room.boardTheme);
    if (room.elevationStyle) setBoardElevationStyle(room.elevationStyle);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(userProfile));
    } catch (_) {}
  }, [userProfile]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirebaseUser(null);
        setCloudLeaderboard([]);
        if (!triedAutoAnonRef.current) {
          triedAutoAnonRef.current = true;
          try {
            await ensureAnonymousAuth();
            return;
          } catch (err: any) {
            const code = err?.code || '';
            if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
              setAnonAuthDisabled(true);
            }
            console.warn('Anonymous auth unavailable:', code || err);
          }
        }
        setAuthReady(true);
        return;
      }

      setAnonAuthDisabled(false);
      setFirebaseUser(user);
      setAuthReady(true);

      const cur = userProfileRef.current;
      const resolvedName =
        cur.name === 'Siswa Pintar' && user.displayName
          ? user.displayName.slice(0, 40)
          : cur.name;
      const updatedProfile: PlayerProfile = {
        ...cur,
        id: user.uid,
        name: resolvedName
      };
      if (cur.id !== user.uid || cur.name !== resolvedName) {
        setUserProfile(updatedProfile);
      }
      try {
        await syncUserProfileToFirestore(user.uid, updatedProfile);
        const lb = await fetchGlobalLeaderboardFromFirestore();
        setCloudLeaderboard(lb);
      } catch (err) {
        console.error('Auth sync error:', err);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const unsub = subscribeToTeacherRooms(firebaseUser.uid, (rooms) => {
      setOpenRooms(prev => {
        const next: Record<string, RoomData> = { ...prev };
        rooms.forEach(r => {
          const existing = next[r.code];
          next[r.code] = existing
            ? {
                ...r,
                players: existing.players || {},
                questions: existing.questions || [],
                messages: existing.messages || [],
                activityLog: existing.activityLog || []
              }
            : r;
        });
        try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(next)); } catch (_) {}
        return next;
      });
    });
    return () => unsub();
  }, [authReady, firebaseUser?.uid]);

  useEffect(() => {
    try {
      const rawRooms = localStorage.getItem(STORAGE_KEYS.ROOMS);
      if (rawRooms) setOpenRooms(JSON.parse(rawRooms));
    } catch (_) {}

    // Fetch live rooms from Express backend so separate smartphones see active classes immediately
    fetch('/api/rooms')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.rooms && Array.isArray(data.rooms)) {
          const map: Record<string, RoomData> = {};
          data.rooms.forEach((r: RoomData) => {
            if (r?.code) map[r.code] = r;
          });
          if (Object.keys(map).length > 0) {
            setOpenRooms(prev => {
              const merged = { ...prev, ...map };
              try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(merged)); } catch (_) {}
              return merged;
            });
          }
        }
      })
      .catch(() => {});

    // Subscribe to real-time lobby updates via SSE across devices
    let lobbyEs: EventSource | null = null;
    if (typeof EventSource !== 'undefined') {
      lobbyEs = new EventSource('/api/rooms-stream');
      lobbyEs.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data?.type === 'LOBBY_UPDATED' && Array.isArray(data.rooms)) {
            const serverMap: Record<string, RoomData> = {};
            data.rooms.forEach((r: RoomData) => {
              if (r?.code) serverMap[r.code] = r;
            });
            setOpenRooms(prev => {
              // Keep active local room if server temporarily restarted
              const activeId = currentRoomIdRef.current;
              const next = activeId && prev[activeId] && !serverMap[activeId]
                ? { ...serverMap, [activeId]: prev[activeId] }
                : serverMap;
              try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(next)); } catch (_) {}
              return next;
            });
          }
        } catch (_) {}
      };
    }

    const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ut3d_realtime_channel_v4') : null;
    broadcastChannelRef.current = bc;

    if (bc) {
      bc.onmessage = (ev) => {
        const data = ev.data;
        if (!data) return;
        if (data.type === 'TEACHER_PIN_UPDATED' && data.pin) {
          try { localStorage.setItem(STORAGE_KEYS.TEACHER_PIN, data.pin); } catch (_) {}
        } else if (data.type === 'ROOM_UPDATED' && data.room) {
          setOpenRooms(prev => {
            const next = { ...prev, [data.room.code]: data.room };
            try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(next)); } catch (_) {}
            return next;
          });
          if (currentRoomIdRef.current === data.room.code) {
            syncVisualsFromRoom(data.room);
          }
        } else if (data.type === 'ROOM_DELETED' && data.code) {
          setOpenRooms(prev => {
            const next = { ...prev };
            delete next[data.code];
            try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(next)); } catch (_) {}
            return next;
          });
          if (currentRoomIdRef.current === data.code) {
            showToast('Kelas telah ditutup oleh Guru.', 'warning');
            handleLeaveRoom();
          }
        }
      };
    }

    const unlockHandler = () => {
      if (musicEnabled) {
        startBackgroundMusic(musicEnabled, musicStyle);
      }
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };
    window.addEventListener('pointerdown', unlockHandler, { once: true });
    window.addEventListener('keydown', unlockHandler, { once: true });

    return () => {
      lobbyEs?.close();
      bc?.close();
      stopAndDisposeBackgroundMusic();
    };
  }, []);

  // Real-time subscription (Firebase Firestore when signed in, Express SSE fallback when offline/local)
  useEffect(() => {
    if (!currentRoomId) {
      prevPhaseRef.current = null;
      return;
    }

    const fbUser = firebaseUser;
    if (authReady && fbUser) {
      hasSeenInitialMetaRef.current = false;
      lastSoundboardTsRef.current = 0;

      const makeBaseRoom = (code: string): RoomData => ({
        code,
        name: 'Kelas Edukasi',
        grade: 'Fase C',
        subject: 'Matematika',
        topic: 'Umum',
        themeMode: 'classic',
        elevationStyle: 'stepped',
        boardTheme: 'rainbow',
        snakeStyle: { colorPreset: 'green', customHex: '#ffffff', patternPreset: 'diamond' },
        phase: 'waiting',
        hostId: '',
        questions: [],
        players: {},
        messages: [],
        activityLog: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const unsub = subscribeToRoomRealtime(currentRoomId, {
        onRoomMeta: (meta, soundboard) => {
          setOpenRooms(prev => {
            const base = prev[currentRoomId] || makeBaseRoom(currentRoomId);
            const merged = { ...base, ...meta };
            const next = { ...prev, [currentRoomId]: merged };
            try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(next)); } catch (_) {}
            return next;
          });
          syncVisualsFromRoom(meta);

          if (!hasSeenInitialMetaRef.current) {
            hasSeenInitialMetaRef.current = true;
            if (soundboard) {
              lastSoundboardTsRef.current = soundboard.triggeredAtMs;
            }
          } else if (soundboard && soundboard.triggeredAtMs !== lastSoundboardTsRef.current) {
            lastSoundboardTsRef.current = soundboard.triggeredAtMs;
            if (soundboard.senderId !== fbUser.uid) {
              playSoundEffect(soundboard.soundKey, soundEnabledRef.current);
              showToast(`🎹 Guru: ${soundboard.soundLabel || soundboard.soundKey}!`, 'success');
            }
          }

          if (meta.phase === 'finished' && prevPhaseRef.current && prevPhaseRef.current !== 'finished') {
            setIsWinnerModalOpen(true);
          } else if (prevPhaseRef.current === 'finished' && (meta.phase === 'playing' || meta.phase === 'waiting')) {
            setIsWinnerModalOpen(false);
            setActiveQuiz(qPrev => ({ ...qPrev, isOpen: false }));
            setConsecutiveCorrectCount(0);
            setHasStreakShield(false);
            studentAskedHistoryRef.current = {};
            showToast('🔄 Permainan dimulai ulang oleh Guru! Semua bidak kembali ke Petak 1.', 'info');
          }
          if (meta.phase) {
            prevPhaseRef.current = meta.phase;
          }
        },
        onRoomDeleted: () => {
          setOpenRooms(prev => {
            const next = { ...prev };
            delete next[currentRoomId];
            try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(next)); } catch (_) {}
            return next;
          });
          showToast('Kelas telah ditutup oleh Guru.', 'warning');
          handleLeaveRoom();
        },
        onPlayers: (players) => {
          setOpenRooms(prev => {
            const base = prev[currentRoomId] || makeBaseRoom(currentRoomId);
            const mergedPlayers = { ...players };
            const myId = userProfileRef.current.id;
            const prevMe = base.players?.[myId];
            const nextMe = mergedPlayers[myId];
            if (prevMe && nextMe && (prevMe.answeredCount || 0) > 0 && (nextMe.answeredCount || 0) === 0 && (nextMe.position || 1) === 1 && (nextMe.score || 0) === 0) {
              setIsWinnerModalOpen(false);
              setActiveQuiz(qPrev => ({ ...qPrev, isOpen: false }));
              setConsecutiveCorrectCount(0);
              setHasStreakShield(false);
              studentAskedHistoryRef.current = {};
            }
            if (isAnimatingMoveRef.current && prevMe && nextMe) {
              mergedPlayers[myId] = {
                ...nextMe,
                position: prevMe.position
              };
            }
            const next = { ...prev, [currentRoomId]: { ...base, players: mergedPlayers } };
            try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(next)); } catch (_) {}
            return next;
          });
        },
        onQuestions: (questions) => {
          setOpenRooms(prev => {
            const base = prev[currentRoomId] || makeBaseRoom(currentRoomId);
            const next = { ...prev, [currentRoomId]: { ...base, questions } };
            return next;
          });
        },
        onMessages: (messages) => {
          setOpenRooms(prev => {
            const base = prev[currentRoomId] || makeBaseRoom(currentRoomId);
            const next = { ...prev, [currentRoomId]: { ...base, messages } };
            return next;
          });
        },
        onActivityLog: (activityLog) => {
          setOpenRooms(prev => {
            const base = prev[currentRoomId] || makeBaseRoom(currentRoomId);
            const next = { ...prev, [currentRoomId]: { ...base, activityLog } };
            return next;
          });
        }
      });

      return () => unsub();
    }

    if (typeof EventSource === 'undefined') {
      prevPhaseRef.current = null;
      return;
    }

    const es = new EventSource(`/api/rooms/${encodeURIComponent(currentRoomId)}/stream`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (!data) return;

        if (data.type === 'ROOM_UPDATED' && data.room) {
          const updatedRoom: RoomData = data.room;
          setOpenRooms(prev => {
            const next = { ...prev, [updatedRoom.code]: updatedRoom };
            try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(next)); } catch (_) {}
            return next;
          });
          syncVisualsFromRoom(updatedRoom);

          if (updatedRoom.phase === 'finished' && prevPhaseRef.current && prevPhaseRef.current !== 'finished') {
            setIsWinnerModalOpen(true);
          } else if (prevPhaseRef.current === 'finished' && (updatedRoom.phase === 'playing' || updatedRoom.phase === 'waiting')) {
            setIsWinnerModalOpen(false);
            setActiveQuiz(qPrev => ({ ...qPrev, isOpen: false }));
            setConsecutiveCorrectCount(0);
            setHasStreakShield(false);
            studentAskedHistoryRef.current = {};
          }
          prevPhaseRef.current = updatedRoom.phase;
        } else if (data.type === 'SOUNDBOARD' && data.soundKey) {
          if (data.senderId !== userProfileRef.current.id) {
            playSoundEffect(data.soundKey, soundEnabledRef.current);
            showToast(`🎹 Guru: ${data.soundLabel || data.soundKey}!`, 'success');
          }
        } else if (data.type === 'ROOM_DELETED' && data.code === currentRoomId) {
          setOpenRooms(prev => {
            const next = { ...prev };
            delete next[data.code];
            try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(next)); } catch (_) {}
            return next;
          });
          showToast('Kelas telah ditutup oleh Guru.', 'warning');
          handleLeaveRoom();
        }
      } catch (_) {}
    };

    return () => {
      es.close();
    };
  }, [currentRoomId, authReady, firebaseUser?.uid]);

  const showToast = (message: string, type = 'info') => {
    const id = 't_' + Math.random().toString(36).substring(2, 8);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  const persistRoomChange = (
    room: RoomData,
    eventType = 'ROOM_UPDATED',
    serverOptions?: {
      playerUpdate?: any;
      activityText?: string;
      chatMessage?: any;
      phase?: RoomData['phase'];
      skipServer?: boolean;
    }
  ) => {
    const cloned = cloneRoom(room);
    cloned.updatedAt = Date.now();
    prevPhaseRef.current = cloned.phase;
    setOpenRooms(prev => {
      const next = { ...prev, [cloned.code]: cloned };
      try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(next)); } catch (_) {}
      return next;
    });
    broadcastChannelRef.current?.postMessage({ type: eventType, room: cloned });

    if (!serverOptions?.skipServer) {
      const payload = serverOptions?.playerUpdate
        ? {
            playerUpdate: serverOptions.playerUpdate,
            activityText: serverOptions.activityText,
            chatMessage: serverOptions.chatMessage,
            phase: serverOptions.phase
          }
        : { room: cloned };

      fetch(`/api/rooms/${encodeURIComponent(cloned.code)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }
  };

  const appendActivityLog = (room: RoomData, text: string) => {
    if (!room.activityLog) room.activityLog = [];
    room.activityLog = [
      {
        text,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      },
      ...room.activityLog
    ].slice(0, 25);
  };

  const appendChatMessage = (room: RoomData, senderName: string, avatar: string, text: string, isSystem = false) => {
    if (!room.messages) room.messages = [];
    room.messages.push({
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      senderName,
      avatar,
      text,
      isSystem,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    });
    room.messages = room.messages.slice(-50);
  };

  const getStoredTeacherPin = () => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TEACHER_PIN) || DEFAULT_TEACHER_PIN;
    } catch (_) {
      return DEFAULT_TEACHER_PIN;
    }
  };

  const isTeacherUnlocked = () => {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.TEACHER_SESSION) === 'unlocked';
    } catch (_) {
      return false;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      showToast('Berhasil masuk dengan Google! Sinkronisasi Cloud aktif.', 'success');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        showToast('Login Google dibatalkan.', 'info');
      } else if (code === 'auth/popup-blocked') {
        showToast('Popup login diblokir browser. Izinkan popup lalu coba lagi.', 'warning');
      } else if (code === 'auth/unauthorized-domain') {
        showToast('Domain belum terdaftar di Firebase Auth Authorized Domains.', 'error');
      } else {
        showToast('Gagal masuk Google. Coba lagi sebentar.', 'error');
      }
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      if (currentRoomIdRef.current) {
        handleLeaveRoom();
      }
      triedAutoAnonRef.current = false;
      await signOutFirebase();
      showToast('Kembali ke sesi tamu otomatis (tanpa login).', 'info');
    } catch (_) {
      showToast('Gagal keluar dari akun Google.', 'error');
    }
  };

  // --- ROOM MANAGEMENT ---
  const handleCreateClass = async (config: {
    className: string;
    grade: string;
    subject: string;
    topic: string;
    themeMode: 'classic' | 'modern';
    autoAi: boolean;
  }) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const initialQuestions = getFilteredSeedQuestions(config.grade, config.subject, config.topic);

    let fbUser = firebaseUserRef.current;
    if (!fbUser && !anonAuthDisabledRef.current) {
      try {
        fbUser = await ensureAnonymousAuth();
      } catch (err: any) {
        const errCode = err?.code || '';
        if (errCode === 'auth/operation-not-allowed' || errCode === 'auth/admin-restricted-operation') {
          setAnonAuthDisabled(true);
        }
      }
    }
    const hostUid = fbUser ? fbUser.uid : userProfile.id;

    const newRoom: RoomData = {
      code,
      name: config.className,
      grade: config.grade,
      subject: config.subject,
      topic: config.topic,
      themeMode: config.themeMode,
      elevationStyle: boardElevationStyle,
      boardTheme: boardColorTheme,
      snakeStyle: { ...snakeStyleConfig },
      phase: 'waiting',
      hostId: hostUid,
      questions: initialQuestions,
      players: {
        [hostUid]: {
          id: hostUid,
          name: 'Guru Pengajar',
          avatar: '👩‍🏫',
          color: '#f59e0b',
          role: 'teacher',
          position: 1,
          score: 0,
          correctCount: 0,
          answeredCount: 0
        }
      },
      messages: [],
      activityLog: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    appendChatMessage(newRoom, 'Sistem', '🏫', `Kelas "${config.className}" (${config.grade} • ${config.subject} - ${config.topic}) dibuka oleh Guru. Kode: ${code}`, true);
    appendActivityLog(newRoom, `Kelas dibuat (${config.grade} • ${config.subject} - ${config.topic})`);

    setVisualThemeMode(config.themeMode);
    setCurrentRoomId(code);
    setCurrentUserRole('teacher');
    persistRoomChange(newRoom, 'ROOM_UPDATED', { skipServer: true });
    setIsCreateModalOpen(false);

    if (fbUser) {
      try {
        await createRoomInFirestore(newRoom, fbUser.uid);
        showToast(`Kelas Cloud ${code} siap! Siswa dapat langsung bergabung dari HP mana saja.`, 'success');
      } catch (err) {
        console.error('Create room Firestore error:', err);
        showToast('Gagal menyimpan kelas ke Cloud. Periksa koneksi internet Anda.', 'error');
      }
    } else {
      fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: newRoom })
      }).catch(() => {});
      showToast(`Kelas lokal ${code} siap! Aktifkan Anonymous Auth di Firebase Console untuk sinkron lintas HP.`, 'info');
    }

    if (config.autoAi) {
      setIsGeneratingAi(true);
      showToast(`🤖 Gemini AI sedang menyusun 5 soal khusus ${config.grade} • ${config.subject} (${config.topic})...`, 'info');
      try {
        const aiQuestions = await requestGeminiQuestionsFromApi(
          config.grade,
          config.subject,
          config.topic,
          5,
          initialQuestions.map(q => q.question)
        );
        const activeRoom = openRoomsRef.current[code];
        if (activeRoom) {
          const updatedRoom = cloneRoom(activeRoom);
          updatedRoom.questions = [...aiQuestions, ...(updatedRoom.questions || [])];
          const currentFbUser = firebaseUserRef.current;
          persistRoomChange(updatedRoom, 'ROOM_UPDATED', { skipServer: Boolean(currentFbUser) });
          if (currentFbUser && updatedRoom.hostId === currentFbUser.uid) {
            await saveQuestionsBatchInFirestore(code, aiQuestions);
          }
          showToast(`✨ 5 soal Gemini AI materi "${config.topic}" siap dimainkan!`, 'success');
        }
      } catch (err: any) {
        showToast(err?.message || 'Gagal menyusun soal Gemini AI. Bank soal kurikulum tetap aktif.', 'warning');
      } finally {
        setIsGeneratingAi(false);
      }
    }
  };

  const handleJoinRoom = async (code: string, studentName?: string) => {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) return;

    let fbUser = firebaseUserRef.current;
    if (!fbUser && !anonAuthDisabledRef.current) {
      try {
        fbUser = await ensureAnonymousAuth();
      } catch (err: any) {
        const errCode = err?.code || '';
        if (errCode === 'auth/operation-not-allowed' || errCode === 'auth/admin-restricted-operation') {
          setAnonAuthDisabled(true);
        }
      }
    }
    let room = openRoomsRef.current[cleanCode];

    if (fbUser) {
      try {
        const cloudRoom = await fetchRoomFromFirestore(cleanCode);
        if (cloudRoom) {
          room = {
            ...cloudRoom,
            players: room?.players || {},
            questions: room?.questions || [],
            messages: room?.messages || [],
            activityLog: room?.activityLog || []
          };
        }
      } catch (err) {
        console.error('Fetch Firestore room error:', err);
      }
    }

    if (!room) {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(cleanCode)}`);
        const ctype = res.headers.get('content-type') || '';
        if (res.ok && ctype.includes('application/json')) {
          const data = await res.json();
          if (data?.room) room = data.room;
        }
      } catch (_) {}
    }

    if (!room) {
      if (!fbUser && anonAuthDisabledRef.current) {
        showToast(`Kelas "${cleanCode}" tidak ditemukan. Aktifkan Anonymous Auth di Firebase Console atau Login Google.`, 'warning');
      } else {
        showToast(`Kelas dengan kode "${cleanCode}" tidak ditemukan.`, 'error');
      }
      return;
    }

    let prof = userProfileRef.current;
    if (fbUser && prof.id !== fbUser.uid) {
      prof = { ...prof, id: fbUser.uid };
    }
    if (studentName && studentName !== prof.name) {
      prof = { ...prof, name: studentName };
    }
    if (prof !== userProfileRef.current) {
      setUserProfile(prof);
    }

    const draftRoom = cloneRoom(room);
    const alreadyInRoom = Boolean(draftRoom.players?.[prof.id]);
    const isHost = Boolean(fbUser && draftRoom.hostId === fbUser.uid) || draftRoom.hostId === prof.id;
    const playerEntry = draftRoom.players[prof.id] || {
      id: prof.id,
      name: isHost ? 'Guru Pengajar' : prof.name,
      avatar: isHost ? '👩‍🏫' : (prof.avatar || '🦊'),
      color: isHost ? '#f59e0b' : (prof.color || PAWN_COLORS[Object.keys(draftRoom.players).length % PAWN_COLORS.length]),
      role: (isHost ? 'teacher' : 'student') as 'teacher' | 'student',
      position: 1,
      score: 0,
      correctCount: 0,
      answeredCount: 0
    };

    let joinChatMessage: any = null;
    let joinActivityText = `${prof.avatar || '🦊'} ${prof.name} bergabung ke kelas`;
    if (!alreadyInRoom) {
      draftRoom.players[prof.id] = playerEntry;
      joinChatMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        senderName: prof.name,
        avatar: prof.avatar || '🦊',
        text: 'bergabung ke dalam kelas!',
        isSystem: true,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
      draftRoom.messages = [...(draftRoom.messages || []), joinChatMessage].slice(-50);
      appendActivityLog(draftRoom, joinActivityText);
    }

    let syncedRoom = draftRoom;
    if (fbUser) {
      try {
        await joinRoomInFirestore(cleanCode, fbUser.uid, playerEntry, joinActivityText);
      } catch (err: any) {
        console.error('Join Firestore error:', err);
        const rawMsg = String(err?.message || '');
        if (rawMsg.includes('permission') || rawMsg.includes('PERMISSION_DENIED')) {
          showToast('Izin akses kelas ditolak oleh aturan Firestore.', 'error');
        } else {
          showToast('Gagal bergabung ke kelas Cloud. Periksa koneksi internet Anda.', 'error');
        }
        return;
      }
    } else {
      try {
        const joinRes = await fetch(`/api/rooms/${encodeURIComponent(cleanCode)}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player: playerEntry,
            chatMessage: joinChatMessage,
            activityText: !alreadyInRoom ? joinActivityText : undefined
          })
        });
        const ctype = joinRes.headers.get('content-type') || '';
        if (joinRes.ok && ctype.includes('application/json')) {
          const joinData = await joinRes.json();
          if (joinData?.room) syncedRoom = joinData.room;
        }
      } catch (_) {}
    }

    syncVisualsFromRoom(syncedRoom);
    setCurrentRoomId(cleanCode);
    setCurrentUserRole(isHost ? 'teacher' : 'student');
    setConsecutiveCorrectCount(0);
    setHasStreakShield(false);

    persistRoomChange(syncedRoom, 'ROOM_UPDATED', { skipServer: true });
    showToast(`Berhasil bergabung ke ${syncedRoom.name}!`, 'success');
  };

  const handleLeaveRoom = () => {
    if (isSimRunningRef.current || simIntervalRef.current) {
      setIsSimRunning(false);
      isSimRunningRef.current = false;
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsAnimatingMove(false);
    isAnimatingMoveRef.current = false;
    setIsLiveBoard2DOpen(false);
    setIsWinnerModalOpen(false);
    setIsTeacherDemoModalOpen(false);
    setIsAiStudioOpen(false);
    setIsSoundboardOpen(false);
    setIsSnakeModalOpen(false);
    setIsBoardModalOpen(false);
    setActiveQuiz({ isOpen: false, isDemo: false, playerId: '', question: null });
    setCurrentRoomId(null);
    setCurrentUserRole('student');
    setIsHudDrawerOpen(false);
  };

  // --- GEMINI AI QUESTION GENERATION & FILTERING ---
  const requestGeminiQuestionsFromApi = async (
    grade: string,
    subject: string,
    topic: string,
    count = 5,
    existingQuestions: string[] = []
  ): Promise<QuestionItem[]> => {
    const res = await fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade,
        subject,
        topic: (topic || 'Materi Umum').trim(),
        count,
        existingQuestions
      })
    });
    const ctype = res.headers.get('content-type') || '';
    const data = ctype.includes('application/json') ? await res.json().catch(() => null) : null;
    if (!res.ok) {
      throw new Error(data?.error || `Gagal menghubungi layanan Gemini AI (${res.status}).`);
    }
    if (!Array.isArray(data?.questions) || data.questions.length === 0) {
      throw new Error(data?.error || 'Gemini AI tidak mengembalikan soal yang valid.');
    }
    return data.questions as QuestionItem[];
  };

  const getMatchingQuestionPool = (room: RoomData): QuestionItem[] => {
    const roomQs = room.questions || [];
    const subjectMatches = (q: QuestionItem) => {
      if (room.subject === 'Campuran') return true;
      if (q.subject === room.subject) return true;
      if (room.subject === 'IPAS') return q.subject === 'IPA' || q.subject === 'IPS';
      return false;
    };

    const exactMatches = roomQs.filter(q => q.grade === room.grade && subjectMatches(q));
    if (exactMatches.length > 0) return exactMatches;
    if (roomQs.length > 0) return roomQs;
    return getFilteredSeedQuestions(room.grade, room.subject, room.topic);
  };

  // --- QUIZ & MOVEMENT ---
  const handleOpenQuiz = () => {
    const room = openRooms[currentRoomId || ''];
    if (!room || isAnimatingMove) return;
    if (room.phase !== 'playing') {
      showToast('Tunggu Guru memulai atau melanjutkan kelas terlebih dahulu.', 'warning');
      return;
    }
    if ((room.players?.[userProfile.id]?.position || 1) >= 100) {
      showToast('🏆 Kamu sudah finish di Petak 100! Pemain lain masih melanjutkan permainan.', 'success');
      return;
    }

    const pool = getMatchingQuestionPool(room);
    if (!studentAskedHistoryRef.current[userProfile.id]) {
      studentAskedHistoryRef.current[userProfile.id] = new Set();
    }
    const askedSet = studentAskedHistoryRef.current[userProfile.id];

    let candidates = pool.filter(q => !askedSet.has(q.id));
    if (candidates.length === 0) {
      askedSet.clear();
      candidates = pool;
    }

    // Prioritize AI-generated or topic-relevant questions first, then pick randomly among top tier
    const cleanTopic = (room.topic || '').toLowerCase().trim();
    const topicWords = cleanTopic.split(/[\s,&/\-]+/).filter(w => w.length >= 3);
    const topicRelevant = cleanTopic
      ? candidates.filter(q => {
          const hay = `${q.topic} ${q.question}`.toLowerCase();
          return hay.includes(cleanTopic) || topicWords.some(w => hay.includes(w));
        })
      : [];
    const pickFrom = topicRelevant.length > 0 ? topicRelevant : candidates;
    const chosen = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    askedSet.add(chosen.id);

    // Background Gemini AI refill when unseen question pool runs low
    const remainingUnseen = pool.filter(q => !askedSet.has(q.id)).length;
    if (remainingUnseen <= 1 && !isRefillingQuestionsRef.current) {
      isRefillingQuestionsRef.current = true;
      const roomCodeSnapshot = room.code;
      requestGeminiQuestionsFromApi(
        room.grade,
        room.subject,
        room.topic,
        5,
        pool.map(q => q.question)
      )
        .then((newBatch) => {
          const latestRoom = openRoomsRef.current[roomCodeSnapshot];
          if (!latestRoom) return;
          const updatedRoom = cloneRoom(latestRoom);
          updatedRoom.questions = [...newBatch, ...(updatedRoom.questions || [])];
          const fbUser = firebaseUserRef.current;
          persistRoomChange(updatedRoom, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
          if (fbUser && updatedRoom.hostId === fbUser.uid) {
            saveQuestionsBatchInFirestore(roomCodeSnapshot, newBatch).catch(console.error);
          }
        })
        .catch(() => {})
        .finally(() => {
          isRefillingQuestionsRef.current = false;
        });
    }

    setActiveQuiz({
      isOpen: true,
      isDemo: false,
      playerId: userProfile.id,
      question: chosen
    });
  };

  const handleAnswerSubmit = (isCorrect: boolean, steps: number) => {
    setActiveQuiz(prev => ({ ...prev, isOpen: false }));
    const liveRoom = openRoomsRef.current[currentRoomIdRef.current || ''];
    if (!liveRoom) return;

    const room = cloneRoom(liveRoom);
    const playerId = activeQuiz.playerId || userProfile.id;
    const existingPlayer = room.players?.[playerId];
    if (!existingPlayer) return;

    const player = { ...existingPlayer, answeredCount: (existingPlayer.answeredCount || 0) + 1 };
    room.players[playerId] = player;

    let updatedWrongProf: PlayerProfile | null = null;
    if (!activeQuiz.isDemo) {
      const prof = { ...userProfile };
      prof.totalAnswered = (prof.totalAnswered || 0) + 1;
      prof.subjectStats = { ...(prof.subjectStats || {}) };
      const subj = room.subject || 'Umum';
      const prevSubj = prof.subjectStats[subj] || { answered: 0, correct: 0 };
      prof.subjectStats[subj] = {
        answered: prevSubj.answered + 1,
        correct: prevSubj.correct + (isCorrect ? 1 : 0)
      };

      if (isCorrect) {
        prof.totalCorrect = (prof.totalCorrect || 0) + 1;
        setConsecutiveCorrectCount(c => {
          const next = c + 1;
          if (next >= 3 && !hasStreakShieldRef.current) {
            setHasStreakShield(true);
            showToast('🛡️ 3 Benar Beruntun! Perisai Ilmu aktif melindungi dari ular!', 'success');
          }
          return next;
        });
      } else {
        setConsecutiveCorrectCount(0);
      }
      updatedWrongProf = prof;
      setUserProfile(prof);
    }

    if (!isCorrect) {
      playSoundEffect('wrong', soundEnabled);
      const actText = `${player.avatar} ${player.name} menjawab kurang tepat`;
      appendActivityLog(room, actText);
      const fbUser = firebaseUserRef.current;
      persistRoomChange(room, 'ROOM_UPDATED', { playerUpdate: player, activityText: actText, skipServer: Boolean(fbUser) });
      if (fbUser) {
        upsertPlayerInFirestore(room.code, fbUser.uid, player).catch(console.error);
        addActivityLogInFirestore(room.code, fbUser.uid, actText).catch(console.error);
        if (!activeQuiz.isDemo && updatedWrongProf) {
          syncUserProfileToFirestore(fbUser.uid, updatedWrongProf).catch(console.error);
        }
      }
      return;
    }

    playSoundEffect('correct', soundEnabled);
    player.correctCount = (player.correctCount || 0) + 1;
    player.score = (player.score || 0) + steps * 25;
    room.players[playerId] = player;

    if (!activeQuiz.isDemo) {
      const nextProf: PlayerProfile = {
        ...userProfileRef.current,
        totalAnswered: (userProfileRef.current.totalAnswered || 0) + 1,
        totalCorrect: (userProfileRef.current.totalCorrect || 0) + 1,
        totalScore: (userProfileRef.current.totalScore || 0) + steps * 25,
        subjectStats: {
          ...(userProfileRef.current.subjectStats || {}),
          [room.subject || 'Umum']: {
            answered: (userProfileRef.current.subjectStats?.[room.subject || 'Umum']?.answered || 0) + 1,
            correct: (userProfileRef.current.subjectStats?.[room.subject || 'Umum']?.correct || 0) + 1
          }
        }
      };
      setUserProfile(nextProf);
      try {
        const lb = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEADERBOARD) || '[]');
        const idx = lb.findIndex((item: any) => item.id === nextProf.id);
        const entry = { id: nextProf.id, name: nextProf.name, avatar: nextProf.avatar, score: nextProf.totalScore, wins: nextProf.gamesWon };
        if (idx >= 0) lb[idx] = entry; else lb.push(entry);
        lb.sort((a: any, b: any) => b.score - a.score);
        localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(lb.slice(0, 30)));
      } catch (_) {}
      const fbUser = firebaseUserRef.current;
      if (fbUser) {
        syncUserProfileToFirestore(fbUser.uid, nextProf)
          .then(() => fetchGlobalLeaderboardFromFirestore().then(setCloudLeaderboard).catch(() => {}))
          .catch(console.error);
      }
    }

    executePawnBoardMovement(room, playerId, steps, activeQuiz.isDemo);
  };

  const executePawnBoardMovement = (initialRoom: RoomData, playerId: string, steps: number, isDemo = false) => {
    const startPlayer = initialRoom.players?.[playerId];
    if (!startPlayer) return;

    const roomCode = initialRoom.code;
    const fbUser = firebaseUserRef.current;
    setIsAnimatingMove(true);
    isAnimatingMoveRef.current = true;
    persistRoomChange(initialRoom, 'ROOM_UPDATED', { playerUpdate: startPlayer, skipServer: Boolean(fbUser) });

    const currentPos = startPlayer.position || 1;
    const targetPos = Math.min(100, currentPos + steps);
    let stepCursor = currentPos;

    const hopTimer = setInterval(() => {
      const latestRoom = cloneRoom(openRoomsRef.current[roomCode] || initialRoom);
      const latestPlayer = { ...(latestRoom.players?.[playerId] || startPlayer) };

      if (stepCursor < targetPos) {
        stepCursor += 1;
        latestPlayer.position = stepCursor;
        latestRoom.players[playerId] = latestPlayer;
        playSoundEffect('hop', soundEnabledRef.current);
        persistRoomChange(latestRoom, 'ROOM_UPDATED', { playerUpdate: latestPlayer, skipServer: Boolean(firebaseUserRef.current) });
      } else {
        clearInterval(hopTimer);

        let actText = `${latestPlayer.avatar} ${latestPlayer.name} maju ke petak ${stepCursor}`;
        if (LADDERS[stepCursor]) {
          const dest = LADDERS[stepCursor];
          latestPlayer.position = dest;
          latestPlayer.score = (latestPlayer.score || 0) + 50;
          playSoundEffect('ladder', soundEnabledRef.current);
          const label = visualThemeModeRef.current === 'modern' ? 'naik Sky-Lift' : 'naik Tangga';
          actText = `🪜 ${latestPlayer.avatar} ${latestPlayer.name} ${label} (${stepCursor} → ${dest})!`;
          if (!isDemo && playerId === userProfileRef.current.id) showToast(`🪜 Hebat! Naik ke petak ${dest}! (+50 Poin)`, 'success');
        } else if (SNAKES[stepCursor]) {
          if (!isDemo && playerId === userProfileRef.current.id && hasStreakShieldRef.current) {
            setHasStreakShield(false);
            setConsecutiveCorrectCount(0);
            actText = `🛡️ ${latestPlayer.avatar} ${latestPlayer.name} menahan ular di petak ${stepCursor} dengan Perisai Ilmu!`;
            showToast(`🛡️ Perisai Ilmu melindungimu dari ular di petak ${stepCursor}!`, 'success');
          } else {
            const dest = SNAKES[stepCursor];
            latestPlayer.position = dest;
            playSoundEffect('snake', soundEnabledRef.current);
            const label = visualThemeModeRef.current === 'modern' ? 'meluncur Perosotan' : 'turun Ular';
            actText = `🐍 ${latestPlayer.avatar} ${latestPlayer.name} ${label} (${stepCursor} → ${dest})`;
            if (!isDemo && playerId === userProfileRef.current.id) showToast(`🐍 Ups! Turun ke petak ${dest}. Tetap semangat!`, 'warning');
          }
        }
        appendActivityLog(latestRoom, actText);
        latestRoom.players[playerId] = latestPlayer;

        setIsAnimatingMove(false);
        isAnimatingMoveRef.current = false;

        const currentFbUser = firebaseUserRef.current;

        if (latestPlayer.position >= 100) {
          const alreadyFinished = Boolean(latestPlayer.finishOrder && latestPlayer.finishOrder > 0);
          latestPlayer.position = 100;
          if (!alreadyFinished) {
            const existingFinishers = Object.values(latestRoom.players || {}).filter(
              p => p.id !== playerId && p.role !== 'teacher' && ((p.finishOrder || 0) > 0 || (p.position || 1) >= 100)
            ).length;
            latestPlayer.finishOrder = existingFinishers + 1;
            latestPlayer.score = (latestPlayer.score || 0) + 200;
          }
          latestRoom.players[playerId] = latestPlayer;

          if (!isDemo && !alreadyFinished) {
            const winProf: PlayerProfile = {
              ...userProfileRef.current,
              gamesWon: (userProfileRef.current.gamesWon || 0) + 1,
              totalScore: (userProfileRef.current.totalScore || 0) + 200
            };
            setUserProfile(winProf);
            if (currentFbUser) {
              syncUserProfileToFirestore(currentFbUser.uid, winProf)
                .then(() => fetchGlobalLeaderboardFromFirestore().then(setCloudLeaderboard).catch(() => {}))
                .catch(console.error);
            }
          }

          const rankLabel = latestPlayer.finishOrder ? ` (Juara #${latestPlayer.finishOrder})` : '';
          const winText = `🏆 ${latestPlayer.avatar} ${latestPlayer.name} mencapai Petak 100${rankLabel}! Permainan terus berlanjut!`;
          appendActivityLog(latestRoom, winText);
          playSoundEffect('cheer', soundEnabledRef.current);

          if (!isDemo) {
            appendChatMessage(
              latestRoom,
              'Sistem',
              '🏆',
              `${latestPlayer.name} sampai di Petak 100${rankLabel}! Pemain lain tetap melanjutkan permainan.`,
              true
            );
            const lastChat = latestRoom.messages[latestRoom.messages.length - 1];
            if (playerId === userProfileRef.current.id) {
              showToast(`🏆 Selamat! Kamu finish di Petak 100${rankLabel}! Pemain lain tetap bermain.`, 'success');
            } else {
              showToast(winText, 'success');
            }
            persistRoomChange(latestRoom, 'ROOM_UPDATED', {
              playerUpdate: latestPlayer,
              activityText: winText,
              chatMessage: lastChat,
              skipServer: Boolean(currentFbUser)
            });
            if (currentFbUser) {
              upsertPlayerInFirestore(roomCode, currentFbUser.uid, latestPlayer).catch(console.error);
              addActivityLogInFirestore(roomCode, currentFbUser.uid, winText).catch(console.error);
              if (lastChat) addChatMessageInFirestore(roomCode, currentFbUser.uid, lastChat).catch(console.error);
            }
            return;
          }
        }

        persistRoomChange(latestRoom, 'ROOM_UPDATED', {
          playerUpdate: latestPlayer,
          activityText: actText,
          skipServer: Boolean(currentFbUser)
        });
        if (currentFbUser) {
          upsertPlayerInFirestore(roomCode, currentFbUser.uid, latestPlayer).catch(console.error);
          addActivityLogInFirestore(roomCode, currentFbUser.uid, actText).catch(console.error);
        }
      }
    }, 220);
  };

  // --- TEACHER ACTIONS ---
  const handleRestartClass = () => {
    const live = openRoomsRef.current[currentRoomIdRef.current || ''];
    if (!live || currentUserRole !== 'teacher') return;

    if (isSimRunningRef.current || simIntervalRef.current) {
      setIsSimRunning(false);
      isSimRunningRef.current = false;
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsAnimatingMove(false);
    isAnimatingMoveRef.current = false;
    setIsWinnerModalOpen(false);
    setIsTeacherDemoModalOpen(false);
    setActiveQuiz({ isOpen: false, isDemo: false, playerId: '', question: null });
    setConsecutiveCorrectCount(0);
    setHasStreakShield(false);
    studentAskedHistoryRef.current = {};

    const room = cloneRoom(live);
    room.phase = 'playing';
    const playerIds: string[] = [];
    Object.keys(room.players || {}).forEach(pid => {
      playerIds.push(pid);
      room.players[pid] = {
        ...room.players[pid],
        position: 1,
        score: 0,
        correctCount: 0,
        answeredCount: 0,
        finishOrder: 0
      };
    });

    const actText = '🔄 Guru memulai ulang permainan (semua bidak kembali ke Petak 1)';
    appendChatMessage(room, 'Guru', '🔄', 'Permainan dimulai ulang! Semua bidak kembali ke Petak 1. Ayo bersemangat!', true);
    appendActivityLog(room, actText);
    const lastMsg = room.messages[room.messages.length - 1];

    const fbUser = firebaseUserRef.current;
    persistRoomChange(room, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });

    if (fbUser && room.hostId === fbUser.uid) {
      restartRoomInFirestore(room.code, fbUser.uid, playerIds, lastMsg, actText).catch(err => {
        console.error('Restart room Firestore error:', err);
        showToast('Gagal sinkronisasi Mulai Ulang ke Cloud.', 'error');
      });
    }
    showToast('🔄 Permainan dimulai ulang! Semua bidak kembali ke Petak 1.', 'success');
  };

  const handleStartClass = () => {
    const live = openRoomsRef.current[currentRoomId || ''];
    if (!live) return;
    if (live.phase === 'finished') {
      handleRestartClass();
      return;
    }
    const room = cloneRoom(live);
    room.phase = 'playing';
    appendChatMessage(room, 'Guru', '👩‍🏫', 'Kelas dimulai! Silakan jawab soal untuk melangkah maju!', true);
    appendActivityLog(room, '▶️ Guru memulai permainan kelas');
    const fbUser = firebaseUserRef.current;
    persistRoomChange(room, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
    if (fbUser && room.hostId === fbUser.uid) {
      updateRoomMetaInFirestore(room.code, { phase: 'playing' }).catch(console.error);
      const lastMsg = room.messages[room.messages.length - 1];
      if (lastMsg) addChatMessageInFirestore(room.code, fbUser.uid, lastMsg).catch(console.error);
      addActivityLogInFirestore(room.code, fbUser.uid, '▶️ Guru memulai permainan kelas').catch(console.error);
    }
    showToast('Kelas dimulai! Tombol jawab soal siswa kini aktif.', 'success');
  };

  const handlePauseClass = () => {
    const live = openRoomsRef.current[currentRoomId || ''];
    if (!live || live.phase === 'finished') return;
    const room = cloneRoom(live);
    let actText = '';
    if (room.phase === 'playing') {
      room.phase = 'paused';
      appendChatMessage(room, 'Guru', '⏸️', 'Permainan dijeda sementara oleh Guru.', true);
      actText = '⏸️ Permainan dijeda Guru';
      appendActivityLog(room, actText);
      showToast('Permainan dijeda sementara.', 'warning');
    } else if (room.phase === 'paused' || room.phase === 'stopped') {
      room.phase = 'playing';
      appendChatMessage(room, 'Guru', '▶️', 'Permainan dilanjutkan kembali!', true);
      actText = '▶️ Permainan dilanjutkan Guru';
      appendActivityLog(room, actText);
      showToast('Permainan dilanjutkan!', 'success');
    }
    const fbUser = firebaseUserRef.current;
    persistRoomChange(room, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
    if (fbUser && room.hostId === fbUser.uid) {
      updateRoomMetaInFirestore(room.code, { phase: room.phase }).catch(console.error);
      const lastMsg = room.messages[room.messages.length - 1];
      if (lastMsg) addChatMessageInFirestore(room.code, fbUser.uid, lastMsg).catch(console.error);
      if (actText) addActivityLogInFirestore(room.code, fbUser.uid, actText).catch(console.error);
    }
  };

  const handleStopClass = () => {
    const live = openRoomsRef.current[currentRoomId || ''];
    if (!live || live.phase === 'finished') return;
    const room = cloneRoom(live);
    room.phase = 'stopped';
    appendChatMessage(room, 'Guru', '⏹️', 'Permainan dihentikan oleh Guru.', true);
    const actText = '⏹️ Permainan dihentikan Guru';
    appendActivityLog(room, actText);
    const fbUser = firebaseUserRef.current;
    persistRoomChange(room, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
    if (fbUser && room.hostId === fbUser.uid) {
      updateRoomMetaInFirestore(room.code, { phase: 'stopped' }).catch(console.error);
      const lastMsg = room.messages[room.messages.length - 1];
      if (lastMsg) addChatMessageInFirestore(room.code, fbUser.uid, lastMsg).catch(console.error);
      addActivityLogInFirestore(room.code, fbUser.uid, actText).catch(console.error);
    }
    showToast('Permainan dihentikan.', 'warning');
  };

  const handleUpdateTeacherSettings = async (
    grade: string,
    subject: string,
    topic: string,
    regenerateQuestions = true
  ) => {
    const live = openRoomsRef.current[currentRoomId || ''];
    if (!live) return;
    if (live.phase === 'finished') {
      showToast('Sesi telah selesai. Klik "Mulai Ulang" untuk mengubah pengaturan.', 'info');
      return;
    }
    const room = cloneRoom(live);
    const oldQuestionIds = (room.questions || []).map(q => q.id);
    room.grade = grade;
    room.subject = subject;
    room.topic = topic;

    const freshSeeds = regenerateQuestions ? getFilteredSeedQuestions(grade, subject, topic) : null;
    if (freshSeeds) {
      room.questions = freshSeeds;
      studentAskedHistoryRef.current = {};
    }

    appendChatMessage(room, 'Guru', '📚', `Materi diperbarui: ${grade} • ${subject} (${topic})`, true);
    const actText = `📚 Mapel diubah: ${grade} • ${subject} (${topic})`;
    appendActivityLog(room, actText);
    const fbUser = firebaseUserRef.current;
    persistRoomChange(room, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });

    if (fbUser && room.hostId === fbUser.uid) {
      updateRoomMetaInFirestore(room.code, { grade, subject, topic }).catch(console.error);
      const lastMsg = room.messages[room.messages.length - 1];
      if (lastMsg) addChatMessageInFirestore(room.code, fbUser.uid, lastMsg).catch(console.error);
      addActivityLogInFirestore(room.code, fbUser.uid, actText).catch(console.error);
      if (freshSeeds) {
        replaceQuestionsInFirestore(room.code, oldQuestionIds, freshSeeds).catch(console.error);
      }
    }

    if (!regenerateQuestions) {
      showToast('Pengaturan mapel & materi diterapkan ke seluruh siswa!', 'success');
      return;
    }

    showToast(`Pengaturan diterapkan! Gemini AI sedang menyusun 5 soal ${grade} • ${subject}...`, 'info');
    setIsGeneratingAi(true);
    try {
      const aiQuestions = await requestGeminiQuestionsFromApi(
        grade,
        subject,
        topic,
        5,
        (freshSeeds || []).map(q => q.question)
      );
      const latestRoom = openRoomsRef.current[room.code];
      if (latestRoom) {
        const updatedRoom = cloneRoom(latestRoom);
        updatedRoom.questions = [...aiQuestions, ...(freshSeeds || updatedRoom.questions || [])];
        const currentFbUser = firebaseUserRef.current;
        persistRoomChange(updatedRoom, 'ROOM_UPDATED', { skipServer: Boolean(currentFbUser) });
        if (currentFbUser && updatedRoom.hostId === currentFbUser.uid) {
          await saveQuestionsBatchInFirestore(room.code, aiQuestions);
        }
        showToast(`✨ 5 soal Gemini AI untuk ${grade} • ${subject} (${topic}) siap digunakan!`, 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyusun soal Gemini AI. Bank soal sesuai fase tetap diterapkan.', 'warning');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleTriggerSoundboard = (soundKey: string, soundLabel: string) => {
    playSoundEffect(soundKey, soundEnabled);
    const live = openRoomsRef.current[currentRoomId || ''];
    if (live) {
      const room = cloneRoom(live);
      const actText = `🎹 Guru memicu soundboard: ${soundLabel}`;
      appendChatMessage(room, 'Guru', '🎹', `Memutar soundboard: ${soundLabel}!`, true);
      appendActivityLog(room, actText);
      const fbUser = firebaseUserRef.current;
      persistRoomChange(room, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });

      if (fbUser && room.hostId === fbUser.uid) {
        if (room.phase !== 'finished') {
          triggerSoundboardInFirestore(room.code, soundKey, soundLabel, fbUser.uid).catch(console.error);
        }
        const lastMsg = room.messages[room.messages.length - 1];
        if (lastMsg) addChatMessageInFirestore(room.code, fbUser.uid, lastMsg).catch(console.error);
        addActivityLogInFirestore(room.code, fbUser.uid, actText).catch(console.error);
      } else {
        fetch(`/api/rooms/${encodeURIComponent(room.code)}/soundboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ soundKey, soundLabel, senderId: userProfile.id })
        }).catch(() => {});
      }
    }
    showToast(`🎹 Memutar ${soundLabel}!`, 'success');
    setIsSoundboardOpen(false);
  };

  // --- DEMO & SIMULATION ---
  const handleStartTeacherDemoQuiz = () => {
    const live = openRoomsRef.current[currentRoomId || ''];
    if (!live) return;
    setIsTeacherDemoModalOpen(false);

    const room = cloneRoom(live);
    const demoId = 'demo_teacher_pawn';
    if (!room.players[demoId]) {
      const demoPawn = {
        id: demoId,
        name: 'Demo Guru',
        avatar: '🎓',
        color: '#38bdf8',
        role: 'student' as const,
        isDemo: true,
        position: 1,
        score: 0,
        correctCount: 0,
        answeredCount: 0
      };
      room.players[demoId] = demoPawn;
      const fbUser = firebaseUserRef.current;
      persistRoomChange(room, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
      if (fbUser && room.hostId === fbUser.uid) {
        upsertPlayerInFirestore(room.code, fbUser.uid, demoPawn).catch(console.error);
      }
    }

    const pool = getMatchingQuestionPool(room);
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    setActiveQuiz({
      isOpen: true,
      isDemo: true,
      playerId: demoId,
      question: chosen
    });
  };

  const handleToggleSim = () => {
    const live = openRoomsRef.current[currentRoomId || ''];
    if (!live) return;

    if (isSimRunningRef.current) {
      setIsSimRunning(false);
      isSimRunningRef.current = false;
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
      showToast('Simulasi otomatis siswa dihentikan.', 'info');
      return;
    }

    const room = cloneRoom(live);
    const bots = [
      { id: 'sim_alya', name: 'Alya (Sim)', avatar: '🦄', color: '#ec4899' },
      { id: 'sim_bima', name: 'Bima (Sim)', avatar: '🦁', color: '#f59e0b' },
      { id: 'sim_citra', name: 'Citra (Sim)', avatar: '🐼', color: '#10b981' }
    ];
    const fbUser = firebaseUserRef.current;
    bots.forEach(b => {
      if (!room.players[b.id]) {
        const botPawn = {
          ...b,
          role: 'student' as const,
          isDemo: true,
          position: 1,
          score: 0,
          correctCount: 0,
          answeredCount: 0
        };
        room.players[b.id] = botPawn;
        if (fbUser && room.hostId === fbUser.uid) {
          upsertPlayerInFirestore(room.code, fbUser.uid, botPawn).catch(console.error);
        }
      }
    });
    persistRoomChange(room, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });

    setIsSimRunning(true);
    isSimRunningRef.current = true;
    setIsTeacherDemoModalOpen(false);
    showToast('Simulasi otomatis 3 siswa berjalan di papan 3D!', 'success');

    let botCursor = 0;
    simIntervalRef.current = setInterval(() => {
      const liveRoom = openRoomsRef.current[currentRoomIdRef.current || ''];
      if (!liveRoom || !isSimRunningRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
        setIsSimRunning(false);
        isSimRunningRef.current = false;
        return;
      }
      const nextRoom = cloneRoom(liveRoom);
      const unfinishedBots = bots.filter(b => {
        const p = nextRoom.players?.[b.id];
        return p && (p.position || 1) < 100;
      });
      if (unfinishedBots.length === 0) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
        setIsSimRunning(false);
        isSimRunningRef.current = false;
        showToast('🤖 Semua siswa simulasi telah mencapai Petak 100!', 'success');
        return;
      }
      const bot = unfinishedBots[botCursor % unfinishedBots.length];
      botCursor++;
      const existing = nextRoom.players?.[bot.id];
      if (!existing) return;

      const steps = Math.floor(Math.random() * 4) + 2;
      const updatedBot = {
        ...existing,
        answeredCount: (existing.answeredCount || 0) + 1,
        correctCount: (existing.correctCount || 0) + 1,
        score: (existing.score || 0) + steps * 25
      };
      nextRoom.players[bot.id] = updatedBot;
      executePawnBoardMovement(nextRoom, bot.id, steps, true);
    }, 2400);
  };

  const handleClearDemoPlayers = () => {
    const live = openRoomsRef.current[currentRoomId || ''];
    if (!live) return;
    if (isSimRunningRef.current || simIntervalRef.current) {
      setIsSimRunning(false);
      isSimRunningRef.current = false;
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    const room = cloneRoom(live);
    const demoIds: string[] = [];
    Object.keys(room.players || {}).forEach(pid => {
      if (room.players[pid]?.isDemo) {
        demoIds.push(pid);
        delete room.players[pid];
      }
    });
    const fbUser = firebaseUserRef.current;
    persistRoomChange(room, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
    if (fbUser && room.hostId === fbUser.uid && demoIds.length > 0) {
      clearDemoPlayersInFirestore(room.code, demoIds).catch(console.error);
    }
    setIsTeacherDemoModalOpen(false);
    showToast('Seluruh bidak demo telah dibersihkan dari papan 3D.', 'info');
  };

  // --- CHAT & OTHER ACTIONS ---
  const handleSendChatMessage = (text: string) => {
    const live = openRoomsRef.current[currentRoomId || ''];
    if (!live) return;
    const room = cloneRoom(live);
    const sender = currentUserRole === 'teacher' ? 'Guru Pengajar' : userProfile.name;
    const avatar = currentUserRole === 'teacher' ? '👩‍🏫' : userProfile.avatar;
    appendChatMessage(room, sender, avatar, text, false);
    const lastChat = room.messages[room.messages.length - 1];
    const myPlayer = room.players?.[userProfile.id];
    const fbUser = firebaseUserRef.current;
    persistRoomChange(
      room,
      'ROOM_UPDATED',
      fbUser
        ? { skipServer: true }
        : myPlayer
          ? { playerUpdate: myPlayer, chatMessage: lastChat }
          : undefined
    );
    if (fbUser && lastChat) {
      addChatMessageInFirestore(room.code, fbUser.uid, lastChat).catch(console.error);
    }
  };

  const currentRoom = currentRoomId ? openRooms[currentRoomId] : null;
  let localLeaderboard: any[] = [];
  try {
    localLeaderboard = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEADERBOARD) || '[]');
  } catch (_) {}
  const mergedLeaderboardMap = new Map<string, any>();
  [...localLeaderboard, ...cloudLeaderboard].forEach((item) => {
    if (!item?.id) return;
    const prev = mergedLeaderboardMap.get(item.id);
    if (!prev || (item.score || 0) >= (prev.score || 0)) {
      mergedLeaderboardMap.set(item.id, item);
    }
  });
  const globalLeaderboard = Array.from(mergedLeaderboardMap.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 30);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#060913] text-[#f8fafc] select-none font-sans">
      {/* Toast Container */}
      <div id="toast-container" className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] flex flex-col items-center gap-2 pointer-events-none w-[92vw] max-w-md">
        {toasts.map(t => {
          const styleMap: Record<string, string> = {
            success: 'bg-emerald-950/95 border-emerald-400/60 text-emerald-100',
            warning: 'bg-amber-950/95 border-amber-400/60 text-amber-100',
            error: 'bg-rose-950/95 border-rose-400/60 text-rose-100',
            info: 'bg-slate-900/95 border-indigo-400/50 text-slate-100'
          };
          const iconMap: Record<string, string> = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
          return (
            <div key={t.id} className={`pointer-events-auto px-4 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-extrabold flex items-center gap-2 transition-all duration-300 ${styleMap[t.type] || styleMap.info}`}>
              <span>{iconMap[t.type] || 'ℹ️'}</span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>

      {/* Three.js 3D Canvas */}
      <ThreeCanvas
        room={currentRoom}
        visualThemeMode={visualThemeMode}
        boardElevationStyle={boardElevationStyle}
        boardColorTheme={boardColorTheme}
        snakeStyleConfig={snakeStyleConfig}
        cameraPreset={cameraPreset}
        cameraTrigger={cameraTrigger}
        focusPlayerId={userProfile.id}
      />

      {/* Lobi Utama atau In-Game HUD */}
      {!currentRoom ? (
        <LobbyOverlay
          userProfile={userProfile}
          onUpdateProfile={(prof) => {
            setUserProfile(prof);
            const fbUser = firebaseUserRef.current;
            if (fbUser) {
              syncUserProfileToFirestore(fbUser.uid, prof).catch(console.error);
            }
          }}
          openRooms={Object.values(openRooms)}
          onJoinRoom={handleJoinRoom}
          onOpenTeacherFlow={() => {
            if (isTeacherUnlocked()) {
              setIsCreateModalOpen(true);
            } else {
              setTeacherPinMode('verify');
              setIsTeacherPinModalOpen(true);
            }
          }}
          onOpenGuide={() => setIsFlowGuideOpen(true)}
          onOpenModal={(kind) => setOverlayModalKind(kind)}
          musicEnabled={musicEnabled}
          onToggleMusic={() => {
            const next = !musicEnabled;
            setMusicEnabled(next);
            try { localStorage.setItem('ut3d_music_enabled', String(next)); } catch (_) {}
            if (next) startBackgroundMusic(true, musicStyle);
            else stopAndDisposeBackgroundMusic();
            showToast(next ? '🎵 Musik latar aktif' : '🔇 Musik latar dimatikan', 'info');
          }}
          musicStyle={musicStyle}
          onCycleMusicStyle={() => {
            const keys = ['adventure', 'chill', 'race'];
            const next = keys[(keys.indexOf(musicStyle) + 1) % keys.length];
            setMusicStyle(next);
            try { localStorage.setItem('ut3d_music_style', next); } catch (_) {}
            if (!musicEnabled) setMusicEnabled(true);
            startBackgroundMusic(true, next);
            showToast(`🎶 Gaya musik diubah`, 'info');
          }}
          onDeleteRoom={(code) => {
            setPendingDeleteCode(code);
            if (isTeacherUnlocked()) {
              const fbUser = firebaseUserRef.current;
              const targetRoom = openRooms[code];
              const next = { ...openRooms };
              delete next[code];
              setOpenRooms(next);
              try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(next)); } catch (_) {}
              broadcastChannelRef.current?.postMessage({ type: 'ROOM_DELETED', code });
              if (fbUser && (targetRoom?.hostId === fbUser.uid || fbUser.email === 'kedaikaryacollection@gmail.com')) {
                deleteRoomInFirestore(code).catch(console.error);
              }
              fetch(`/api/rooms/${encodeURIComponent(code)}`, { method: 'DELETE' }).catch(() => {});
              showToast(`Riwayat kelas ${code} telah dihapus.`, 'info');
            } else {
              setTeacherPinMode('delete_room');
              setIsTeacherPinModalOpen(true);
            }
          }}
          authUser={firebaseUser ? { uid: firebaseUser.uid, displayName: firebaseUser.displayName, email: firebaseUser.email, isAnonymous: firebaseUser.isAnonymous } : null}
          authReady={authReady}
          anonAuthDisabled={anonAuthDisabled}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
        />
      ) : (
        <>
          <GameHUD
            room={currentRoom}
            currentUserRole={currentUserRole}
            userProfile={userProfile}
            hasStreakShield={hasStreakShield}
            isAnimatingMove={isAnimatingMove}
            onLeaveRoom={handleLeaveRoom}
            onCopyCode={() => {
              try {
                navigator.clipboard.writeText(currentRoom.code);
                showToast(`Kode kelas "${currentRoom.code}" disalin!`, 'success');
              } catch (_) {
                showToast(`Kode kelas: ${currentRoom.code}`, 'info');
              }
            }}
            onResetCamera={(preset) => {
              setCameraPreset(preset);
              setCameraTrigger(c => c + 1);
            }}
            musicEnabled={musicEnabled}
            onToggleMusic={() => {
              const next = !musicEnabled;
              setMusicEnabled(next);
              if (next) startBackgroundMusic(true, musicStyle);
              else stopAndDisposeBackgroundMusic();
            }}
            musicStyle={musicStyle}
            onCycleMusicStyle={() => {
              const keys = ['adventure', 'chill', 'race'];
              const next = keys[(keys.indexOf(musicStyle) + 1) % keys.length];
              setMusicStyle(next);
              startBackgroundMusic(true, next);
            }}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(s => !s)}
            onStartClass={handleStartClass}
            onPauseClass={handlePauseClass}
            onStopClass={handleStopClass}
            onRestartClass={handleRestartClass}
            onOpenTeacherDemo={() => setIsTeacherDemoModalOpen(true)}
            onOpenAiStudio={() => setIsAiStudioOpen(true)}
            onOpenSoundboard={() => setIsSoundboardOpen(true)}
            onOpenLiveBoard2D={() => setIsLiveBoard2DOpen(true)}
            onOpenHudDrawer={(tab) => {
              setDrawerActiveTab(tab);
              setIsHudDrawerOpen(true);
            }}
            onCycleThemeMode={() => {
              const next = visualThemeMode === 'classic' ? 'modern' : 'classic';
              setVisualThemeMode(next);
              const updated = cloneRoom(currentRoom);
              updated.themeMode = next;
              const fbUser = firebaseUserRef.current;
              persistRoomChange(updated, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
              if (fbUser && currentRoom.hostId === fbUser.uid && currentRoom.phase !== 'finished') {
                updateRoomMetaInFirestore(currentRoom.code, { themeMode: next }).catch(console.error);
              }
              showToast(next === 'modern' ? 'Mode 3D: Perosotan & Lift' : 'Mode 3D: Ular & Tangga', 'info');
            }}
            onOpenSnakeCustomizer={() => setIsSnakeModalOpen(true)}
            onOpenBoardTheme={() => setIsBoardModalOpen(true)}
            onCycleElevation={() => {
              const order: any[] = ['stepped', 'terraced', 'pyramid'];
              const next = order[(order.indexOf(boardElevationStyle) + 1) % order.length];
              setBoardElevationStyle(next);
              const updated = cloneRoom(currentRoom);
              updated.elevationStyle = next;
              const fbUser = firebaseUserRef.current;
              persistRoomChange(updated, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
              if (fbUser && currentRoom.hostId === fbUser.uid && currentRoom.phase !== 'finished') {
                updateRoomMetaInFirestore(currentRoom.code, { elevationStyle: next }).catch(console.error);
              }
              showToast(`Gaya Elevasi: ${next}`, 'info');
            }}
            onOpenChangePin={() => {
              setTeacherPinMode('change');
              setIsTeacherPinModalOpen(true);
            }}
            onEndClassPodium={() => {
              const updated = cloneRoom(currentRoom);
              const fbUser = firebaseUserRef.current;
              if (updated.phase !== 'finished') {
                updated.phase = 'finished';
                persistRoomChange(updated, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
                if (fbUser && currentRoom.hostId === fbUser.uid) {
                  updateRoomMetaInFirestore(currentRoom.code, { phase: 'finished' }).catch(console.error);
                }
              }
              setIsWinnerModalOpen(true);
            }}
            onOpenQuizModal={handleOpenQuiz}
          />

          <HudDrawer
            isOpen={isHudDrawerOpen}
            activeTab={drawerActiveTab}
            onClose={() => setIsHudDrawerOpen(false)}
            onSwitchTab={(tab) => setDrawerActiveTab(tab)}
            room={currentRoom}
            currentUserRole={currentUserRole}
            onSendChatMessage={handleSendChatMessage}
            onUpdateTeacherSettings={handleUpdateTeacherSettings}
            isGeneratingAi={isGeneratingAi}
            onOpenAiStudio={() => setIsAiStudioOpen(true)}
            onOpenSnakeCustomizer={() => setIsSnakeModalOpen(true)}
            onOpenBoardTheme={() => setIsBoardModalOpen(true)}
            onOpenChangePin={() => {
              setTeacherPinMode('change');
              setIsTeacherPinModalOpen(true);
            }}
            globalLeaderboard={globalLeaderboard}
          />
        </>
      )}

      {/* Modals */}
      <TeacherPinModal
        isOpen={isTeacherPinModalOpen}
        mode={teacherPinMode}
        storedPin={getStoredTeacherPin()}
        onClose={() => {
          setIsTeacherPinModalOpen(false);
          setPendingDeleteCode(null);
        }}
        onSuccessVerify={() => {
          try { sessionStorage.setItem(STORAGE_KEYS.TEACHER_SESSION, 'unlocked'); } catch (_) {}
          setIsTeacherPinModalOpen(false);
          setIsCreateModalOpen(true);
        }}
        onChangePinSuccess={(newPin) => {
          try { localStorage.setItem(STORAGE_KEYS.TEACHER_PIN, newPin); } catch (_) {}
          broadcastChannelRef.current?.postMessage({ type: 'TEACHER_PIN_UPDATED', pin: newPin });
          setIsTeacherPinModalOpen(false);
          showToast('PIN Rahasia Guru berhasil diperbarui!', 'success');
        }}
        onDeleteRoomSuccess={() => {
          setIsTeacherPinModalOpen(false);
          if (pendingDeleteCode) {
            const fbUser = firebaseUserRef.current;
            const targetRoom = openRooms[pendingDeleteCode];
            const next = { ...openRooms };
            delete next[pendingDeleteCode];
            setOpenRooms(next);
            try { localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(next)); } catch (_) {}
            broadcastChannelRef.current?.postMessage({ type: 'ROOM_DELETED', code: pendingDeleteCode });
            if (fbUser && (targetRoom?.hostId === fbUser.uid || fbUser.email === 'kedaikaryacollection@gmail.com')) {
              deleteRoomInFirestore(pendingDeleteCode).catch(console.error);
            }
            fetch(`/api/rooms/${encodeURIComponent(pendingDeleteCode)}`, { method: 'DELETE' }).catch(() => {});
            showToast(`Riwayat kelas ${pendingDeleteCode} telah dihapus.`, 'info');
            setPendingDeleteCode(null);
          }
        }}
      />

      <CreateClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateClass={handleCreateClass}
      />

      <QuizModal
        isOpen={activeQuiz.isOpen}
        isDemo={activeQuiz.isDemo}
        grade={currentRoom?.grade || 'Fase C'}
        subject={currentRoom?.subject || 'Matematika'}
        question={activeQuiz.question}
        onClose={() => setActiveQuiz(prev => ({ ...prev, isOpen: false }))}
        onAnswerSubmit={handleAnswerSubmit}
      />

      <AiStudioModal
        isOpen={isAiStudioOpen}
        onClose={() => setIsAiStudioOpen(false)}
        grade={currentRoom?.grade || 'Fase C'}
        subject={currentRoom?.subject || 'IPAS'}
        topic={currentRoom?.topic || 'Rantai Makanan'}
        questions={currentRoom?.questions || getFilteredSeedQuestions(currentRoom?.grade || 'Fase C', currentRoom?.subject || 'IPAS', currentRoom?.topic)}
        isGeneratingAi={isGeneratingAi}
        onGenerateAi={async (g, s, t) => {
          if (!currentRoom) return;
          const roomCode = currentRoom.code;
          setIsGeneratingAi(true);
          try {
            const generated = await requestGeminiQuestionsFromApi(
              g,
              s,
              t,
              5,
              (currentRoom.questions || []).map(q => q.question)
            );
            const liveRoom = openRoomsRef.current[roomCode] || currentRoom;
            const updated = cloneRoom(liveRoom);
            updated.questions = [...generated, ...(updated.questions || [])];
            const fbUser = firebaseUserRef.current;
            persistRoomChange(updated, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
            if (fbUser && updated.hostId === fbUser.uid) {
              await saveQuestionsBatchInFirestore(roomCode, generated);
            }
            showToast(`✨ 5 soal Gemini AI (${g} • ${s}) berhasil ditambahkan!`, 'success');
          } catch (err: any) {
            showToast(err?.message || 'Gagal menghubungi Gemini AI untuk membuat soal.', 'error');
          } finally {
            setIsGeneratingAi(false);
          }
        }}
        onSaveQuestion={(q, editId) => {
          if (!currentRoom) return;
          const updated = cloneRoom(currentRoom);
          if (!updated.questions) updated.questions = [];
          const idx = updated.questions.findIndex(item => item.id === editId);
          const isEdit = idx >= 0;
          if (isEdit) updated.questions[idx] = q;
          else updated.questions.unshift(q);
          const fbUser = firebaseUserRef.current;
          persistRoomChange(updated, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
          if (fbUser && currentRoom.hostId === fbUser.uid) {
            saveQuestionInFirestore(currentRoom.code, q, isEdit).catch(console.error);
          }
          showToast('Soal berhasil disimpan ke kelas!', 'success');
        }}
        onDeleteQuestion={(id) => {
          if (!currentRoom) return;
          const updated = cloneRoom(currentRoom);
          updated.questions = (updated.questions || []).filter(q => q.id !== id);
          const fbUser = firebaseUserRef.current;
          persistRoomChange(updated, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
          if (fbUser && currentRoom.hostId === fbUser.uid) {
            deleteQuestionInFirestore(currentRoom.code, id).catch(console.error);
          }
        }}
      />

      <FlowGuideModal
        isOpen={isFlowGuideOpen}
        onClose={() => setIsFlowGuideOpen(false)}
        storedPin={getStoredTeacherPin()}
      />

      <OverlayModal
        isOpen={overlayModalKind !== null}
        kind={overlayModalKind}
        onClose={() => setOverlayModalKind(null)}
        userProfile={userProfile}
        onUpdateProfile={(prof) => {
          setUserProfile(prof);
          const fbUser = firebaseUserRef.current;
          if (fbUser) {
            syncUserProfileToFirestore(fbUser.uid, prof).catch(console.error);
          }
        }}
        globalLeaderboard={globalLeaderboard}
      />

      <WinnerModal
        isOpen={isWinnerModalOpen}
        room={currentRoom}
        isTeacher={currentUserRole === 'teacher'}
        onClose={() => setIsWinnerModalOpen(false)}
        onRestartClass={handleRestartClass}
      />

      <TeacherDemoModal
        isOpen={isTeacherDemoModalOpen}
        onClose={() => setIsTeacherDemoModalOpen(false)}
        onStartDemoQuiz={handleStartTeacherDemoQuiz}
        isSimRunning={isSimRunning}
        onToggleSim={handleToggleSim}
        onClearDemoPlayers={handleClearDemoPlayers}
      />

      <SnakeCustomizerModal
        isOpen={isSnakeModalOpen}
        onClose={() => setIsSnakeModalOpen(false)}
        snakeStyleConfig={snakeStyleConfig}
        onChangeSnakeStyle={(cfg) => {
          setSnakeStyleConfig(cfg);
          if (currentRoom) {
            const updated = cloneRoom(currentRoom);
            updated.snakeStyle = cfg;
            const fbUser = firebaseUserRef.current;
            persistRoomChange(updated, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
            if (fbUser && currentRoom.hostId === fbUser.uid && currentRoom.phase !== 'finished') {
              updateRoomMetaInFirestore(currentRoom.code, { snakeStyle: cfg }).catch(console.error);
            }
          }
        }}
      />

      <BoardThemeModal
        isOpen={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        boardColorTheme={boardColorTheme}
        onSelectBoardTheme={(themeKey) => {
          setBoardColorTheme(themeKey);
          if (currentRoom) {
            const updated = cloneRoom(currentRoom);
            updated.boardTheme = themeKey;
            const fbUser = firebaseUserRef.current;
            persistRoomChange(updated, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
            if (fbUser && currentRoom.hostId === fbUser.uid && currentRoom.phase !== 'finished') {
              updateRoomMetaInFirestore(currentRoom.code, { boardTheme: themeKey }).catch(console.error);
            }
          }
          showToast(`Nuansa papan diubah`, 'info');
        }}
      />

      <SoundboardModal
        isOpen={isSoundboardOpen}
        onClose={() => setIsSoundboardOpen(false)}
        onTriggerSound={handleTriggerSoundboard}
      />

      <LiveBoard2DModal
        isOpen={isLiveBoard2DOpen}
        onClose={() => setIsLiveBoard2DOpen(false)}
        room={currentRoom}
        currentUserId={userProfile.id}
      />
    </div>
  );
}
