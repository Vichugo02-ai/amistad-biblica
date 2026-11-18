import React from 'react';
import { RoomState } from '../types/game';
import { MEDALS } from '../data/theme';
import { POINTS_PER_PIECE, MAX_SPEED_BONUS } from '../utils/puzzle';
import { ArrowRight, BookOpen, Crown, Info, Loader2, Mountain, Puzzle, Trophy } from 'lucide-react';

interface RoundSummaryProps {
  room: RoomState;
  myPlayerId: string | null;
  onNextRound: () => void;
}

export const RoundSummary: React.FC<RoundSummaryProps> = ({ room, myPlayerId, onNextRound }) => {
  const isHost = myPlayerId && room.hostId === myPlayerId;
  const isLastRound = room.currentRound >= room.totalRounds;

  const sortedPlayers = Object.values(room.players).sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Encabezado */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teams-500/20 border border-teams-500/50 text-sm font-semibold text-slate-100 mb-3">
          <span className="emoji">📊</span>
          <span>Resumen · Ronda extra {room.currentRound} de {room.totalRounds}</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-bold text-slate-100 font-cinzel mb-2">{room.story.title}</h1>
      </div>

      {/* Reflexión bíblica */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-400/40 rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-xl">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-300 shrink-0">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300 block mb-1">
              Pasaje bíblico · {room.story.passage}
            </span>
            <p className="text-base sm:text-lg italic text-slate-100 mb-2">«{room.story.verseText}»</p>
            <p className="text-sm text-slate-300">
              <span className="emoji mr-1">🤝</span>
              <strong className="text-slate-100">Enseñanza del Día del Amigo:</strong> {room.story.theme}.
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de las rondas extra */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-6 mb-6 sm:mb-8 shadow-lg">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-200 mb-1 px-1">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          Puntos de las rondas extra
        </h3>
        <p className="text-xs text-slate-400 mb-4 px-1">
          Suma el rompecabezas y el personaje de todas las rondas extra. No cambia la tabla oficial de los versículos.
        </p>

        <div className="space-y-2.5">
          {sortedPlayers.map((player, rank) => {
            const isMe = player.id === myPlayerId;
            const roundPoints = player.puzzlePoints + player.abyssPoints;
            const solvedName = room.abyssSolved && room.abyssWinnerName === player.name;
            return (
              <div
                key={player.id}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-colors ${
                  rank === 0
                    ? 'border-amber-400/60 bg-amber-400/10'
                    : isMe
                    ? 'border-teams-500/60 bg-teams-500/15'
                    : 'border-slate-800 bg-slate-950/60'
                }`}
              >
                {/* Línea 1: puesto, distintivo, nombre y total */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {rank < 3 ? (
                    <span className="emoji text-2xl sm:text-3xl w-8 text-center shrink-0" title={`Puesto ${rank + 1}`}>
                      {MEDALS[rank]}
                    </span>
                  ) : (
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-sm bg-slate-800 text-slate-300 shrink-0">
                      {rank + 1}
                    </span>
                  )}
                  <span className="emoji text-xl sm:text-2xl w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-teams-500/20 border border-teams-500/30 rounded-xl shrink-0">
                    {player.avatar}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-slate-100 text-base line-clamp-2 break-words sm:truncate">{player.name}</span>
                      {isMe && <span className="text-xs text-amber-300 font-semibold shrink-0">(Tú)</span>}
                      {player.isHost && (
                        <span title="Líder anfitrión" className="shrink-0">
                          <Crown className="w-4 h-4 text-amber-400" />
                        </span>
                      )}
                    </span>
                    {/* En celular el total va debajo del nombre para que el nombre no se corte */}
                    <span className="sm:hidden block">
                      <span className="text-xl font-mono font-bold text-amber-300 tabular-nums">{player.score}</span>
                      <span className="text-xs text-slate-400 ml-1">pts</span>
                    </span>
                  </span>
                  <span className="hidden sm:block shrink-0 text-right">
                    <span className="text-xl sm:text-2xl font-mono font-bold text-amber-300 tabular-nums">{player.score}</span>
                    <span className="text-xs text-slate-400 ml-1">pts</span>
                  </span>
                </div>

                {/* Línea 2: de dónde salen los puntos de esta ronda */}
                <div className="mt-2 sm:pl-[5.75rem] flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <Puzzle className="w-3.5 h-3.5 text-teams-300 shrink-0" />
                    {player.puzzleCompleted
                      ? `Completo en ${player.puzzleFinishTime ?? '?'} s`
                      : `${player.puzzlePiecesPlaced}/24 piezas`}
                    <strong className="text-slate-100 ml-0.5">+{player.puzzlePoints}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5 text-teams-300 shrink-0" />
                    {solvedName ? 'Completó el nombre' : 'Letras'}
                    <strong className="text-slate-100 ml-0.5">+{player.abyssPoints}</strong>
                  </span>
                  <span className="text-slate-400">
                    Esta ronda: <strong className="text-slate-200">+{roundPoints}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="flex items-start gap-2 text-xs text-slate-400 mt-4 px-1">
          <Info className="w-4 h-4 shrink-0 text-teams-300" />
          <span>
            Rompecabezas: {POINTS_PER_PIECE} pts por pieza y, si lo completas, hasta {MAX_SPEED_BONUS} pts por rapidez.
            Personaje: 50 pts por cada letra que aciertas, 200 a quien completa el nombre y 350 si lo escribes completo.
          </span>
        </p>
      </div>

      {/* Controles del anfitrión */}
      <div className="text-center">
        {isHost ? (
          <button
            onClick={onNextRound}
            className="inline-flex items-center gap-3 px-6 sm:px-8 py-3.5 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-bold text-base rounded-2xl transition-all shadow-lg shadow-amber-500/25 active:scale-95"
          >
            <span>{isLastRound ? 'Ver el podio de las rondas extra' : 'Siguiente ronda extra'}</span>
            <ArrowRight className="w-5 h-5 shrink-0" />
          </button>
        ) : (
          <div className="inline-flex items-center gap-2.5 text-sm font-medium text-amber-200 bg-amber-400/10 px-4 py-2.5 rounded-xl border border-amber-400/30">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Esperando que el anfitrión continúe...</span>
          </div>
        )}
      </div>
    </div>
  );
};
