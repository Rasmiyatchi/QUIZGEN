/**
 * Universal HEMIS Test Parser v3
 * O'zbekiston OTMlaridagi HEMIS va boshqa test tizimlari uchun kengaytirilgan parser.
 * 0 AI token sarflaydi, 100% bepul, tezkor va aniq.
 * 
 * Qo'llab-quvvatlanadigan formatlar:
 * 1. Simvolli format: ++++ (savol) ==== (variantlar) # yoki * yoki (+) to'g'ri javob
 * 2. Raqamlangan format: 1. Savol... A) ... B) ... C) ... D) ... Javob: A
 * 3. Kirill va Lotin harflari (A-F, А-Е)
 * 4. HTML format (mammoth DOCX bold/strong teglari bilan)
 * 5. ParseReport (to'liq hisobot, validQuestions, needsReview, warnings)
 */

export interface HemisQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  needsReview?: boolean;
  reviewReason?: string;
}

export interface ParseReport {
  isHemis: boolean;
  formatType?: 'symbol' | 'numbered' | 'lettered' | 'html';
  totalFound: number;
  validQuestions: number;
  needsReviewCount: number;
  warnings: string[];
  questions: HemisQuestion[];
}

export interface ParseResult {
  isHemis: boolean;
  formatType?: 'symbol' | 'numbered' | 'lettered' | 'html';
  questions: HemisQuestion[];
}

/**
 * Matn ichidagi qatorlarni tozalash va normalizatsiya qilish
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ') // non-breaking space
    .trim();
}

/**
 * Variant harfini indeksga o'girish (A -> 0, B -> 1, C -> 2, D -> 3 va kirillcha)
 */
export function letterToIndex(letter: string): number {
  const map: Record<string, number> = {
    'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5,
    'а': 0, 'б': 1, 'в': 2, 'г': 3, 'д': 4, 'е': 5 // Kirill harflari
  };
  return map[letter.toLowerCase()] ?? 0;
}

/**
 * HTML dan qalin (bold/strong) qilib belgilangan to'g'ri javoblarni oddiy matnga aylantirish
 */
export function preprocessHtmlDocx(html: string): string {
  // Strong/bold teg ichida variant harfi (A) B) ko'rinishida) bo'lsa,
  // `*` ni harfdan OLDIN qo'yamiz: "B) *text" emas, "*B) text" bo'lsin
  const processed = html
    // Agar strong teg variant harfini o'z ichiga olsa: <strong>B) text</strong> → *B) text
    .replace(/<(?:strong|b)>\s*([A-FА-Еa-fа-е][\.\)]\s*.*?)<\/(?:strong|b)>/gi, '*$1')
    // U teg (underline) bilan belgilangan variantlar ham xuddi shunday
    .replace(/<u>\s*([A-FА-Еa-fа-е][\.\)]\s*.*?)<\/u>/gi, '*$1')
    // Qolgan strong/b/u teglarni ham belgilaymiz (matnning o'rtasida bo'lsa)
    .replace(/<(?:strong|b)>(.*?)<\/(?:strong|b)>/gi, '*$1')
    .replace(/<u>(.*?)<\/u>/gi, '*$1')
    // P va br teglarni qator ajratuvchiga
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    // Boshqa barcha HTML teglarni olib tashlash
    .replace(/<[^>]+>/g, '')
    .trim();
  
  // Agar variant qatori "X) *text" ko'rinishida bo'lsa,
  // uni "*X) text" ga o'tkazamiz (numbered parser uchun)
  return processed.replace(
    /^([A-FА-Еa-fа-е][\.\)])\s+\*(.+)$/gm,
    '*$1 $2'
  );
}

/**
 * 1-SHABLON: Simvolli format (++++ va ====)
 */
function parseSymbolFormatWithReport(text: string): { questions: HemisQuestion[]; warnings: string[] } {
  const blocks = text
    .split(/\+{4,}/)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  const questions: HemisQuestion[] = [];
  const warnings: string[] = [];

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    const parts = block
      .split(/={4,}/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (parts.length >= 2) {
      const questionText = parts[0];
      const rawOptions = parts.slice(1);
      let correctAnswerIndex = -1;
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

      if (options.length < 2) {
        warnings.push(`${bIdx + 1}-savolda variantlar yetarli emas (kamida 2 ta bo'lishi kerak).`);
        continue;
      }

      const needsReview = correctAnswerIndex === -1;
      if (needsReview) {
        correctAnswerIndex = 0; // Standart birinchi variant
        warnings.push(`${bIdx + 1}-savolda to'g'ri javob belgilanmagan (# yoki * yo'q), 1-variant belgilandi.`);
      }

      questions.push({
        question: questionText,
        options,
        correctAnswer: correctAnswerIndex,
        needsReview,
        reviewReason: needsReview ? "To'g'ri javob belgilanmagan" : undefined
      });
    } else if (parts.length === 1 && parts[0].length > 5) {
      warnings.push(`${bIdx + 1}-savol ajratuvchi (====) bilan to'liq ajratilmagan.`);
    }
  }

  return { questions, warnings };
}

/**
 * 2-SHABLON: Raqamlangan format (1. Savol... A) ... B) ... C) ... D) ... Javob: A)
 */
