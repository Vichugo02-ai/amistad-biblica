import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RoomState, ServerMessage, ClientMessage, BiblicalStory } from './types/game';
import { BIBLICAL_STORIES } from './data/biblicalStories';
import { STAGE_EMOJI } from './data/theme';
import { Navbar } from './components/Navbar';
import { LobbyView } from './components/LobbyView';
import { Puzzle24Board } from './components/Puzzle24Board';
import { AbyssBridgeBoard } from './components/AbyssBridgeBoard';
import { RoundSummary } from './components/RoundSummary';
import { FinalPodium } from './components/FinalPodium';
import { ReactionsOverlay } from './components/ReactionsOverlay';
import { StorySelectorModal } from './components/StorySelectorModal';
import { AlertTriangle, CheckCircle2, Info, ArrowRight, WifiOff, ImagePlus, Crown } from 'lucide-react';

// Sesión guardada en el navegador para volver a la misma sala tras recargar o cerrar la pestaña
const SESSION_KEY = 'amistad-biblica-sesion';

interface SavedSession {
  roomCode: string;
  playerId: string;
  token: string;
}

function readSession(): SavedSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

function saveSession(session: SavedSession) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // sin almacenamiento disponible: la app funciona, pero no podrá reconectar
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // nada que borrar
  }
}

