import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { BIBLICAL_STORIES } from './src/data/biblicalStories.js';
import { RoomState, Player, ClientMessage, ServerMessage, BiblicalStory } from './src/types/game.js';
import { calculatePuzzlePoints, TOTAL_PIECES } from './src/utils/puzzle.js';
import { DEFAULT_VERSES, VERSES_COUNT, buildVerseChallenge, formatMs, verseTotalMs } from './src/utils/verses.js';
import { ADD_TIME_SECONDS, DEFAULT_SETTINGS, MAX_TIMER_SECONDS, sanitizeSettings } from './src/utils/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Clave de líder (opcional). Si se define la variable de entorno HOST_KEY,
// solo quien la escriba puede crear salas. Sin ella, cualquiera puede crearlas.
const HOST_KEY = (process.env.HOST_KEY || '').trim();

// La app pregunta aquí si debe pedir la clave (nunca se envía la clave misma)
app.get('/api/config', (_req, res) => {
  res.json({ hostKeyRequired: HOST_KEY.length > 0 });
});

// In-memory room store
const rooms = new Map<string, RoomState>();
const socketMeta = new Map<WebSocket, { roomCode: string; playerId: string }>();

// Clave secreta de cada jugador para volver a su sala si recarga o cierra la pestaña.
// Solo se le envía a ese jugador; nunca viaja en el estado de la sala.
const playerTokens = new Map<string, string>();

function createPlayerToken(playerId: string): string {
  const token = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  playerTokens.set(playerId, token);
  return token;
}

// Historias ya jugadas en cada sala, para no repetir imagen entre rondas
const usedStoryIds = new Map<string, Set<string>>();

function markStoryUsed(roomCode: string, storyId: string) {
  const used = usedStoryIds.get(roomCode) ?? new Set<string>();
  used.add(storyId);
  usedStoryIds.set(roomCode, used);
}

function pickUnusedStory(roomCode: string): BiblicalStory {
  const used = usedStoryIds.get(roomCode) ?? new Set<string>();
  return BIBLICAL_STORIES.find(story => !used.has(story.id)) ?? BIBLICAL_STORIES[0];
}

function createPlayer(id: string, name: string, avatar: string, isHost: boolean): Player {
  return {
    id,
    name,
    avatar,
    score: 0,
    isHost,
    connected: true,
    puzzlePiecesPlaced: 0,
    puzzleCompleted: false,
    puzzlePoints: 0,
    abyssPoints: 0,
    abyssStrikes: 0,
    versesDone: 0,
    verseTimeMs: 0,
    verseMistakes: 0,
    versePenaltyMs: 0,
    verseFinished: false
  };
}

function resetVerseStats(p: Player) {
  p.versesDone = 0;
  p.verseTimeMs = 0;
  p.verseMistakes = 0;
  p.versePenaltyMs = 0;
  p.verseFinished = false;
  p.verseFinishOrder = undefined;
}

/** Borra lo de la ronda extra anterior (los puntos acumulados en `score` se conservan) */
function resetRoundStats(p: Player) {
  p.puzzlePiecesPlaced = 0;
  p.puzzleCompleted = false;
  p.puzzleFinishTime = undefined;
  p.puzzlePoints = 0;
  p.abyssPoints = 0;
  p.abyssStrikes = 0;
  p.hasBuzzed = false;
}

function startTimer(room: RoomState, seconds: number) {
  room.timerSeconds = seconds;
  room.isTimerRunning = true;
  room.stageStartedAt = Date.now();
}

/** Abre el rompecabezas de una ronda extra con el tiempo configurado */
function startPuzzle(room: RoomState) {
  Object.values(room.players).forEach(resetRoundStats);
  room.stage = 'PUZZLE_STAGE';
  room.abyssGuessedLetters = [];
  room.abyssStrikes = 0;
  room.abyssSolved = false;
  room.abyssWinnerName = undefined;
  startTimer(room, room.settings.puzzleSeconds);
}

/**
 * Cierra el rompecabezas. Quien no lo terminó recibe 25 puntos por pieza colocada.
 * Se usa igual si se acabó el tiempo o si el anfitrión pulsó "Avanzar".
 */
