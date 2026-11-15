import React, { useEffect } from 'react';
import { RoomState } from '../types/game';
import { audioFx } from '../utils/audio';
import { MEDALS, CONFETTI_COLORS } from '../data/theme';
import { VERSE_PENALTY_MS, formatMs, rankVersePlayers, verseTotalMs } from '../utils/verses';
import confetti from 'canvas-confetti';
import { BookOpen, Crown, Loader2, Puzzle, RotateCcw, Trophy } from 'lucide-react';

interface VersesResultsProps {
  room: RoomState;
  myPlayerId: string | null;
  /** Rondas extra: rompecabezas y personaje bíblico */
  onStartExtra: () => void;
  onResetGame: () => void;
}

export const VersesResults: React.FC<VersesResultsProps> = ({ room, myPlayerId, onStartExtra, onResetGame }) => {
  const isHost = !!myPlayerId && room.hostId === myPlayerId;
  const ranked = rankVersePlayers(Object.values(room.players));
  const total = room.verses.length;
  const [first, second, third] = ranked;

  useEffect(() => {
    audioFx.playVictoryFanfare();
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: CONFETTI_COLORS });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: CONFETTI_COLORS });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const resultOf = (player: typeof first) =>
    player.verseFinished ? formatMs(verseTotalMs(player)) : `${player.versesDone}/${total} versículos`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teams-500/20 border border-teams-500/50 text-sm font-semibold text-slate-100 mb-3">
          <span className="emoji">🏆</span>
          <span>Tabla oficial · Día del Amigo</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-bold font-cinzel mb-2 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
          Resultados
        </h1>
        <p className="text-sm text-slate-300">
          Gana quien ordenó los {total} versículos en menos tiempo.
        </p>
      </div>

      {/* Podio */}
      {first && (
        <div className="flex flex-col md:flex-row items-end justify-center gap-4 mb-10 max-w-2xl mx-auto">
          {second && (
            <div className="w-full md:w-1/3 order-2 md:order-1 flex flex-col items-center">
              <div className="emoji text-4xl mb-1">{second.avatar}</div>
              <span className="text-sm text-slate-100 font-semibold truncate max-w-[160px] text-center">{second.name}</span>
              <span className="text-sm font-mono font-bold text-slate-300 mb-2 tabular-nums">{resultOf(second)}</span>
              <div className="w-full h-32 bg-gradient-to-t from-slate-900 to-slate-800 border-t-4 border-slate-300 rounded-t-3xl flex flex-col items-center justify-center shadow-lg">
                <span className="emoji text-5xl">{MEDALS[1]}</span>
              </div>
            </div>
          )}
          <div className="w-full md:w-1/3 order-1 md:order-2 flex flex-col items-center">
            <Crown className="w-9 h-9 text-amber-400 fill-amber-400 animate-bounce mb-1" />
            <div className="emoji text-5xl mb-1">{first.avatar}</div>
            <span className="text-lg text-amber-200 font-bold truncate max-w-[180px] text-center">{first.name}</span>
            <span className="text-base font-mono font-bold text-amber-300 mb-2 tabular-nums">{resultOf(first)}</span>
            <div className="w-full h-44 bg-gradient-to-t from-slate-900 to-amber-950/60 border-t-4 border-amber-400 rounded-t-3xl flex flex-col items-center justify-center shadow-2xl shadow-amber-500/20">
              <span className="emoji text-6xl">{MEDALS[0]}</span>
              <span className="text-sm uppercase tracking-wider text-amber-300 font-bold mt-1 flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                Campeón
              </span>
            </div>
          </div>
          {third && (
            <div className="w-full md:w-1/3 order-3 flex flex-col items-center">
              <div className="emoji text-4xl mb-1">{third.avatar}</div>
              <span className="text-sm text-slate-100 font-semibold truncate max-w-[160px] text-center">{third.name}</span>
              <span className="text-sm font-mono font-bold text-coral-300 mb-2 tabular-nums">{resultOf(third)}</span>
              <div className="w-full h-24 bg-gradient-to-t from-slate-900 to-slate-800 border-t-4 border-coral-400 rounded-t-3xl flex flex-col items-center justify-center shadow-lg">
                <span className="emoji text-4xl">{MEDALS[2]}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla completa */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 mb-8 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-amber-400" />
          Tabla completa ({ranked.length} participantes)
        </h3>

        <div className="divide-y divide-slate-800">
          {ranked.map((player, index) => {
            const isMe = player.id === myPlayerId;
            return (
              <div
                key={player.id}
                className={`py-3 px-2 flex items-center justify-between gap-3 ${isMe ? 'bg-teams-500/20 rounded-xl' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {index < 3 ? (
                    <span className="emoji text-xl w-7 text-center shrink-0">{MEDALS[index]}</span>
                  ) : (
                    <span className="font-mono text-sm w-7 text-center text-slate-400 shrink-0">{index + 1}</span>
                  )}
                  <span className="emoji text-2xl shrink-0">{player.avatar}</span>
                  <div className="min-w-0">
                    <span className="text-base font-semibold text-slate-100 truncate block">
                      {player.name} {isMe && '(Tú)'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {player.versesDone}/{total} versículos
                      {player.verseMistakes > 0 &&
                        ` · ${player.verseMistakes} ${player.verseMistakes === 1 ? 'error' : 'errores'} (+${(player.verseMistakes * VERSE_PENALTY_MS) / 1000} s)`}
                    </span>
                  </div>
                </div>
                <span className={`font-mono font-bold tabular-nums shrink-0 ${player.verseFinished ? 'text-amber-300 text-lg' : 'text-slate-400 text-sm'}`}>
                  {player.verseFinished ? formatMs(verseTotalMs(player)) : 'Sin terminar'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Los versículos completos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {room.verses.map(verse => (
          <div key={verse.reference + verse.text} className="p-4 rounded-2xl border border-amber-400/40 bg-slate-900/60">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300 mb-2">
              <BookOpen className="w-4 h-4" />
              {verse.reference}
            </span>
            <p className="text-sm italic text-slate-100">«{verse.text}»</p>
          </div>
        ))}
      </div>

      {/* Controles del anfitrión */}
      {isHost ? (
        <div className="text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onStartExtra}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/25 active:scale-95"
            >
              <Puzzle className="w-5 h-5" />
              <span>Seguir jugando: rompecabezas y personaje</span>
            </button>
            <button
              onClick={onResetGame}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Nueva partida</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Las rondas extra son solo para seguir compartiendo: no cambian esta tabla.
          </p>
        </div>
      ) : (
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 text-sm font-medium text-amber-200 bg-amber-400/10 px-4 py-2.5 rounded-xl border border-amber-400/30">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>El anfitrión decide si seguimos con las rondas extra...</span>
          </div>
        </div>
      )}
    </div>
  );
};
