import React from 'react';
import { Volume2, VolumeX, Moon, Sun, Users, Copy, Check, HeartHandshake, Crown, LogOut } from 'lucide-react';
import { audioFx } from '../utils/audio';

interface NavbarProps {
  roomCode?: string;
  stageName?: string;
  stageEmoji?: string;
  playerCount?: number;
  playerName?: string;
  isHost?: boolean;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  muted: boolean;
  setMuted: (val: boolean) => void;
  onLeaveRoom?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomCode,
  stageName,
  stageEmoji,
  playerCount = 0,
  playerName,
  isHost,
  darkMode,
  setDarkMode,
  muted,
  setMuted,
  onLeaveRoom
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    audioFx.setMuted(next);
  };

  return (
    <header className="flex items-center justify-between gap-2 md:gap-8 px-3 md:px-6 py-2.5 md:py-3 border-b border-teams-500/30 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zona 1: logo y nombre */}
      <a
        href="/"
        onClick={(e) => {
          // Dentro de una sala el logo no navega: evita salirse por accidente
          if (roomCode) e.preventDefault();
        }}
        className="flex items-center gap-2 md:gap-2.5 min-w-0 group"
      >
        <span className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25">
          <HeartHandshake className="w-5 h-5" strokeWidth={2.25} />
        </span>
        {/* En celular el nombre se acorta para que los botones quepan */}
        <span className="text-base md:text-lg font-bold tracking-tight text-amber-300 font-cinzel group-hover:text-amber-200 transition-colors truncate">
          <span className="sm:hidden">Amistad Bíblica</span>
          <span className="hidden sm:inline">Conexión Amistad Bíblica</span>
        </span>
      </a>

      {/* Zona 2: estado de la sala */}
      <div className="hidden md:flex items-center gap-3 text-sm text-slate-300 min-w-0">
        {roomCode ? (
          <>
            <button
              onClick={handleCopyCode}
              title="Copiar código de sala"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teams-500/20 border border-teams-500/50 hover:bg-teams-500/35 text-slate-100 transition-colors font-mono font-bold tracking-wider"
            >
              <span>{roomCode}</span>
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-teams-300" />}
            </button>

            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 text-slate-200 font-medium">
              <Users className="w-4 h-4 text-teams-300" />
              <span className="tabular-nums">{playerCount}</span>
            </span>

            {stageName && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-200 font-semibold truncate">
                {stageEmoji && <span className="emoji text-base">{stageEmoji}</span>}
                <span className="truncate">{stageName}</span>
              </span>
            )}

            {playerName && (
              <span className="flex items-center gap-1.5 text-slate-200 truncate">
                {isHost && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                <span className="truncate">{playerName}</span>
              </span>
            )}
          </>
        ) : (
          <span className="flex items-center gap-2 text-slate-300">
            <span className="emoji">🤝</span>
            <span>Día del Amigo · Actividad en Teams</span>
          </span>
        )}
      </div>

      {/* Zona 3: sonido y tema */}
      <div className="flex items-center gap-0.5 md:gap-1.5 shrink-0">
        <button
          onClick={toggleSound}
          title={muted ? 'Activar sonido' : 'Silenciar sonido'}
          className={`p-2 md:p-2.5 rounded-xl transition-colors ${
            muted
              ? 'text-rose-300 bg-rose-500/15 hover:bg-rose-500/25'
              : 'text-slate-300 hover:text-amber-300 hover:bg-slate-800'
          }`}
          aria-label="Alternar sonido"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          className="p-2 md:p-2.5 text-slate-300 hover:text-amber-300 transition-colors rounded-xl hover:bg-slate-800"
          aria-label="Alternar tema"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {roomCode && onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            title="Salir de la sala"
            className="p-2 md:p-2.5 text-slate-300 hover:text-rose-300 transition-colors rounded-xl hover:bg-rose-500/15"
            aria-label="Salir de la sala"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};
