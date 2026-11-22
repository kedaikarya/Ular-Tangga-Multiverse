import { QuestionItem } from './types';

export const STORAGE_KEYS = {
  PROFILE: 'ut3d_profile_v4',
  LEADERBOARD: 'ut3d_leaderboard_v4',
  ROOMS: 'ut3d_rooms_v4',
  TEACHER_PIN: 'ut3d_teacher_pin_v4',
  TEACHER_SESSION: 'ut3d_teacher_session_v4'
};

export const DEFAULT_TEACHER_PIN = 'sekarmelati';

export const AVATAR_OPTIONS = ['🦊', '🐼', '🦁', '🐯', '🐸', '🐧', '🦄', '🐨', '🐙', '🚀', '🤖', '🦉'];

export const AVATAR_NAMES: Record<string, string> = {
  '🦊': 'Rubah',
  '🐼': 'Panda',
  '🦁': 'Singa',
  '🐯': 'Harimau',
  '🐸': 'Katak',
  '🐧': 'Penguin',
  '🦄': 'Unicorn',
  '🐨': 'Koala',
  '🐙': 'Gurita',
  '🚀': 'Roket',
  '🤖': 'Robot',
  '🦉': 'Burung Hantu',
  '🎓': 'Demo Guru'
};

export const PAWN_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#f43f5e', '#84cc16'];

export const LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91
};

export const SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  99: 78
};

export const TILE_SIZE = 2.0;

export const BOARD_COLOR_THEMES = {
  rainbow: {
    name: 'Pelangi Edukasi',
    icon: '🌈',
    desc: 'Warna cerah berbeda tiap baris untuk memudahkan identifikasi tingkatan.',
    swatch: 'linear-gradient(135deg,#2563eb,#10b981,#9333ea,#f97316)',
    platformHex: 0x0b1120
  },
  wood: {
    name: 'Nuansa Kayu Klasik',
    icon: '🪵',
    desc: 'Perpaduan papan kayu jati tua (Walnut) & kayu oak berserat alami.',
    swatch: 'linear-gradient(135deg,#5d4037,#d7a86e)',
    platformHex: 0x3e2723
  },
  grayscale: {
    name: 'Grayscale Monokrom',
    icon: '🪨',
    desc: 'Gradasi abu-abu arang & perak kontras tinggi agar bidak dan ular menonjol.',
    swatch: 'linear-gradient(135deg,#18181b,#d4d4d8)',
    platformHex: 0x18181b
  },
  bamboo: {
    name: 'Kayu Bambu & Daun',
    icon: '🎋',
    desc: 'Nuansa kayu bambu hangat berpadu hijau daun zaitun yang sejuk di mata.',
    swatch: 'linear-gradient(135deg,#b58938,#3f6212)',
    platformHex: 0x1a2e05
  },
  marble: {
    name: 'Marmer & Batu Alam',
    icon: '🏛️',
    desc: 'Papan marmer putih bersih berselang-seling dengan batu basal modern.',
    swatch: 'linear-gradient(135deg,#f1f5f9,#334155)',
    platformHex: 0x1e293b
  }
};

