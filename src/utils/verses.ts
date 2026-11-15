import { Player, VerseChallenge } from '../types/game';

/** Tiempo máximo del juego de versículos, en segundos */
export const VERSES_TIME_LIMIT = 300;
/** Penalización por cada intento equivocado, en milisegundos */
export const VERSE_PENALTY_MS = 5000;
/** Cantidad de versículos del juego */
export const VERSES_COUNT = 3;

export interface VerseInput {
  reference: string;
  /** Texto del versículo. Una barra "/" o un salto de línea marca dónde se corta cada frase. */
  text: string;
}

// Versículos por defecto (Reina-Valera 1909). El líder puede cambiarlos en la sala de espera.
export const DEFAULT_VERSES: VerseInput[] = [
  {
    reference: 'Proverbios 17:17',
    text: 'En todo tiempo / ama el amigo; / y el hermano / para la angustia / es nacido.'
  },
  {
    reference: 'Juan 15:13',
    text: 'Nadie tiene / mayor amor que este, / que ponga alguno / su vida / por sus amigos.'
  },
  {
    reference: 'Eclesiastés 4:9',
    text: 'Mejores son dos / que uno; / porque tienen / mejor paga / de su trabajo.'
  }
];

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const wordCount = (s: string) => s.split(' ').filter(Boolean).length;

/**
 * Parte un versículo en frases cortas para ordenar.
 * - Si el texto trae "/" o saltos de línea, se respetan esos cortes.
 * - Si no, corta en los signos de puntuación y divide las frases largas.
 */
export function splitIntoPhrases(raw: string): string[] {
  const manual = raw.split(/[\/\n]+/).map(clean).filter(Boolean);
  if (manual.length >= 2) return manual.slice(0, 8);

  const text = clean(raw);
  if (!text) return [];

  // 1. Cortes naturales: después de , ; : . ! ?
  let chunks = (text.match(/[^,;:.!?]+[,;:.!?]*/g) || [text]).map(clean).filter(Boolean);

  // 2. Un trozo de una sola palabra se une al anterior
  chunks = chunks.reduce<string[]>((acc, chunk) => {
    if (acc.length > 0 && wordCount(chunk) < 2) acc[acc.length - 1] = `${acc[acc.length - 1]} ${chunk}`;
    else acc.push(chunk);
    return acc;
  }, []);

  // 3. Mientras haya pocas frases, se parte en dos la más larga
  while (chunks.length < 4) {
    const longest = chunks.reduce((best, chunk, i) => (wordCount(chunk) > wordCount(chunks[best]) ? i : best), 0);
    const words = chunks[longest].split(' ');
    if (words.length < 4) break;
    const half = Math.ceil(words.length / 2);
    chunks.splice(longest, 1, words.slice(0, half).join(' '), words.slice(half).join(' '));
  }

  // 4. Si quedaron demasiadas, se unen las dos vecinas más cortas
  while (chunks.length > 6) {
    let at = 0;
    for (let i = 1; i < chunks.length - 1; i++) {
      if (wordCount(chunks[i]) + wordCount(chunks[i + 1]) < wordCount(chunks[at]) + wordCount(chunks[at + 1])) at = i;
    }
    chunks.splice(at, 2, `${chunks[at]} ${chunks[at + 1]}`);
  }

  return chunks;
}

export function buildVerseChallenge(input: VerseInput): VerseChallenge {
  const phrases = splitIntoPhrases(input.text);
  return {
    reference: clean(input.reference) || 'Versículo',
    text: phrases.join(' '),
    phrases
  };
}

/** Tiempo total de un jugador: lo que tardó más la penalización por errores */
export function verseTotalMs(player: Player): number {
  return player.verseTimeMs + player.verseMistakes * VERSE_PENALTY_MS;
}

/** Orden de la tabla: primero quien terminó en menos tiempo; luego quien ordenó más versículos */
export function rankVersePlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (a.verseFinished !== b.verseFinished) return a.verseFinished ? -1 : 1;
    if (a.versesDone !== b.versesDone) return b.versesDone - a.versesDone;
    return verseTotalMs(a) - verseTotalMs(b);
  });
}

/** 83400 -> "1:23.4" */
export function formatMs(ms: number): string {
  const totalTenths = Math.round(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}
