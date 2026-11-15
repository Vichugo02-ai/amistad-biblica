import React, { useState } from 'react';
import { BiblicalStory } from '../types/game';
import { BIBLICAL_STORIES } from '../data/biblicalStories';
import {
  AlertTriangle,
  BookOpen,
  Check,
  EyeOff,
  ImagePlus,
  Images,
  KeyRound,
  Palette,
  Upload,
  X
} from 'lucide-react';

interface StorySelectorModalProps {
  currentStoryId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectStory: (story: BiblicalStory) => void;
  onUploadCustomStory: (story: BiblicalStory) => void;
}

const FIELD_LABEL = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5';
const FIELD_INPUT =
  'w-full px-3.5 py-2.5 bg-slate-950 border-2 border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-400 placeholder:text-slate-600';

export const StorySelectorModal: React.FC<StorySelectorModalProps> = ({
  currentStoryId,
  isOpen,
  onClose,
  onSelectStory,
  onUploadCustomStory
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload'>('gallery');

  // Custom upload form state
  const [customTitle, setCustomTitle] = useState('');
  const [customPassage, setCustomPassage] = useState('');
  const [customVerse, setCustomVerse] = useState('');
  const [customPhrase, setCustomPhrase] = useState('');
  const [customHint, setCustomHint] = useState('');
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP).');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustomStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedImageDataUrl) {
      setUploadError('Por favor carga una imagen antes de guardar.');
      return;
    }
    if (!customTitle.trim()) {
      setUploadError('Por favor ingresa un título para la escena.');
      return;
    }

    const cleanPhrase = customPhrase
      .toUpperCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-ZÑ ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanPhrase) {
      setUploadError('Escribe el nombre o la frase que los jugadores deberán adivinar (solo letras).');
      return;
    }

    const newStory: BiblicalStory = {
      id: `custom_${Date.now()}`,
      title: customTitle.trim(),
      passage: customPassage.trim() || 'Pasaje Bíblico',
      verseText: customVerse.trim() || customTitle.trim(),
      theme: 'Fe y comunión en Cristo',
      character: customTitle.trim(),
      phrase: cleanPhrase,
      hints: [
        customHint.trim() || 'Observa con atención la imagen que armaste.',
        `Cita de referencia: ${customPassage.trim() || 'Biblia'}`
      ],
      imageUrl: uploadedImageDataUrl,
      artColor1: '#0D0F2B',
      artColor2: '#181B40',
      artAccent: '#FFC53D'
    };

    onUploadCustomStory(newStory);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-teams-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300">
              <Images className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 font-cinzel">
                Imágenes para el rompecabezas
              </h3>
              <p className="text-xs text-slate-400">
                Elige una escena de la galería o sube tu propia imagen.
              </p>
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

        {/* Aviso: esta ventana muestra las respuestas */}
        <div className="mx-6 mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-400/10 border border-amber-400/40 text-amber-200 text-sm">
          <EyeOff className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Aquí se ven las respuestas.</strong> Si estás compartiendo pantalla en Teams, deja de compartir antes de elegir.
          </span>
        </div>

        {/* Pestañas */}
        <div className="px-6 pt-4 pb-3 border-b border-slate-800 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'gallery'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            <Images className="w-4 h-4" />
            <span>Galería ({BIBLICAL_STORIES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'upload'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            <ImagePlus className="w-4 h-4" />
            <span>Subir mi imagen</span>
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'gallery' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BIBLICAL_STORIES.map((story) => {
                const isSelected = story.id === currentStoryId;
                return (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => {
                      onSelectStory(story);
                      onClose();
                    }}
                    className={`group text-left rounded-2xl border-2 overflow-hidden transition-all duration-200 flex flex-col ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-500/15'
                        : 'border-slate-800 bg-slate-950 hover:border-teams-400'
                    }`}
                  >
                    {/* Miniatura */}
                    <div className="relative aspect-[3/2] w-full bg-slate-900 overflow-hidden">
                      {story.imageUrl ? (
                        <img
                          src={story.imageUrl}
                          alt={story.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-teams-500/35 to-slate-950 p-4 text-center">
                          <Palette className="w-7 h-7 text-amber-300 mb-1.5" />
                          <span className="text-xs font-semibold text-amber-200">
                            Escena ilustrada
                          </span>
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-amber-400 text-slate-950 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                          <Check className="w-3.5 h-3.5" />
                          <span>En uso</span>
                        </div>
                      )}
                    </div>

                    {/* Datos */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between w-full">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 line-clamp-2 group-hover:text-amber-300 transition-colors">
                          {story.title}
                        </h4>
                        <span className="flex items-center gap-1.5 text-xs text-amber-300 font-medium mt-1">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          {story.passage}
                        </span>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1.5">
                          «{story.verseText}»
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-1.5 text-xs text-slate-300">
                        <KeyRound className="w-3.5 h-3.5 text-teams-300 shrink-0" />
                        <span className="text-slate-400">Respuesta:</span>
                        <span className="font-mono font-bold truncate">{story.phrase}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Subir imagen propia */
            <form onSubmit={handleSaveCustomStory} className="max-w-2xl mx-auto space-y-5">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div>
                <label className={FIELD_LABEL}>
                  1. Tu imagen (JPG, PNG o WEBP)
                </label>
                <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-2xl p-6 text-center transition-colors bg-slate-950/60">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {uploadedImageDataUrl ? (
                    <div className="space-y-3">
                      <img
                        src={uploadedImageDataUrl}
                        alt="Vista previa de tu imagen"
                        className="max-h-60 mx-auto rounded-xl border border-slate-700 shadow-md aspect-[3/2] object-cover"
                      />
                      <p className="flex items-center justify-center gap-1.5 text-sm text-emerald-400 font-semibold">
                        <Check className="w-4 h-4" />
                        Imagen cargada. Haz clic o arrastra otra para cambiarla.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <Upload className="w-9 h-9 text-teams-300 mx-auto" />
                      <p className="text-sm font-semibold text-slate-200">
                        Haz clic aquí o arrastra una imagen
                      </p>
                      <p className="text-xs text-slate-400">
                        Se recorta sola a la cuadrícula de 24 piezas (proporción 3:2).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={FIELD_LABEL}>2. Título de la escena</label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ej. Moisés y la Zarza Ardiendo"
                    className={FIELD_INPUT}
                  />
                </div>

                <div>
                  <label className={FIELD_LABEL}>3. Cita bíblica</label>
                  <input
                    type="text"
                    value={customPassage}
                    onChange={(e) => setCustomPassage(e.target.value)}
                    placeholder="Ej. Éxodo 3:2-4"
                    className={FIELD_INPUT}
                  />
                </div>
              </div>

              <div>
                <label className={FIELD_LABEL}>
                  4. Respuesta que deberán adivinar
                </label>
                <input
                  type="text"
                  required
                  value={customPhrase}
                  onChange={(e) => setCustomPhrase(e.target.value.toUpperCase())}
                  placeholder="Ej. MOISES"
                  className={`${FIELD_INPUT} font-mono font-bold uppercase text-amber-300 placeholder:normal-case placeholder:font-normal`}
                />
                <span className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-teams-300 shrink-0" />
                  Es el nombre o la frase secreta del puente colgante. Se guarda sin tildes.
                </span>
              </div>

              <div>
                <label className={FIELD_LABEL}>
                  5. Versículo o mensaje de amistad
                </label>
                <textarea
                  rows={2}
                  value={customVerse}
                  onChange={(e) => setCustomVerse(e.target.value)}
                  placeholder="Ej. Y se le apareció el Ángel de Jehová en una llama de fuego en medio de una zarza..."
                  className={`${FIELD_INPUT} resize-none`}
                />
              </div>

              <div>
                <label className={FIELD_LABEL}>
                  6. Pista para los jugadores (opcional)
                </label>
                <input
                  type="text"
                  value={customHint}
                  onChange={(e) => setCustomHint(e.target.value)}
                  placeholder="Ej. Ocurrió en el monte Horeb, en el desierto"
                  className={FIELD_INPUT}
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
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
                  <span>Usar esta imagen</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
