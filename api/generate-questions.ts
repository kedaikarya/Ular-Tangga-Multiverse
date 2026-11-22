import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

function buildPrompt(grade: string, subject: string, topic: string, count: number, existingQuestions: string[]) {
  const phaseGuide: Record<string, string> = {
    'Fase A': 'Kelas 1–2 SD (usia 6–8 tahun). Gunakan kalimat sangat singkat, sederhana, konkret, dan dekat dengan kehidupan sehari-hari anak.',
    'Fase B': 'Kelas 3–4 SD (usia 8–10 tahun). Gunakan bahasa jelas dan lugas tentang konsep dasar serta pengamatan sederhana.',
    'Fase C': 'Kelas 5–6 SD (usia 10–12 tahun). Uji pemahaman konsep nyata, hubungan sebab-akibat, penalaran terapan, dan contoh kehidupan sehari-hari.',
    'Fase D': 'Kelas 7–9 SMP (usia 12–15 tahun). Uji analisis ilmiah/matematis lebih mendalam, istilah baku, dan pemecahan masalah tingkat SMP.'
  };

  const avoidSection =
    existingQuestions.length > 0
      ? `\nHindari mengulang atau memparafrase soal-soal berikut:\n- ${existingQuestions.slice(0, 15).join('\n- ')}`
      : '';

  return [
    `Buat tepat ${count} soal pilihan ganda Kurikulum Merdeka Indonesia.`,
    `Fase Pembelajaran: ${grade} (${phaseGuide[grade] || phaseGuide['Fase C']})`,
    `Mata Pelajaran: ${subject}`,
    `Materi/Topik Utama: ${topic}`,
    '',
    'Aturan wajib:',
    '1. Setiap soal HARUS menguji pengetahuan/pemahaman konten materi di atas secara akurat (JANGAN membuat soal umum tentang sikap berdiskusi atau tujuan belajar topik tersebut, kecuali materinya memang tentang hal itu).',
    '2. Sesuaikan tingkat kesulitan, kosakata, dan kedalaman konsep tepat dengan Fase yang diminta.',
    '3. Setiap soal memiliki tepat 4 pilihan jawaban yang masuk akal, tidak ambigu, dan hanya 1 jawaban benar.',
    '4. Berikan `steps` antara 2 sampai 5 (2–3 untuk soal dasar, 4–5 untuk soal analisis/HOTS).',
    '5. Berikan `explanation` singkat (1–2 kalimat) yang edukatif menjelaskan alasan jawaban benar.',
    avoidSection
  ].join('\n');
}

export default async function handler(
  req: { method?: string; body?: any },
  res: { status: (code: number) => any; json: (data: any) => any; setHeader: (k: string, v: string) => void }
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method tidak diizinkan. Gunakan POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY belum dikonfigurasi di server. Tambahkan pada Secrets (AI Studio) atau Environment Variables (Vercel).'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const grade = String(body.grade || 'Fase C').trim().slice(0, 40);
    const subject = String(body.subject || 'IPAS').trim().slice(0, 40);
    const topic = String(body.topic || 'Umum').trim().slice(0, 120);
    const count = Math.max(1, Math.min(10, Math.floor(Number(body.count) || 5)));
    const existingQuestions = Array.isArray(body.existingQuestions)
      ? body.existingQuestions.slice(0, 15).map((q: any) => String(q || '').slice(0, 200))
      : [];

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: buildPrompt(grade, subject, topic, count, existingQuestions),
      config: {
        systemInstruction:
          'Anda adalah guru profesional dan penyusun soal Kurikulum Merdeka Indonesia (SD/SMP). Susun soal pilihan ganda yang akurat secara keilmuan, sesuai fase usia siswa, jelas, dan langsung menguji materi yang diminta.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: 'Pertanyaan pilihan ganda yang jelas dan spesifik.' },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Tepat 4 opsi jawaban berbeda.'
              },
              correctIndex: { type: Type.INTEGER, description: 'Indeks opsi benar (0 sampai 3).' },
              steps: { type: Type.INTEGER, description: 'Bobot langkah antara 2 sampai 5.' },
              explanation: { type: Type.STRING, description: 'Pembahasan singkat mengapa jawaban tersebut benar.' }
            },
            required: ['question', 'options', 'correctIndex', 'steps', 'explanation']
          }
        }
      }
    });

    const rawText = (response.text ?? '[]').trim();
    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return res.status(502).json({ error: 'Gemini AI tidak mengembalikan daftar soal yang valid.' });
    }

    const questions = parsed.slice(0, count).map((item: any, idx: number) => {
      const opts = Array.isArray(item.options) && item.options.length >= 2
        ? item.options.slice(0, 4).map((o: any) => String(o || '').trim()).filter(Boolean)
        : ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'];
      while (opts.length < 4) opts.push(`Pilihan ${String.fromCharCode(65 + opts.length)}`);
      const cIdx = Math.max(0, Math.min(opts.length - 1, Math.floor(Number(item.correctIndex) || 0)));
      const steps = Math.max(2, Math.min(5, Math.floor(Number(item.steps) || 3)));
      return {
        id: `ai_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        grade,
        subject,
        topic,
        question: String(item.question || '').trim().slice(0, 500),
        options: opts,
        correctIndex: cIdx,
        steps,
        explanation: String(item.explanation || '').trim().slice(0, 500)
      };
    }).filter((q: any) => q.question.length > 0);

    return res.status(200).json({ questions });
  } catch (err: any) {
    console.error('Gemini question generation error:', err);
    const status = Number(err?.status) || 500;
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: err?.message || 'Gagal menghubungi Gemini AI untuk membuat soal.'
    });
  }
}
