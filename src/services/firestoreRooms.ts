import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  ActivityLogItem,
  ChatMessage,
  PlayerPawn,
  PlayerProfile,
  QuestionItem,
  RoomData
} from '../types';

export function sanitizeId(raw: string): string {
  const cleaned = String(raw || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return cleaned || `id_${Date.now()}`;
}

export function sanitizeRoomCode(raw: string): string {
  return String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9_\-]/g, '').slice(0, 16);
}

function toMillis(ts: any): number {
  if (!ts) return Date.now();
  if (typeof ts === 'number') return ts;
  if (ts instanceof Timestamp) return ts.toMillis();
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  return Date.now();
}

export async function createRoomInFirestore(room: RoomData, hostUid: string): Promise<void> {
  const code = sanitizeRoomCode(room.code);
  const roomPath = `rooms/${code}`;
  try {
    await setDoc(doc(db, 'rooms', code), {
      code,
      name: (room.name || 'Kelas Edukasi').slice(0, 100),
      grade: (room.grade || 'Fase C').slice(0, 40),
      subject: (room.subject || 'Matematika').slice(0, 40),
      topic: (room.topic || 'Umum').slice(0, 120),
      themeMode: room.themeMode === 'modern' ? 'modern' : 'classic',
      elevationStyle: room.elevationStyle || 'stepped',
      boardTheme: room.boardTheme || 'rainbow',
      snakeStyle: {
        colorPreset: String(room.snakeStyle?.colorPreset || 'green').slice(0, 30),
        customHex: String(room.snakeStyle?.customHex || '#ffffff').slice(0, 16),
        patternPreset: String(room.snakeStyle?.patternPreset || 'diamond').slice(0, 30)
      },
      phase: 'waiting',
      hostId: hostUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const batch = writeBatch(db);
    const teacherPawn = room.players?.[hostUid];
    batch.set(doc(db, 'rooms', code, 'players', hostUid), {
      id: hostUid,
      roomCode: code,
      uid: hostUid,
      name: (teacherPawn?.name || 'Guru Pengajar').slice(0, 50),
      avatar: (teacherPawn?.avatar || '👩‍🏫').slice(0, 16),
      color: (teacherPawn?.color || '#f59e0b').slice(0, 24),
      role: 'teacher',
      isDemo: false,
      position: 1,
      score: 0,
      correctCount: 0,
      answeredCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    (room.questions || []).slice(0, 40).forEach((q, idx) => {
      const qId = sanitizeId(q.id || `q_${Date.now()}_${idx}`);
      const options = (q.options && q.options.length >= 2 ? q.options : ['A', 'B']).slice(0, 6).map(o => String(o).slice(0, 200));
      const correctIdx = Math.max(0, Math.min(options.length - 1, Math.floor(q.correctIndex || 0)));
      batch.set(doc(db, 'rooms', code, 'questions', qId), {
        id: qId,
        roomCode: code,
        grade: String(q.grade || room.grade || 'Fase C').slice(0, 40),
        subject: String(q.subject || room.subject || 'Matematika').slice(0, 40),
        topic: String(q.topic || room.topic || 'Umum').slice(0, 120),
        question: String(q.question || 'Pertanyaan').slice(0, 600),
        options,
        correctIndex: correctIdx,
        steps: Math.max(1, Math.min(12, Math.floor(q.steps || 3))),
        explanation: String(q.explanation || '').slice(0, 600),
        createdAt: serverTimestamp()
      });
    });

    const firstMsg = room.messages?.[0];
    if (firstMsg) {
      const mId = sanitizeId(firstMsg.id || `msg_${Date.now()}`);
      batch.set(doc(db, 'rooms', code, 'messages', mId), {
        id: mId,
        roomCode: code,
        senderUid: hostUid,
        senderName: String(firstMsg.senderName || 'Sistem').slice(0, 50),
        avatar: String(firstMsg.avatar || '🏫').slice(0, 16),
        text: String(firstMsg.text || 'Kelas dibuka').slice(0, 300),
        isSystem: Boolean(firstMsg.isSystem),
        time: String(firstMsg.time || '00:00').slice(0, 20),
        createdAt: serverTimestamp()
      });
    }

    const firstLog = room.activityLog?.[0];
    if (firstLog) {
      const lId = sanitizeId(`log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
      batch.set(doc(db, 'rooms', code, 'activityLog', lId), {
        id: lId,
        roomCode: code,
        uid: hostUid,
        text: String(firstLog.text || 'Kelas dibuat').slice(0, 300),
        time: String(firstLog.time || '00:00').slice(0, 20),
        createdAt: serverTimestamp()
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, roomPath);
  }
}

export async function fetchRoomFromFirestore(code: string): Promise<RoomData | null> {
  const cleanCode = sanitizeRoomCode(code);
  if (!cleanCode) return null;
  const path = `rooms/${cleanCode}`;
  try {
    const snap = await getDoc(doc(db, 'rooms', cleanCode));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      code: d.code,
      name: d.name,
      grade: d.grade,
      subject: d.subject,
      topic: d.topic,
      themeMode: d.themeMode || 'classic',
      elevationStyle: d.elevationStyle || 'stepped',
      boardTheme: d.boardTheme || 'rainbow',
      snakeStyle: d.snakeStyle || { colorPreset: 'green', customHex: '#ffffff', patternPreset: 'diamond' },
      phase: d.phase || 'waiting',
      hostId: d.hostId,
      questions: [],
      players: {},
      messages: [],
      activityLog: [],
      createdAt: toMillis(d.createdAt),
      updatedAt: toMillis(d.updatedAt)
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function joinRoomInFirestore(
  code: string,
  uid: string,
  player: PlayerPawn,
  joinActivityText: string
): Promise<void> {
  const cleanCode = sanitizeRoomCode(code);
  const playerPath = `rooms/${cleanCode}/players/${uid}`;
  try {
    const playerRef = doc(db, 'rooms', cleanCode, 'players', uid);
    const existingSnap = await getDoc(playerRef);
    const isNew = !existingSnap.exists();

    if (isNew) {
      await setDoc(playerRef, {
        id: uid,
        roomCode: cleanCode,
        uid,
        name: String(player.name || 'Siswa').slice(0, 50),
        avatar: String(player.avatar || '🦊').slice(0, 16),
        color: String(player.color || '#6366f1').slice(0, 24),
        role: 'student',
        isDemo: false,
        position: Math.max(1, Math.min(100, Math.floor(player.position || 1))),
        score: Math.max(0, Math.floor(player.score || 0)),
        correctCount: Math.max(0, Math.floor(player.correctCount || 0)),
        answeredCount: Math.max(0, Math.floor(player.answeredCount || 0)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const msgId = sanitizeId(`msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
      const logId = sanitizeId(`log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
      const batch = writeBatch(db);
      batch.set(doc(db, 'rooms', cleanCode, 'messages', msgId), {
        id: msgId,
        roomCode: cleanCode,
        senderUid: uid,
        senderName: String(player.name || 'Siswa').slice(0, 50),
        avatar: String(player.avatar || '🦊').slice(0, 16),
        text: 'bergabung ke dalam kelas!',
        isSystem: true,
        time: nowTime,
        createdAt: serverTimestamp()
      });
      batch.set(doc(db, 'rooms', cleanCode, 'activityLog', logId), {
        id: logId,
        roomCode: cleanCode,
        uid,
        text: joinActivityText.slice(0, 300),
        time: nowTime,
        createdAt: serverTimestamp()
      });
      await batch.commit();
    } else {
      await updateDoc(playerRef, {
        name: String(player.name || 'Siswa').slice(0, 50),
        avatar: String(player.avatar || '🦊').slice(0, 16),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, playerPath);
  }
}

export async function updateRoomMetaInFirestore(
  code: string,
  updates: Partial<Pick<RoomData, 'grade' | 'subject' | 'topic' | 'themeMode' | 'elevationStyle' | 'boardTheme' | 'snakeStyle' | 'phase'>>
): Promise<void> {
  const cleanCode = sanitizeRoomCode(code);
  const path = `rooms/${cleanCode}`;
  try {
    const payload: Record<string, any> = { updatedAt: serverTimestamp() };
    if (updates.grade !== undefined) payload.grade = String(updates.grade).slice(0, 40);
    if (updates.subject !== undefined) payload.subject = String(updates.subject).slice(0, 40);
    if (updates.topic !== undefined) payload.topic = String(updates.topic).slice(0, 120);
    if (updates.themeMode !== undefined) payload.themeMode = updates.themeMode;
    if (updates.elevationStyle !== undefined) payload.elevationStyle = updates.elevationStyle;
    if (updates.boardTheme !== undefined) payload.boardTheme = updates.boardTheme;
    if (updates.snakeStyle !== undefined) payload.snakeStyle = updates.snakeStyle;
    if (updates.phase !== undefined) payload.phase = updates.phase;
    await updateDoc(doc(db, 'rooms', cleanCode), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function triggerSoundboardInFirestore(
  code: string,
  soundKey: string,
  soundLabel: string,
  senderId: string
): Promise<void> {
  const cleanCode = sanitizeRoomCode(code);
  const path = `rooms/${cleanCode}`;
  try {
    await updateDoc(doc(db, 'rooms', cleanCode), {
      soundboardTrigger: {
        soundKey: String(soundKey).slice(0, 32),
        soundLabel: String(soundLabel).slice(0, 60),
        senderId: String(senderId).slice(0, 128),
        triggeredAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function upsertPlayerInFirestore(
  code: string,
  ownerUid: string,
  player: PlayerPawn
): Promise<void> {
  const cleanCode = sanitizeRoomCode(code);
  const playerId = sanitizeId(player.id);
  const path = `rooms/${cleanCode}/players/${playerId}`;
  try {
    const ref = doc(db, 'rooms', cleanCode, 'players', playerId);
    if (player.isDemo) {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: playerId,
          roomCode: cleanCode,
          uid: ownerUid,
          name: String(player.name || 'Demo').slice(0, 50),
          avatar: String(player.avatar || '🎓').slice(0, 16),
          color: String(player.color || '#38bdf8').slice(0, 24),
          role: 'student',
          isDemo: true,
          position: Math.max(1, Math.min(100, Math.floor(player.position || 1))),
          score: Math.max(0, Math.floor(player.score || 0)),
          correctCount: Math.max(0, Math.floor(player.correctCount || 0)),
          answeredCount: Math.max(0, Math.floor(player.answeredCount || 0)),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return;
      }
    }
    await updateDoc(ref, {
      position: Math.max(1, Math.min(100, Math.floor(player.position || 1))),
      score: Math.max(0, Math.floor(player.score || 0)),
      correctCount: Math.max(0, Math.floor(player.correctCount || 0)),
      answeredCount: Math.max(0, Math.floor(player.answeredCount || 0)),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function clearDemoPlayersInFirestore(code: string, demoPlayerIds: string[]): Promise<void> {
  const cleanCode = sanitizeRoomCode(code);
  const path = `rooms/${cleanCode}/players`;
  try {
    const batch = writeBatch(db);
    demoPlayerIds.forEach(pid => {
      batch.delete(doc(db, 'rooms', cleanCode, 'players', sanitizeId(pid)));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveQuestionInFirestore(code: string, q: QuestionItem, isEdit: boolean): Promise<void> {
  const cleanCode = sanitizeRoomCode(code);
  const qId = sanitizeId(q.id);
  const path = `rooms/${cleanCode}/questions/${qId}`;
  try {
    const options = (q.options && q.options.length >= 2 ? q.options : ['A', 'B']).slice(0, 6).map(o => String(o).slice(0, 200));
    const correctIndex = Math.max(0, Math.min(options.length - 1, Math.floor(q.correctIndex || 0)));
    const payload = {
      grade: String(q.grade || 'Fase C').slice(0, 40),
      subject: String(q.subject || 'Matematika').slice(0, 40),
      topic: String(q.topic || 'Umum').slice(0, 120),
      question: String(q.question || '').slice(0, 600),
      options,
      correctIndex,
      steps: Math.max(1, Math.min(12, Math.floor(q.steps || 3))),
      explanation: String(q.explanation || '').slice(0, 600)
    };
    if (isEdit) {
      await updateDoc(doc(db, 'rooms', cleanCode, 'questions', qId), payload);
    } else {
      await setDoc(doc(db, 'rooms', cleanCode, 'questions', qId), {
        id: qId,
        roomCode: cleanCode,
        ...payload,
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteQuestionInFirestore(code: string, questionId: string): Promise<void> {
  const cleanCode = sanitizeRoomCode(code);
  const qId = sanitizeId(questionId);
  const path = `rooms/${cleanCode}/questions/${qId}`;
  try {
    await deleteDoc(doc(db, 'rooms', cleanCode, 'questions', qId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function addChatMessageInFirestore(
  code: string,
  senderUid: string,
  msg: ChatMessage
): Promise<void> {
  const cleanCode = sanitizeRoomCode(code);
  const msgId = sanitizeId(msg.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const path = `rooms/${cleanCode}/messages/${msgId}`;
  try {
    await setDoc(doc(db, 'rooms', cleanCode, 'messages', msgId), {
      id: msgId,
      roomCode: cleanCode,
      senderUid,
      senderName: String(msg.senderName || 'Pemain').slice(0, 50),
      avatar: String(msg.avatar || '💬').slice(0, 16),
      text: String(msg.text || '').slice(0, 300),
      isSystem: Boolean(msg.isSystem),
      time: String(msg.time || '00:00').slice(0, 20),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function addActivityLogInFirestore(
  code: string,
  uid: string,
  text: string,
  time?: string
): Promise<void> {
  const cleanCode = sanitizeRoomCode(code);
  const logId = sanitizeId(`log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const path = `rooms/${cleanCode}/activityLog/${logId}`;
  try {
    await setDoc(doc(db, 'rooms', cleanCode, 'activityLog', logId), {
      id: logId,
      roomCode: cleanCode,
      uid,
      text: String(text || '').slice(0, 300),
      time: String(time || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })).slice(0, 20),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteRoomInFirestore(code: string): Promise<void> {
  const cleanCode = sanitizeRoomCode(code);
  const path = `rooms/${cleanCode}`;
  try {
    await deleteDoc(doc(db, 'rooms', cleanCode));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToTeacherRooms(
  hostUid: string,
  onRooms: (rooms: RoomData[]) => void
): () => void {
  const path = 'rooms';
  const q = query(collection(db, 'rooms'), where('hostId', '==', hostUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: RoomData[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        list.push({
          code: d.code,
          name: d.name,
          grade: d.grade,
          subject: d.subject,
          topic: d.topic,
          themeMode: d.themeMode || 'classic',
          elevationStyle: d.elevationStyle || 'stepped',
          boardTheme: d.boardTheme || 'rainbow',
          snakeStyle: d.snakeStyle || { colorPreset: 'green', customHex: '#ffffff', patternPreset: 'diamond' },
          phase: d.phase || 'waiting',
          hostId: d.hostId,
          questions: [],
          players: {},
          messages: [],
          activityLog: [],
          createdAt: toMillis(d.createdAt),
          updatedAt: toMillis(d.updatedAt)
        });
      });
      onRooms(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToRoomRealtime(
  code: string,
  callbacks: {
    onRoomMeta: (meta: Partial<RoomData>, soundboard?: { soundKey: string; soundLabel: string; senderId: string; triggeredAtMs: number }) => void;
    onRoomDeleted: () => void;
    onPlayers: (players: Record<string, PlayerPawn>) => void;
    onQuestions: (questions: QuestionItem[]) => void;
    onMessages: (messages: ChatMessage[]) => void;
    onActivityLog: (logs: ActivityLogItem[]) => void;
  }
): () => void {
  const cleanCode = sanitizeRoomCode(code);
  let sawExistingRoom = false;

  const unsubRoom = onSnapshot(
    doc(db, 'rooms', cleanCode),
    (snap) => {
      if (!snap.exists()) {
        if (sawExistingRoom) callbacks.onRoomDeleted();
        return;
      }
      sawExistingRoom = true;
      const d = snap.data();
      const sb = d.soundboardTrigger
        ? {
            soundKey: d.soundboardTrigger.soundKey,
            soundLabel: d.soundboardTrigger.soundLabel,
            senderId: d.soundboardTrigger.senderId,
            triggeredAtMs: toMillis(d.soundboardTrigger.triggeredAt)
          }
        : undefined;

      callbacks.onRoomMeta(
        {
          code: d.code,
          name: d.name,
          grade: d.grade,
          subject: d.subject,
          topic: d.topic,
          themeMode: d.themeMode || 'classic',
          elevationStyle: d.elevationStyle || 'stepped',
          boardTheme: d.boardTheme || 'rainbow',
          snakeStyle: d.snakeStyle || { colorPreset: 'green', customHex: '#ffffff', patternPreset: 'diamond' },
          phase: d.phase || 'waiting',
          hostId: d.hostId,
          createdAt: toMillis(d.createdAt),
          updatedAt: toMillis(d.updatedAt)
        },
        sb
      );
    },
    (error) => handleFirestoreError(error, OperationType.GET, `rooms/${cleanCode}`)
  );

  const unsubPlayers = onSnapshot(
    query(collection(db, 'rooms', cleanCode, 'players'), where('roomCode', '==', cleanCode)),
    (snap) => {
      const players: Record<string, PlayerPawn> = {};
      snap.forEach(docSnap => {
        const p = docSnap.data();
        players[p.id] = {
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          color: p.color,
          role: p.role,
          isDemo: Boolean(p.isDemo),
          position: p.position || 1,
          score: p.score || 0,
          correctCount: p.correctCount || 0,
          answeredCount: p.answeredCount || 0
        };
      });
      callbacks.onPlayers(players);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, `rooms/${cleanCode}/players`)
  );

  const unsubQuestions = onSnapshot(
    query(collection(db, 'rooms', cleanCode, 'questions'), where('roomCode', '==', cleanCode)),
    (snap) => {
      const raw: Array<QuestionItem & { _ts: number }> = [];
      snap.forEach(docSnap => {
        const q = docSnap.data();
        raw.push({
          id: q.id,
          grade: q.grade,
          subject: q.subject,
          topic: q.topic,
          question: q.question,
          options: q.options || [],
          correctIndex: q.correctIndex || 0,
          steps: q.steps || 3,
          explanation: q.explanation || '',
          _ts: toMillis(q.createdAt)
        });
      });
      raw.sort((a, b) => b._ts - a._ts);
      callbacks.onQuestions(raw.map(({ _ts, ...item }) => item));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, `rooms/${cleanCode}/questions`)
  );

  const unsubMessages = onSnapshot(
    query(collection(db, 'rooms', cleanCode, 'messages'), where('roomCode', '==', cleanCode)),
    (snap) => {
      const raw: Array<ChatMessage & { _ts: number }> = [];
      snap.forEach(docSnap => {
        const m = docSnap.data();
        raw.push({
          id: m.id,
          senderName: m.senderName,
          avatar: m.avatar,
          text: m.text,
          isSystem: Boolean(m.isSystem),
          time: m.time || '',
          _ts: toMillis(m.createdAt)
        });
      });
      raw.sort((a, b) => a._ts - b._ts);
      callbacks.onMessages(raw.slice(-50).map(({ _ts, ...item }) => item));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, `rooms/${cleanCode}/messages`)
  );

  const unsubLogs = onSnapshot(
    query(collection(db, 'rooms', cleanCode, 'activityLog'), where('roomCode', '==', cleanCode)),
    (snap) => {
      const raw: Array<ActivityLogItem & { _ts: number }> = [];
      snap.forEach(docSnap => {
        const l = docSnap.data();
        raw.push({
          text: l.text,
          time: l.time || '',
          _ts: toMillis(l.createdAt)
        });
      });
      raw.sort((a, b) => b._ts - a._ts);
      callbacks.onActivityLog(raw.slice(0, 25).map(({ _ts, ...item }) => item));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, `rooms/${cleanCode}/activityLog`)
  );

  return () => {
    unsubRoom();
    unsubPlayers();
    unsubQuestions();
    unsubMessages();
    unsubLogs();
  };
}

export async function syncUserProfileToFirestore(uid: string, profile: PlayerProfile): Promise<void> {
  const path = `users/${uid}`;
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        id: uid,
        name: String(profile.name || 'Siswa Pintar').slice(0, 40),
        avatar: String(profile.avatar || '🦊').slice(0, 16),
        color: String(profile.color || '#6366f1').slice(0, 24),
        totalScore: Math.max(0, Math.floor(profile.totalScore || 0)),
        totalAnswered: Math.max(0, Math.floor(profile.totalAnswered || 0)),
        totalCorrect: Math.max(0, Math.floor(profile.totalCorrect || 0)),
        gamesWon: Math.max(0, Math.floor(profile.gamesWon || 0)),
        subjectStats: profile.subjectStats || {},
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'leaderboard', uid),
      {
        id: uid,
        name: String(profile.name || 'Siswa Pintar').slice(0, 40),
        avatar: String(profile.avatar || '🦊').slice(0, 16),
        score: Math.max(0, Math.floor(profile.totalScore || 0)),
        wins: Math.max(0, Math.floor(profile.gamesWon || 0)),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchGlobalLeaderboardFromFirestore(): Promise<Array<{ id: string; name: string; avatar: string; score: number; wins: number }>> {
  const path = 'leaderboard';
  try {
    const q = query(collection(db, 'leaderboard'), where('score', '>=', 0), orderBy('score', 'desc'), limit(30));
    const snap = await getDocs(q);
    const items: Array<{ id: string; name: string; avatar: string; score: number; wins: number }> = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      items.push({
        id: d.id,
        name: d.name,
        avatar: d.avatar,
        score: d.score || 0,
        wins: d.wins || 0
      });
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