function parseNumberedFormatWithReport(text: string): { questions: HemisQuestion[]; warnings: string[] } {
  const questions: HemisQuestion[] = [];
  const warnings: string[] = [];

  // Savollar bloklarini ajratish
  const questionBlocks = text.split(/\n(?=(?:\d+[\.\)]|\d+\-savol[\.\:]?|\bSavol\s+\d+[\.\:]?)\s+)/i);

  for (let qIdx = 0; qIdx < questionBlocks.length; qIdx++) {
    const trimmed = questionBlocks[qIdx].trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 3) continue;

    // 1-qator: Savol matni (boshidagi raqamni tozalaymiz)
    let questionText = lines[0].replace(/^(?:\d+[\.\)]|\d+\-savol[\.\:]?|\bSavol\s+\d+[\.\:]?)\s*/i, '').trim();

    // Agar savol bir necha qator davom etsa, variantlar boshlanguncha qo'shamiz
    let lineIdx = 1;
    while (lineIdx < lines.length && !/^[#*+]?[A-FА-Еa-fа-е][\.\)]\s+/i.test(lines[lineIdx])) {
      questionText += ' ' + lines[lineIdx];
      lineIdx++;
    }

    const options: string[] = [];
    let detectedAnswerIndex = -1;

    for (; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];

      // To'g'ri javob alohida qatorda ko'rsatilganmi?
      const answerMatch = line.match(/(?:to['`‘]?g['`‘]?ri\s+javob|javob|ans(?:wer)?)\s*[:=\-]?\s*([A-FА-Е])/i);
      if (answerMatch) {
        detectedAnswerIndex = letterToIndex(answerMatch[1]);
        continue;
      }

      // Variant qatori bormi? (A) ... yoki #A) ... yoki *A) ...)
      const optMatch = line.match(/^([#*+])?\s*([A-FА-Еa-fа-е])[\.\)]\s+(.*)$/i);
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

    if (options.length < 2) {
      warnings.push(`Savolda variantlar topilmadi yoki yetarli emas: "${questionText.substring(0, 40)}..."`);
      continue;
    }

    const needsReview = detectedAnswerIndex < 0 || detectedAnswerIndex >= options.length;
    if (needsReview) {
      detectedAnswerIndex = 0;
      warnings.push(`"${questionText.substring(0, 30)}..." savolida to'g'ri javob belgilanmagan, 1-variant olindi.`);
    }

    questions.push({
      question: questionText,
      options,
      correctAnswer: detectedAnswerIndex,
      needsReview,
      reviewReason: needsReview ? "To'g'ri javob noaniq" : undefined
    });
  }

  return { questions, warnings };
}

/**
 * Kengaytirilgan tahlil funksiyasi (ParseReport bilan)
 */
export function parseHemisQuizWithReport(rawText: string): ParseReport {
  const cleaned = cleanText(rawText);

  // 1. Simvolli formatni tekshirish (++++ va ====)
  if (cleaned.includes('++++') && cleaned.includes('====')) {
    const { questions, warnings } = parseSymbolFormatWithReport(cleaned);
    if (questions.length > 0) {
      const needsReviewCount = questions.filter(q => q.needsReview).length;
      return {
        isHemis: true,
        formatType: 'symbol',
        totalFound: questions.length,
        validQuestions: questions.length - needsReviewCount,
        needsReviewCount,
        warnings,
        questions
      };
    }
  }

  // 2. Raqamlangan formatni tekshirish (1. Savol... A) ... B) ...)
  const hasNumbers = /(?:^\s*\d+[\.\)]|^\s*\d+\-savol)/m.test(cleaned);
  const hasOptions = /^[#*+]?[A-FА-Е][\.\)]\s+/m.test(cleaned);

  if (hasNumbers && hasOptions) {
    const { questions, warnings } = parseNumberedFormatWithReport(cleaned);
    if (questions.length > 0) {
      const needsReviewCount = questions.filter(q => q.needsReview).length;
      return {
        isHemis: true,
        formatType: 'numbered',
        totalFound: questions.length,
        validQuestions: questions.length - needsReviewCount,
        needsReviewCount,
        warnings,
        questions
      };
    }
  }

  // 3. Raqamsiz, faqat A) B) C) variantli format
  if (hasOptions) {
    const { questions, warnings } = parseNumberedFormatWithReport(cleaned);
    if (questions.length > 0) {
      const needsReviewCount = questions.filter(q => q.needsReview).length;
      return {
        isHemis: true,
        formatType: 'lettered',
        totalFound: questions.length,
        validQuestions: questions.length - needsReviewCount,
        needsReviewCount,
        warnings,
        questions
      };
    }
  }

  return {
    isHemis: false,
    totalFound: 0,
    validQuestions: 0,
    needsReviewCount: 0,
    warnings: ["HEMIS shabloni topilmadi. ++++ / ==== yoki 1. A) B) C) formatida bo'lishi kerak."],
    questions: []
  };
}

/**
 * Mavjud kodlar bilan to'liq orqaga moslik (Backward Compatibility)
 */
export function parseHemisQuiz(rawText: string): ParseResult {
  const report = parseHemisQuizWithReport(rawText);
  return {
    isHemis: report.isHemis,
    formatType: report.formatType,
    questions: report.questions
  };
}
