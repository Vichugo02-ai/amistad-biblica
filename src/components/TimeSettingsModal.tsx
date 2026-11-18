import React, { useEffect, useState } from 'react';
import { GameSettings } from '../types/game';
import { DEFAULT_SETTINGS, SETTING_LIMITS, formatClock } from '../utils/settings';
import { BookOpen, Check, Minus, Mountain, Plus, Puzzle, RotateCcw, Timer, TriangleAlert, X } from 'lucide-react';

interface TimeSettingsModalProps {
  isOpen: boolean;
  settings: GameSettings;
  onClose: () => void;
  onSave: (settings: GameSettings) => void;
}

interface Row {
  key: keyof GameSettings;
  label: string;
  help: string;
  Icon: React.ComponentType<{ className?: string }>;
  format: (seconds: number) => string;
}

const ROWS: Row[] = [
  {
    key: 'versesSeconds',
    label: 'Ordenar versículos',
    help: 'Juego principal. Si se acaba, la tabla se arma con lo que cada uno alcanzó.',
    Icon: BookOpen,
    format: formatClock
  },
  {
    key: 'versePenaltySeconds',
    label: 'Castigo por error',
    help: 'Segundos que se suman por cada intento equivocado al ordenar. En 0 no hay castigo.',
    Icon: TriangleAlert,
    format: (s) => (s === 0 ? 'Sin castigo' : `${s} s`)
  },
  {
    key: 'puzzleSeconds',
    label: 'Rompecabezas',
    help: 'Ronda extra. El bono por velocidad se calcula sobre este tiempo.',
    Icon: Puzzle,
    format: formatClock
  },
  {
    key: 'abyssSeconds',
    label: 'Adivinar el personaje',
    help: 'Ronda extra, en el puente.',
    Icon: Mountain,
    format: formatClock
  }
];

export const TimeSettingsModal: React.FC<TimeSettingsModalProps> = ({ isOpen, settings, onClose, onSave }) => {
  const [draft, setDraft] = useState<GameSettings>(settings);

  useEffect(() => {
    if (isOpen) setDraft(settings);
  }, [isOpen]);

  if (!isOpen) return null;

  const change = (key: keyof GameSettings, direction: 1 | -1) => {
    const { min, max, step } = SETTING_LIMITS[key];
    setDraft((prev) => ({ ...prev, [key]: Math.min(max, Math.max(min, prev[key] + direction * step)) }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[92vh] bg-slate-900 border border-teams-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 font-cinzel">Tiempos del juego</h3>
              <p className="text-xs text-slate-400">Se usan desde la próxima etapa que empiece.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {ROWS.map(({ key, label, help, Icon, format }) => {
            const { min, max } = SETTING_LIMITS[key];
            return (
              <div key={key} className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/50">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="flex items-center gap-3 flex-1 basis-40 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-teams-500/20 border border-teams-500/40 text-teams-300 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-slate-100">{label}</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <button
                      type="button"
                      onClick={() => change(key, -1)}
                      disabled={draft[key] <= min}
                      aria-label={`Menos tiempo: ${label}`}
                      className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 hover:border-amber-400 disabled:opacity-30 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="min-w-[5.5rem] text-center font-mono font-bold text-lg text-amber-300 tabular-nums whitespace-nowrap">
                      {format(draft[key])}
                    </span>
                    <button
                      type="button"
                      onClick={() => change(key, 1)}
                      disabled={draft[key] >= max}
                      aria-label={`Más tiempo: ${label}`}
                      className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 hover:border-amber-400 disabled:opacity-30 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">{help}</p>
              </div>
            );
          })}

          <p className="text-xs text-slate-400 px-1">
            Durante el juego también puedes sumar 1 minuto al reloj con el botón <strong className="text-slate-200">+1 min</strong> de la barra inferior.
          </p>

          <div className="flex flex-wrap justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setDraft(DEFAULT_SETTINGS)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Valores por defecto</span>
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 text-sm font-bold transition-colors shadow-lg shadow-amber-500/25"
              >
                <Check className="w-4 h-4" />
                <span>Guardar</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
