import React, { useState, useEffect } from 'react';
import { RoomState } from '../types/game';
import { audioFx } from '../utils/audio';
import { renderBiblicalSceneToCanvas } from '../utils/sceneArt';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  ChevronRight,
  Image as ImageIcon,
  Keyboard,
  Lightbulb,
  Maximize2,
  PartyPopper,
  Send,
  Timer,
  X
} from 'lucide-react';

interface AbyssBridgeBoardProps {
  room: RoomState;
  myPlayerId: string | null;
  onGuessLetter: (letter: string) => void;
  onGuessPhrase: (phrase: string) => void;
  onBuzzerPress: () => void;
  onHostNext: () => void;
}

const SPANISH_KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

const MAX_STRIKES = 6;

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

/** true en celular, tableta vertical y en el panel lateral de Teams */
function useIsCompact(): boolean {
  const query = '(max-width: 1023px)';
  const [compact, setCompact] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setCompact(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return compact;
}

/**
 * Personaje que cruza el puente: un joven pastor de cabello rizado, túnica
 * turquesa, manto a rayas y zurrón. Dibujo propio en SVG; los pies quedan en y = 56.
 */
const Shepherd: React.FC<{ pose: 'walk' | 'cheer' | 'fall' }> = ({ pose }) => {
  const skin = '#f2c9a0';
  const armsUp = pose !== 'walk';
  return (
    <g>
      {/* zurrón a la espalda */}
      <ellipse cx="7" cy="31" rx="6" ry="7" fill="#cdb48a" />
      {/* piernas y sandalias */}
      <rect x="12" y="47" width="4.5" height="9" rx="2" fill={skin} />
      <rect x="20" y="47" width="4.5" height="9" rx="2" fill={skin} />
      <rect x="11" y="54.5" width="6.5" height="2.5" rx="1.2" fill="#6b4423" />
      <rect x="19" y="54.5" width="6.5" height="2.5" rx="1.2" fill="#6b4423" />
      {/* túnica: falda crema y pecho turquesa */}
      <path d="M9,34 L27,34 L29.5,50 L6.5,50 Z" fill="#efe6d2" />
      <rect x="9" y="21" width="18" height="16" rx="5" fill={pose === 'fall' ? '#f25f5c' : '#1fa3b5'} />
      {/* manto a rayas cruzado */}
      <path d="M10,22 L16,21 L28,47 L21.5,48 Z" fill="#e8872b" />
      <path d="M13,21.5 L15,21.2 L26.5,47.2 L24.5,47.6 Z" fill="#4f8a4a" />
      {/* cinturón */}
      <rect x="8" y="34" width="20" height="3" rx="1.5" fill="#6b4423" />
      {/* brazos */}
      {armsUp ? (
        <>
          <line x1="10" y1="25" x2="2" y2="9" stroke={skin} strokeWidth="4.5" strokeLinecap="round" />
          <line x1="26" y1="25" x2="34" y2="9" stroke={skin} strokeWidth="4.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <line x1="10" y1="25" x2="5" y2="38" stroke={skin} strokeWidth="4.5" strokeLinecap="round" />
          <line x1="26" y1="25" x2="32" y2="34" stroke={skin} strokeWidth="4.5" strokeLinecap="round" />
          {/* piedra en la mano */}
          <circle cx="33" cy="35" r="2.6" fill="#8a8f9c" />
        </>
      )}
      {/* cabeza y cabello rizado */}
      <circle cx="18" cy="13" r="9" fill={skin} />
      <circle cx="10.5" cy="10" r="4" fill="#6b4226" />
      <circle cx="14" cy="6" r="4.6" fill="#6b4226" />
      <circle cx="19.5" cy="4.5" r="4.8" fill="#7a4c2c" />
      <circle cx="24.5" cy="7" r="4.4" fill="#6b4226" />
      <circle cx="26.5" cy="11.5" r="3" fill="#6b4226" />
      {/* ojos */}
      <circle cx="15" cy="14.5" r="1.1" fill="#3a2414" />
      <circle cx="21.5" cy="14.5" r="1.1" fill="#3a2414" />
    </g>
  );
};

export const AbyssBridgeBoard: React.FC<AbyssBridgeBoardProps> = ({
  room,
  myPlayerId,
  onGuessLetter,
  onGuessPhrase,
  onBuzzerPress,
  onHostNext
}) => {
  const [phraseInput, setPhraseInput] = useState('');
  const [activeHintIndex, setActiveHintIndex] = useState(0);
  const [showFullImageModal, setShowFullImageModal] = useState(false);
  const [sceneUrl, setSceneUrl] = useState('');
  const isCompact = useIsCompact();

  const isHost = !!myPlayerId && room.hostId === myPlayerId;
  const isGameOver = room.abyssStrikes >= MAX_STRIKES;
  const isWon = room.abyssSolved;
  const canPlay = !isGameOver && !isWon;
  // Mientras se juega no se muestra título, cita ni versículo: revelarían la respuesta
  const isRevealed = isWon || isGameOver;

  const targetPhrase = room.story.phrase.toUpperCase();
  const guessedLetters = room.abyssGuessedLetters.map(l => l.toUpperCase());
  const guessedSet = new Set(guessedLetters);
  const guessedKey = guessedLetters.join('');

  // Imagen de referencia: la foto de la historia o, si no tiene, la escena ilustrada
  useEffect(() => {
    if (room.story.imageUrl) {
      setSceneUrl(room.story.imageUrl);
      return;
    }
    const canvas = document.createElement('canvas');
    renderBiblicalSceneToCanvas(canvas, room.story.svgSceneId || 'david_jonatan', 900, 600);
    setSceneUrl(canvas.toDataURL());
  }, [room.story.id, room.story.imageUrl, room.story.svgSceneId]);

  // Vuelve a la primera pista cuando cambia la historia
  useEffect(() => {
    setActiveHintIndex(0);
  }, [room.story.id]);

  // Atajos de teclado: escribir una letra la juega
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canPlay) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toUpperCase();
      if (/^[A-ZÑ]$/.test(key) && !guessedKey.includes(key)) {
        onGuessLetter(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canPlay, guessedKey, onGuessLetter]);

  const handlePhraseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phraseInput.trim() || !canPlay) return;
    onGuessPhrase(phraseInput);
    setPhraseInput('');
  };

  const pressLetter = (letter: string) => {
    if (targetPhrase.includes(letter)) audioFx.playCorrectLetter();
    else audioFx.playBridgeCreak();
    onGuessLetter(letter);
  };

  const pressBuzzer = () => {
    audioFx.playBuzzer();
    onBuzzerPress();
  };

  const words = targetPhrase.split(' ');
  const letterCount = targetPhrase.replace(/ /g, '').length;
  const characterName = room.story.character || room.story.phrase;
  const hints = room.story.hints;
  const isTimeLow = room.timerSeconds <= 15;
  const nextHint = () => setActiveHintIndex((prev) => (prev + 1) % hints.length);

  // ---------- Piezas que comparten la vista de escritorio y la de celular ----------

  /**
   * Escena del puente. Siempre es de noche, también en modo claro.
   * En vertical (celular) usa un encuadre alto y cerrado sobre el puente: el cielo
   * y el abismo se alargan para llenar toda la pantalla detrás del nombre y el teclado.
   */
  const bridgeScene = (portrait: boolean) => (
    <svg
      viewBox={portrait ? '185 -420 690 1190' : '0 -40 900 440'}
      className="w-full h-full select-none"
      preserveAspectRatio={portrait ? 'xMidYMid slice' : 'xMidYMid meet'}
      role="img"
      aria-label="Un joven pastor cruza un puente colgante sobre el abismo"
    >
      <defs>
        <linearGradient id="abyssSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0d0f2b" />
          <stop offset="55%" stopColor="#181b40" />
          <stop offset="100%" stopColor="#444791" />
        </linearGradient>
        <linearGradient id="abyssMist" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(91, 95, 199, 0)" />
          <stop offset="65%" stopColor="rgba(91, 95, 199, 0.45)" />
          <stop offset="100%" stopColor="rgba(13, 15, 43, 0.95)" />
        </linearGradient>
        <radialGradient id="abyssGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 197, 61, 0.5)" />
          <stop offset="100%" stopColor="rgba(255, 197, 61, 0)" />
        </radialGradient>
      </defs>

      <rect x="0" y="-40" width="900" height="440" fill="url(#abyssSky)" />
      {portrait && (
        <>
          {/* más cielo arriba y más abismo abajo */}
          <rect x="0" y="-500" width="900" height="461" fill="#0d0f2b" />
          <rect x="0" y="399" width="900" height="401" fill="#0d0f2b" />
          <rect x="0" y="-500" width="184" height="461" fill="#2a2e5c" />
          <rect x="716" y="-500" width="184" height="461" fill="#232750" />
          <polygon points="785,399 900,399 900,800 803,800" fill="#232750" />
        </>
      )}

      {/* Estrellas */}
      {Array.from({ length: 28 }).map((_, i) => (
        <circle
          key={i}
          cx={(i * 37 + 190) % 900}
          cy={((i * 23) % 200) - 30}
          r={(i % 3) * 0.7 + 0.9}
          fill="#ffe59a"
          opacity={0.45 + (i % 4) * 0.13}
        />
      ))}

      {/* Risco de salida, con antorcha */}
      <path d="M0,-40 L184,-40 L160,190 L130,280 L0,400 Z" fill="#2a2e5c" />
      <path d="M184,-40 L160,190 L130,280" fill="none" stroke="#3b4078" strokeWidth="3" />
      <circle cx="140" cy="172" r="22" fill="#f5a623" opacity="0.28" />
      <rect x="138" y="176" width="4" height="16" fill="#8a520b" />
      <polygon points="133,178 140,158 147,178" fill="#ffc53d" />
      <polygon points="136,178 140,166 144,178" fill="#ff7f73" />

      {/* Risco de llegada, con la bandera de meta */}
      <path d="M716,-40 L900,-40 L900,400 L785,400 L760,300 L740,190 Z" fill="#232750" />
      <path d="M716,-40 L740,190 L760,300 L785,400" fill="none" stroke="#3b4078" strokeWidth="3" />
      <circle cx="812" cy="122" r="56" fill="url(#abyssGlow)" />
      <rect x="808" y="92" width="5" height="96" rx="2" fill="#cdb48a" />
      <path d="M813,94 L852,107 L813,121 Z" fill="#ffc53d" />
      <path d="M813,94 L852,107 L813,107 Z" fill="#ffd76a" />
      <circle cx="810.5" cy="91" r="4" fill="#ffc53d" />

      {/* Niebla del abismo */}
      <rect x="120" y="215" width="670" height="185" fill="url(#abyssMist)" />

      {/* Cuerdas del puente */}
      <path d="M150,185 Q450,230 750,185" fill="none" stroke="#b06a08" strokeWidth="4" />
      <path d="M150,215 Q450,260 750,215" fill="none" stroke="#6b400d" strokeWidth="6" />

      {/* 6 tablones */}
      {[0, 1, 2, 3, 4, 5].map((plankIdx) => {
        const px = 200 + plankIdx * 88;
        const normalizedDist = (px - 450) / 300;
        const py = 210 + (1 - normalizedDist * normalizedDist) * 28;
        const isBroken = room.abyssStrikes > plankIdx;

        if (isBroken) {
          return (
            <g key={plankIdx} opacity="0.75">
              <rect
                x={px}
                y={py + 45}
                width="30"
                height="10"
                rx="2"
                fill="#6b400d"
                transform={`rotate(${plankIdx % 2 === 0 ? 35 : -35} ${px + 15} ${py + 50})`}
              />
              <rect
                x={px + 34}
                y={py + 70}
                width="26"
                height="10"
                rx="2"
                fill="#8a520b"
                transform={`rotate(${plankIdx % 2 === 0 ? -50 : 50} ${px + 47} ${py + 75})`}
              />
            </g>
          );
        }

        return (
          <g key={plankIdx}>
            <line
              x1={px + 32}
              y1={py - 22}
              x2={px + 32}
              y2={py}
              stroke="#db8a0b"
              strokeWidth="2"
              strokeDasharray="3,2"
            />
            <rect x={px} y={py} width="65" height="13" rx="3" fill="#b06a08" stroke="#ffc53d" strokeWidth="1.5" />
          </g>
        );
      })}

      {/* El pastor */}
      {(() => {
        if (isWon) {
          // A salvo junto a la bandera, celebrando
          return (
            <g transform="translate(745, 119) scale(1.5)">
              <Shepherd pose="cheer" />
            </g>
          );
        }

        if (isGameOver) {
          // Cayendo hacia la niebla. La posición va en el <g> de afuera y el rebote en el
          // de adentro: si van juntos, la animación CSS borra la posición.
          return (
            <g transform="translate(420, 250) scale(1.5)">
              <g className="animate-bounce">
                <Shepherd pose="fall" />
              </g>
            </g>
          );
        }

        const safePlankIndex = Math.min(5, Math.max(0, room.abyssStrikes));
        const charX = 220 + safePlankIndex * 85;
        const charNormalizedDist = (charX - 450) / 300;
        const charY = 165 + (1 - charNormalizedDist * charNormalizedDist) * 28;

        // Escala 1.5 desde los pies (y = 56) y el centro (x = 18)
        return (
          <g style={{ transform: `translate(${charX - 9}px, ${charY - 28}px) scale(1.5)`, transition: 'transform 500ms ease-out' }}>
            <Shepherd pose="walk" />
          </g>
        );
      })()}
    </svg>
  );

  /**
   * En celular cada casilla mide lo que cabe en el ancho: la palabra más larga
   * entra en una sola línea sin salirse, también con la letra del celular agrandada.
   */
  const longestWord = Math.max(5, ...words.map(w => w.length));
  const fluidSide = `min(2.4rem, calc((100vw - 2.75rem) / ${longestWord} - 0.3rem))`;
  const fluidTile: React.CSSProperties = {
    width: fluidSide,
    height: `calc(${fluidSide} * 1.2)`,
    fontSize: `calc(${fluidSide} * 0.62)`
  };

  /** Casillas del nombre. */
  const wordTiles = (size: 'lg' | 'fluid') => (
    <div className={`flex flex-wrap items-center justify-center ${size === 'lg' ? 'gap-x-6 gap-y-3' : 'gap-x-3 gap-y-1.5'}`}>
      {words.map((word, wordIdx) => (
        <div key={wordIdx} className={`flex items-center ${size === 'lg' ? 'gap-1.5 sm:gap-2' : 'gap-1'}`}>
          {word.split('').map((char, charIdx) => {
            const isLetterShown = guessedSet.has(char) || isRevealed;
            const isMissed = isGameOver && !guessedSet.has(char);
            return (
              <div
                key={charIdx}
                style={size === 'fluid' ? fluidTile : undefined}
                className={`border-2 flex items-center justify-center font-cinzel font-bold transition-all ${
                  size === 'lg' ? 'w-14 h-18 rounded-xl text-4xl' : 'rounded-lg shrink-0'
                } ${
                  isMissed
                    ? 'border-rose-500/60 bg-rose-500/10 text-rose-300'
                    : isLetterShown
                    ? 'border-amber-400 bg-amber-400/15 text-amber-300'
                    : 'border-slate-700 bg-slate-950 text-transparent'
                }`}
              >
                {isLetterShown ? char : ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const keyboard = (compact: boolean) => (
    <div className={compact ? 'space-y-1' : 'space-y-2 max-w-2xl mx-auto'}>
      {SPANISH_KEYBOARD_ROWS.map((row, rIdx) => (
        <div key={rIdx} className={`flex justify-center ${compact ? 'gap-1' : 'gap-2'}`}>
          {row.map((letter) => {
            const isGuessed = guessedSet.has(letter);
            const isCorrect = isGuessed && targetPhrase.includes(letter);
            const isWrong = isGuessed && !targetPhrase.includes(letter);

            return (
              <button
                key={letter}
                type="button"
                disabled={!canPlay || isGuessed}
                onClick={() => pressLetter(letter)}
                className={`font-bold transition-all flex items-center justify-center border-2 ${
                  compact ? 'flex-1 max-w-[2.6rem] h-10 rounded-lg text-base' : 'w-12 h-13 rounded-xl text-lg'
                } ${
                  isCorrect
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : isWrong
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 line-through opacity-60 cursor-not-allowed'
                    : canPlay
                    ? 'bg-slate-800 hover:bg-teams-500/30 active:scale-95 border-slate-700 text-slate-100 hover:border-teams-400'
                    : 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  const planks = (
    <div className="flex items-center gap-1" role="img" aria-label={`${room.abyssStrikes} de ${MAX_STRIKES} tablones rotos`}>
      {Array.from({ length: MAX_STRIKES }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 rounded-sm transition-colors ${isCompact ? 'w-2.5' : 'w-6'} ${
            i < room.abyssStrikes ? 'bg-rose-500' : 'bg-amber-400/90'
          }`}
        />
      ))}
    </div>
  );

  const imageModal = showFullImageModal && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in"
      onClick={() => setShowFullImageModal(false)}
    >
      <div
        className="relative max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
            <ImageIcon className="w-4 h-4" />
            La imagen que armaron
          </span>
          <button
            onClick={() => setShowFullImageModal(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {sceneUrl && (
          <img
            src={sceneUrl}
            alt="Imagen del rompecabezas armado"
            className="w-full rounded-xl border border-slate-800 aspect-[3/2] object-cover"
          />
        )}
      </div>
    </div>
  );

  // =====================================================================
  //  CELULAR Y PANEL DE TEAMS: una sola pantalla.
  //  El puente queda de fondo; encima, arriba, el nombre del personaje y,
  //  abajo, el teclado. `scene-dark` mantiene los colores de noche también
  //  en modo claro.
  // =====================================================================
  if (isCompact) {
    return (
      <div className="scene-dark max-w-xl mx-auto">
        <div
          className="relative min-h-[480px] overflow-hidden sm:rounded-3xl"
          style={{ background: '#0d0f2b', height: isHost ? 'calc(100dvh - 11.25rem)' : 'calc(100dvh - 8.5rem)' }}
        >
          {/* Fondo: el puente llena toda la pantalla */}
          <div className="absolute inset-0">{bridgeScene(true)}</div>

          {/* Arriba: estado y nombre del personaje */}
          <div className="absolute top-0 inset-x-0 p-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowFullImageModal(true)}
                  aria-label="Ver la imagen"
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 text-xs font-semibold"
                >
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span className="hidden min-[400px]:inline">Imagen</span>
                </button>
                <button
                  onClick={pressBuzzer}
                  title="Avisa a todos que quieres responder por el micrófono"
                  aria-label="Pedir la palabra"
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-teams-500 text-white text-xs font-bold active:scale-95"
                >
                  <Bell className="w-4 h-4 fill-current" />
                  <span className="hidden min-[400px]:inline">Hablar</span>
                </button>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700">
                {planks}
                {canPlay && (
                  <span className={`flex items-center gap-1 font-mono font-bold text-sm tabular-nums ${isTimeLow ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                    <Timer className="w-4 h-4" />
                    {formatTime(room.timerSeconds)}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/85 border border-slate-700 backdrop-blur-sm px-2 py-2.5">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-300 block text-center mb-1.5">
                ¿Quién es el personaje? · {letterCount} letras
              </span>
              {wordTiles('fluid')}
              {hints.length > 0 && canPlay && (
                <button
                  onClick={nextHint}
                  className="mt-2 w-full flex items-start gap-1.5 text-left text-xs text-slate-200"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="flex-1">
                    <strong className="text-amber-300">Pista {activeHintIndex + 1}/{hints.length}:</strong> {hints[activeHintIndex]}
                  </span>
                  {hints.length > 1 && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>
              )}
            </div>
          </div>

          {/* Abajo: teclado, o el resultado cuando termina */}
          <div className="absolute bottom-0 inset-x-0 p-2">
            {canPlay ? (
              <div className="rounded-2xl bg-slate-900/85 border border-slate-700 backdrop-blur-sm p-2">
                {keyboard(true)}
                <form onSubmit={handlePhraseSubmit} className="flex gap-1.5 mt-2">
                  <input
                    type="text"
                    value={phraseInput}
                    onChange={(e) => setPhraseInput(e.target.value.toUpperCase())}
                    placeholder="¿Ya lo sabes? Nombre completo (+350)"
                    className="flex-1 min-w-0 px-3 py-2 bg-slate-950 border-2 border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-400 placeholder:text-slate-500 placeholder:normal-case uppercase font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={!phraseInput.trim()}
                    aria-label="Arriesgar el nombre completo"
                    className="px-3.5 py-2 bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-xl"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div
                className={`rounded-2xl border-2 backdrop-blur-sm p-4 text-center animate-fade-in ${
                  isWon ? 'bg-emerald-950/90 border-emerald-500/60' : 'bg-rose-950/90 border-rose-500/60'
                }`}
              >
                <h3 className={`text-lg font-bold font-cinzel ${isWon ? 'text-emerald-200' : 'text-rose-200'}`}>
                  {isWon ? '¡Cruzaron el puente!' : '¡Se quebraron los 6 tablones!'}
                </h3>
                <p className="text-sm text-slate-200 mt-1">
                  El personaje {isWon ? 'es' : 'era'}{' '}
                  <strong className="text-amber-300 font-cinzel text-lg">{characterName}</strong>
                </p>
                {isWon && room.abyssWinnerName && (
                  <p className="text-xs text-emerald-300 mt-0.5">Lo completó {room.abyssWinnerName}</p>
                )}
                <p className="text-xs italic text-slate-300 mt-2">
                  «{room.story.verseText}» — {room.story.passage}
                </p>
                {isHost && (
                  <button
                    onClick={onHostNext}
                    className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 font-bold text-sm"
                  >
                    <span>Ver el resumen</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {imageModal}
      </div>
    );
  }

  // =====================================================================
  //  COMPUTADOR
  // =====================================================================
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Encabezado: etapa, pulsador, reloj y tablones */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 mb-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teams-500/20 border border-teams-500/50 text-xs font-semibold text-slate-100 mb-2">
              <span className="emoji">🌉</span>
              <span>Ronda {room.currentRound} de {room.totalRounds} · Sin Caer al Abismo</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-100 font-cinzel">
              ¿Quién es el personaje bíblico?
            </h2>
            <p className="text-sm text-slate-400">
              Adivinen letra por letra. Cada error quiebra un tablón: con 6, el pastor cae.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={pressBuzzer}
              title="Avisa a todos que quieres responder por el micrófono de Teams"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teams-500 to-teams-600 hover:from-teams-600 hover:to-teams-700 text-white font-bold text-sm transition-transform active:scale-95 shadow-lg shadow-teams-500/30"
            >
              <Bell className="w-4 h-4 fill-current" />
              <span>¡Pido la palabra!</span>
            </button>

            {canPlay && (
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
            )}

            <div className="px-4 py-2 rounded-xl bg-slate-950 border-2 border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block leading-none mb-1.5">
                Tablones rotos · {room.abyssStrikes}/{MAX_STRIKES}
              </span>
              {planks}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 items-stretch mb-6">
        {/* Imagen armada (pista visual) */}
        <div className="col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                <span>La imagen que armaron</span>
              </span>
              <button
                onClick={() => setShowFullImageModal(true)}
                className="text-xs font-semibold text-slate-300 hover:text-amber-300 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Ampliar</span>
              </button>
            </div>

            <div className="relative aspect-[3/2] w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
              {sceneUrl && <img src={sceneUrl} alt="Imagen del rompecabezas armado" className="w-full h-full object-cover" />}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-sm">
            {isRevealed ? (
              <div className="flex items-start gap-2 text-slate-300">
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="italic">
                  «{room.story.verseText}» — <strong className="text-amber-300 not-italic">{room.story.passage}</strong>
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-slate-300">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Miren bien la escena: ahí está la respuesta. El versículo se revela al final.</span>
              </div>
            )}
          </div>
        </div>

        {/* Puente colgante. El fondo es un color fijo porque la escena siempre es de noche. */}
        <div className="col-span-8 bg-[#0d0f2b] border-2 border-slate-800 rounded-3xl p-3 flex flex-col justify-center relative overflow-hidden shadow-2xl shadow-slate-950/40">
          <div className="relative w-full aspect-[45/22] rounded-2xl overflow-hidden">{bridgeScene(false)}</div>
        </div>
      </div>

      {/* Caída al abismo */}
      {isGameOver && (
        <div className="bg-rose-950/80 border-2 border-rose-500/60 rounded-3xl p-6 mb-6 text-center animate-fade-in shadow-2xl">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-rose-200 font-cinzel">
            <span className="emoji mr-2">💥</span>¡Se quebraron los 6 tablones!
          </h3>
          <p className="text-sm text-rose-300 mt-1 max-w-lg mx-auto">
            El puente se vino abajo antes de completar el nombre. ¡En la próxima ronda lo logran!
          </p>

          <div className="mt-5 p-4 rounded-2xl bg-slate-900 border border-rose-500/40 max-w-xl mx-auto flex items-center gap-4 text-left">
            {sceneUrl && (
              <img
                src={sceneUrl}
                alt="Imagen del rompecabezas"
                className="w-32 h-24 object-cover rounded-xl border border-slate-700 shrink-0 shadow-md"
              />
            )}
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-rose-400 block">El personaje bíblico era</span>
              <span className="text-2xl font-black font-cinzel text-amber-300 block">{characterName}</span>
              <span className="text-xs text-slate-300 block mt-1">
                {room.story.title} ({room.story.passage})
              </span>
            </div>
          </div>

          {isHost && (
            <button
              onClick={onHostNext}
              className="mt-6 inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-bold text-sm transition-colors shadow-lg shadow-amber-500/25"
            >
              <span>Ver el resumen de la ronda</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Victoria */}
      {isWon && (
        <div className="bg-emerald-950/80 border-2 border-emerald-500/60 rounded-3xl p-6 mb-6 text-center animate-fade-in shadow-2xl">
          <PartyPopper className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-emerald-200 font-cinzel">¡Gloria a Dios! ¡Cruzaron el puente!</h3>
          <p className="text-base text-emerald-300 font-medium mt-1">
            El personaje bíblico es{' '}
            <strong className="text-amber-300 font-bold tracking-wide text-xl font-cinzel">{characterName}</strong>
          </p>
          {room.abyssWinnerName && (
            <p className="text-sm text-emerald-300 mt-1">
              <span className="emoji mr-1">🙌</span>Lo completó <strong className="text-emerald-200">{room.abyssWinnerName}</strong>
            </p>
          )}
          {isHost && (
            <button
              onClick={onHostNext}
              className="mt-5 inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-sm transition-colors shadow-lg shadow-emerald-500/25"
            >
              <span>Ver el resumen de la ronda</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Tablero de la palabra secreta */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6 text-center shadow-xl">
        <span className="text-xs uppercase tracking-wider font-semibold text-amber-300 block mb-4">
          Nombre del personaje · {letterCount} letras
        </span>

        {wordTiles('lg')}

        {hints.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-start gap-2.5 text-left">
              <span className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4" />
              </span>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Pista {activeHintIndex + 1} de {hints.length}
                </span>
                <span className="text-slate-100 font-medium">{hints[activeHintIndex]}</span>
              </div>
            </div>

            {hints.length > 1 && (
              <button
                onClick={nextHint}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-sm transition-colors shrink-0"
              >
                <span>Otra pista</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Teclado en español */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-slate-300">
            <Keyboard className="w-4 h-4 text-teams-300" />
            Toca una letra o escríbela en tu teclado
          </span>
          <span className="text-xs text-slate-400">
            Letras usadas: <span className="font-mono text-amber-300 font-bold tabular-nums">{room.abyssGuessedLetters.length}</span>
          </span>
        </div>

        {keyboard(false)}

        <div className="mt-6 pt-5 border-t border-slate-800 max-w-xl mx-auto">
          <form onSubmit={handlePhraseSubmit} className="flex gap-2">
            <input
              type="text"
              disabled={!canPlay}
              value={phraseInput}
              onChange={(e) => setPhraseInput(e.target.value.toUpperCase())}
              placeholder="¿Ya lo sabes? Escribe el nombre completo"
              className="flex-1 min-w-0 px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-400 placeholder:text-slate-500 placeholder:normal-case uppercase font-semibold"
            />
            <button
              type="submit"
              disabled={!canPlay || !phraseInput.trim()}
              className="flex items-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm rounded-xl transition-colors whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>Arriesgar</span>
            </button>
          </form>
          <span className="text-xs text-slate-400 block text-center mt-2">
            <span className="emoji mr-1">⭐</span>Acertar el nombre completo da +350 puntos. Si fallas, se quiebra un tablón.
          </span>
        </div>
      </div>

      {imageModal}
    </div>
  );
};
