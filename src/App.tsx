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
  saveQuestionInFirestore,
  subscribeToRoomRealtime,
  subscribeToTeacherRooms,
  syncUserProfileToFirestore,
  triggerSoundboardInFirestore,
  updateRoomMetaInFirestore,
  upsertPlayerInFirestore
} from './services/firestoreRooms';
import { PlayerProfile, RoomData, QuestionItem } from './types';
import { STORAGE_KEYS, DEFAULT_TEACHER_PIN, PAWN_COLORS, SEED_QUESTION_BANK, LADDERS, SNAKES } from './constants';
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
  const [consecutiveCorrectCount, setConsecutiveCorrectCount] = useState(0);
  const [hasStreakShield, setHasStreakShield] = useState(false);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const studentAskedHistoryRef = useRef<Record<string, Set<string>>>({});
  const simIntervalRef = useRef<any>(null);

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
            if (isAnimatingMoveRef.current && base.players?.[myId] && mergedPlayers[myId]) {
              mergedPlayers[myId] = {
                ...mergedPlayers[myId],
                position: base.players[myId].position
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

    let questions = SEED_QUESTION_BANK.filter(q => config.subject === 'Campuran' || q.subject === config.subject);
    if (config.autoAi || questions.length < 5) {
      questions = [...buildAiQuestionsForTopic(config.grade, config.subject, config.topic), ...questions];
    }

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
      questions,
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

    appendChatMessage(newRoom, 'Sistem', '🏫', `Kelas "${config.className}" (${config.grade} • ${config.subject}) dibuka oleh Guru. Kode: ${code}`, true);
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
        if (res.ok) {
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
      } catch (err) {
        console.error('Join Firestore error:', err);
        showToast('Gagal bergabung ke kelas Cloud.', 'error');
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
        if (joinRes.ok) {
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
    setIsLiveBoard2DOpen(false);
    setCurrentRoomId(null);
    setCurrentUserRole('student');
    setIsHudDrawerOpen(false);
  };

  // --- AI QUESTION BUILDER ---
  const buildAiQuestionsForTopic = (grade: string, subject: string, topic: string) => {
    const cleanTopic = (topic || 'Materi Umum').trim();
    const uid = () => 'ai_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const a = Math.floor(Math.random() * 12) + 4;
    const b = Math.floor(Math.random() * 9) + 3;

    if (subject === 'Matematika') {
      return [
        {
          id: uid(), grade, subject, topic: cleanTopic,
          question: `[${grade} • ${cleanTopic}] Berapakah hasil dari (${a} × ${b}) + ${a}?`,
          options: [String(a * b + a), String(a * b + b), String(a * b - a), String((a + 1) * b)],
          correctIndex: 0, steps: 3,
          explanation: `${a} × ${b} = ${a * b}, lalu ditambah ${a} menjadi ${a * b + a}.`
        },
        {
          id: uid(), grade, subject, topic: cleanTopic,
          question: `[${grade} • ${cleanTopic}] Sebuah persegi memiliki panjang sisi ${a} cm. Berapa kelilingnya?`,
          options: [`${a * 2} cm`, `${a * 4} cm`, `${a * a} cm`, `${a + 4} cm`],
          correctIndex: 1, steps: 3,
          explanation: `Keliling persegi = 4 × sisi = 4 × ${a} = ${a * 4} cm.`
        },
        {
          id: uid(), grade, subject, topic: cleanTopic,
          question: `[${grade} • ${cleanTopic}] Bilangan manakah yang merupakan kelipatan dari ${b}?`,
          options: [String(b * 4 + 1), String(b * 5), String(b * 3 + 2), String(b * 2 + 1)],
          correctIndex: 1, steps: 3,
          explanation: `${b} × 5 = ${b * 5}, sehingga habis dibagi ${b}.`
        },
        {
          id: uid(), grade, subject, topic: cleanTopic,
          question: `[${grade} • ${cleanTopic}] Jika 1 jam = 60 menit, maka ${b} jam sama dengan ... menit.`,
          options: [`${b * 30} menit`, `${b * 60} menit`, `${b * 100} menit`, `${b * 45} menit`],
          correctIndex: 1, steps: 4,
          explanation: `${b} × 60 menit = ${b * 60} menit.`
        },
        {
          id: uid(), grade, subject, topic: cleanTopic,
          question: `[${grade} • ${cleanTopic}] Nilai tempat angka 7 pada bilangan 4.725 adalah ...`,
          options: ['Satuan', 'Puluhan', 'Ratusan', 'Ribuan'],
          correctIndex: 2, steps: 3,
          explanation: 'Pada bilangan 4.725, angka 7 menempati posisi ratusan (700).'
        }
      ];
    }

    return [
      {
        id: uid(), grade, subject, topic: cleanTopic,
        question: `[${grade} • ${subject}] Konsep utama yang dipelajari pada materi "${cleanTopic}" bertujuan untuk ...`,
        options: [
          'Memahami penerapan konsep dalam kehidupan sehari-hari',
          'Menghafal tanpa memahami makna',
          'Mengabaikan bukti ilmiah dan fakta',
          'Menghindari kerja sama dalam kelompok'
        ],
        correctIndex: 0, steps: 3,
        explanation: `Pembelajaran ${cleanTopic} pada ${grade} menekankan pemahaman konsep dan penerapannya.`
      },
      {
        id: uid(), grade, subject, topic: cleanTopic,
        question: `[${grade} • ${subject}] Sikap yang tepat saat berdiskusi tentang materi "${cleanTopic}" di kelas adalah ...`,
        options: [
          'Memotong pembicaraan teman',
          'Mendengarkan pendapat teman dengan saling menghargai',
          'Tidak mau menerima masukan',
          'Berdiam diri tanpa berpartisipasi'
        ],
        correctIndex: 1, steps: 3,
        explanation: 'Menghargai pendapat teman mencerminkan profil pelajar yang kolaboratif.'
      },
      {
        id: uid(), grade, subject, topic: cleanTopic,
        question: `[${grade} • ${subject}] Langkah pertama yang paling efektif dalam menganalisis persoalan "${cleanTopic}" adalah ...`,
        options: [
          'Langsung menebak jawaban akhir',
          'Mengidentifikasi informasi penting dan tujuan masalah',
          'Melewati petunjuk soal',
          'Menyalin jawaban tanpa memeriksa'
        ],
        correctIndex: 1, steps: 4,
        explanation: 'Mengidentifikasi informasi penting membantu menentukan strategi penyelesaian yang tepat.'
      },
      {
        id: uid(), grade, subject, topic: cleanTopic,
        question: `[${grade} • ${subject}] Mengapa kita perlu mengaitkan materi "${cleanTopic}" dengan lingkungan sekitar?`,
        options: [
          'Agar pembelajaran lebih bermakna dan mudah diterapkan',
          'Agar materi menjadi lebih sulit dipahami',
          'Karena tidak ada hubungannya dengan kehidupan',
          'Supaya tidak perlu belajar di kelas'
        ],
        correctIndex: 0, steps: 3,
        explanation: 'Pembelajaran kontekstual membantu siswa memahami manfaat nyata ilmu yang dipelajari.'
      },
      {
        id: uid(), grade, subject, topic: cleanTopic,
        question: `[${grade} • ${subject}] Evaluasi hasil belajar pada topik "${cleanTopic}" dilakukan untuk ...`,
        options: [
          'Mengetahui bagian yang sudah dikuasai dan perlu ditingkatkan',
          'Membanding-bandingkan kelemahan teman',
          'Menghentikan proses belajar',
          'Menghindari tantangan soal baru'
        ],
        correctIndex: 0, steps: 3,
        explanation: 'Evaluasi membantu mengukur pemahaman serta memperbaiki strategi belajar.'
      }
    ];
  };

  const generateDynamicInfiniteQuestion = (room: RoomData) => {
    const batch = buildAiQuestionsForTopic(room.grade, room.subject === 'Campuran' ? 'Matematika' : room.subject, room.topic);
    return batch[Math.floor(Math.random() * batch.length)];
  };

  // --- QUIZ & MOVEMENT ---
  const handleOpenQuiz = () => {
    const room = openRooms[currentRoomId || ''];
    if (!room || isAnimatingMove) return;
    if (room.phase !== 'playing') {
      showToast('Tunggu Guru memulai atau melanjutkan kelas terlebih dahulu.', 'warning');
      return;
    }

    const pool = (room.questions && room.questions.length > 0) ? room.questions : SEED_QUESTION_BANK;
    if (!studentAskedHistoryRef.current[userProfile.id]) {
      studentAskedHistoryRef.current[userProfile.id] = new Set();
    }
    const askedSet = studentAskedHistoryRef.current[userProfile.id];

    let candidates = pool.filter(q => !askedSet.has(q.id));
    let chosen: QuestionItem;

    if (candidates.length > 0) {
      chosen = candidates[Math.floor(Math.random() * candidates.length)];
      askedSet.add(chosen.id);
    } else {
      chosen = generateDynamicInfiniteQuestion(room);
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
        if (!activeQuiz.isDemo) {
          const updatedProf = { ...userProfileRef.current, totalAnswered: (userProfileRef.current.totalAnswered || 0) + 1 };
          syncUserProfileToFirestore(fbUser.uid, updatedProf).catch(console.error);
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
          latestPlayer.position = 100;
          latestPlayer.score = (latestPlayer.score || 0) + 200;
          latestRoom.players[playerId] = latestPlayer;
          if (!isDemo) {
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
          const winText = `🏆 ${latestPlayer.avatar} ${latestPlayer.name} mencapai Puncak Petak 100!`;
          appendActivityLog(latestRoom, winText);
          if (!isDemo) {
            latestRoom.phase = 'finished';
            persistRoomChange(latestRoom, 'ROOM_UPDATED', {
              playerUpdate: latestPlayer,
              activityText: winText,
              phase: 'finished',
              skipServer: Boolean(currentFbUser)
            });
            if (currentFbUser) {
              upsertPlayerInFirestore(roomCode, currentFbUser.uid, latestPlayer)
                .then(() => updateRoomMetaInFirestore(roomCode, { phase: 'finished' }))
                .catch(console.error);
              addActivityLogInFirestore(roomCode, currentFbUser.uid, winText).catch(console.error);
            }
            setIsWinnerModalOpen(true);
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
  const handleStartClass = () => {
    const live = openRoomsRef.current[currentRoomId || ''];
    if (!live) return;
    if (live.phase === 'finished') {
      showToast('Kelas telah selesai. Buat kelas baru untuk sesi berikutnya.', 'info');
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

  const handleUpdateTeacherSettings = (grade: string, subject: string, topic: string) => {
    const live = openRoomsRef.current[currentRoomId || ''];
    if (!live || live.phase === 'finished') return;
    const room = cloneRoom(live);
    room.grade = grade;
    room.subject = subject;
    room.topic = topic;
    appendChatMessage(room, 'Guru', '📚', `Materi diperbarui: ${grade} • ${subject} (${topic})`, true);
    const actText = `📚 Mapel diubah: ${grade} • ${subject}`;
    appendActivityLog(room, actText);
    const fbUser = firebaseUserRef.current;
    persistRoomChange(room, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
    if (fbUser && room.hostId === fbUser.uid) {
      updateRoomMetaInFirestore(room.code, { grade, subject, topic }).catch(console.error);
      const lastMsg = room.messages[room.messages.length - 1];
      if (lastMsg) addChatMessageInFirestore(room.code, fbUser.uid, lastMsg).catch(console.error);
      addActivityLogInFirestore(room.code, fbUser.uid, actText).catch(console.error);
    }
    showToast('Pengaturan mapel & materi diterapkan ke seluruh siswa!', 'success');
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

    const pool = room.questions && room.questions.length > 0 ? room.questions : SEED_QUESTION_BANK;
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
      const bot = bots[botCursor % bots.length];
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
        onClose={() => setIsTeacherPinModalOpen(false)}
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
        subject={currentRoom?.subject || 'Matematika'}
        topic={currentRoom?.topic || 'Umum'}
        questions={currentRoom?.questions || SEED_QUESTION_BANK}
        onGenerateAi={(g, s, t) => {
          if (!currentRoom) return;
          const generated = buildAiQuestionsForTopic(g, s, t);
          const updated = cloneRoom(currentRoom);
          updated.questions = [...generated, ...(updated.questions || [])];
          const fbUser = firebaseUserRef.current;
          persistRoomChange(updated, 'ROOM_UPDATED', { skipServer: Boolean(fbUser) });
          if (fbUser && currentRoom.hostId === fbUser.uid) {
            generated.forEach(q => {
              saveQuestionInFirestore(currentRoom.code, q, false).catch(console.error);
            });
          }
          showToast('5 soal baru berhasil dibuat oleh AI!', 'success');
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
        onClose={() => setIsWinnerModalOpen(false)}
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
