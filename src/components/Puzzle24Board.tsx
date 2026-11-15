import React, { useState, useEffect } from 'react';
import { RoomState } from '../types/game';
import { renderBiblicalSceneToCanvas } from '../utils/sceneArt';
import { initializePuzzlePieces, PieceLayout, COLS, ROWS, TOTAL_PIECES } from '../utils/puzzle';
import { audioFx } from '../utils/audio';
import {
  Eye,
  EyeOff,
  Timer,
  Puzzle,
  PartyPopper,
  ArrowRight,
  Loader2,
  Users,
  CheckCircle2,
  MousePointerClick,
  X
} from 'lucide-react';

interface Puzzle24BoardProps {
  room: RoomState;
  myPlayerId: string | null;
  onPiecePlaced: (piecesCount: number) => void;
  onPuzzleFinished: (timeTaken: number) => void;
  onStartAbyss?: () => void;
}

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

export const Puzzle24Board: React.FC<Puzzle24BoardProps> = ({
  room,
  myPlayerId,
  onPiecePlaced,
  onPuzzleFinished,
  onStartAbyss
}) => {
  const [pieces, setPieces] = useState<PieceLayout[]>([]);
  const [trayPieceIds, setTrayPieceIds] = useState<number[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [errorSlot, setErrorSlot] = useState<number | null>(null);

  const [pieceDataUrls, setPieceDataUrls] = useState<string[]>([]);
  const [fullSceneUrl, setFullSceneUrl] = useState<string>('');

  const isHost = !!myPlayerId && room.hostId === myPlayerId;

  // Dibuja la escena en un lienzo de 900x600 y la corta en 24 piezas
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    const sliceAndSetup = () => {
      setFullSceneUrl(canvas.toDataURL());

      // Generate sliced piece data URLs (6x4 = 24 slices of 150x150)
      const urls: string[] = [];
      const pieceW = 900 / COLS; // 150
      const pieceH = 600 / ROWS; // 150

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const pieceCanvas = document.createElement('canvas');
          pieceCanvas.width = pieceW;
          pieceCanvas.height = pieceH;
          const pctx = pieceCanvas.getContext('2d');
          if (pctx) {
            pctx.drawImage(
              canvas,
              c * pieceW,
              r * pieceH,
              pieceW,
              pieceH,
              0,
              0,
              pieceW,
              pieceH
            );
          }
          urls.push(pieceCanvas.toDataURL());
        }
      }
      setPieceDataUrls(urls);

      const { pieces: initPieces, shuffledIds } = initializePuzzlePieces();
      setPieces(initPieces);
      setTrayPieceIds(shuffledIds);
      setIsCompleted(false);
      setSelectedPieceId(null);
      setStartTime(Date.now());
    };

    if (room.story.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (ctx) {
          // Draw image with object-fit cover math to fill 900x600 (3:2) cleanly
          const canvasAspect = 900 / 600;
          const imgAspect = img.width / img.height;
          let renderW = 900;
          let renderH = 600;
          let offsetX = 0;
          let offsetY = 0;

          if (imgAspect > canvasAspect) {
            renderH = 600;
            renderW = 600 * imgAspect;
            offsetX = (900 - renderW) / 2;
          } else {
            renderW = 900;
            renderH = 900 / imgAspect;
            offsetY = (600 - renderH) / 2;
          }

          // Solo la imagen: sin título ni cita encima, porque revelarían al personaje
          ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
        }
        sliceAndSetup();
      };
      img.onerror = () => {
        // Fallback to procedural scene
        renderBiblicalSceneToCanvas(canvas, room.story.svgSceneId || 'david_jonatan', 900, 600);
        sliceAndSetup();
      };
      img.src = room.story.imageUrl;
    } else {
      renderBiblicalSceneToCanvas(canvas, room.story.svgSceneId || 'david_jonatan', 900, 600);
      sliceAndSetup();
    }
  }, [room.story.id, room.story.imageUrl]);

  // Click on a piece in the tray to select it
  const handleSelectTrayPiece = (pieceId: number) => {
    if (isCompleted) return;
    if (selectedPieceId === pieceId) {
      setSelectedPieceId(null);
    } else {
      setSelectedPieceId(pieceId);
    }
  };

  // Click on a slot on the 6x4 board
  const handleSlotClick = (slotIndex: number) => {
    if (isCompleted) return;

    // Check if slot already has a correct piece
    const existingPieceInSlot = pieces.find(p => p.currentSlotIndex === slotIndex && p.isCorrect);
    if (existingPieceInSlot) return;

    if (selectedPieceId === null) return;

    const piece = pieces.find(p => p.id === selectedPieceId);
    if (!piece) return;

    // Check if selected piece belongs in this slot
    if (piece.targetIndex === slotIndex) {
      // Correct snap!
      audioFx.playPieceSnap();
      const updatedPieces = pieces.map(p =>
        p.id === selectedPieceId
          ? { ...p, currentSlotIndex: slotIndex, isCorrect: true }
          : p
      );
      setPieces(updatedPieces);
      setTrayPieceIds(prev => prev.filter(id => id !== selectedPieceId));
      setSelectedPieceId(null);

      const correctCount = updatedPieces.filter(p => p.isCorrect).length;
      onPiecePlaced(correctCount);

      if (correctCount === TOTAL_PIECES) {
        setIsCompleted(true);
        audioFx.playSuccessChime();
        const secondsTaken = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        onPuzzleFinished(secondsTaken);
      }
    } else {
      // Wrong slot feedback
      audioFx.playBridgeCreak();
      setErrorSlot(slotIndex);
      setTimeout(() => setErrorSlot(null), 600);
    }
  };

  const correctPiecesCount = pieces.filter(p => p.isCorrect).length;
  const progressPercent = Math.round((correctPiecesCount / TOTAL_PIECES) * 100);
  const isTimeLow = room.timerSeconds <= 20;

  // Clasificación en vivo: primero quien terminó más rápido, luego quien lleva más piezas
  const rankedPlayers = Object.values(room.players).sort((a, b) => {
    if (a.puzzleCompleted && b.puzzleCompleted) {
      return (a.puzzleFinishTime ?? 0) - (b.puzzleFinishTime ?? 0);
    }
    if (a.puzzleCompleted !== b.puzzleCompleted) return a.puzzleCompleted ? -1 : 1;
    return b.puzzlePiecesPlaced - a.puzzlePiecesPlaced;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Encabezado: etapa, reloj y avance */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teams-500/20 border border-teams-500/50 text-xs font-semibold text-slate-100 mb-2">
              <span className="emoji">🧩</span>
              <span>Ronda {room.currentRound} de {room.totalRounds} · Rompecabezas de 24 piezas</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-100 font-cinzel">
              Arma la escena bíblica
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Obsérvala bien: después tendrás que adivinar quién es el personaje sin caer al abismo.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors"
            >
              {showGuide ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-amber-400" />}
              <span>{showGuide ? 'Ocultar guía' : 'Ver guía'}</span>
            </button>

            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-950 border-2 ${
                isTimeLow ? 'border-rose-500 animate-pulse' : 'border-amber-400/40'
              }`}
            >
              <Timer className={`w-5 h-5 ${isTimeLow ? 'text-rose-400' : 'text-amber-400'}`} />
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block leading-none mb-0.5">Tiempo</span>
                <span className={`text-2xl font-mono font-bold leading-none tabular-nums ${isTimeLow ? 'text-rose-400' : 'text-amber-300'}`}>
                  {formatTime(room.timerSeconds)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-950 border-2 border-emerald-500/40">
              <Puzzle className="w-5 h-5 text-emerald-400" />
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block leading-none mb-0.5">Piezas</span>
                <span className="text-2xl font-mono font-bold text-emerald-400 leading-none tabular-nums">
                  {correctPiecesCount}/{TOTAL_PIECES}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de avance */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
            <span>Tu avance</span>
            <span className="font-mono font-semibold text-amber-300 tabular-nums">{progressPercent}%</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Imagen guía */}
      {showGuide && (
        <div className="mb-6 p-4 rounded-3xl bg-slate-900 border border-amber-400/50 shadow-xl animate-fade-in">
          <div className="flex justify-between items-center mb-3">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <Eye className="w-4 h-4" />
              Así debe quedar
            </span>
            <button
              onClick={() => setShowGuide(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              aria-label="Cerrar guía"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <img
            src={fullSceneUrl}
            alt="Imagen completa del rompecabezas"
            className="w-full max-w-xl mx-auto rounded-xl border border-slate-700 shadow-md aspect-[3/2] object-cover"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Tablero de armado 6 x 4 */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-3 md:p-5 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">Tablero · 6 columnas × 4 filas</span>
            <span className="flex items-center gap-1.5">
              <MousePointerClick className="w-4 h-4 text-teams-300" />
              Toca una pieza y luego su casilla
            </span>
          </div>

          <div
            className="relative w-full aspect-[3/2] bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-800 grid grid-cols-6 grid-rows-4 gap-0.5 p-0.5"
            style={{
              backgroundImage: isCompleted ? `url(${fullSceneUrl})` : 'none',
              backgroundSize: 'cover'
            }}
          >
            {Array.from({ length: TOTAL_PIECES }).map((_, slotIdx) => {
              const placedPiece = pieces.find(p => p.currentSlotIndex === slotIdx && p.isCorrect);
              const isError = errorSlot === slotIdx;

              return (
                <button
                  key={slotIdx}
                  type="button"
                  onClick={() => handleSlotClick(slotIdx)}
                  disabled={isCompleted || !!placedPiece}
                  className={`relative flex items-center justify-center transition-all ${
                    placedPiece
                      ? 'border-transparent'
                      : isError
                      ? 'bg-rose-500/30 border-2 border-rose-500 animate-shake'
                      : selectedPieceId !== null
                      ? 'border border-amber-400/50 bg-amber-400/5 hover:bg-amber-400/20 cursor-pointer'
                      : 'border border-dashed border-slate-700 bg-slate-900/40'
                  }`}
                >
                  {placedPiece ? (
                    <img
                      src={pieceDataUrls[placedPiece.id]}
                      alt={`Pieza ${placedPiece.id + 1}`}
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                  ) : (
                    <span className="text-xs font-mono font-semibold text-slate-500 select-none">
                      {slotIdx + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tarjeta de victoria (sin versículo ni cita: se revelan al final de la ronda) */}
          {isCompleted && (
            <div className="mt-4 p-5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-center animate-fade-in shadow-xl">
              <PartyPopper className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-emerald-200 font-cinzel">
                ¡Gloria a Dios! Armaste las 24 piezas
              </h3>
              <p className="text-sm text-emerald-300 max-w-lg mx-auto mt-1">
                Guarda la imagen en tu mente: en el siguiente reto hay que adivinar quién es el personaje bíblico.
              </p>

              {isHost && onStartAbyss ? (
                <button
                  onClick={onStartAbyss}
                  className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-bold text-sm transition-transform active:scale-95 shadow-lg shadow-amber-500/25"
                >
                  <span className="emoji">🌉</span>
                  <span>Pasar todos al reto del abismo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="mt-4 inline-flex items-center gap-2.5 text-sm font-medium text-amber-200 bg-amber-400/10 px-4 py-2.5 rounded-xl border border-amber-400/30">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Esperando a que los demás terminen...</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* Banco de piezas */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Puzzle className="w-4 h-4 text-amber-400" />
                Banco de piezas
                <span className="text-slate-400 font-medium">({trayPieceIds.length})</span>
              </h3>
              {selectedPieceId !== null && (
                <span className="text-xs text-amber-300 font-semibold animate-pulse">
                  Pieza {selectedPieceId + 1} elegida
                </span>
              )}
            </div>

            {trayPieceIds.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                ¡Colocaste todas las piezas!
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2 max-h-[340px] overflow-y-auto pr-1">
                {trayPieceIds.map(pieceId => {
                  const isSelected = selectedPieceId === pieceId;
                  return (
                    <button
                      key={pieceId}
                      type="button"
                      onClick={() => handleSelectTrayPiece(pieceId)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400 scale-105 shadow-lg shadow-amber-500/30'
                          : 'border-slate-700 hover:border-teams-400 hover:scale-105'
                      }`}
                    >
                      <img
                        src={pieceDataUrls[pieceId]}
                        alt={`Pieza suelta ${pieceId + 1}`}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                      <span className="absolute bottom-0.5 right-0.5 text-[10px] font-mono font-bold bg-slate-950/85 px-1 rounded text-amber-300">
                        {pieceId + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Competencia en vivo */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-teams-300" />
              Competencia en vivo
              <span className="text-slate-400 font-medium">({rankedPlayers.length})</span>
            </h3>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {rankedPlayers.map(player => {
                const isMe = player.id === myPlayerId;
                const percent = Math.round((player.puzzlePiecesPlaced / TOTAL_PIECES) * 100);
                return (
                  <div
                    key={player.id}
                    className={`p-2.5 rounded-xl border ${
                      isMe
                        ? 'border-amber-400/60 bg-amber-400/10'
                        : 'border-slate-800 bg-slate-950/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="emoji text-xl shrink-0">{player.avatar}</span>
                        <span className="text-sm font-semibold text-slate-100 truncate">
                          {player.name} {isMe && '(Tú)'}
                        </span>
                      </div>
                      <span className="text-sm font-mono font-bold text-amber-300 shrink-0 tabular-nums">
                        {player.score} pts
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            player.puzzleCompleted ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      {player.puzzleCompleted ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {player.puzzleFinishTime ?? '?'} s
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-semibold text-slate-400 shrink-0 tabular-nums">
                          {player.puzzlePiecesPlaced}/{TOTAL_PIECES}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
