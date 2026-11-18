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
import { VersesBoard } from './components/VersesBoard';
import { VersesResults } from './components/VersesResults';
import { VerseEditorModal } from './components/VerseEditorModal';
import { TimeSettingsModal } from './components/TimeSettingsModal';
import { ADD_TIME_SECONDS, DEFAULT_SETTINGS } from './utils/settings';
import { AlertTriangle, CheckCircle2, Info, ArrowRight, WifiOff, ImagePlus, Crown, Timer, TimerReset, MoreHorizontal } from 'lucide-react';
import { GameSettings } from './types/game';

// Sesión para volver a la misma sala.
//  - En la pestaña (sessionStorage): sirve para recargar; cada pestaña conserva su propio jugador.
//  - En el navegador (localStorage): sirve tras cerrar la pestaña; se ofrece con un botón "Volver a mi sala".
const SESSION_KEY = 'amistad-biblica-sesion';

interface SavedSession {
  roomCode: string;
  playerId: string;
  token: string;
  name: string;
  isHost: boolean;
}

function readFrom(storage: 'sessionStorage' | 'localStorage'): SavedSession | null {
  try {
    const raw = window[storage].getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

function saveSession(session: SavedSession) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Si en este navegador ya está guardado el anfitrión de esta sala, un invitado
    // que entre desde otra pestaña no lo reemplaza.
    const saved = readFrom('localStorage');
    const keepHost = saved && saved.roomCode === session.roomCode && saved.isHost && !session.isHost;
    if (!keepHost) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // sin almacenamiento disponible: la app funciona, pero no podrá reconectar
  }
}

