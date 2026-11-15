import React, { useEffect, useMemo, useState } from 'react';
import { RoomState } from '../types/game';
import { audioFx } from '../utils/audio';
import { VERSES_TIME_LIMIT, VERSE_PENALTY_MS, formatMs, rankVersePlayers, verseTotalMs } from '../utils/verses';
import { BookOpen, Check, CheckCircle2, Eraser, Loader2, MousePointerClick, Timer, Users, X } from 'lucide-react';

interface VersesBoardProps {
  room: RoomState;
  myPlayerId: string | null;
  onSubmit: (verseIndex: number, order: string[]) => void;
  /** Última respuesta del servidor a un intento de este jugador */
  lastResult: { id: string; verseIndex: number; correct: boolean } | null;
}

const formatClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

/** Mezcla los índices y evita que queden ya en el orden correcto */
function shuffledIndices(count: number): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    if (count < 2 || indices.some((value, i) => value !== i)) break;
  }
  return indices;
}

export const VersesBoard: React.FC<VersesBoardProps> = ({ room, myPlayerId, onSubmit, lastResult }) => {
  const me = myPlayerId ? room.players[myPlayerId] : undefined;
  const verseIndex = me?.versesDone ?? 0;
  const finished = me?.verseFinished ?? false;
  const verse = room.verses[verseIndex];
  const total = room.verses.length;

  // Frases disponibles (por índice) y respuesta que va armando el jugador
  const [pool, setPool] = useState<number[]>([]);
  const [answer, setAnswer] = useState<number[]>([]);
  const [checking, setChecking] = useState(false);
  const [wrong, setWrong] = useState(false);

  // Cada versículo nuevo empieza con sus frases revueltas
  useEffect(() => {
    setPool(shuffledIndices(verse?.phrases.length ?? 0));
    setAnswer([]);
    setChecking(false);
    setWrong(false);
  }, [verseIndex, verse?.text]);

  // Respuesta del servidor al intento
  useEffect(() => {
    if (!lastResult) return;
    setChecking(false);
    if (lastResult.correct) {
      audioFx.playSuccessChime();
    } else if (lastResult.verseIndex === verseIndex) {
      audioFx.playBridgeCreak();
      setWrong(true);
    }
  }, [lastResult?.id]);

  const addPhrase = (index: number) => {
    if (checking || finished) return;
    audioFx.playPieceSnap();
    setPool(prev => prev.filter(i => i !== index));
    setAnswer(prev => [...prev, index]);
    setWrong(false);
  };

  const removePhrase = (index: number) => {
    if (checking || finished) return;
    setAnswer(prev => prev.filter(i => i !== index));
    setPool(prev => [...prev, index]);
    setWrong(false);
  };

  const clearAnswer = () => {
    if (checking || finished) return;
    setPool(prev => [...prev, ...answer]);
    setAnswer([]);
    setWrong(false);
  };

  const handleCheck = () => {
    if (!verse || checking || answer.length !== verse.phrases.length) return;
    setChecking(true);
    onSubmit(verseIndex, answer.map(i => verse.phrases[i]));
  };

  const ranked = useMemo(() => rankVersePlayers(Object.values(room.players)), [room.players]);
  const isTimeLow = room.timerSeconds <= 30;
  const allPlaced = !!verse && answer.length === verse.phrases.length;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Encabezado */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teams-500/20 border border-teams-500/50 text-xs font-semibold text-slate-100 mb-2">
              <span className="emoji">📜</span>
              <span>Juego principal · Ordena los versículos</span>
            </div>
            <h2 className="text-lg md:text-2xl font-bold text-slate-100 font-cinzel">
              Arma cada versículo en el menor tiempo
            </h2>
            <p className="hidden sm:block text-sm text-slate-400 mt-0.5">
              Toca las frases en el orden correcto. Cada intento equivocado suma {VERSE_PENALTY_MS / 1000} segundos.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-950 border-2 ${
                isTimeLow ? 'border-rose-500 animate-pulse' : 'border-amber-400/40'
              }`}
            >
              <Timer className={`w-5 h-5 ${isTimeLow ? 'text-rose-400' : 'text-amber-400'}`} />
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block leading-none mb-0.5">Tiempo</span>
                <span className={`text-2xl font-mono font-bold leading-none tabular-nums ${isTimeLow ? 'text-rose-400' : 'text-amber-300'}`}>
                  {formatClock(room.timerSeconds)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-950 border-2 border-emerald-500/40">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block leading-none mb-0.5">Versículos</span>
                <span className="text-2xl font-mono font-bold text-emerald-400 leading-none tabular-nums">
                  {Math.min(verseIndex, total)}/{total}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Zona de juego */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl shadow-slate-950/40">
          {finished || !verse ? (
            <div className="text-center py-8 animate-fade-in">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-emerald-200 font-cinzel">¡Ordenaste los {total} versículos!</h3>
              {me && (
                <p className="text-base text-slate-200 mt-2">
                  Tu tiempo: <strong className="text-amber-300 font-mono text-xl">{formatMs(verseTotalMs(me))}</strong>
                  {me.verseMistakes > 0 && (
                    <span className="text-sm text-slate-400"> (incluye {me.verseMistakes * (VERSE_PENALTY_MS / 1000)} s de penalización)</span>
                  )}
                </p>
              )}
              <div className="mt-5 inline-flex items-center gap-2.5 text-sm font-medium text-amber-200 bg-amber-400/10 px-4 py-2.5 rounded-xl border border-amber-400/30">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Esperando a que terminen los demás...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <span className="flex items-center gap-2 text-sm font-bold text-amber-300">
                  <BookOpen className="w-4 h-4" />
                  Versículo {verseIndex + 1} de {total} · {verse.reference}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <MousePointerClick className="w-4 h-4 text-teams-300" />
                  Toca una frase para ponerla o quitarla
                </span>
              </div>

              {/* Respuesta que se va armando */}
              <div
                className={`min-h-[7.5rem] p-3 rounded-2xl border-2 border-dashed flex flex-wrap content-start gap-2 transition-colors ${
                  wrong ? 'border-rose-500 bg-rose-500/10 animate-shake' : 'border-slate-700 bg-slate-950/60'
                }`}
              >
                {answer.length === 0 && (
                  <span className="text-sm text-slate-500 m-auto text-center">
                    Aquí se va armando el versículo
                  </span>
                )}
                {answer.map((phraseIndex, position) => {
                  // Tras un intento fallido se marcan las frases que sí están en su lugar
                  const inPlace = wrong && phraseIndex === position;
                  const misplaced = wrong && phraseIndex !== position;
                  return (
                    <button
                      key={phraseIndex}
                      type="button"
                      onClick={() => removePhrase(phraseIndex)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm sm:text-base font-semibold text-left transition-all active:scale-95 ${
                        inPlace
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                          : misplaced
                          ? 'border-rose-500/70 bg-rose-500/10 text-rose-200'
                          : 'border-amber-400 bg-amber-400/15 text-amber-200'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-950/70 text-[11px] font-mono flex items-center justify-center shrink-0">
                        {position + 1}
                      </span>
                      <span>{verse.phrases[phraseIndex]}</span>
                    </button>
                  );
                })}
              </div>

              {wrong && (
                <p className="flex items-center gap-2 text-sm text-rose-300 font-medium mt-2">
                  <X className="w-4 h-4 shrink-0" />
                  Hay frases fuera de lugar (+{VERSE_PENALTY_MS / 1000} s). En verde, las que sí van ahí.
                </p>
              )}

              {/* Frases revueltas */}
              <div className="mt-4 flex flex-wrap gap-2 min-h-[3rem]">
                {pool.map(phraseIndex => (
                  <button
                    key={phraseIndex}
                    type="button"
                    onClick={() => addPhrase(phraseIndex)}
                    className="px-3 py-2 rounded-xl border-2 border-slate-700 bg-slate-800 hover:border-teams-400 hover:bg-teams-500/25 text-slate-100 text-sm sm:text-base font-semibold text-left transition-all active:scale-95"
                  >
                    {verse.phrases[phraseIndex]}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={clearAnswer}
                  disabled={answer.length === 0 || checking}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-40 text-sm font-semibold transition-colors"
                >
                  <Eraser className="w-4 h-4" />
                  <span>Limpiar</span>
                </button>
                <button
                  type="button"
                  onClick={handleCheck}
                  disabled={!allPlaced || checking}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm transition-all active:scale-95"
                >
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Comprobar</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Avance en vivo */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-4">
          <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-teams-300" />
            Avance en vivo
            <span className="text-slate-400 font-medium">({ranked.length})</span>
          </h3>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {ranked.map((player, index) => {
              const isMe = player.id === myPlayerId;
              return (
                <div
                  key={player.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                    isMe ? 'border-amber-400/60 bg-amber-400/10' : 'border-slate-800 bg-slate-950/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-xs font-mono text-slate-400 text-center shrink-0">{index + 1}</span>
                    <span className="emoji text-xl shrink-0">{player.avatar}</span>
                    <span className="text-sm font-semibold text-slate-100 truncate">
                      {player.name} {isMe && '(Tú)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {player.verseFinished ? (
                      <span className="flex items-center gap-1 text-sm font-mono font-bold text-emerald-400 tabular-nums">
                        <CheckCircle2 className="w-4 h-4" />
                        {formatMs(verseTotalMs(player))}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1" aria-label={`${player.versesDone} de ${total} versículos`}>
                        {Array.from({ length: total }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-3 h-3 rounded-full ${i < player.versesDone ? 'bg-emerald-400' : 'bg-slate-700'}`}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 mt-3">
            Tiempo máximo: {formatClock(VERSES_TIME_LIMIT)}. Gana quien ordene los {total} versículos más rápido.
          </p>
        </div>
      </div>
    </div>
  );
};
