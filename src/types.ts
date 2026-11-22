export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  color: string;
  totalScore: number;
  totalAnswered: number;
  totalCorrect: number;
  gamesWon: number;
  subjectStats: Record<string, { answered: number; correct: number }>;
}

export interface PlayerPawn {
  id: string;
  name: string;
  avatar: string;
  color: string;
  role: 'teacher' | 'student';
  isDemo?: boolean;
  position: number;
  score: number;
  correctCount: number;
  answeredCount: number;
}

export interface QuestionItem {
  id: string;
  grade: string;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  steps: number;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  avatar: string;
  text: string;
  isSystem: boolean;
  time: string;
}

export interface ActivityLogItem {
  text: string;
  time: string;
}

export interface RoomData {
  code: string;
  name: string;
  grade: string;
  subject: string;
  topic: string;
  themeMode: 'classic' | 'modern';
  elevationStyle: 'stepped' | 'terraced' | 'pyramid';
  boardTheme: 'rainbow' | 'wood' | 'grayscale' | 'bamboo' | 'marble';
  snakeStyle: {
    colorPreset: string;
    customHex: string;
    patternPreset: string;
  };
  phase: 'waiting' | 'playing' | 'paused' | 'stopped' | 'finished';
  hostId: string;
  questions: QuestionItem[];
  players: Record<string, PlayerPawn>;
  messages: ChatMessage[];
  activityLog: ActivityLogItem[];
  createdAt: number;
  updatedAt: number;
}
