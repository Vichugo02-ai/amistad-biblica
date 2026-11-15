// Emojis e identidad visual del juego, en un solo lugar.
// Todos los emojis son anteriores a 2019 para que se vean bien
// en Windows 10/11, Mac, Android y iPhone dentro de Teams.

export interface AvatarOption {
  id: string;
  label: string;
  icon: string;
}

// 16 distintivos: suficientes para que 20 amigos casi no se repitan
export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'paloma', label: 'Paloma', icon: '🕊️' },
  { id: 'cordero', label: 'Cordero', icon: '🐑' },
  { id: 'leon', label: 'León de Judá', icon: '🦁' },
  { id: 'pez', label: 'Pez', icon: '🐟' },
  { id: 'fuego', label: 'Fuego', icon: '🔥' },
  { id: 'corona', label: 'Corona', icon: '👑' },
  { id: 'estrella', label: 'Estrella', icon: '⭐' },
  { id: 'arcoiris', label: 'Arcoíris', icon: '🌈' },
  { id: 'biblia', label: 'Biblia', icon: '📖' },
  { id: 'trompeta', label: 'Trompeta', icon: '🎺' },
  { id: 'lampara', label: 'Lámpara', icon: '🕯️' },
  { id: 'escudo', label: 'Escudo', icon: '🛡️' },
  { id: 'ancla', label: 'Ancla', icon: '⚓' },
  { id: 'espiga', label: 'Espiga', icon: '🌾' },
  { id: 'vid', label: 'Vid', icon: '🍇' },
  { id: 'olivo', label: 'Olivo', icon: '🌿' }
];

// Reacciones rápidas durante la llamada
export const QUICK_REACTIONS: { emoji: string; label: string }[] = [
  { emoji: '🙌', label: '¡Aleluya!' },
  { emoji: '👏', label: 'Aplausos' },
  { emoji: '🙏', label: 'Amén' },
  { emoji: '❤️', label: 'Amor' },
  { emoji: '🔥', label: 'Fuego' },
  { emoji: '🎉', label: 'Fiesta' },
  { emoji: '😂', label: 'Risa' },
  { emoji: '🕊️', label: 'Paz' }
];

// Emoji que identifica cada etapa del juego
export const STAGE_EMOJI: Record<string, string> = {
  LOBBY: '👋',
  VERSES_STAGE: '📜',
  VERSES_RESULTS: '🏆',
  PUZZLE_STAGE: '🧩',
  ABYSS_STAGE: '🌉',
  ROUND_RECAP: '📊',
  FINAL_PODIUM: '🏆'
};

// Medallas para los tres primeros lugares
export const MEDALS = ['🥇', '🥈', '🥉'];

// Colores del confeti final (misma paleta de la app)
export const CONFETTI_COLORS = ['#FFC53D', '#8B8FF5', '#34D399', '#FF7F73', '#F6F7FF'];
