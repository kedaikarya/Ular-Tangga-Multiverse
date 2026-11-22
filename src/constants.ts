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

export const GRADE_OPTIONS = [
  { value: 'Fase A', label: 'Fase A (Kelas 1–2 SD)' },
  { value: 'Fase B', label: 'Fase B (Kelas 3–4 SD)' },
  { value: 'Fase C', label: 'Fase C (Kelas 5–6 SD)' },
  { value: 'Fase D', label: 'Fase D (Kelas 7–9 SMP)' }
];

export const SUBJECT_OPTIONS = [
  { value: 'Matematika', label: 'Matematika' },
  { value: 'IPAS', label: 'IPAS (Ilmu Pengetahuan Alam & Sosial)' },
  { value: 'IPA', label: 'IPA (Sains)' },
  { value: 'IPS', label: 'IPS' },
  { value: 'Bahasa Indonesia', label: 'Bahasa Indonesia' },
  { value: 'PPKn', label: 'PPKn' },
  { value: 'Bahasa Inggris', label: 'Bahasa Inggris' },
  { value: 'Campuran', label: 'Campuran Semua Mapel' }
];

export const SEED_QUESTION_BANK: QuestionItem[] = [
  // --- FASE A (Kelas 1-2 SD) ---
  { id: 'q_a_mtk_1', grade: 'Fase A', subject: 'Matematika', topic: 'Penjumlahan', question: 'Ibu membeli 8 apel dan Ayah membawa 7 apel. Berapa jumlah semua apel?', options: ['13 apel', '14 apel', '15 apel', '16 apel'], correctIndex: 2, steps: 3, explanation: '8 + 7 = 15 apel.' },
  { id: 'q_a_mtk_2', grade: 'Fase A', subject: 'Matematika', topic: 'Pengurangan', question: 'Ada 14 burung di pohon, lalu 5 burung terbang. Sisa burung di pohon ada ... ekor.', options: ['8 ekor', '9 ekor', '10 ekor', '11 ekor'], correctIndex: 1, steps: 3, explanation: '14 - 5 = 9 ekor burung.' },
  { id: 'q_a_ipas_1', grade: 'Fase A', subject: 'IPAS', topic: 'Tubuh & Panca Indra', question: 'Bagian tubuh yang kita gunakan untuk melihat benda-benda di sekitar adalah ...', options: ['Telinga', 'Hidung', 'Mata', 'Kulit'], correctIndex: 2, steps: 2, explanation: 'Mata adalah indra penglihatan untuk melihat benda di sekitar.' },
  { id: 'q_a_bi_1', grade: 'Fase A', subject: 'Bahasa Indonesia', topic: 'Kosakata', question: 'Lawan kata dari "panjang" adalah ...', options: ['Tinggi', 'Pendek', 'Besar', 'Lebar'], correctIndex: 1, steps: 2, explanation: 'Lawan kata (antonim) dari panjang adalah pendek.' },

  // --- FASE B (Kelas 3-4 SD) ---
  { id: 'q_b_mtk_1', grade: 'Fase B', subject: 'Matematika', topic: 'Perkalian', question: 'Hasil dari 7 × 8 adalah ...', options: ['54', '56', '63', '48'], correctIndex: 1, steps: 3, explanation: '7 dikali 8 sama dengan 56.' },
  { id: 'q_b_mtk_2', grade: 'Fase B', subject: 'Matematika', topic: 'Pembagian', question: 'Ibu membagikan 36 kue sama rata ke dalam 4 kotak. Setiap kotak berisi ... kue.', options: ['7 kue', '8 kue', '9 kue', '10 kue'], correctIndex: 2, steps: 3, explanation: '36 ÷ 4 = 9 kue per kotak.' },
  { id: 'q_b_ipas_1', grade: 'Fase B', subject: 'IPAS', topic: 'Tumbuhan & Fotosintesis', question: 'Proses tumbuhan hijau membuat makanan sendiri dengan bantuan cahaya matahari disebut ...', options: ['Respirasi', 'Fotosintesis', 'Adaptasi', 'Evaporasi'], correctIndex: 1, steps: 3, explanation: 'Fotosintesis terjadi pada klorofil daun dengan bantuan cahaya matahari.' },
  { id: 'q_b_ipas_2', grade: 'Fase B', subject: 'IPAS', topic: 'Perubahan Wujud Zat', question: 'Peristiwa berubahnya es batu menjadi air cair saat diletakkan di tempat hangat disebut ...', options: ['Membeku', 'Mencair', 'Menguap', 'Menyublim'], correctIndex: 1, steps: 3, explanation: 'Perubahan wujud padat menjadi cair karena menerima panas disebut mencair.' },
  { id: 'q_b_ipa_1', grade: 'Fase B', subject: 'IPA', topic: 'Tumbuhan', question: 'Bagian tumbuhan yang berfungsi menyerap air dan zat hara dari dalam tanah adalah ...', options: ['Daun', 'Bunga', 'Akar', 'Buah'], correctIndex: 2, steps: 3, explanation: 'Akar menyerap air serta mineral dari tanah dan menguatkan berdirinya tumbuhan.' },

  // --- FASE C (Kelas 5-6 SD) ---
  { id: 'q_c_ipas_rm_1', grade: 'Fase C', subject: 'IPAS', topic: 'Rantai Makanan', question: 'Pada rantai makanan di ekosistem sawah: Padi → Tikus → Ular → Elang. Organisme yang berperan sebagai produsen adalah ...', options: ['Tikus', 'Padi', 'Ular', 'Elang'], correctIndex: 1, steps: 3, explanation: 'Padi berperan sebagai produsen karena mampu membuat makanan sendiri melalui fotosintesis.' },
  { id: 'q_c_ipas_rm_2', grade: 'Fase C', subject: 'IPAS', topic: 'Rantai Makanan', question: 'Dalam rantai makanan "Rumput → Belalang → Katak → Ular", hewan yang menempati posisi konsumen tingkat II adalah ...', options: ['Rumput', 'Belalang', 'Katak', 'Ular'], correctIndex: 2, steps: 3, explanation: 'Belalang adalah konsumen I (pemakan produsen), sedangkan katak pemakan belalang adalah konsumen II.' },
  { id: 'q_c_ipas_rm_3', grade: 'Fase C', subject: 'IPAS', topic: 'Rantai Makanan', question: 'Jika populasi ular di sawah diburu hingga habis, dampak langsung yang terjadi pada ekosistem sawah tersebut adalah ...', options: ['Populasi tikus meningkat pesat dan merusak padi', 'Populasi padi bertambah subur', 'Populasi elang bertambah sangat banyak', 'Belalang berubah menjadi produsen'], correctIndex: 0, steps: 4, explanation: 'Berkurangnya ular (predator tikus) menyebabkan populasi tikus melonjak sehingga hasil panen padi terancam.' },
  { id: 'q_c_ipas_rm_4', grade: 'Fase C', subject: 'IPAS', topic: 'Rantai Makanan', question: 'Bakteri dan jamur dalam rantai makanan berperan sebagai pengurai (dekomposer) yang berfungsi untuk ...', options: ['Menangkap mangsa berukuran besar', 'Menguraikan sisa makhluk hidup menjadi zat hara bagi tanah', 'Menyerap energi matahari secara langsung', 'Menghentikan aliran energi di ekosistem'], correctIndex: 1, steps: 4, explanation: 'Dekomposer menguraikan bangkai dan sisa tumbuhan menjadi nutrisi/zat hara yang menyuburkan tanah bagi produsen.' },
  { id: 'q_c_ipas_rm_5', grade: 'Fase C', subject: 'IPAS', topic: 'Rantai Makanan', question: 'Sumber energi utama yang memulai hampir seluruh rantai makanan di darat maupun di laut adalah ...', options: ['Air hujan', 'Angin', 'Cahaya matahari', 'Batu bara'], correctIndex: 2, steps: 3, explanation: 'Cahaya matahari digunakan produsen (tumbuhan/fitoplankton) untuk berfotosintesis dan mengalirkan energi ke konsumen.' },
  { id: 'q_c_ipas_sa_1', grade: 'Fase C', subject: 'IPAS', topic: 'Siklus Air', question: 'Proses penguapan air dari permukaan laut, sungai, dan danau akibat panas matahari dalam siklus air disebut ...', options: ['Kondensasi', 'Presipitasi', 'Evaporasi', 'Infiltrasi'], correctIndex: 2, steps: 3, explanation: 'Evaporasi adalah penguapan air permukaan menjadi uap air yang naik ke atmosfer.' },
  { id: 'q_c_ipas_ts_1', grade: 'Fase C', subject: 'IPAS', topic: 'Tata Surya', question: 'Planet terbesar di dalam sistem Tata Surya kita adalah ...', options: ['Saturnus', 'Mars', 'Jupiter', 'Neptunus'], correctIndex: 2, steps: 3, explanation: 'Jupiter adalah planet terbesar dalam sistem Tata Surya.' },
  { id: 'q_c_ipa_1', grade: 'Fase C', subject: 'IPA', topic: 'Tata Surya', question: 'Urutan planet yang letaknya paling dekat dengan Matahari adalah ...', options: ['Venus', 'Merkurius', 'Mars', 'Bumi'], correctIndex: 1, steps: 3, explanation: 'Merkurius merupakan planet pertama dan terdekat dari Matahari.' },
  { id: 'q_c_ipa_2', grade: 'Fase C', subject: 'IPA', topic: 'Rantai Makanan', question: 'Organisme pemakan tumbuhan secara langsung dalam suatu rantai makanan disebut ...', options: ['Produsen', 'Konsumen tingkat I (herbivora)', 'Konsumen puncak', 'Dekomposer'], correctIndex: 1, steps: 3, explanation: 'Konsumen tingkat I memakan produsen (tumbuhan) secara langsung dan umumnya berupa herbivora.' },
  { id: 'q_c_mtk_1', grade: 'Fase C', subject: 'Matematika', topic: 'Pecahan', question: 'Hasil dari 1/2 + 1/4 adalah ...', options: ['2/6', '3/4', '1/6', '2/4'], correctIndex: 1, steps: 4, explanation: '1/2 = 2/4, sehingga 2/4 + 1/4 = 3/4.' },
  { id: 'q_c_mtk_2', grade: 'Fase C', subject: 'Matematika', topic: 'Bangun Ruang', question: 'Sebuah kubus memiliki panjang rusuk 5 cm. Berapakah volume kubus tersebut?', options: ['25 cm³', '100 cm³', '125 cm³', '150 cm³'], correctIndex: 2, steps: 4, explanation: 'Volume kubus = s × s × s = 5 × 5 × 5 = 125 cm³.' },
  { id: 'q_c_bi_1', grade: 'Fase C', subject: 'Bahasa Indonesia', topic: 'Ide Pokok', question: 'Kalimat utama yang menjadi inti pembahasan dalam sebuah paragraf disebut ...', options: ['Kalimat penjelas', 'Ide pokok', 'Kata penghubung', 'Pantun'], correctIndex: 1, steps: 3, explanation: 'Ide pokok adalah gagasan utama yang mendasari suatu paragraf.' },
  { id: 'q_c_ppkn_1', grade: 'Fase C', subject: 'PPKn', topic: 'Pancasila', question: 'Sila ketiga Pancasila dilambangkan dengan gambar ...', options: ['Bintang', 'Rantai Emas', 'Pohon Beringin', 'Kepala Banteng'], correctIndex: 2, steps: 3, explanation: 'Pohon Beringin melambangkan Persatuan Indonesia (Sila ke-3).' },
  { id: 'q_c_ips_1', grade: 'Fase C', subject: 'IPS', topic: 'Keragaman Budaya', question: 'Indonesia dikenal sebagai negara maritim karena ...', options: ['Seluruh wilayahnya berupa pegunungan', 'Sebagian besar wilayahnya berupa perairan dan pulau-pulau', 'Tidak memiliki garis pantai', 'Hanya memiliki satu pulau besar'], correctIndex: 1, steps: 3, explanation: 'Negara maritim memiliki wilayah perairan laut yang luas dan menghubungkan ribuan pulau.' },
  { id: 'q_c_en_1', grade: 'Fase C', subject: 'Bahasa Inggris', topic: 'Vocabulary', question: 'Arti dari kata "Library" dalam bahasa Indonesia adalah ...', options: ['Laboratorium', 'Perpustakaan', 'Kantin', 'Lapangan'], correctIndex: 1, steps: 3, explanation: 'Library berarti perpustakaan.' },

  // --- FASE D (Kelas 7-9 SMP) ---
  { id: 'q_d_mtk_1', grade: 'Fase D', subject: 'Matematika', topic: 'Aljabar', question: 'Jika 3x + 5 = 20, maka nilai x adalah ...', options: ['3', '4', '5', '6'], correctIndex: 2, steps: 4, explanation: '3x = 20 - 5 = 15, maka x = 15 / 3 = 5.' },
  { id: 'q_d_ipa_1', grade: 'Fase D', subject: 'IPA', topic: 'Energi & Gaya', question: 'Satuan Internasional (SI) untuk gaya adalah ...', options: ['Joule', 'Watt', 'Newton', 'Pascal'], correctIndex: 2, steps: 4, explanation: 'Gaya diukur dalam satuan Newton (N).' },
  { id: 'q_d_ipa_2', grade: 'Fase D', subject: 'IPA', topic: 'Ekosistem', question: 'Dalam piramida energi ekosistem, jumlah energi yang berpindah dari satu tingkat trofik ke tingkat trofik berikutnya umumnya sekitar ...', options: ['10%', '50%', '75%', '100%'], correctIndex: 0, steps: 4, explanation: 'Berdasarkan aturan 10%, hanya sekitar 10% energi yang diteruskan ke tingkat trofik di atasnya.' },
  { id: 'q_d_ips_1', grade: 'Fase D', subject: 'IPS', topic: 'Interaksi Sosial', question: 'Hubungan timbal balik antara individu dengan individu, individu dengan kelompok, maupun antarkelompok disebut ...', options: ['Asimilasi', 'Interaksi sosial', 'Mobilitas vertikal', 'Urbanisasi'], correctIndex: 1, steps: 3, explanation: 'Interaksi sosial adalah hubungan sosial dinamis yang menyangkut hubungan timbal balik antarmanusia.' }
];

