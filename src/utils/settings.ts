import { GameSettings } from '../types/game';

/** Tiempos por defecto de cada sala */
export const DEFAULT_SETTINGS: GameSettings = {
  versesSeconds: 360,
  puzzleSeconds: 120,
  abyssSeconds: 90,
  versePenaltySeconds: 5
};

/** Mínimo, máximo y salto de cada ajuste (en segundos) */
export const SETTING_LIMITS: Record<keyof GameSettings, { min: number; max: number; step: number }> = {
  versesSeconds: { min: 60, max: 900, step: 30 },
  puzzleSeconds: { min: 30, max: 600, step: 15 },
  abyssSeconds: { min: 30, max: 600, step: 15 },
  versePenaltySeconds: { min: 0, max: 30, step: 1 }
};

/** Lo que suma el botón del anfitrión durante el juego */
export const ADD_TIME_SECONDS = 60;
/** Un reloj nunca pasa de 30 minutos */
export const MAX_TIMER_SECONDS = 1800;

/** Limpia lo que llega del navegador: solo números, dentro de los límites y en saltos válidos */
export function sanitizeSettings(input: Partial<GameSettings> | undefined, base: GameSettings = DEFAULT_SETTINGS): GameSettings {
  const result = { ...base };
  (Object.keys(SETTING_LIMITS) as (keyof GameSettings)[]).forEach((key) => {
    const raw = Number(input?.[key]);
    if (!Number.isFinite(raw)) return;
    const { min, max, step } = SETTING_LIMITS[key];
    const stepped = Math.round(raw / step) * step;
    result[key] = Math.min(max, Math.max(min, stepped));
  });
  return result;
}

/** 90 -> "1:30" */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${(safe % 60).toString().padStart(2, '0')}`;
}
