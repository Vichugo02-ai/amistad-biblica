import React, { useState, useEffect } from 'react';
import { RoomState, Player, BiblicalStory } from '../types/game';
import { AVATAR_OPTIONS } from '../data/theme';
import {
  Users,
  Check,
  Play,
  BookOpen,
  Crown,
  Image as ImageIcon,
  ImagePlus,
  KeyRound,
  Link2,
  Loader2,
  MonitorUp,
  Puzzle,
  Mountain,
  LogIn,
  AlertTriangle
} from 'lucide-react';

interface LobbyViewProps {
  room: RoomState | null;
  myPlayerId: string | null;
  selectedStory: BiblicalStory;
  onCreateRoom: (hostName: string, avatar: string, rounds: number, customStory?: BiblicalStory) => void;
  onJoinRoom: (code: string, playerName: string, avatar: string) => void;
  onStartGame: () => void;
  onOpenStoryModal: () => void;
}

const HOW_TO_STEPS = [
  {
    Icon: MonitorUp,
    emoji: '🖥️',
    title: '1. Comparte pantalla',
    text: 'El anfitrión comparte esta pestaña en Teams para proyectar la tabla de posiciones y el puente colgante.'
  },
  {
    Icon: Puzzle,
    emoji: '🧩',
    title: '2. Arma el Puzzle 24',
    text: 'Cada participante coloca las 24 piezas de la escena bíblica en su propio dispositivo y suma puntos por velocidad.'
  },
  {
    Icon: Mountain,
    emoji: '🌉',
    title: '3. Sin Caer al Abismo',
    text: 'Adivinen las letras del personaje bíblico sin fallar más de 6 veces para cruzar el puente triunfantes.'
  }
];

/**
 * Miniatura de la imagen elegida. A propósito NO muestra el título, la cita
 * ni la respuesta: esta pantalla suele estar compartida en Teams.
 */