export function getFilteredSeedQuestions(grade: string, subject: string, topic?: string): QuestionItem[] {
  const cleanTopic = (topic || '').toLowerCase().trim();
  const topicWords = cleanTopic.split(/[\s,&/\-]+/).filter(w => w.length >= 3);

  const matchesSubject = (q: QuestionItem) => {
    if (subject === 'Campuran') return true;
    if (subject === 'IPAS') return q.subject === 'IPAS' || q.subject === 'IPA' || q.subject === 'IPS';
    if (subject === 'IPA') return q.subject === 'IPA' || q.subject === 'IPAS';
    if (subject === 'IPS') return q.subject === 'IPS' || q.subject === 'IPAS';
    return q.subject === subject;
  };

  // 1. Exact grade + subject match
  let pool = SEED_QUESTION_BANK.filter(q => q.grade === grade && matchesSubject(q));

  // 2. Fallback: same grade (if subject had too few seeds)
  if (pool.length === 0) {
    pool = SEED_QUESTION_BANK.filter(q => q.grade === grade);
  }
  // 3. Fallback: same subject across phases
  if (pool.length === 0) {
    pool = SEED_QUESTION_BANK.filter(matchesSubject);
  }
  if (pool.length === 0) {
    pool = SEED_QUESTION_BANK;
  }

  // Prioritize questions that match topic keywords or exact subject
  return [...pool].sort((a, b) => {
    const scoreItem = (item: QuestionItem) => {
      let s = 0;
      if (item.subject === subject) s += 10;
      if (item.grade === grade) s += 8;
      if (cleanTopic) {
        const hay = `${item.topic} ${item.question}`.toLowerCase();
        if (hay.includes(cleanTopic)) s += 20;
        topicWords.forEach(w => {
          if (hay.includes(w)) s += 5;
        });
      }
      return s;
    };
    return scoreItem(b) - scoreItem(a);
  });
}

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
