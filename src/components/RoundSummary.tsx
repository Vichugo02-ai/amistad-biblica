import React from 'react';
import { RoomState } from '../types/game';
import { MEDALS } from '../data/theme';
import { ArrowRight, BookOpen, Crown, Loader2, Puzzle, Mountain, Trophy } from 'lucide-react';

interface RoundSummaryProps {
  room: RoomState;
  myPlayerId: string | null;
  onNextRound: () => void;
}

export const RoundSummary: React.FC<RoundSummaryProps> = ({
  room,
  myPlayerId,
  onNextRound
}) => {
  const isHost = myPlayerId && room.hostId === myPlayerId;
  const isLastRound = room.currentRound >= room.totalRounds;

  const sortedPlayers = Object.values(room.players).sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teams-500/20 border border-teams-500/50 text-sm font-semibold text-slate-100 mb-3">
          <span className="emoji">📊</span>
          <span>Resumen · Ronda {room.currentRound} de {room.totalRounds}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-100 font-cinzel mb-2">
          {room.story.title}
        </h1>
        <p className="text-sm text-slate-300">
          Clasificación acumulada y reflexión bíblica para la congregación.
        </p>
      </div>

      {/* Biblical Reflection Box */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-400/40 rounded-3xl p-6 mb-8 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-300 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300 block mb-1">
              Pasaje bíblico · {room.story.passage}
            </span>
            <p className="text-lg italic text-slate-100 mb-2">
              «{room.story.verseText}»
            </p>
            <p className="text-sm text-slate-300">
              <span className="emoji mr-1">🤝</span>
              <strong className="text-slate-100">Enseñanza del Día del Amigo:</strong> {room.story.theme}. Recordemos cultivar amistades puras, leales y fundadas en el amor de Cristo.
            </p>
          </div>
        </div>
      </div>

      {/* Round Leaderboard Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 shadow-lg">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Tabla de posiciones
          </span>
          <span className="text-xs text-slate-400 font-normal normal-case tracking-normal">Puntuación automática</span>
        </h3>

        <div className="space-y-2.5">
          {sortedPlayers.map((player, rank) => {
            const isMe = player.id === myPlayerId;
            return (
              <div
                key={player.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                  rank === 0
                    ? 'border-amber-400/60 bg-amber-400/10'
                    : isMe
                    ? 'border-teams-500/60 bg-teams-500/15'
                    : 'border-slate-800 bg-slate-950/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {rank < 3 ? (
                    <span className="emoji text-3xl w-9 text-center shrink-0" title={`Puesto ${rank + 1}`}>
                      {MEDALS[rank]}
                    </span>
                  ) : (
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm bg-slate-800 text-slate-300 shrink-0">
                      {rank + 1}
                    </span>
                  )}

                  <span className="emoji text-2xl w-10 h-10 flex items-center justify-center bg-teams-500/20 border border-teams-500/30 rounded-xl shrink-0">
                    {player.avatar}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-100 text-base truncate">
                        {player.name}
                      </span>
                      {isMe && <span className="text-xs text-amber-300 font-semibold shrink-0">(Tú)</span>}
                      {player.isHost && (
                        <span title="Líder anfitrión">
                          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="flex items-center gap-1">
                        <Puzzle className="w-3.5 h-3.5 text-teams-300" />
                        {player.puzzlePiecesPlaced}/24 piezas
                      </span>
                      <span className="flex items-center gap-1">
                        <Mountain className="w-3.5 h-3.5 text-teams-300" />
                        +{player.abyssPoints} pts en el abismo
                      </span>
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xl font-mono font-bold text-amber-300 tabular-nums">
                    {player.score}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">pts</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Controls */}
      <div className="text-center">
        {isHost ? (
          <button
            onClick={onNextRound}
            className="inline-flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-bold text-base rounded-2xl transition-all shadow-lg shadow-amber-500/25 active:scale-95"
          >
            <span>{isLastRound ? 'Ver el gran podio final' : 'Comenzar siguiente ronda'}</span>
            <ArrowRight className="w-5 h-5" />
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
