/**
 * Universal HEMIS Test Parser
 * O'zbekiston OTMlaridagi HEMIS va boshqa test tizimlari uchun shablonlarni avtomatik tahlil qiladi.
 * 0 AI token sarflaydi, 100% bepul, tezkor va aniq.
 */

export interface HemisQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface ParseResult {
  isHemis: boolean;
  formatType?: 'symbol' | 'numbered' | 'lettered';
  questions: HemisQuestion[];
}

/**
 * Matn ichidagi qatorlarni tozalash
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ') // non-breaking space
    .trim();
}

/**
 * 1-SHABLON: Simvolli format (++++ va ====)
 */
function parseSymbolFormat(text: string): HemisQuestion[] {
  const blocks = text
    .split(/\+{4,}/)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  const questions: HemisQuestion[] = [];

  for (const block of blocks) {
    const parts = block
      .split(/={4,}/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (parts.length >= 2) {
      const questionText = parts[0];
      const rawOptions = parts.slice(1);
      let correctAnswerIndex = 0;
      const options: string[] = [];

      for (let i = 0; i < rawOptions.length; i++) {
        let opt = rawOptions[i];
        if (opt.startsWith('#') || opt.startsWith('*') || opt.startsWith('+')) {
          correctAnswerIndex = i;
          opt = opt.replace(/^[#*+]\s*/, '').trim();
        } else if (/\(\+\)$/.test(opt)) {
          correctAnswerIndex = i;
          opt = opt.replace(/\s*\(\+\)$/, '').trim();
        }
        options.push(opt);
      }

      if (options.length >= 2 && questionText) {
        questions.push({
          question: questionText,
          options,
          correctAnswer: correctAnswerIndex
        });
      }
    }
  }

  return questions;
}

/**
 * Variant harfini indeksga o'girish (A -> 0, B -> 1, C -> 2, D -> 3 va kirillcha)
 */
function letterToIndex(letter: string): number {
  const map: Record<string, number> = {
    'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5,
    'а': 0, 'б': 1, 'в': 2, 'г': 3, 'д': 4, 'е': 5 // Kirill harflari
  };
  return map[letter.toLowerCase()] ?? 0;
}

/**
 * 2-SHABLON: Raqamlangan format (1. Savol... A) ... B) ... C) ... D) ... Javob: A)
 */
function parseNumberedFormat(text: string): HemisQuestion[] {
  const questions: HemisQuestion[] = [];

  // Har bir savol qatorini ajratib olish (1. yoki 1) yoki 1-savol yoki === orqali)
  // Masalan: \n1. yoki \n1) yoki matn boshidagi 1.
  const questionBlocks = text.split(/\n(?=(?:\d+[\.\)]|\d+\-savol[\.\:]?|\bSavol\s+\d+[\.\:]?)\s+)/i);

  for (const block of questionBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 3) continue;

    // 1-qator: Savol matni (boshidagi raqamni tozalaymiz)
    let questionText = lines[0].replace(/^(?:\d+[\.\)]|\d+\-savol[\.\:]?|\bSavol\s+\d+[\.\:]?)\s*/i, '').trim();

    // Agar savol bir necha qator davom etsa, variantlar boshlanguncha qo'shamiz
    let lineIdx = 1;
    while (lineIdx < lines.length && !/^[#*]?[A-DА-Дa-dа-д][\.\)]\s+/i.test(lines[lineIdx])) {
      questionText += ' ' + lines[lineIdx];
      lineIdx++;
    }

    const options: string[] = [];
    let detectedAnswerIndex = -1;

    for (; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];

      // To'g'ri javob alohida qatorda ko'rsatilganmi? (Masalan: "Javob: A" yoki "To'g'ri javob: B" yoki "Ans: C")
      const answerMatch = line.match(/(?:to['`‘]?g['`‘]?ri\s+javob|javob|ans(?:wer)?)\s*[:=\-]?\s*([A-DА-Д])/i);
      if (answerMatch) {
        detectedAnswerIndex = letterToIndex(answerMatch[1]);
        continue;
      }

      // Variant qatori bormi? (A) ... yoki #A) ... yoki *A) ...)
      const optMatch = line.match(/^([#*+])?\s*([A-DА-Дa-dа-д])[\.\)]\s+(.*)$/i);
      if (optMatch) {
        const isMarkedCorrect = Boolean(optMatch[1]);
        let optText = optMatch[3].trim();

        if (/\(\+\)$/.test(optText)) {
          detectedAnswerIndex = options.length;
          optText = optText.replace(/\s*\(\+\)$/, '').trim();
        }

        if (isMarkedCorrect) {
          detectedAnswerIndex = options.length;
        }

        options.push(optText);
      }
    }

    if (options.length >= 2 && questionText) {
      questions.push({
        question: questionText,
        options,
        correctAnswer: detectedAnswerIndex >= 0 && detectedAnswerIndex < options.length ? detectedAnswerIndex : 0
      });
    }
  }

  return questions;
}

/**
 * Asosiy tahlil funksiyasi (Avtomatik formatni aniqlash)
 */
export function parseHemisQuiz(rawText: string): ParseResult {
  const cleaned = cleanText(rawText);

  // 1. Simvolli formatni tekshirish
  if (cleaned.includes('++++') && cleaned.includes('====')) {
    const questions = parseSymbolFormat(cleaned);
    if (questions.length > 0) {
      return { isHemis: true, formatType: 'symbol', questions };
    }
  }

  // 2. Raqamlangan formatni tekshirish (1. Savol... A) ... B) ...)
  const hasNumbers = /(?:^\s*\d+[\.\)]|^\s*\d+\-savol)/m.test(cleaned);
  const hasOptions = /^[#*]?[A-DА-Д][\.\)]\s+/m.test(cleaned);

  if (hasNumbers && hasOptions) {
    const questions = parseNumberedFormat(cleaned);
    if (questions.length > 0) {
      return { isHemis: true, formatType: 'numbered', questions };
    }
  }

  // 3. Agar raqamlar bo'lmasa-da, har bir savol A) B) C) D) ko'rinishida bo'lsa
  if (hasOptions) {
    const questions = parseNumberedFormat(cleaned);
    if (questions.length > 0) {
      return { isHemis: true, formatType: 'lettered', questions };
    }
  }

  return { isHemis: false, questions: [] };
}

