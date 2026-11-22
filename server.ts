import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RoomRecord {
  code: string;
  updatedAt: number;
  players?: Record<string, any>;
  [key: string]: any;
}

const roomsStore = new Map<string, RoomRecord>();
const roomSubscribers = new Map<string, Set<express.Response>>();
const lobbySubscribers = new Set<express.Response>();

function broadcastLobbyUpdate() {
  const list = Array.from(roomsStore.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const payload = `data: ${JSON.stringify({ type: 'LOBBY_UPDATED', rooms: list })}\n\n`;
  for (const res of lobbySubscribers) {
    try {
      res.write(payload);
    } catch {
      lobbySubscribers.delete(res);
    }
  }
}

function broadcastRoomEvent(code: string, event: Record<string, any>) {
  const subs = roomSubscribers.get(code);
  if (!subs) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of subs) {
    try {
      res.write(payload);
    } catch {
      subs.delete(res);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Server-side Gemini AI question generation endpoint
  app.post('/api/generate-questions', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di server. Tambahkan pada Settings > Secrets (AI Studio) atau Environment Variables (Vercel).'
      });
      return;
    }

    try {
      const body = req.body || {};
      const grade = String(body.grade || 'Fase C').trim().slice(0, 40);
      const subject = String(body.subject || 'IPAS').trim().slice(0, 40);
      const topic = String(body.topic || 'Umum').trim().slice(0, 120);
      const count = Math.max(1, Math.min(10, Math.floor(Number(body.count) || 5)));
      const existingQuestions = Array.isArray(body.existingQuestions)
        ? body.existingQuestions.slice(0, 15).map((q: any) => String(q || '').slice(0, 200))
        : [];

      const phaseGuide: Record<string, string> = {
        'Fase A': 'Kelas 1–2 SD (usia 6–8 tahun). Gunakan kalimat sangat singkat, sederhana, konkret, dan dekat dengan kehidupan sehari-hari anak.',
        'Fase B': 'Kelas 3–4 SD (usia 8–10 tahun). Gunakan bahasa jelas dan lugas tentang konsep dasar serta pengamatan sederhana.',
        'Fase C': 'Kelas 5–6 SD (usia 10–12 tahun). Uji pemahaman konsep nyata, hubungan sebab-akibat, penalaran terapan, dan contoh kehidupan sehari-hari.',
        'Fase D': 'Kelas 7–9 SMP (usia 12–15 tahun). Uji analisis ilmiah/matematis lebih mendalam, istilah baku, dan pemecahan masalah tingkat SMP.'
      };

      const avoidSection =
        existingQuestions.length > 0
          ? `\nHindari mengulang atau memparafrase soal-soal berikut:\n- ${existingQuestions.join('\n- ')}`
          : '';

      const prompt = [
        `Buat tepat ${count} soal pilihan ganda Kurikulum Merdeka Indonesia.`,
        `Fase Pembelajaran: ${grade} (${phaseGuide[grade] || phaseGuide['Fase C']})`,
        `Mata Pelajaran: ${subject}`,
        `Materi/Topik Utama: ${topic}`,
        '',
        'Aturan wajib:',
        '1. Setiap soal HARUS menguji pengetahuan/pemahaman konten materi di atas secara akurat (JANGAN membuat soal umum tentang sikap berdiskusi atau tujuan belajar topik tersebut, kecuali materinya memang tentang hal itu).',
        '2. Sesuaikan tingkat kesulitan, kosakata, dan kedalaman konsep tepat dengan Fase yang diminta.',
        '3. Setiap soal memiliki tepat 4 pilihan jawaban yang masuk akal, tidak ambigu, dan hanya 1 jawaban benar.',
        '4. Berikan `steps` antara 2 sampai 5 (2–3 untuk soal dasar, 4–5 untuk soal analisis/HOTS).',
        '5. Berikan `explanation` singkat (1–2 kalimat) yang edukatif menjelaskan alasan jawaban benar.',
        avoidSection
      ].join('\n');

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Anda adalah guru profesional dan penyusun soal Kurikulum Merdeka Indonesia (SD/SMP). Susun soal pilihan ganda yang akurat secara keilmuan, sesuai fase usia siswa, jelas, dan langsung menguji materi yang diminta.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: 'Pertanyaan pilihan ganda yang jelas dan spesifik.' },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Tepat 4 opsi jawaban berbeda.'
                },
                correctIndex: { type: Type.INTEGER, description: 'Indeks opsi benar (0 sampai 3).' },
                steps: { type: Type.INTEGER, description: 'Bobot langkah antara 2 sampai 5.' },
                explanation: { type: Type.STRING, description: 'Pembahasan singkat mengapa jawaban tersebut benar.' }
              },
              required: ['question', 'options', 'correctIndex', 'steps', 'explanation']
            }
          }
        }
      });

      const rawText = (response.text ?? '[]').trim();
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        res.status(502).json({ error: 'Gemini AI tidak mengembalikan daftar soal yang valid.' });
        return;
      }

      const questions = parsed.slice(0, count).map((item: any, idx: number) => {
        const opts = Array.isArray(item.options) && item.options.length >= 2
          ? item.options.slice(0, 4).map((o: any) => String(o || '').trim()).filter(Boolean)
          : ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'];
        while (opts.length < 4) opts.push(`Pilihan ${String.fromCharCode(65 + opts.length)}`);
        const cIdx = Math.max(0, Math.min(opts.length - 1, Math.floor(Number(item.correctIndex) || 0)));
        const steps = Math.max(2, Math.min(5, Math.floor(Number(item.steps) || 3)));
        return {
          id: `ai_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          grade,
          subject,
          topic,
          question: String(item.question || '').trim().slice(0, 500),
          options: opts,
          correctIndex: cIdx,
          steps,
          explanation: String(item.explanation || '').trim().slice(0, 500)
        };
      }).filter((q: any) => q.question.length > 0);

      res.json({ questions });
    } catch (err: any) {
      console.error('Gemini question generation error:', err);
      const status = Number(err?.status) || 500;
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: err?.message || 'Gagal menghubungi Gemini AI untuk membuat soal.'
      });
    }
  });

  // SSE stream for lobby room list
  app.get('/api/rooms-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    lobbySubscribers.add(res);
    const list = Array.from(roomsStore.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    res.write(`data: ${JSON.stringify({ type: 'LOBBY_UPDATED', rooms: list })}\n\n`);

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAlive);
      lobbySubscribers.delete(res);
    });
  });

  // List all active rooms
  app.get('/api/rooms', (_req, res) => {
    const list = Array.from(roomsStore.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    res.json({ rooms: list });
  });

  // Get single room
  app.get('/api/rooms/:code', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const room = roomsStore.get(code);
    if (!room) {
      res.status(404).json({ error: 'Kelas tidak ditemukan' });
      return;
    }
    res.json({ room });
  });

  // Create or upsert room
  app.post('/api/rooms', (req, res) => {
    const room = req.body?.room as RoomRecord | undefined;
    if (!room || !room.code) {
      res.status(400).json({ error: 'Data kelas tidak valid' });
      return;
    }
    const code = String(room.code).trim().toUpperCase();
    const saved: RoomRecord = { ...room, code, updatedAt: Date.now() };
    roomsStore.set(code, saved);
    broadcastRoomEvent(code, { type: 'ROOM_UPDATED', room: saved });
    broadcastLobbyUpdate();
    res.json({ room: saved });
  });

  // Join room (merges player cleanly without overwriting other concurrent players)
  app.post('/api/rooms/:code/join', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const room = roomsStore.get(code);
    if (!room) {
      res.status(404).json({ error: 'Kelas tidak ditemukan' });
      return;
    }
    const player = req.body?.player;
    const chatMessage = req.body?.chatMessage;
    const activityText = req.body?.activityText;

    if (!room.players) room.players = {};
    if (player && player.id) {
      const existing = room.players[player.id];
      room.players[player.id] = existing
        ? { ...existing, name: player.name, avatar: player.avatar }
        : player;
    }
    if (chatMessage) {
      if (!Array.isArray(room.messages)) room.messages = [];
      room.messages.push(chatMessage);
      room.messages = room.messages.slice(-50);
    }
    if (activityText) {
      if (!Array.isArray(room.activityLog)) room.activityLog = [];
      room.activityLog.unshift({
        text: activityText,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      });
      room.activityLog = room.activityLog.slice(0, 25);
    }

    room.updatedAt = Date.now();
    roomsStore.set(code, room);
    broadcastRoomEvent(code, { type: 'ROOM_UPDATED', room });
    broadcastLobbyUpdate();
    res.json({ room });
  });

  // Update room (supports partial player move or full room sync)
  app.put('/api/rooms/:code', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const incoming = req.body?.room as RoomRecord | undefined;
    const playerUpdate = req.body?.playerUpdate;
    const activityText = req.body?.activityText;
    const chatMessage = req.body?.chatMessage;

    const existing = roomsStore.get(code);

    if (playerUpdate && existing) {
      if (!existing.players) existing.players = {};
      existing.players[playerUpdate.id] = playerUpdate;
      if (activityText) {
        if (!Array.isArray(existing.activityLog)) existing.activityLog = [];
        existing.activityLog.unshift({
          text: activityText,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        });
        existing.activityLog = existing.activityLog.slice(0, 25);
      }
      if (chatMessage) {
        if (!Array.isArray(existing.messages)) existing.messages = [];
        existing.messages.push(chatMessage);
        existing.messages = existing.messages.slice(-50);
      }
      if (req.body?.phase) {
        existing.phase = req.body.phase;
      }
      existing.updatedAt = Date.now();
      roomsStore.set(code, existing);
      broadcastRoomEvent(code, { type: 'ROOM_UPDATED', room: existing });
      broadcastLobbyUpdate();
      res.json({ room: existing });
      return;
    }

    if (!incoming) {
      res.status(400).json({ error: 'Data pembaruan kelas kosong' });
      return;
    }

    // Merge players to avoid losing newly joined students when teacher updates settings
    const mergedPlayers = {
      ...(existing?.players || {}),
      ...(incoming.players || {})
    };
    const saved: RoomRecord = {
      ...(existing || {}),
      ...incoming,
      code,
      players: mergedPlayers,
      updatedAt: Date.now()
    };
    roomsStore.set(code, saved);
    broadcastRoomEvent(code, { type: 'ROOM_UPDATED', room: saved });
    broadcastLobbyUpdate();
    res.json({ room: saved });
  });

  // Trigger real-time soundboard event to all connected students
  app.post('/api/rooms/:code/soundboard', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const { soundKey, soundLabel, senderId } = req.body || {};
    if (!soundKey) {
      res.status(400).json({ error: 'soundKey wajib diisi' });
      return;
    }
    broadcastRoomEvent(code, { type: 'SOUNDBOARD', soundKey, soundLabel, senderId });
    res.json({ ok: true });
  });

  // Delete room
  app.delete('/api/rooms/:code', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    roomsStore.delete(code);
    broadcastRoomEvent(code, { type: 'ROOM_DELETED', code });
    broadcastLobbyUpdate();
    res.json({ ok: true });
  });

  // SSE stream for a specific room
  app.get('/api/rooms/:code/stream', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    if (!roomSubscribers.has(code)) {
      roomSubscribers.set(code, new Set());
    }
    roomSubscribers.get(code)!.add(res);

    const existing = roomsStore.get(code);
    if (existing) {
      res.write(`data: ${JSON.stringify({ type: 'ROOM_UPDATED', room: existing })}\n\n`);
    }

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAlive);
      roomSubscribers.get(code)?.delete(res);
    });
  });

  // Vite middleware in development, static files in production
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    const port = Number(process.env.PORT) || 3000;
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening on http://0.0.0.0:${port}`);
    });
  }

  return app;
}

const appPromise = startServer();
export default appPromise;