export const SNAKE_COLOR_PRESETS: Record<string, any> = {
  green: {
    name: 'Hijau Rimba',
    swatch: '#16a34a',
    baseHex: '#15803d',
    patternHex: '#facc15',
    accentHex: '#14532d',
    skullHex: 0x166534,
    jawHex: 0x14532d,
    eyeHex: 0xfacc15
  },
  white: {
    name: 'Putih Salju',
    swatch: '#f8fafc',
    baseHex: '#f8fafc',
    patternHex: '#cbd5e1',
    accentHex: '#fde68a',
    skullHex: 0xf1f5f9,
    jawHex: 0xe2e8f0,
    eyeHex: 0xf43f5e
  },
  pink: {
    name: 'Pink Sakura',
    swatch: '#f472b6',
    baseHex: '#f472b6',
    patternHex: '#fdf2f8',
    accentHex: '#be185d',
    skullHex: 0xec4899,
    jawHex: 0xdb2777,
    eyeHex: 0xfef08a
  },
  yellow: {
    name: 'Kuning Emas',
    swatch: '#facc15',
    baseHex: '#facc15',
    patternHex: '#92400e',
    accentHex: '#fef08a',
    skullHex: 0xeab308,
    jawHex: 0xca8a04,
    eyeHex: 0x06b6d4
  },
  cyan: {
    name: 'Biru Es',
    swatch: '#38bdf8',
    baseHex: '#0284c7',
    patternHex: '#e0f2fe',
    accentHex: '#0c4a6e',
    skullHex: 0x0369a1,
    jawHex: 0x075985,
    eyeHex: 0xfacc15
  },
  purple: {
    name: 'Ungu Ametis',
    swatch: '#a855f7',
    baseHex: '#7e22ce',
    patternHex: '#f3e8ff',
    accentHex: '#facc15',
    skullHex: 0x6b21a8,
    jawHex: 0x581c87,
    eyeHex: 0xfacc15
  },
  rainbow: {
    name: 'Pelangi Ceria',
    swatch: 'linear-gradient(135deg,#ef4444,#facc15,#22c55e,#3b82f6,#a855f7)',
    baseHex: '#ec4899',
    patternHex: '#facc15',
    accentHex: '#38bdf8',
    skullHex: 0xec4899,
    jawHex: 0x8b5cf6,
    eyeHex: 0xffffff,
    isRainbow: true
  }
};

export const SNAKE_PATTERN_PRESETS: Record<string, { name: string; icon: string }> = {
  diamond: { name: 'Sisik Berlian', icon: '💠' },
  stripes: { name: 'Belang Cincin', icon: '🦓' },
  spots: { name: 'Totol Piton', icon: '🐆' },
  zigzag: { name: 'Zig-Zag Petir', icon: '⚡' },
  scales: { name: 'Sisik Naga', icon: '🐉' }
};

export const SEED_QUESTION_BANK: QuestionItem[] = [
  { id: 'q1', grade: 'Fase A', subject: 'Matematika', topic: 'Penjumlahan', question: 'Ibu membeli 8 apel dan Ayah membawa 7 apel. Berapa jumlah semua apel?', options: ['13 apel', '14 apel', '15 apel', '16 apel'], correctIndex: 2, steps: 3, explanation: '8 + 7 = 15 apel.' },
  { id: 'q2', grade: 'Fase B', subject: 'Matematika', topic: 'Perkalian', question: 'Hasil dari 7 × 8 adalah ...', options: ['54', '56', '63', '48'], correctIndex: 1, steps: 3, explanation: '7 dikali 8 sama dengan 56.' },
  { id: 'q3', grade: 'Fase C', subject: 'Matematika', topic: 'Pecahan', question: 'Hasil dari 1/2 + 1/4 adalah ...', options: ['2/6', '3/4', '1/6', '2/4'], correctIndex: 1, steps: 4, explanation: '1/2 = 2/4, sehingga 2/4 + 1/4 = 3/4.' },
  { id: 'q4', grade: 'Fase D', subject: 'Matematika', topic: 'Aljabar', question: 'Jika 3x + 5 = 20, maka nilai x adalah ...', options: ['3', '4', '5', '6'], correctIndex: 2, steps: 4, explanation: '3x = 20 - 5 = 15, maka x = 15 / 3 = 5.' },
  { id: 'q5', grade: 'Fase C', subject: 'IPA', topic: 'Tata Surya', question: 'Planet terbesar di dalam sistem Tata Surya kita adalah ...', options: ['Saturnus', 'Mars', 'Jupiter', 'Neptunus'], correctIndex: 2, steps: 3, explanation: 'Jupiter adalah planet terbesar di Tata Surya.' },
  { id: 'q6', grade: 'Fase B', subject: 'IPA', topic: 'Tumbuhan', question: 'Proses tumbuhan hijau membuat makanan sendiri dengan bantuan cahaya matahari disebut ...', options: ['Respirasi', 'Fotosintesis', 'Adaptasi', 'Evaporasi'], correctIndex: 1, steps: 3, explanation: 'Fotosintesis terjadi pada klorofil daun dengan bantuan cahaya matahari.' },
  { id: 'q7', grade: 'Fase C', subject: 'Bahasa Indonesia', topic: 'Ide Pokok', question: 'Kalimat utama yang menjadi inti pembahasan dalam sebuah paragraf disebut ...', options: ['Kalimat penjelas', 'Ide pokok', 'Kata penghubung', 'Pantun'], correctIndex: 1, steps: 3, explanation: 'Ide pokok adalah gagasan utama yang mendasari suatu paragraf.' },
  { id: 'q8', grade: 'Fase C', subject: 'PPKn', topic: 'Pancasila', question: 'Sila ketiga Pancasila dilambangkan dengan gambar ...', options: ['Bintang', 'Rantai Emas', 'Pohon Beringin', 'Kepala Banteng'], correctIndex: 2, steps: 3, explanation: 'Pohon Beringin melambangkan Persatuan Indonesia (Sila ke-3).' },
  { id: 'q9', grade: 'Fase D', subject: 'IPA', topic: 'Energi', question: 'Satuan Internasional (SI) untuk gaya adalah ...', options: ['Joule', 'Watt', 'Newton', 'Pascal'], correctIndex: 2, steps: 4, explanation: 'Gaya diukur dalam satuan Newton (N).' },
  { id: 'q10', grade: 'Fase C', subject: 'Bahasa Inggris', topic: 'Vocabulary', question: 'Arti dari kata "Library" dalam bahasa Indonesia adalah ...', options: ['Laboratorium', 'Perpustakaan', 'Kantin', 'Lapangan'], correctIndex: 1, steps: 3, explanation: 'Library berarti perpustakaan.' }
];

