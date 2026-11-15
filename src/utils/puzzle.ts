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

/**
 * Calculates puzzle points based on pieces placed and elapsed time
 * Total possible: up to 1000 points (24 pieces * 25 pts = 600 pts, + up to 400 speed bonus)
 */
export function calculatePuzzlePoints(piecesCorrect: number, secondsTaken: number): number {
  const basePoints = piecesCorrect * 25; // 24 * 25 = 600
  if (piecesCorrect < TOTAL_PIECES) {
    return basePoints;
  }
  // Completed puzzle speed bonus (under 120s gives up to 400 bonus points)
  const maxTime = 120;
  const timeBonus = Math.max(0, Math.floor((maxTime - secondsTaken) * 3.5));
  return basePoints + timeBonus;
}
