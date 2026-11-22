import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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

