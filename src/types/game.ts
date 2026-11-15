export type GameStage =
  | 'LOBBY'
  | 'VERSES_STAGE'
  | 'VERSES_RESULTS'
  | 'PUZZLE_STAGE'
  | 'ABYSS_STAGE'
  | 'ROUND_RECAP'
  | 'FINAL_PODIUM';

export interface BiblicalStory {
  id: string;
  title: string;
  passage: string;
  verseText: string;
  theme: string;
  character: string;
  phrase: string; // The phrase to uncover in Abyss (normalized uppercase, spaces preserved)
  hints: string[];
  artColor1?: string;
  artColor2?: string;
  artAccent?: string;
  svgSceneId?: 'david_jonatan' | 'rut_noemi' | 'jesus_amigos' | 'pablo_silas' | 'daniel_amigos';
  imageUrl?: string; // Optional image URL or base64 data URL
}

/** Un versículo del juego de ordenar: sus frases van en el orden correcto */
export interface VerseChallenge {
  reference: string;
  text: string;
  phrases: string[];
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  puzzlePiecesPlaced: number;
  puzzleCompleted: boolean;
  puzzleFinishTime?: number; // seconds taken
  abyssPoints: number;
  abyssStrikes: number;
  hasBuzzed?: boolean;
  // Juego de ordenar versículos (define la tabla oficial)
  versesDone: number; // versículos ordenados correctamente
  verseTimeMs: number; // tiempo hasta el último versículo ordenado
  verseMistakes: number; // intentos equivocados (cada uno suma penalización)
  verseFinished: boolean;
}

export interface RoomState {
  code: string;
  stage: GameStage;
  hostId: string;
  currentRound: number;
  totalRounds: number;
  timerSeconds: number;
  isTimerRunning: boolean;
  story: BiblicalStory;
  players: Record<string, Player>;
  // Juego de ordenar versículos
  verses: VerseChallenge[];
  versesStartedAt?: number;
  // Abyss board shared state
  abyssGuessedLetters: string[];
  abyssStrikes: number; // max 6
  abyssSolved: boolean;
  abyssWinnerName?: string;
  roundLeaderboard?: {
    playerId: string;
    name: string;
    avatar: string;
    roundPoints: number;
    totalScore: number;
  }[];
}

export interface PuzzlePiece {
  id: number;
  index: number;
  col: number; // 0..5
  row: number; // 0..3
  currentSlotIndex: number | null; // null if in tray
  isCorrect: boolean;
}

export type ClientMessage =
  | { type: 'CREATE_ROOM'; payload: { hostName: string; avatar: string; rounds?: number; customStory?: BiblicalStory; hostKey?: string } }
  | { type: 'JOIN_ROOM'; payload: { roomCode: string; playerName: string; avatar: string } }
  | { type: 'REJOIN_ROOM'; payload: { roomCode: string; playerId: string; token: string } }
  | { type: 'HOST_START_ROUND'; payload: { roomCode: string } }
  | { type: 'HOST_SET_VERSES'; payload: { roomCode: string; verses: { reference: string; text: string }[] } }
  | { type: 'HOST_START_VERSES'; payload: { roomCode: string } }
  | { type: 'VERSE_SUBMIT'; payload: { roomCode: string; verseIndex: number; order: string[] } }
  | { type: 'HOST_NEXT_STAGE'; payload: { roomCode: string } }
  | { type: 'HOST_RESET_GAME'; payload: { roomCode: string } }
  | { type: 'HOST_SELECT_STORY'; payload: { roomCode: string; story: BiblicalStory } }
  | { type: 'HOST_ADD_CUSTOM_STORY'; payload: { roomCode: string; story: BiblicalStory } }
  | { type: 'PUZZLE_PIECE_SNAP'; payload: { roomCode: string; piecesPlaced: number; totalPieces: number } }
  | { type: 'PUZZLE_FINISHED'; payload: { roomCode: string; timeTaken: number } }
  | { type: 'ABYSS_GUESS_LETTER'; payload: { roomCode: string; letter: string } }
  | { type: 'ABYSS_GUESS_PHRASE'; payload: { roomCode: string; phrase: string } }
  | { type: 'BUZZER_PRESS'; payload: { roomCode: string } }
  | { type: 'SEND_REACTION'; payload: { roomCode: string; emoji: string } };

export type ServerMessage =
  | { type: 'ROOM_CREATED'; payload: { room: RoomState; playerId: string; token: string } }
  | { type: 'ROOM_JOINED'; payload: { room: RoomState; playerId: string; token: string } }
  | { type: 'REJOIN_FAILED' }
  | { type: 'VERSE_RESULT'; payload: { verseIndex: number; correct: boolean } }
  | { type: 'STATE_UPDATE'; payload: { room: RoomState } }
  | { type: 'TIMER_TICK'; payload: { seconds: number } }
  | { type: 'NOTIFICATION'; payload: { message: string; type: 'info' | 'success' | 'warning' } }
  | { type: 'REACTION_EVENT'; payload: { playerId: string; playerName: string; emoji: string } }
  | { type: 'ERROR'; payload: { message: string } };
