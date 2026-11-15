import React, { useEffect, useState } from 'react';
import { VerseChallenge } from '../types/game';
import { VERSES_COUNT, splitIntoPhrases } from '../utils/verses';
import { AlertTriangle, BookOpen, Check, EyeOff, Scissors, X } from 'lucide-react';

interface VerseEditorModalProps {
  isOpen: boolean;
  verses: VerseChallenge[];
  onClose: () => void;
  onSave: (verses: { reference: string; text: string }[]) => void;
}

interface Draft {
  reference: string;
  text: string;
}

const FIELD_INPUT =
  'w-full px-3.5 py-2.5 bg-slate-950 border-2 border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-400 placeholder:text-slate-600';

export const VerseEditorModal: React.FC<VerseEditorModalProps> = ({ isOpen, verses, onClose, onSave }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Al abrir, carga los versículos actuales con sus cortes marcados con "/"
  useEffect(() => {
    if (!isOpen) return;
    setDrafts(
      Array.from({ length: VERSES_COUNT }, (_, i) => ({
        reference: verses[i]?.reference ?? '',
        text: verses[i]?.phrases.join(' / ') ?? ''
      }))
    );
    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (index: number, field: keyof Draft, value: string) => {
    setDrafts(prev => prev.map((draft, i) => (i === index ? { ...draft, [field]: value } : draft)));
    setError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const short = drafts.findIndex(draft => splitIntoPhrases(draft.text).length < 3);
    if (short !== -1) {
      setError(`El versículo ${short + 1} debe quedar con al menos 3 frases. Escríbelo completo o sepáralo con "/".`);
      return;
    }
    onSave(drafts.map(draft => ({ reference: draft.reference.trim(), text: draft.text })));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-teams-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 font-cinzel">Versículos del juego</h3>
              <p className="text-xs text-slate-400">Los participantes ordenarán las frases de estos {VERSES_COUNT} versículos.</p>
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

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-400/10 border border-amber-400/40 text-amber-200 text-sm">
            <EyeOff className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Aquí se ven las respuestas.</strong> Si estás compartiendo pantalla en Teams, deja de compartir antes de editar.
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-sm text-slate-300">
            <Scissors className="w-4 h-4 text-teams-300 shrink-0 mt-0.5" />
            <span>
              Escribe el versículo completo y la app lo parte sola en frases. Si prefieres decidir los cortes, pon una barra <strong>/</strong> donde termina cada frase.
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {drafts.map((draft, index) => {
            const phrases = splitIntoPhrases(draft.text);
            return (
              <div key={index} className="p-4 rounded-2xl border border-slate-800 bg-slate-950/50 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">Versículo {index + 1}</span>
                <input
                  type="text"
                  value={draft.reference}
                  maxLength={60}
                  onChange={(e) => update(index, 'reference', e.target.value)}
                  placeholder="Cita, por ejemplo: Proverbios 17:17"
                  className={FIELD_INPUT}
                />
                <textarea
                  rows={3}
                  value={draft.text}
                  maxLength={500}
                  onChange={(e) => update(index, 'text', e.target.value)}
                  placeholder="Texto del versículo"
                  className={`${FIELD_INPUT} resize-none`}
                />
                <div>
                  <span className="text-xs text-slate-400 block mb-1.5">
                    Así quedan las frases ({phrases.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {phrases.map((phrase, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100">
                        {phrase}
                      </span>
                    ))}
                    {phrases.length === 0 && <span className="text-xs text-slate-500">Escribe el versículo para ver las frases.</span>}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 text-sm font-bold transition-colors shadow-lg shadow-amber-500/25"
            >
              <Check className="w-4 h-4" />
              <span>Guardar versículos</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