export default function App() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<BiblicalStory>(BIBLICAL_STORIES[0]);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(false);
  const [toast, setToast] = useState<{ id: string; message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const [incomingReaction, setIncomingReaction] = useState<{ id: string; emoji: string; playerName: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const wsRef = useRef<WebSocket | null>(null);

  // El modo claro/oscuro se decide con la clase `dark` en <html>;
  // los colores de cada modo están en index.css
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');

      // Si este navegador ya estaba en una sala, vuelve a ella con el mismo jugador.
      // No aplica si el enlace abierto es de otra sala distinta.
      const session = readSession();
      const roomInUrl = new URLSearchParams(window.location.search).get('room')?.toUpperCase();
      if (session && (!roomInUrl || roomInUrl === session.roomCode)) {
        ws.send(JSON.stringify({ type: 'REJOIN_ROOM', payload: session }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        switch (msg.type) {
          case 'ROOM_CREATED':
          case 'ROOM_JOINED':
            setRoom(msg.payload.room);
            setMyPlayerId(msg.payload.playerId);
            saveSession({
              roomCode: msg.payload.room.code,
              playerId: msg.payload.playerId,
              token: msg.payload.token
            });
            break;

          case 'REJOIN_FAILED':
            // La sala ya no existe (por ejemplo, el servidor se reinició)
            clearSession();
            setRoom(null);
            setMyPlayerId(null);
            break;

          case 'STATE_UPDATE':
            setRoom({ ...msg.payload.room });
            break;

          case 'TIMER_TICK':
            setRoom((prev: RoomState | null) => prev ? { ...prev, timerSeconds: msg.payload.seconds } : null);
            break;

          case 'NOTIFICATION':
            setToast({
              id: `${Date.now()}_${Math.random()}`,
              message: msg.payload.message,
              type: msg.payload.type
            });
            break;

          case 'REACTION_EVENT':
            setIncomingReaction({
              id: `${Date.now()}_${Math.random()}`,
              emoji: msg.payload.emoji,
              playerName: msg.payload.playerName
            });
            break;

          case 'ERROR':
            // Aviso en pantalla en vez de alert(): no bloquea la pestaña compartida en Teams
            setToast({
              id: `${Date.now()}_${Math.random()}`,
              message: msg.payload.message,
              type: 'warning'
            });
            break;
        }
      } catch (err) {
        console.error('Failed to parse websocket message', err);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      // Attempt reconnection after 2.5 seconds
      setTimeout(() => {
        connectWebSocket();
      }, 2500);
    };

    ws.onerror = (err) => {
      console.error('WebSocket encountered error:', err);
    };
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  // Auto-clear toasts
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  // Send message helper
  const sendMessage = (msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  // Actions
  const handleCreateRoom = (hostName: string, avatar: string, rounds: number, customStory?: BiblicalStory) => {
    sendMessage({
      type: 'CREATE_ROOM',
      payload: { hostName, avatar, rounds, customStory: customStory || selectedStory }
    });
  };

  const handleSelectStory = (story: BiblicalStory) => {
    setSelectedStory(story);
    if (room && isHost) {
      sendMessage({
        type: 'HOST_SELECT_STORY',
        payload: { roomCode: room.code, story }
      });
    }
  };

  const handleUploadCustomStory = (story: BiblicalStory) => {
    setSelectedStory(story);
    if (room && isHost) {
      sendMessage({
        type: 'HOST_ADD_CUSTOM_STORY',
        payload: { roomCode: room.code, story }
      });
    } else {
      // Sin título: el aviso podría verse en la pantalla compartida
      setToast({
        id: `${Date.now()}`,
        message: '¡Tu imagen bíblica quedó cargada!',
        type: 'success'
      });
    }
  };

  const handleJoinRoom = (roomCode: string, playerName: string, avatar: string) => {
    sendMessage({
      type: 'JOIN_ROOM',
      payload: { roomCode, playerName, avatar }
    });
  };

  const handleStartGame = () => {
    if (!room) return;
    sendMessage({
      type: 'HOST_START_ROUND',
      payload: { roomCode: room.code }
    });
  };

  const handlePiecePlaced = (piecesCount: number) => {
    if (!room) return;
    sendMessage({
      type: 'PUZZLE_PIECE_SNAP',
      payload: { roomCode: room.code, piecesPlaced: piecesCount, totalPieces: 24 }
    });
  };

  const handlePuzzleFinished = (timeTaken: number) => {
    if (!room) return;
    sendMessage({
      type: 'PUZZLE_FINISHED',
      payload: { roomCode: room.code, timeTaken }
    });
  };

  const handleGuessLetter = (letter: string) => {
    if (!room) return;
    sendMessage({
      type: 'ABYSS_GUESS_LETTER',
      payload: { roomCode: room.code, letter }
    });
  };

  const handleGuessPhrase = (phrase: string) => {
    if (!room) return;
    sendMessage({
      type: 'ABYSS_GUESS_PHRASE',
      payload: { roomCode: room.code, phrase }
    });
  };

  const handleBuzzerPress = () => {
    if (!room) return;
    sendMessage({
      type: 'BUZZER_PRESS',
      payload: { roomCode: room.code }
    });
  };

  const handleNextStage = () => {
    if (!room) return;
    sendMessage({
      type: 'HOST_NEXT_STAGE',
      payload: { roomCode: room.code }
    });
  };

  const handleResetGame = () => {
    if (!room) return;
    sendMessage({
      type: 'HOST_RESET_GAME',
      payload: { roomCode: room.code }
    });
  };

  const handleLeaveRoom = () => {
    const warning = isHost
      ? '¿Salir de la sala? Eres el anfitrión: sin ti nadie podrá avanzar la partida.'
      : '¿Salir de la sala? Perderás tu lugar y tus puntos.';
    if (!window.confirm(warning)) return;
    clearSession();
    window.location.href = '/';
  };

  const handleSendReaction = (emoji: string) => {
    if (!room) return;
    sendMessage({
      type: 'SEND_REACTION',
      payload: { roomCode: room.code, emoji }
    });
  };

  const me = room && myPlayerId ? room.players[myPlayerId] : null;
  const isHost = me ? me.isHost : false;

  const stageDisplayNames: Record<string, string> = {
    LOBBY: 'Sala de Espera',
    PUZZLE_STAGE: `Ronda ${room?.currentRound} · Rompecabezas`,
    ABYSS_STAGE: `Ronda ${room?.currentRound} · Sin Caer al Abismo`,
    ROUND_RECAP: `Resumen · Ronda ${room?.currentRound}`,
    FINAL_PODIUM: 'Gran Podio Final'
  };

  const showHostBar = !!room && isHost && room.stage !== 'LOBBY' && room.stage !== 'FINAL_PODIUM';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Global Navbar */}
      <Navbar
        roomCode={room?.code}
        stageName={room ? stageDisplayNames[room.stage] : undefined}
        stageEmoji={room ? STAGE_EMOJI[room.stage] : undefined}
        playerCount={room ? Object.keys(room.players).length : 0}
        playerName={me?.name}
        isHost={isHost}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        muted={muted}
        setMuted={setMuted}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Connection Notice if disconnected */}
      {connectionStatus === 'disconnected' && (
        <div className="bg-rose-500/15 border-b border-rose-500/40 px-4 py-2.5 text-center text-sm font-medium text-rose-200 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Reconectando con el servidor del juego...</span>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 w-max max-w-[92vw]">
          <div
            key={toast.id}
            className={`animate-fade-in flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl shadow-slate-950/60 text-sm font-semibold backdrop-blur-md border ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-400/60 text-emerald-100'
                : toast.type === 'warning'
                ? 'bg-amber-950/95 border-amber-400/60 text-amber-100'
                : 'bg-slate-900/95 border-teams-400/60 text-slate-100'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-teams-300 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Game Stage View */}
      <main className="flex-1 pb-20">
        {!room || room.stage === 'LOBBY' ? (
          <LobbyView
            room={room}
            myPlayerId={myPlayerId}
            selectedStory={room ? room.story : selectedStory}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onStartGame={handleStartGame}
            onOpenStoryModal={() => setIsStoryModalOpen(true)}
          />
        ) : room.stage === 'PUZZLE_STAGE' ? (
          <Puzzle24Board
            room={room}
            myPlayerId={myPlayerId}
            onPiecePlaced={handlePiecePlaced}
            onPuzzleFinished={handlePuzzleFinished}
            onStartAbyss={handleNextStage}
          />
        ) : room.stage === 'ABYSS_STAGE' ? (
          <AbyssBridgeBoard
            room={room}
            myPlayerId={myPlayerId}
            onGuessLetter={handleGuessLetter}
            onGuessPhrase={handleGuessPhrase}
            onBuzzerPress={handleBuzzerPress}
            onHostNext={handleNextStage}
          />
        ) : room.stage === 'ROUND_RECAP' ? (
          <RoundSummary
            room={room}
            myPlayerId={myPlayerId}
            onNextRound={handleNextStage}
          />
        ) : room.stage === 'FINAL_PODIUM' ? (
          <FinalPodium
            room={room}
            myPlayerId={myPlayerId}
            onResetGame={handleResetGame}
          />
        ) : null}
      </main>

      {/* Barra de control del anfitrión durante la llamada de Teams */}
      {showHostBar && room && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 border-t border-teams-500/40 px-4 py-2.5 flex items-center justify-between gap-3 text-sm backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teams-500/25 border border-teams-500/50 text-slate-100 font-semibold shrink-0">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Anfitrión</span>
            </span>
            {/* El título de la historia solo aparece en el resumen: antes revelaría la respuesta */}
            <span className="text-slate-300 truncate">
              <span className="emoji mr-1">{STAGE_EMOJI[room.stage]}</span>
              Ronda {room.currentRound} de {room.totalRounds}
              {room.stage === 'ROUND_RECAP' && ` · ${room.story.title}`}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsStoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 hover:border-amber-400 bg-slate-800 text-slate-100 hover:text-amber-300 font-medium transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">Cambiar imagen</span>
            </button>

            <button
              onClick={handleNextStage}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-bold transition-colors shadow-lg shadow-amber-500/20"
            >
              <span>Avanzar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Story Selector & Image Upload Modal */}
      <StorySelectorModal
        isOpen={isStoryModalOpen}
        currentStoryId={room ? room.story.id : selectedStory.id}
        onClose={() => setIsStoryModalOpen(false)}
        onSelectStory={handleSelectStory}
        onUploadCustomStory={handleUploadCustomStory}
      />

      {/* Reacciones en vivo para la llamada de Teams */}
      {room && (
        <ReactionsOverlay
          onSendReaction={handleSendReaction}
          incomingReaction={incomingReaction}
          raised={showHostBar}
        />
      )}
    </div>
  );
}
