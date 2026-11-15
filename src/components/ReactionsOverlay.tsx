import React, { useState, useEffect } from 'react';
import { QUICK_REACTIONS } from '../data/theme';

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

      {/* Barra de reacciones rápidas */}
      <div
        className={`fixed right-3 sm:right-4 z-40 bg-slate-900/95 border border-teams-500/40 rounded-2xl px-2 py-1.5 shadow-xl shadow-slate-950/60 backdrop-blur flex items-center gap-0.5 ${
          raised ? 'bottom-16' : 'bottom-4'
        }`}
      >
        {QUICK_REACTIONS.map(({ emoji, label }) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSendReaction(emoji)}
            title={label}
            aria-label={`Reaccionar: ${label}`}
            className="emoji w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xl sm:text-2xl rounded-xl hover:bg-teams-500/25 hover:scale-125 active:scale-95 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
};