function clearSession() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
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
  const [isTimeSettingsOpen, setIsTimeSettingsOpen] = useState<boolean>(false);
  // Menú "más opciones" de la barra del anfitrión en celular
  const [hostMenuOpen, setHostMenuOpen] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(false);
  const [toast, setToast] = useState<{ id: string; message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const [incomingReaction, setIncomingReaction] = useState<{ id: string; emoji: string; playerName: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Sala anterior guardada en este navegador, para ofrecer "Volver a mi sala"
  const [resumable, setResumable] = useState<SavedSession | null>(null);

  // Juego de versículos: última respuesta del servidor a un intento, y editor del líder
  const [lastVerseResult, setLastVerseResult] = useState<{ id: string; verseIndex: number; correct: boolean } | null>(null);
  const [isVerseEditorOpen, setIsVerseEditorOpen] = useState<boolean>(false);

  // ¿El servidor exige clave de líder para crear salas? (variable HOST_KEY)
  const [hostKeyRequired, setHostKeyRequired] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((config: { hostKeyRequired?: boolean }) => setHostKeyRequired(!!config.hostKeyRequired))
      .catch(() => setHostKeyRequired(false));
  }, []);

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

      const roomInUrl = new URLSearchParams(window.location.search).get('room')?.toUpperCase();
      const matchesUrl = (session: SavedSession | null) =>
        session && (!roomInUrl || roomInUrl === session.roomCode) ? session : null;

      // Recarga de la misma pestaña: vuelve sola a su sala, con el mismo jugador
      const tabSession = matchesUrl(readFrom('sessionStorage'));
      if (tabSession) {
        const { roomCode, playerId, token } = tabSession;
        ws.send(JSON.stringify({ type: 'REJOIN_ROOM', payload: { roomCode, playerId, token } }));
      } else {
        // Pestaña nueva: no entra sola; ofrece el botón para volver
        setResumable(matchesUrl(readFrom('localStorage')));
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
              token: msg.payload.token,
              name: msg.payload.room.players[msg.payload.playerId]?.name ?? '',
              isHost: msg.payload.room.hostId === msg.payload.playerId
            });
            setResumable(null);
            break;

          case 'VERSE_RESULT':
            setLastVerseResult({ id: `${Date.now()}_${Math.random()}`, ...msg.payload });
            break;

          case 'REJOIN_FAILED':
            // La sala ya no existe (por ejemplo, el servidor se reinició)
            clearSession();
            setResumable(null);
            setRoom(null);
            setMyPlayerId(null);
            setToast({
              id: `${Date.now()}_${Math.random()}`,
              message: 'Tu sala anterior ya no existe. Crea una nueva o únete con otro código.',
              type: 'warning'
            });
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
  const handleCreateRoom = (hostName: string, avatar: string, rounds: number, customStory?: BiblicalStory, hostKey?: string) => {
    sendMessage({
      type: 'CREATE_ROOM',
      payload: { hostName, avatar, rounds, customStory: customStory || selectedStory, hostKey }
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

  const handleStartVerses = () => {
    if (!room) return;
    sendMessage({ type: 'HOST_START_VERSES', payload: { roomCode: room.code } });
  };

  const handleSetSettings = (settings: GameSettings) => {
    if (!room) return;
    sendMessage({ type: 'HOST_SET_SETTINGS', payload: { roomCode: room.code, settings } });
  };

  const handleAddTime = () => {
    if (!room) return;
    sendMessage({ type: 'HOST_ADD_TIME', payload: { roomCode: room.code, seconds: ADD_TIME_SECONDS } });
  };

  const handleSetVerses = (verses: { reference: string; text: string }[]) => {
    if (!room) return;
    sendMessage({ type: 'HOST_SET_VERSES', payload: { roomCode: room.code, verses } });
  };

  const handleSubmitVerse = (verseIndex: number, order: string[]) => {
    if (!room) return;
    sendMessage({ type: 'VERSE_SUBMIT', payload: { roomCode: room.code, verseIndex, order } });
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

  const handleResumeRoom = () => {
    if (!resumable) return;
    const { roomCode, playerId, token } = resumable;
    sendMessage({ type: 'REJOIN_ROOM', payload: { roomCode, playerId, token } });
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
    VERSES_STAGE: 'Ordena los versículos',
    VERSES_RESULTS: 'Tabla de resultados',
    PUZZLE_STAGE: `Ronda ${room?.currentRound} · Rompecabezas`,
    ABYSS_STAGE: `Ronda ${room?.currentRound} · Sin Caer al Abismo`,
    ROUND_RECAP: `Resumen · Ronda ${room?.currentRound}`,
    FINAL_PODIUM: 'Gran Podio Final'
  };

  const showHostBar = !!room && isHost && room.stage !== 'LOBBY' && room.stage !== 'VERSES_RESULTS' && room.stage !== 'FINAL_PODIUM';

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
        {/* Volver a la sala en la que ya estaba este navegador */}
        {!room && resumable && (
          <div className="max-w-md mx-auto px-4 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-teams-500/20 border border-teams-500/50">
              <div className="flex-1 min-w-0 text-sm text-slate-100">
                <span className="font-bold block">
                  Ya estabas en la sala {resumable.roomCode}
                </span>
                <span className="text-slate-300 flex items-center gap-1.5">
                  {resumable.isHost && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                  <span className="truncate">
                    {resumable.name} · {resumable.isHost ? 'anfitrión' : 'participante'}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleResumeRoom}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-bold text-sm transition-colors"
                >
                  Volver a mi sala
                </button>
                <button
                  onClick={() => { clearSession(); setResumable(null); }}
                  className="px-3 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        )}
        {!room || room.stage === 'LOBBY' ? (
          <LobbyView
            room={room}
            myPlayerId={myPlayerId}
            selectedStory={room ? room.story : selectedStory}
            hostKeyRequired={hostKeyRequired}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onStartGame={handleStartVerses}
            onOpenVerseEditor={() => setIsVerseEditorOpen(true)}
            onOpenTimeSettings={() => setIsTimeSettingsOpen(true)}
            onOpenStoryModal={() => setIsStoryModalOpen(true)}
          />
        ) : room.stage === 'VERSES_STAGE' ? (
          <VersesBoard
            room={room}
            myPlayerId={myPlayerId}
            onSubmit={handleSubmitVerse}
            lastResult={lastVerseResult}
          />
        ) : room.stage === 'VERSES_RESULTS' ? (
          <VersesResults
            room={room}
            myPlayerId={myPlayerId}
            onStartExtra={handleStartGame}
            onOpenTimeSettings={() => setIsTimeSettingsOpen(true)}
            onResetGame={handleResetGame}
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
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 border-t border-teams-500/40 px-2 sm:px-4 py-2 flex items-center justify-between gap-2 text-sm backdrop-blur">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-teams-500/25 border border-teams-500/50 text-slate-100 font-semibold shrink-0">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="emoji sm:hidden">{STAGE_EMOJI[room.stage]}</span>
              <span className="hidden md:inline">Anfitrión</span>
            </span>
            {/* El título de la historia solo aparece en el resumen: antes revelaría la respuesta */}
            <span className="hidden sm:inline text-slate-300 truncate min-w-0">
              <span className="emoji mr-1">{STAGE_EMOJI[room.stage]}</span>
              {room.stage === 'VERSES_STAGE' ? 'Juego principal' : `Ronda extra ${room.currentRound}/${room.totalRounds}`}
              <span className="hidden lg:inline">{room.stage === 'ROUND_RECAP' && ` · ${room.story.title}`}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {room.isTimerRunning && (
              <button
                onClick={handleAddTime}
                title="Sumar 1 minuto al reloj"
                aria-label="Sumar 1 minuto al reloj"
                className="flex items-center gap-1 px-2 sm:px-2.5 py-2 rounded-xl border border-slate-700 hover:border-emerald-400 bg-slate-800 text-emerald-300 font-bold transition-colors"
              >
                <TimerReset className="w-4 h-4" />
                <span className="sm:hidden">+1</span>
                <span className="hidden sm:inline">+1 min</span>
              </button>
            )}

            {/* Computador: los botones a la vista */}
            <button
              onClick={() => setIsTimeSettingsOpen(true)}
              title="Configurar tiempos"
              aria-label="Configurar tiempos"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-700 hover:border-amber-400 bg-slate-800 text-slate-100 hover:text-amber-300 font-medium transition-colors"
            >
              <Timer className="w-4 h-4" />
              <span className="hidden lg:inline">Tiempos</span>
            </button>
            {room.stage !== 'VERSES_STAGE' && (
              <button
                onClick={() => setIsStoryModalOpen(true)}
                title="Cambiar imagen"
                aria-label="Cambiar imagen"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-700 hover:border-amber-400 bg-slate-800 text-slate-100 hover:text-amber-300 font-medium transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                <span className="hidden lg:inline">Cambiar imagen</span>
              </button>
            )}

            {/* Celular: esas opciones van en un menú para que todo quepa */}
            <div className="relative sm:hidden">
              <button
                onClick={() => setHostMenuOpen(v => !v)}
                title="Más opciones"
                aria-label="Más opciones"
                aria-expanded={hostMenuOpen}
                className="flex items-center px-2 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {hostMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-52 p-1.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-slate-950/70 animate-fade-in">
                  <button
                    onClick={() => { setHostMenuOpen(false); setIsTimeSettingsOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-slate-100 hover:bg-slate-800"
                  >
                    <Timer className="w-4 h-4 text-amber-400" />
                    <span>Configurar tiempos</span>
                  </button>
                  {room.stage !== 'VERSES_STAGE' && (
                    <button
                      onClick={() => { setHostMenuOpen(false); setIsStoryModalOpen(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-slate-100 hover:bg-slate-800"
                    >
                      <ImagePlus className="w-4 h-4 text-amber-400" />
                      <span>Cambiar imagen</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => { setHostMenuOpen(false); handleNextStage(); }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-bold transition-colors shadow-lg shadow-amber-500/20"
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

      {/* Tiempos del juego (solo el líder) */}
      <TimeSettingsModal
        isOpen={isTimeSettingsOpen}
        settings={room?.settings ?? DEFAULT_SETTINGS}
        onClose={() => setIsTimeSettingsOpen(false)}
        onSave={handleSetSettings}
      />

      {/* Editor de versículos (solo el líder, en la sala de espera) */}
      <VerseEditorModal
        isOpen={isVerseEditorOpen}
        verses={room ? room.verses : []}
        onClose={() => setIsVerseEditorOpen(false)}
        onSave={handleSetVerses}
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
