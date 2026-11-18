import { PuzzlePiece } from '../types/game';

export const COLS = 6;
export const ROWS = 4;
export const TOTAL_PIECES = COLS * ROWS; // 24 pieces!

export interface PieceLayout {
  id: number;
  col: number;
  row: number;
  targetIndex: number;
  currentSlotIndex: number | null; // null means it's in the tray
  isCorrect: boolean;
}

/**
 * Initializes 24 pieces with shuffled tray positions
 */
export function initializePuzzlePieces(): { pieces: PieceLayout[]; shuffledIds: number[] } {
  const pieces: PieceLayout[] = [];
  const ids: number[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const index = r * COLS + c;
      pieces.push({
        id: index,
        col: c,
        row: r,
        targetIndex: index,
        currentSlotIndex: null,
        isCorrect: false
      });
      ids.push(index);
    }
  }

  // Fisher-Yates shuffle for the tray piece order
  const shuffledIds = [...ids];
  for (let i = shuffledIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
  }

  return { pieces, shuffledIds };
}

/** Puntos por cada pieza bien colocada */
export const POINTS_PER_PIECE = 25;
/** Bono máximo por terminar rápido (se reparte según el tiempo que sobró) */
export const MAX_SPEED_BONUS = 400;

/**
 * Puntos del rompecabezas.
 * - 25 por cada pieza colocada (24 piezas = 600).
 * - Solo si se completa: bono de hasta 400 según la parte del tiempo que sobró.
 *   Ejemplo con 2:00: terminar en 0:30 da 300 de bono; en 1:30, 100.
 */
export function calculatePuzzlePoints(piecesCorrect: number, secondsTaken: number, timeLimitSeconds = 120): number {
  const pieces = Math.min(TOTAL_PIECES, Math.max(0, Math.floor(piecesCorrect)));
  const basePoints = pieces * POINTS_PER_PIECE;
  if (pieces < TOTAL_PIECES) {
    return basePoints;
  }
  const limit = Math.max(1, timeLimitSeconds);
  const remainingShare = Math.max(0, (limit - secondsTaken) / limit);
  return basePoints + Math.round(MAX_SPEED_BONUS * remainingShare);
}