const StoryThumb: React.FC<{ story: BiblicalStory; className: string }> = ({ story, className }) =>
  story.imageUrl ? (
    <img
      src={story.imageUrl}
      alt="Imagen bíblica elegida para el rompecabezas"
      className={`${className} object-cover border border-slate-700 shrink-0`}
    />
  ) : (
    <div className={`${className} bg-slate-800 flex items-center justify-center shrink-0 text-amber-400`}>
      <ImageIcon className="w-5 h-5" />
    </div>
  );

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  myPlayerId,
  selectedStory,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onOpenStoryModal
}) => {
  const [tab, setTab] = useState<'join' | 'create'>('join');
  const [name, setName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0].icon);
  const [selectedRounds, setSelectedRounds] = useState(3);
  const [copiedLink, setCopiedLink] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Check URL params for quick join code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get('room');
      if (codeFromUrl) {
        setRoomCodeInput(codeFromUrl.toUpperCase());
        setTab('join');
      }
    }
  }, []);

  const handleCopyTeamsLink = () => {
    if (!room) return;
    const url = `${window.location.origin}/?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmit = () => {
    if (tab === 'join') {
      if (!roomCodeInput.trim()) {
        setFormError('Escribe el código de sala que compartió el anfitrión.');
        return;
      }
      setFormError(null);
      onJoinRoom(roomCodeInput, name, selectedAvatar);
    } else {
      setFormError(null);
      onCreateRoom(name, selectedAvatar, selectedRounds, selectedStory);
    }
  };

  const isHost = room && myPlayerId && room.hostId === myPlayerId;
  const playersList: Player[] = room ? Object.values(room.players) : [];
  const currentStory = room ? room.story : selectedStory;

  // When not in a room, render the Join / Create interface
  if (!room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Banner */}
        <div className="text-center mb-9">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teams-500/20 border border-teams-500/50 text-sm font-semibold text-slate-100 mb-4">
            <span className="emoji">🤝</span>
            <span>Día del Amigo · Reunión en Teams</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight font-cinzel mb-4 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
            Conexión Amistad Bíblica
          </h1>
          <p className="max-w-2xl mx-auto text-base text-slate-300">
            Compite con hasta 20 hermanos: arma el rompecabezas de 24 piezas, adivina el personaje bíblico sin caer al abismo y celebra la comunión en Cristo con puntuación automática.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5 text-sm font-medium text-slate-200">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800"><span className="emoji mr-1.5">🧩</span>Puzzle de 24 piezas</span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800"><span className="emoji mr-1.5">🌉</span>Sin Caer al Abismo</span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800"><span className="emoji mr-1.5">🏆</span>Podio automático</span>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="max-w-md mx-auto mb-6">
          <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-2xl">
            <button
              onClick={() => { setTab('join'); setFormError(null); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                tab === 'join'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Unirme con código</span>
            </button>
            <button
              onClick={() => { setTab('create'); setFormError(null); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                tab === 'create'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>Crear sala (líder)</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="max-w-md mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-slate-950/50">
          <div className="space-y-5">
            {tab === 'join' ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Código de sala (6 letras)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="AMIGO7"
                  className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl text-center text-3xl font-mono font-bold tracking-[0.3em] text-amber-300 focus:outline-none focus:border-amber-400 placeholder:text-slate-700"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Cantidad de rondas
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[3, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedRounds(num)}
                      className={`py-2.5 px-3 text-sm font-semibold rounded-xl border-2 transition-colors ${
                        selectedRounds === num
                          ? 'bg-amber-400/15 border-amber-400 text-amber-200'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {num} rondas
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === 'create' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Imagen de la ronda 1
                </label>
                <button
                  type="button"
                  onClick={onOpenStoryModal}
                  className="w-full group flex items-center gap-3 p-2.5 rounded-xl bg-slate-950 border-2 border-slate-800 hover:border-amber-400/60 transition-colors text-left"
                >
                  <StoryThumb story={currentStory} className="w-20 h-14 rounded-lg" />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-slate-100 block">Imagen elegida</span>
                    <span className="text-xs text-slate-400 block">La respuesta no se muestra aquí.</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-amber-300 group-hover:text-amber-200 font-semibold shrink-0 pr-1">
                    <ImagePlus className="w-4 h-4" />
                    <span>Cambiar o subir</span>
                  </span>
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Tu nombre o alias
              </label>
              <input
                type="text"
                value={name}
                maxLength={20}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Hermano David"
                className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Elige tu distintivo
              </label>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_OPTIONS.map((item) => {
                  const active = selectedAvatar === item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedAvatar(item.icon)}
                      title={item.label}
                      aria-pressed={active}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border-2 transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-400/15 scale-105 shadow-lg shadow-amber-500/15'
                          : 'border-slate-800 bg-slate-950 hover:border-teams-500/60'
                      }`}
                    >
                      <span className="emoji text-2xl">{item.icon}</span>
                      <span className={`text-[11px] truncate mt-1 w-full text-center ${active ? 'text-amber-200 font-semibold' : 'text-slate-400'}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-200 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {tab === 'join' ? <LogIn className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{tab === 'join' ? 'Entrar a la sala' : 'Crear sala y recibir amigos'}</span>
            </button>
          </div>
        </div>

        {/* Biblical Quote Card */}
        <div className="max-w-md mx-auto mt-8 p-4 rounded-2xl border border-slate-800 bg-slate-900/50 text-center">
          <BookOpen className="w-5 h-5 text-amber-400 mx-auto mb-2" />
          <p className="text-sm italic text-slate-200">
            «En todo tiempo ama el amigo, y es como un hermano en tiempo de angustia.»
          </p>
          <span className="text-xs text-amber-300 font-semibold mt-1 block">Proverbios 17:17</span>
        </div>
      </div>
    );
  }

  // Active Room Lobby
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Top Banner with Code */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-teams-500/40 rounded-3xl p-6 md:p-8 mb-8 text-center relative overflow-hidden shadow-2xl shadow-slate-950/50">
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teams-500/20 border border-teams-500/50 text-slate-100 text-sm font-semibold mb-4">
            <Users className="w-4 h-4 text-teams-300" />
            <span>Sala de espera · {playersList.length} {playersList.length === 1 ? 'amigo reunido' : 'amigos reunidos'}</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 font-cinzel mb-2">
            <span className="emoji mr-2">🎉</span>¡Bienvenidos al Día del Amigo!
          </h2>
          <p className="text-sm text-slate-300 mb-6">
            Pega el enlace en el chat de Teams o dicta el código para que todos entren desde su computadora o celular.
          </p>

          {/* Large Code Display */}
          <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-4 bg-slate-950 border-2 border-amber-400/50 rounded-3xl p-5 mb-6 animate-soft-glow">
            <div className="text-center px-4">
              <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">
                Código de sala
              </span>
              <span className="text-5xl md:text-6xl font-mono font-black tracking-[0.2em] text-amber-300">
                {room.code}
              </span>
            </div>

            <div className="h-px sm:h-14 w-full sm:w-px bg-slate-800" />

            <button
              onClick={handleCopyTeamsLink}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                copiedLink
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-teams-500 hover:bg-teams-600 text-white'
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Enlace copiado!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  <span>Copiar enlace para Teams</span>
                </>
              )}
            </button>
          </div>

          {/* Imagen de la ronda 1 (sin título: la sala de espera se comparte en pantalla) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-6 max-w-lg mx-auto flex items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3 overflow-hidden">
              <StoryThumb story={currentStory} className="w-20 h-14 rounded-lg" />
              <div className="overflow-hidden">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-300 block">
                  <span className="emoji mr-1">🧩</span>Imagen de la ronda 1
                </span>
                <span className="text-sm font-bold text-slate-100 block truncate">
                  Escena bíblica sorpresa
                </span>
                <span className="text-xs text-slate-400 block truncate">
                  ¿Quién será el personaje?
                </span>
              </div>
            </div>

            {isHost && (
              <button
                type="button"
                onClick={onOpenStoryModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 hover:border-amber-400 bg-slate-900 text-amber-300 hover:text-amber-200 text-xs font-semibold shrink-0 transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                <span>Cambiar</span>
              </button>
            )}
          </div>

          {/* Host Start Button */}
          {isHost ? (
            <div>
              <button
                onClick={onStartGame}
                disabled={playersList.length === 0}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-lg rounded-2xl transition-all shadow-xl shadow-emerald-500/25 active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Iniciar competencia</span>
              </button>
              <p className="text-xs text-slate-400 mt-3">
                Al hacer clic comienza para todos la ronda 1: el rompecabezas de 24 piezas.
              </p>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2.5 text-sm font-medium text-amber-200 bg-amber-400/10 px-4 py-2.5 rounded-xl border border-amber-400/30">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Esperando que el anfitrión inicie la partida...</span>
            </div>
          )}
        </div>
      </div>

      {/* Players Connected Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-100 font-cinzel">
              Amigos conectados ({playersList.length})
            </h3>
            <p className="text-xs text-slate-400">
              Todos verán el juego sincronizado en tiempo real.
            </p>
          </div>
          <span className="text-xs text-slate-400">
            Hasta 30 personas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {playersList.map((player) => {
            const isMe = player.id === myPlayerId;
            return (
              <div
                key={player.id}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors animate-fade-in ${
                  isMe
                    ? 'border-amber-400/60 bg-amber-400/10'
                    : 'border-slate-800 bg-slate-950/60'
                }`}
              >
                <span className="emoji text-2xl w-11 h-11 flex items-center justify-center rounded-xl bg-teams-500/20 border border-teams-500/30 shrink-0">
                  {player.avatar}
                </span>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-100 truncate">
                      {player.name}
                    </span>
                    {player.isHost && (
                      <span title="Líder anfitrión">
                        <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {isMe ? 'Tú' : 'En la llamada'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cómo se juega */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {HOW_TO_STEPS.map(({ Icon, emoji, title, text }) => (
          <div key={title} className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 flex gap-3">
            <span className="w-10 h-10 rounded-xl bg-teams-500/20 border border-teams-500/40 text-teams-300 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </span>
            <div>
              <span className="font-bold text-amber-300 text-sm block mb-1">
                {title} <span className="emoji">{emoji}</span>
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
