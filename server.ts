import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { BIBLICAL_STORIES } from './src/data/biblicalStories.js';
import { RoomState, Player, ClientMessage, ServerMessage, BiblicalStory } from './src/types/game.js';
import { calculatePuzzlePoints, TOTAL_PIECES } from './src/utils/puzzle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// In-memory room store
const rooms = new Map<string, RoomState>();
const socketMeta = new Map<WebSocket, { roomCode: string; playerId: string }>();

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
        if (room.stage === 'PUZZLE_STAGE') {
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
            abyssStrikes: 0
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
            abyssSolved: false
          };

          rooms.set(roomCode, newRoom);
          socketMeta.set(ws, { roomCode, playerId: hostId });

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            payload: { room: newRoom, playerId: hostId }
          }));
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
            abyssStrikes: 0
          };

          room.players[playerId] = newPlayer;
          socketMeta.set(ws, { roomCode: code, playerId });

          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            payload: { room, playerId }
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

          if (room.stage === 'PUZZLE_STAGE') {
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