function closePuzzle(room: RoomState) {
  Object.values(room.players).forEach(p => {
    if (!p.puzzleCompleted && p.puzzlePoints === 0) {
      p.puzzlePoints = calculatePuzzlePoints(p.puzzlePiecesPlaced, room.settings.puzzleSeconds, room.settings.puzzleSeconds);
      p.score += p.puzzlePoints;
    }
  });
  room.stage = 'ABYSS_STAGE';
  startTimer(room, room.settings.abyssSeconds);
}

/** El nombre se resolvió o el puente cayó: el reloj se detiene y el anfitrión decide cuándo seguir */
function stopAbyssIfOver(room: RoomState) {
  if (room.abyssSolved || room.abyssStrikes >= 6) room.isTimerRunning = false;
}

function finishRound(room: RoomState) {
  room.stage = 'ROUND_RECAP';
  room.isTimerRunning = false;
  calculateLeaderboard(room);
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function broadcastToRoom(roomCode: string, message: ServerMessage) {
  const payload = JSON.stringify(message);
  for (const [ws, meta] of socketMeta.entries()) {
    if (meta.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// Global 1-second timer tick for active game rooms
setInterval(() => {
  for (const [code, room] of rooms.entries()) {
    if (room.isTimerRunning && room.timerSeconds > 0) {
      room.timerSeconds -= 1;
      broadcastToRoom(code, {
        type: 'TIMER_TICK',
        payload: { seconds: room.timerSeconds }
      });

      if (room.timerSeconds <= 0) {
        room.isTimerRunning = false;
        // Auto transition on timeout
        if (room.stage === 'VERSES_STAGE') {
          finishVerses(code, room, '¡Se acabó el tiempo! Veamos la tabla de resultados.');
        } else if (room.stage === 'PUZZLE_STAGE') {
          closePuzzle(room);
          broadcastToRoom(code, {
            type: 'NOTIFICATION',
            payload: { message: '¡Tiempo del rompecabezas terminado! Pasando al Tablero del Abismo.', type: 'info' }
          });
          broadcastToRoom(code, { type: 'STATE_UPDATE', payload: { room } });
        } else if (room.stage === 'ABYSS_STAGE') {
          finishRound(room);
          broadcastToRoom(code, {
            type: 'NOTIFICATION',
            payload: { message: '¡Ronda finalizada! Veamos las puntuaciones.', type: 'info' }
          });
          broadcastToRoom(code, { type: 'STATE_UPDATE', payload: { room } });
        }
      }
    }
  }
}, 1000);

// Cierra el juego de versículos y muestra la tabla oficial
function finishVerses(roomCode: string, room: RoomState, message: string) {
  room.stage = 'VERSES_RESULTS';
  room.isTimerRunning = false;
  broadcastToRoom(roomCode, { type: 'NOTIFICATION', payload: { message, type: 'info' } });
  broadcastToRoom(roomCode, { type: 'STATE_UPDATE', payload: { room } });
}

function calculateLeaderboard(room: RoomState) {
  const sorted = Object.values(room.players)
    .sort((a, b) => b.score - a.score)
    .map(p => ({
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      roundPoints: p.puzzlePoints + p.abyssPoints,
      totalScore: p.score
    }));
  room.roundLeaderboard = sorted;
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: string) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());

      switch (msg.type) {
        case 'CREATE_ROOM': {
          if (HOST_KEY && (msg.payload.hostKey || '').trim() !== HOST_KEY) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: 'Clave de líder incorrecta. Solo el líder puede crear salas.' }
            }));
            return;
          }

          const roomCode = generateRoomCode();
          const hostId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const hostPlayer = createPlayer(hostId, msg.payload.hostName.trim() || 'Líder Anfitrión', msg.payload.avatar || '👑', true);

          const newRoom: RoomState = {
            code: roomCode,
            stage: 'LOBBY',
            hostId: hostId,
            currentRound: 1,
            totalRounds: msg.payload.rounds || 3,
            timerSeconds: DEFAULT_SETTINGS.puzzleSeconds,
            isTimerRunning: false,
            settings: { ...DEFAULT_SETTINGS },
            story: msg.payload.customStory || BIBLICAL_STORIES[0],
            players: { [hostId]: hostPlayer },
            abyssGuessedLetters: [],
            abyssStrikes: 0,
            abyssSolved: false,
            verses: DEFAULT_VERSES.map(buildVerseChallenge)
          };

          rooms.set(roomCode, newRoom);
          socketMeta.set(ws, { roomCode, playerId: hostId });

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            payload: { room: newRoom, playerId: hostId, token: createPlayerToken(hostId) }
          }));
          break;
        }

        case 'REJOIN_ROOM': {
          const code = msg.payload.roomCode.toUpperCase().trim();
          const room = rooms.get(code);
          const player = room?.players[msg.payload.playerId];
          const validToken = playerTokens.get(msg.payload.playerId) === msg.payload.token;

          if (!room || !player || !validToken) {
            ws.send(JSON.stringify({ type: 'REJOIN_FAILED' }));
            return;
          }

          // Si quedaba una conexión vieja de este jugador, se desvincula
          for (const [otherWs, meta] of socketMeta.entries()) {
            if (otherWs !== ws && meta.playerId === player.id) socketMeta.delete(otherWs);
          }

          player.connected = true;
          socketMeta.set(ws, { roomCode: code, playerId: player.id });

          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            payload: { room, playerId: player.id, token: msg.payload.token }
          }));
          broadcastToRoom(code, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'JOIN_ROOM': {
          const code = msg.payload.roomCode.toUpperCase().trim();
          const room = rooms.get(code);

          if (!room) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: `No se encontró la sala con código "${code}". Verifica el código del anfitrión.` }
            }));
            return;
          }

          const playerCount = Object.keys(room.players).length;
          if (playerCount >= 30) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: 'La sala ha alcanzado el límite máximo de participantes.' }
            }));
            return;
          }

          const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const newPlayer = createPlayer(playerId, msg.payload.playerName.trim() || `Amigo ${playerCount + 1}`, msg.payload.avatar || '🕊️', false);

          room.players[playerId] = newPlayer;
          socketMeta.set(ws, { roomCode: code, playerId });

          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            payload: { room, playerId, token: createPlayerToken(playerId) }
          }));

          broadcastToRoom(code, {
            type: 'NOTIFICATION',
            payload: { message: `¡${newPlayer.name} se unió a la sala!`, type: 'info' }
          });
          broadcastToRoom(code, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'HOST_SELECT_STORY': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          room.story = msg.payload.story;
          if (room.stage !== 'LOBBY') markStoryUsed(meta.roomCode, room.story.id);

          // Sin título: el aviso lo ven todos y revelaría la respuesta
          broadcastToRoom(meta.roomCode, {
            type: 'NOTIFICATION',
            payload: { message: 'El anfitrión eligió una nueva imagen bíblica.', type: 'info' }
          });
          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'HOST_ADD_CUSTOM_STORY': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          room.story = msg.payload.story;
          if (room.stage !== 'LOBBY') markStoryUsed(meta.roomCode, room.story.id);

          broadcastToRoom(meta.roomCode, {
            type: 'NOTIFICATION',
            payload: { message: '¡El anfitrión cargó una imagen bíblica personalizada!', type: 'success' }
          });
          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'HOST_SET_VERSES': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId || room.stage !== 'LOBBY') return;

          const verses = (msg.payload.verses || [])
            .slice(0, VERSES_COUNT)
            .map(v => buildVerseChallenge({
              reference: String(v.reference || '').slice(0, 60),
              text: String(v.text || '').slice(0, 500)
            }));

          if (verses.length !== VERSES_COUNT || verses.some(v => v.phrases.length < 3)) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: `Se necesitan ${VERSES_COUNT} versículos y cada uno debe quedar con al menos 3 frases.` }
            }));
            return;
          }

          room.verses = verses;
          // Sin el texto: el aviso lo ven todos
          broadcastToRoom(meta.roomCode, {
            type: 'NOTIFICATION',
            payload: { message: 'El anfitrión actualizó los versículos del juego.', type: 'info' }
          });
          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'HOST_SET_SETTINGS': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          // Los tiempos nuevos se usan desde la próxima etapa que empiece
          room.settings = sanitizeSettings(msg.payload.settings, room.settings);
          broadcastToRoom(meta.roomCode, {
            type: 'NOTIFICATION',
            payload: { message: 'El anfitrión ajustó los tiempos del juego.', type: 'info' }
          });
          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'HOST_ADD_TIME': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId || !room.isTimerRunning) return;

          const seconds = Math.min(300, Math.max(15, Math.round(Number(msg.payload.seconds) || ADD_TIME_SECONDS)));
          room.timerSeconds = Math.min(MAX_TIMER_SECONDS, room.timerSeconds + seconds);
          broadcastToRoom(meta.roomCode, {
            type: 'NOTIFICATION',
            payload: { message: `⏱️ El anfitrión agregó ${seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`} al reloj.`, type: 'info' }
          });
          broadcastToRoom(meta.roomCode, { type: 'TIMER_TICK', payload: { seconds: room.timerSeconds } });
          break;
        }

        case 'HOST_START_VERSES': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId || room.stage !== 'LOBBY') return;

          Object.values(room.players).forEach(resetVerseStats);

          room.stage = 'VERSES_STAGE';
          room.versesStartedAt = Date.now();
          startTimer(room, room.settings.versesSeconds);

          broadcastToRoom(meta.roomCode, {
            type: 'NOTIFICATION',
            payload: { message: '¡Comienza el juego! Ordena los versículos lo más rápido que puedas.', type: 'success' }
          });
          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'VERSE_SUBMIT': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.stage !== 'VERSES_STAGE') return;
          const player = room.players[meta.playerId];
          if (!player || player.verseFinished) return;

          // Solo se acepta el versículo que le toca a este jugador
          const verseIndex = player.versesDone;
          const verse = room.verses[verseIndex];
          if (!verse || msg.payload.verseIndex !== verseIndex) return;

          const order = Array.isArray(msg.payload.order) ? msg.payload.order : [];
          const correct = order.length === verse.phrases.length && verse.phrases.every((phrase, i) => order[i] === phrase);

          if (correct) {
            player.versesDone += 1;
            player.verseTimeMs = Date.now() - (room.versesStartedAt ?? Date.now());
            if (player.versesDone >= room.verses.length) {
              player.verseFinished = true;
              player.verseFinishOrder = Object.values(room.players).filter(p => p.verseFinished).length;
              // El aviso muestra el tiempo real y, si hubo errores, el castigo: así se entiende
              // por qué alguien que terminó antes puede quedar más abajo en la tabla
              const penaltyText = player.versePenaltyMs > 0
                ? ` + ${player.versePenaltyMs / 1000} s por errores = ${formatMs(verseTotalMs(player))}`
                : '';
              broadcastToRoom(meta.roomCode, {
                type: 'NOTIFICATION',
                payload: { message: `¡${player.name} ordenó los ${room.verses.length} versículos en ${formatMs(player.verseTimeMs)}${penaltyText}!`, type: 'success' }
              });
            }
          } else {
            player.verseMistakes += 1;
            player.versePenaltyMs += room.settings.versePenaltySeconds * 1000;
          }

          ws.send(JSON.stringify({ type: 'VERSE_RESULT', payload: { verseIndex, correct } }));

          // Cuando terminan todos los que siguen conectados, se muestra la tabla
          const active = Object.values(room.players).filter(p => p.connected);
          if (active.length > 0 && active.every(p => p.verseFinished)) {
            finishVerses(meta.roomCode, room, '¡Todos terminaron! Veamos la tabla de resultados.');
          } else {
            broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          }
          break;
        }

        case 'HOST_START_ROUND': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;
          if (room.stage !== 'LOBBY' && room.stage !== 'VERSES_RESULTS') return;

          // Empiezan las rondas extra: su tabla arranca en cero
          room.currentRound = 1;
          Object.values(room.players).forEach(p => {
            p.score = 0;
          });

          // La ronda 1 usa la imagen que el anfitrión dejó elegida
          markStoryUsed(meta.roomCode, room.story.id);
          startPuzzle(room);

          broadcastToRoom(meta.roomCode, {
            type: 'NOTIFICATION',
            payload: { message: `¡Comienza la ronda ${room.currentRound}! A armar el rompecabezas.`, type: 'success' }
          });
          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'PUZZLE_PIECE_SNAP': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.stage !== 'PUZZLE_STAGE' || !room.players[meta.playerId]) return;

          const player = room.players[meta.playerId];
          if (player.puzzleCompleted) return;
          // Nunca baja: si alguien recarga, su tablero empieza de cero pero conserva lo que ya llevaba
          const pieces = Math.min(TOTAL_PIECES, Math.max(0, Math.floor(Number(msg.payload.piecesPlaced) || 0)));
          player.puzzlePiecesPlaced = Math.max(player.puzzlePiecesPlaced, pieces);

          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'PUZZLE_FINISHED': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.stage !== 'PUZZLE_STAGE' || !room.players[meta.playerId]) return;

          const player = room.players[meta.playerId];
          if (!player.puzzleCompleted) {
            // El tiempo lo mide el servidor con el mismo reloj para todos
            const secondsTaken = Math.max(1, Math.round((Date.now() - (room.stageStartedAt ?? Date.now())) / 1000));
            player.puzzleCompleted = true;
            player.puzzlePiecesPlaced = TOTAL_PIECES;
            player.puzzleFinishTime = secondsTaken;
            player.puzzlePoints = calculatePuzzlePoints(TOTAL_PIECES, secondsTaken, room.settings.puzzleSeconds);
            player.score += player.puzzlePoints;

            broadcastToRoom(meta.roomCode, {
              type: 'NOTIFICATION',
              payload: { message: `¡${player.name} completó el rompecabezas en ${secondsTaken} s (+${player.puzzlePoints} pts)!`, type: 'success' }
            });

            // Check if all players completed
            const allDone = Object.values(room.players).filter(p => p.connected).every(p => p.puzzleCompleted);
            if (allDone) {
              closePuzzle(room);
              broadcastToRoom(meta.roomCode, {
                type: 'NOTIFICATION',
                payload: { message: '¡Todos armaron el puzzle! Entrando al reto "Sin Caer al Abismo"...', type: 'info' }
              });
            }

            broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          }
          break;
        }

        case 'HOST_NEXT_STAGE': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          if (room.stage === 'VERSES_STAGE') {
            finishVerses(meta.roomCode, room, 'El anfitrión cerró el juego. Veamos la tabla de resultados.');
            break;
          } else if (room.stage === 'PUZZLE_STAGE') {
            closePuzzle(room);
          } else if (room.stage === 'ABYSS_STAGE') {
            finishRound(room);
          } else if (room.stage === 'ROUND_RECAP') {
            if (room.currentRound >= room.totalRounds) {
              room.stage = 'FINAL_PODIUM';
              calculateLeaderboard(room);
            } else {
              room.currentRound += 1;
              // Siguiente imagen de la galería que todavía no se haya jugado en esta sala
              room.story = pickUnusedStory(meta.roomCode);
              markStoryUsed(meta.roomCode, room.story.id);
              startPuzzle(room);
            }
          }
          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'HOST_RESET_GAME': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          room.currentRound = 1;
          room.stage = 'LOBBY';
          room.isTimerRunning = false;
          room.timerSeconds = room.settings.puzzleSeconds;
          room.story = BIBLICAL_STORIES[0];
          usedStoryIds.delete(meta.roomCode);
          room.abyssGuessedLetters = [];
          room.abyssStrikes = 0;
          room.abyssSolved = false;
          room.abyssWinnerName = undefined;
          Object.values(room.players).forEach(p => {
            p.score = 0;
            resetVerseStats(p);
            resetRoundStats(p);
          });

          broadcastToRoom(meta.roomCode, {
            type: 'NOTIFICATION',
            payload: { message: 'El anfitrión ha reiniciado la partida. ¡Listos para un nuevo juego!', type: 'info' }
          });
          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'ABYSS_GUESS_LETTER': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.stage !== 'ABYSS_STAGE' || room.abyssSolved || room.abyssStrikes >= 6) return;

          const letter = normalizeText(msg.payload.letter);
          if (!letter || room.abyssGuessedLetters.includes(letter)) return;

          room.abyssGuessedLetters.push(letter);
          const targetNorm = normalizeText(room.story.phrase);
          const player = room.players[meta.playerId];

          if (targetNorm.includes(letter)) {
            // Count occurrences
            const count = targetNorm.split('').filter(ch => ch === letter).length;
            const awardedPoints = count * 50;
            if (player) {
              player.score += awardedPoints;
              player.abyssPoints += awardedPoints;
            }

            // Check if whole phrase is revealed
            const uniqueTargetLetters = new Set(targetNorm.replace(/[^A-ZÑ]/g, '').split(''));
            const allGuessed = Array.from(uniqueTargetLetters).every(l => room.abyssGuessedLetters.includes(l));

            if (allGuessed) {
              room.abyssSolved = true;
              room.abyssWinnerName = player ? player.name : 'Equipo';
              if (player) {
                player.score += 200; // Bonus for completing
                player.abyssPoints += 200;
              }
              broadcastToRoom(meta.roomCode, {
                type: 'NOTIFICATION',
                payload: { message: `¡Gloria a Dios! Frase completada: "${room.story.phrase}".`, type: 'success' }
              });
            } else {
              broadcastToRoom(meta.roomCode, {
                type: 'NOTIFICATION',
                payload: { message: `¡Letra "${letter}" correcta! (+${awardedPoints} pts)`, type: 'success' }
              });
            }
          } else {
            room.abyssStrikes += 1;
            if (player) {
              player.abyssStrikes += 1;
            }
            if (room.abyssStrikes >= 6) {
              broadcastToRoom(meta.roomCode, {
                type: 'NOTIFICATION',
                payload: { message: `¡Cuidado! Se quebró el último tablón del puente. La frase era: "${room.story.phrase}".`, type: 'warning' }
              });
            } else {
              broadcastToRoom(meta.roomCode, {
                type: 'NOTIFICATION',
                payload: { message: `La letra "${letter}" no está. ¡Se quiebra un tablón! (${room.abyssStrikes}/6 fallos)`, type: 'warning' }
              });
            }
          }

          stopAbyssIfOver(room);
          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'ABYSS_GUESS_PHRASE': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.stage !== 'ABYSS_STAGE' || room.abyssSolved || room.abyssStrikes >= 6) return;

          const guessNorm = normalizeText(msg.payload.phrase);
          const targetNorm = normalizeText(room.story.phrase);
          const player = room.players[meta.playerId];

          if (guessNorm === targetNorm) {
            room.abyssSolved = true;
            room.abyssWinnerName = player ? player.name : 'Equipo';
            const bonus = 350;
            if (player) {
              player.score += bonus;
              player.abyssPoints += bonus;
            }
            broadcastToRoom(meta.roomCode, {
              type: 'NOTIFICATION',
              payload: { message: `¡${player?.name || 'Alguien'} adivinó la frase completa: "${room.story.phrase}"! (+${bonus} pts)`, type: 'success' }
            });
          } else {
            room.abyssStrikes += 1;
            if (player) player.abyssStrikes += 1;
            const tail = room.abyssStrikes >= 6
              ? ` Se quebró el último tablón. La respuesta era: "${room.story.phrase}".`
              : ` ¡Un tablón se quiebra! (${room.abyssStrikes}/6 fallos)`;
            broadcastToRoom(meta.roomCode, {
              type: 'NOTIFICATION',
              payload: { message: `"${String(msg.payload.phrase).slice(0, 40)}" no es la respuesta.${tail}`, type: 'warning' }
            });
          }
          stopAbyssIfOver(room);
          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'BUZZER_PRESS': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;
          const player = room.players[meta.playerId];
          if (!player) return;

          player.hasBuzzed = true;
          broadcastToRoom(meta.roomCode, {
            type: 'NOTIFICATION',
            payload: { message: `🔔 ¡${player.name} presionó el pulsador para responder!`, type: 'info' }
          });
          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'SEND_REACTION': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;
          const player = room.players[meta.playerId];
          broadcastToRoom(meta.roomCode, {
            type: 'REACTION_EVENT',
            payload: {
              playerId: meta.playerId,
              playerName: player?.name || 'Amigo',
              emoji: msg.payload.emoji
            }
          });
          break;
        }
      }
    } catch (err) {
      console.error('Error parsing client message:', err);
    }
  });

  ws.on('close', () => {
    const meta = socketMeta.get(ws);
    if (meta) {
      const room = rooms.get(meta.roomCode);
      if (room && room.players[meta.playerId]) {
        room.players[meta.playerId].connected = false;
        broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
      }
      socketMeta.delete(ws);
    }
  });
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`Conexión Amistad Bíblica Server running on port ${PORT}`);
  });
}

startServer();
