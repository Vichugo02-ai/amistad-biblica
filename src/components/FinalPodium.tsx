import React, { useEffect } from 'react';
import { RoomState } from '../types/game';
import { audioFx } from '../utils/audio';
import { MEDALS, CONFETTI_COLORS } from '../data/theme';
import confetti from 'canvas-confetti';
import { Trophy, Crown, RotateCcw, HeartHandshake } from 'lucide-react';

interface FinalPodiumProps {
  room: RoomState;
  myPlayerId: string | null;
  onResetGame: () => void;
}

export const FinalPodium: React.FC<FinalPodiumProps> = ({
  room,
  myPlayerId,
  onResetGame
}) => {
  const isHost = myPlayerId && room.hostId === myPlayerId;
  const sortedPlayers = Object.values(room.players).sort((a, b) => b.score - a.score);

  const firstPlace = sortedPlayers[0];
  const secondPlace = sortedPlayers[1];
  const thirdPlace = sortedPlayers[2];

  useEffect(() => {
    // Play celebratory sound
    audioFx.playVictoryFanfare();

    // Fire fireworks confetti
    const duration = 3.5 * 1000;
    const animationEnd = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: CONFETTI_COLORS
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: CONFETTI_COLORS
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teams-500/20 border border-teams-500/50 text-sm font-semibold text-slate-100 mb-3">
          <span className="emoji">🎉</span>
          <span>¡Gran final del Día del Amigo!</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-cinzel mb-3 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
          Podio de Campeones
        </h1>
        <p className="max-w-xl mx-auto text-base text-slate-300">
          «Nadie tiene mayor amor que este, que uno ponga su vida por sus amigos.» — Juan 15:13
        </p>
      </div>

      {/* 3-Step Podium Display */}
      {sortedPlayers.length >= 1 && (
        <div className="flex flex-col md:flex-row items-end justify-center gap-4 mb-12 max-w-2xl mx-auto pt-8">
          {/* 2nd Place (Left) */}
          {secondPlace && (
            <div className="w-full md:w-1/3 order-2 md:order-1 flex flex-col items-center">
              <div className="emoji text-4xl mb-1">{secondPlace.avatar}</div>
              <span className="text-sm text-slate-100 font-semibold truncate max-w-[160px] text-center">
                {secondPlace.name}
              </span>
              <span className="text-sm font-mono font-bold text-slate-300 mb-2 tabular-nums">
                {secondPlace.score} pts
              </span>
              <div className="w-full h-36 bg-gradient-to-t from-slate-900 to-slate-800 border-t-4 border-slate-300 rounded-t-3xl p-4 flex flex-col items-center justify-center shadow-lg">
                <span className="emoji text-5xl">{MEDALS[1]}</span>
                <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold mt-1">2.º lugar</span>
              </div>
            </div>
          )}

          {/* 1st Place (Center - Elevated) */}
          {firstPlace && (
            <div className="w-full md:w-1/3 order-1 md:order-2 flex flex-col items-center">
              <Crown className="w-9 h-9 text-amber-400 fill-amber-400 animate-bounce mb-1" />
              <div className="emoji text-5xl mb-1">{firstPlace.avatar}</div>
              <span className="text-lg text-amber-200 font-bold truncate max-w-[180px] text-center">
                {firstPlace.name}
              </span>
              <span className="text-base font-mono font-bold text-amber-300 mb-2 tabular-nums">
                {firstPlace.score} pts
              </span>
              <div className="w-full h-48 bg-gradient-to-t from-slate-900 to-amber-950/60 border-t-4 border-amber-400 rounded-t-3xl p-4 flex flex-col items-center justify-center shadow-2xl shadow-amber-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-amber-400/10 pointer-events-none" />
                <span className="emoji text-6xl relative">{MEDALS[0]}</span>
                <span className="text-sm uppercase tracking-wider text-amber-300 font-bold mt-1 relative flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" />
                  Campeón
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place (Right) */}
          {thirdPlace && (
            <div className="w-full md:w-1/3 order-3 flex flex-col items-center">
              <div className="emoji text-4xl mb-1">{thirdPlace.avatar}</div>
              <span className="text-sm text-slate-100 font-semibold truncate max-w-[160px] text-center">
                {thirdPlace.name}
              </span>
              <span className="text-sm font-mono font-bold text-coral-300 mb-2 tabular-nums">
                {thirdPlace.score} pts
              </span>
              <div className="w-full h-28 bg-gradient-to-t from-slate-900 to-slate-800 border-t-4 border-coral-400 rounded-t-3xl p-4 flex flex-col items-center justify-center shadow-lg">
                <span className="emoji text-4xl">{MEDALS[2]}</span>
                <span className="text-xs uppercase tracking-wider text-coral-300 font-semibold mt-1">3.er lugar</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Tabla completa ({sortedPlayers.length} participantes)
          </h3>
          <span className="text-xs text-slate-400">
            Puntuación automática
          </span>
        </div>

        <div className="divide-y divide-slate-800">
          {sortedPlayers.map((player, index) => {
            const isMe = player.id === myPlayerId;
            return (
              <div
                key={player.id}
                className={`py-3 px-2 flex items-center justify-between text-base ${
                  isMe ? 'bg-teams-500/20 rounded-xl font-semibold' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {index < 3 ? (
                    <span className="emoji text-xl w-7 text-center shrink-0">{MEDALS[index]}</span>
                  ) : (
                    <span className="font-mono text-sm w-7 text-center text-slate-400 shrink-0">
                      {index + 1}
                    </span>
                  )}
                  <span className="emoji text-2xl shrink-0">{player.avatar}</span>
                  <span className="text-slate-100 truncate">
                    {player.name} {isMe && '(Tú)'}
                  </span>
                  {player.isHost && (
                    <span title="Líder anfitrión">
                      <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-amber-300 tabular-nums">
                    {player.score} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fellowship Banner */}
      <div className="bg-gradient-to-r from-teams-500/25 via-amber-400/10 to-teams-500/25 border border-amber-400/40 rounded-3xl p-6 text-center mb-8">
        <HeartHandshake className="w-8 h-8 text-amber-300 mx-auto mb-2" />
        <h4 className="text-xl font-bold text-slate-100 font-cinzel">
          ¡Gracias por compartir esta fiesta del Día del Amigo!
        </h4>
        <p className="text-sm text-slate-300 max-w-lg mx-auto mt-1">
          «Mirad cuán bueno y cuán delicioso es habitar los hermanos juntos en armonía.» — Salmos 133:1
        </p>
      </div>

      {/* Host Restart Controls */}
      {isHost ? (
        <div className="text-center">
          <button
            onClick={onResetGame}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Jugar nueva partida</span>
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center">
          El anfitrión puede reiniciar la partida para jugar con nuevas historias bíblicas.
        </p>
      )}
    </div>
  );
};
