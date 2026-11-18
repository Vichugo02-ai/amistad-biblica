import React, { useState, useEffect } from 'react';
import { QUICK_REACTIONS } from '../data/theme';
import { SmilePlus, X } from 'lucide-react';

interface ReactionItem {
  id: string;
  emoji: string;
  playerName: string;
  x: number; // percentage across screen
}

interface ReactionsOverlayProps {
  onSendReaction: (emoji: string) => void;
  incomingReaction: { id: string; emoji: string; playerName: string } | null;
  /** Sube la barra cuando el anfitrión tiene su barra de control abajo */
  raised?: boolean;
}

export const ReactionsOverlay: React.FC<ReactionsOverlayProps> = ({
  onSendReaction,
  incomingReaction,
  raised = false
}) => {
  const [floatingReactions, setFloatingReactions] = useState<ReactionItem[]>([]);
  // En celular las reacciones se abren con un botón para no tapar el juego
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!incomingReaction) return;

    const newReaction: ReactionItem = {
      id: incomingReaction.id,
      emoji: incomingReaction.emoji,
      playerName: incomingReaction.playerName,
      x: 15 + Math.random() * 70 // between 15% and 85% width
    };

    setFloatingReactions(prev => [...prev, newReaction]);

    const timer = setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 2800);

    return () => clearTimeout(timer);
  }, [incomingReaction]);

  const send = (emoji: string) => {
    onSendReaction(emoji);
    setOpen(false);
  };

  const bottom = raised ? 'bottom-16' : 'bottom-4';

  return (
    <>
      {/* Emojis flotantes (grandes para que se vean al compartir pantalla) */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map(r => (
          <div
            key={r.id}
            className="absolute bottom-20 flex flex-col items-center animate-float-up select-none"
            style={{ left: `${r.x}%` }}
          >
            <span className="emoji text-5xl drop-shadow-lg">{r.emoji}</span>
            <span className="text-xs font-semibold bg-slate-950/90 border border-teams-500/50 text-amber-300 px-2.5 py-0.5 rounded-full mt-1">
              {r.playerName}
            </span>
          </div>
        ))}
      </div>

      {/* Computador: la fila completa */}
      <div
        className={`hidden md:flex fixed right-4 z-40 bg-slate-900/95 border border-teams-500/40 rounded-2xl px-2 py-1.5 shadow-xl shadow-slate-950/60 backdrop-blur items-center gap-0.5 ${bottom}`}
      >
        {QUICK_REACTIONS.map(({ emoji, label }) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSendReaction(emoji)}
            title={label}
            aria-label={`Reaccionar: ${label}`}
            className="emoji w-10 h-10 flex items-center justify-center text-2xl rounded-xl hover:bg-teams-500/25 hover:scale-125 active:scale-95 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Celular y panel de Teams: un botón que abre las reacciones */}
      {open && (
        // Tocar fuera cierra las reacciones
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      <div className={`md:hidden fixed right-3 z-40 flex flex-col items-end gap-2 ${bottom}`}>
        {open && (
          <div className="grid grid-cols-4 gap-1 p-2 rounded-2xl bg-slate-900/95 border border-teams-500/40 shadow-xl shadow-slate-950/60 backdrop-blur animate-fade-in">
            {QUICK_REACTIONS.map(({ emoji, label }) => (
              <button
                key={emoji}
                type="button"
                onClick={() => send(emoji)}
                title={label}
                aria-label={`Reaccionar: ${label}`}
                className="emoji w-11 h-11 flex items-center justify-center text-2xl rounded-xl active:bg-teams-500/30 active:scale-90 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Cerrar reacciones' : 'Abrir reacciones'}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl shadow-slate-950/60 border transition-colors ${
            open ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-teams-500 border-teams-400 text-white'
          }`}
        >
          {open ? <X className="w-5 h-5" /> : <SmilePlus className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
};