export const MUSIC_TRACKS: Record<string, any> = {
  adventure: {
    label: '🎶 Ceria',
    fullName: 'Petualangan Ceria',
    bpm: 114,
    melody: [
      'C5', 'E5', 'G5', 'E5', 'A5', 'G5', 'E5', 'D5',
      'C5', 'D5', 'E5', 'G5', 'E5', null, 'D5', null,
      'F5', 'A5', 'G5', 'E5', 'D5', 'F5', 'E5', 'C5',
      'D5', 'G4', 'B4', 'D5', 'C5', null, null, null
    ],
    bass: [
      'C3', null, 'G2', null, 'A2', null, 'E2', null,
      'F2', null, 'C3', null, 'G2', null, 'G2', null,
      'F2', null, 'C3', null, 'C3', null, 'G2', null,
      'G2', null, 'D3', null, 'C3', null, 'G2', null
    ]
  },
  chill: {
    label: '🎹 Fokus',
    fullName: 'Santai & Fokus Belajar',
    bpm: 88,
    melody: [
      'E4', 'G4', 'B4', 'D5', 'C5', 'B4', 'G4', null,
      'D4', 'F4', 'A4', 'C5', 'B4', 'A4', 'F4', null,
      'E4', 'G4', 'A4', 'C5', 'E5', 'D5', 'C5', 'A4',
      'D4', 'G4', 'B4', 'A4', 'G4', null, null, null
    ],
    bass: [
      'C3', null, null, 'G2', 'A2', null, null, 'E2',
      'F2', null, null, 'C3', 'D2', null, null, 'A2',
      'A2', null, null, 'E2', 'F2', null, null, 'C3',
      'G2', null, null, 'D3', 'C3', null, null, null
    ]
  },
  race: {
    label: '🚀 Lomba',
    fullName: 'Semangat Lomba',
    bpm: 132,
    melody: [
      'G4', 'B4', 'D5', 'G5', 'F#5', 'D5', 'B4', 'D5',
      'E5', 'G5', 'F#5', 'E5', 'D5', null, 'B4', null,
      'C5', 'E5', 'G5', 'E5', 'B4', 'D5', 'G5', 'D5',
      'A4', 'C5', 'F#5', 'A5', 'G5', null, null, null
    ],
    bass: [
      'G2', 'D3', 'G2', 'D3', 'B2', 'F#3', 'B2', 'F#3',
      'C3', 'G3', 'C3', 'G3', 'G2', 'D3', 'G2', 'D3',
      'C3', 'G3', 'C3', 'G3', 'G2', 'D3', 'G2', 'D3',
      'D2', 'A2', 'D3', 'A2', 'G2', null, 'G2', null
    ]
  }
};
