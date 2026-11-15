import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { BIBLICAL_STORIES } from './src/data/biblicalStories.js';
import { RoomState, Player, ClientMessage, ServerMessage, BiblicalStory } from './src/types/game.js';
import { calculatePuzzlePoints, TOTAL_PIECES } from './src/utils/puzzle.js';
import { DEFAULT_VERSES, VERSES_COUNT, VERSES_TIME_LIMIT, buildVerseChallenge, formatMs, verseTotalMs } from './src/utils/verses.js';

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
          // Calculate scores for players who didn't finish
          Object.values(room.players).forEach(p => {
            if (!p.puzzleCompleted) {
              const pts = calculatePuzzlePoints(p.puzzlePiecesPlaced, 120);
              p.score += pts;
            }
          });
          room.stage = 'ABYSS_STAGE';
          room.timerSeconds = 90;
          room.isTimerRunning = true;
          broadcastToRoom(code, {
            type: 'NOTIFICATION',
            payload: { message: '¡Tiempo del rompecabezas terminado! Pasando al Tablero del Abismo.', type: 'info' }
          });
          broadcastToRoom(code, { type: 'STATE_UPDATE', payload: { room } });
        } else if (room.stage === 'ABYSS_STAGE') {
          room.stage = 'ROUND_RECAP';
          calculateLeaderboard(room);
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
      roundPoints: (p.puzzleCompleted ? 600 : p.puzzlePiecesPlaced * 25) + p.abyssPoints,
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
          const hostPlayer: Player = {
            id: hostId,
            name: msg.payload.hostName.trim() || 'Líder Anfitrión',
            avatar: msg.payload.avatar || '👑',
            score: 0,
            isHost: true,
            connected: true,
            puzzlePiecesPlaced: 0,
            puzzleCompleted: false,
            abyssPoints: 0,
            abyssStrikes: 0,
            versesDone: 0,
            verseTimeMs: 0,
            verseMistakes: 0,
            verseFinished: false
          };

          const newRoom: RoomState = {
            code: roomCode,
            stage: 'LOBBY',
            hostId: hostId,
            currentRound: 1,
            totalRounds: msg.payload.rounds || 3,
            timerSeconds: 120,
            isTimerRunning: false,
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
          const newPlayer: Player = {
            id: playerId,
            name: msg.payload.playerName.trim() || `Amigo ${playerCount + 1}`,
            avatar: msg.payload.avatar || '🕊️',
            score: 0,
            isHost: false,
            connected: true,
            puzzlePiecesPlaced: 0,
            puzzleCompleted: false,
            abyssPoints: 0,
            abyssStrikes: 0,
            versesDone: 0,
            verseTimeMs: 0,
            verseMistakes: 0,
            verseFinished: false
          };

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

        case 'HOST_START_VERSES': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId || room.stage !== 'LOBBY') return;

          Object.values(room.players).forEach(p => {
            p.versesDone = 0;
            p.verseTimeMs = 0;
            p.verseMistakes = 0;
            p.verseFinished = false;
          });

          room.stage = 'VERSES_STAGE';
          room.versesStartedAt = Date.now();
          room.timerSeconds = VERSES_TIME_LIMIT;
          room.isTimerRunning = true;

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
              broadcastToRoom(meta.roomCode, {
                type: 'NOTIFICATION',
                payload: { message: `¡${player.name} ordenó los ${room.verses.length} versículos en ${formatMs(verseTotalMs(player))}!`, type: 'success' }
              });
            }
          } else {
            player.verseMistakes += 1;
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

          // La ronda 1 usa la imagen que el anfitrión dejó elegida en la sala de espera
          markStoryUsed(meta.roomCode, room.story.id);

          // Reset round progress for all players
          Object.values(room.players).forEach(p => {
            p.puzzlePiecesPlaced = 0;
            p.puzzleCompleted = false;
            p.puzzleFinishTime = undefined;
            p.abyssPoints = 0;
            p.abyssStrikes = 0;
            p.hasBuzzed = false;
          });

          room.stage = 'PUZZLE_STAGE';
          room.timerSeconds = 120; // 2 minutes for 24 pieces
          room.isTimerRunning = true;
          room.abyssGuessedLetters = [];
          room.abyssStrikes = 0;
          room.abyssSolved = false;
          room.abyssWinnerName = undefined;

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
          if (!room || !room.players[meta.playerId]) return;

          const player = room.players[meta.playerId];
          player.puzzlePiecesPlaced = msg.payload.piecesPlaced;

          broadcastToRoom(meta.roomCode, { type: 'STATE_UPDATE', payload: { room } });
          break;
        }

        case 'PUZZLE_FINISHED': {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || !room.players[meta.playerId]) return;

          const player = room.players[meta.playerId];
          if (!player.puzzleCompleted) {
            player.puzzleCompleted = true;
            player.puzzlePiecesPlaced = TOTAL_PIECES;
            player.puzzleFinishTime = msg.payload.timeTaken;
            const points = calculatePuzzlePoints(TOTAL_PIECES, msg.payload.timeTaken);
            player.score += points;

            broadcastToRoom(meta.roomCode, {
              type: 'NOTIFICATION',
              payload: { message: `¡${player.name} completó el rompecabezas en ${msg.payload.timeTaken}s (+${points} pts)!`, type: 'success' }
            });

            // Check if all players completed
            const allDone = Object.values(room.players).every(p => p.puzzleCompleted);
            if (allDone) {
              room.stage = 'ABYSS_STAGE';
              room.timerSeconds = 90;
              room.isTimerRunning = true;
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
            room.stage = 'ABYSS_STAGE';
            room.timerSeconds = 90;
            room.isTimerRunning = true;
          } else if (room.stage === 'ABYSS_STAGE') {
            room.stage = 'ROUND_RECAP';
            room.isTimerRunning = false;
            calculateLeaderboard(room);
          } else if (room.stage === 'ROUND_RECAP') {
            if (room.currentRound >= room.totalRounds) {
              room.stage = 'FINAL_PODIUM';
              calculateLeaderboard(room);
            } else {
              room.currentRound += 1;
              // Siguiente imagen de la galería que todavía no se haya jugado en esta sala
              room.story = pickUnusedStory(meta.roomCode);
              markStoryUsed(meta.roomCode, room.story.id);
              Object.values(room.players).forEach(p => {
                p.puzzlePiecesPlaced = 0;
                p.puzzleCompleted = false;
                p.hasBuzzed = false;
              });
              room.stage = 'PUZZLE_STAGE';
              room.timerSeconds = 120;
              room.isTimerRunning = true;
              room.abyssGuessedLetters = [];
              room.abyssStrikes = 0;
              room.abyssSolved = false;
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
          room.timerSeconds = 120;
          room.story = BIBLICAL_STORIES[0];
          usedStoryIds.delete(meta.roomCode);
          room.abyssGuessedLetters = [];
          room.abyssStrikes = 0;
          room.abyssSolved = false;
          Object.values(room.players).forEach(p => {
            p.score = 0;
            p.versesDone = 0;
            p.verseTimeMs = 0;
            p.verseMistakes = 0;
            p.verseFinished = false;
            p.puzzlePiecesPlaced = 0;
            p.puzzleCompleted = false;
            p.puzzleFinishTime = undefined;
            p.abyssPoints = 0;
            p.abyssStrikes = 0;
            p.hasBuzzed = false;
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
            broadcastToRoom(meta.roomCode, {
              type: 'NOTIFICATION',
              payload: { message: `"${msg.payload.phrase}" no es la frase correcta. ¡Un tablón se quiebra! (${room.abyssStrikes}/6 fallos)`, type: 'warning' }
            });
          }
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
