import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { 
  initDatabase, 
  upsertUser, 
  getQuiz, 
  getQuizQuestions 
} from '../src/lib/db.ts';

import { 
  parseHemisQuizWithReport, 
  preprocessHtmlDocx, 
  letterToIndex 
} from '../src/lib/hemis-parser.ts';

import { QuizCreationService } from '../src/services/quiz-creation.service.ts';

describe('M4 — Test Yaratish Yadrosi va HEMIS Parser Testlari', () => {

  test('Format A (Simvolli format: ++++ va ====): to\'g\'ri tahlil va to\'g\'ri javob indeksi', () => {
    const rawSample = `
++++
O'zbekiston Respublikasi Konstitutsiyasi qachon qabul qilingan?
====
# 1992-yil 8-dekabr
====
1991-yil 1-sentyabr
====
1993-yil 2-iyul
====
1990-yil 20-iyun
++++
Axborot xavfsizligining asosiy tamoyillari qaysilar?
====
Maxfiylik, butunlik, qulaylik
====
Faqat maxfiylik
====
* Butunlik, mavjudlik, maxfiylik
====
Faqat viruslardan himoya
`;

    const report = parseHemisQuizWithReport(rawSample);
    assert.equal(report.isHemis, true);
    assert.equal(report.formatType, 'symbol');
    assert.equal(report.totalFound, 2);
    assert.equal(report.validQuestions, 2);
    assert.equal(report.needsReviewCount, 0);

    // 1-savol: # bilan 0-indeks
    assert.equal(report.questions[0].correctAnswer, 0);
    assert.equal(report.questions[0].options[0], "1992-yil 8-dekabr");

    // 2-savol: * bilan 2-indeks
    assert.equal(report.questions[1].correctAnswer, 2);
    assert.equal(report.questions[1].options[2], "Butunlik, mavjudlik, maxfiylik");
  });

  test('Format B (Raqamlangan format): 1. Savol... A) B) C) D) va Javob: A', () => {
    const rawSample = `
1. Algoritmning asosiy xossalariga nimalar kiradi?
A) Diskretlik, determiniklik, tushunarlilik, natijaviylik, ommaviylik
B) Faqat tezkorlik va qulaylik
C) Faqat dasturlash tili qoidalari
D) Chiziqli va tarmoqlanuvchi
Javob: A

2. Relyatsion ma'lumotlar bazasida jadvalning har bir qatori nima deyiladi?
A) Maydon (Field)
B) Kortej (Yozuv / Record / Tuple)
C) Domen (Domain)
D) Kalit (Key)
To'g'ri javob: B
`;

    const report = parseHemisQuizWithReport(rawSample);
    assert.equal(report.isHemis, true);
    assert.equal(report.formatType, 'numbered');
    assert.equal(report.totalFound, 2);
    assert.equal(report.validQuestions, 2);

    // 1-savol: Javob: A -> 0
    assert.equal(report.questions[0].correctAnswer, 0);
    assert.equal(report.questions[0].options.length, 4);

    // 2-savol: To'g'ri javob: B -> 1
    assert.equal(report.questions[1].correctAnswer, 1);
    assert.equal(report.questions[1].options[1], "Kortej (Yozuv / Record / Tuple)");
  });

  test('DOCX HTML bold/strong teglari orqali to\'g\'ri javobni aniqlash', () => {
    const rawHtml = `
<p>1. Kompyuterning asosiy mantiqiy elementi nima?</p>
<p>A) Monitor</p>
<p>B) <strong>Tranzistor va protsessor</strong></p>
<p>C) Klaviatura</p>
<p>D) Printer</p>
`;

    const preprocessed = preprocessHtmlDocx(rawHtml);
    // Strong tegi yulduzcha (*) bilan belgilanganligini tekshirish
    // preprocessor "B) <strong>text</strong>" ni "*B) text" ga aylantiradi
    assert.ok(preprocessed.includes('*') && preprocessed.includes('Tranzistor va protsessor'), "Strong tegi yulduzchaga aylantirilgan bo'lishi kerak");

    const report = parseHemisQuizWithReport(preprocessed);
    assert.equal(report.isHemis, true);
    assert.equal(report.totalFound, 1);
    // B varianti strong edi, shuning uchun index 1 bo'lishi kerak
    assert.equal(report.questions[0].correctAnswer, 1);
  });

  test('needsReview va warnings: to\'g\'ri javobi belgilanmagan savol uchun ogohlantirish beradi', () => {
    const noAnswerSample = `
++++
Dunyoning eng baland cho'qqisi qaysi?
====
Everest (Jomolungma)
====
K2
====
Monblan
====
Elbrus
`;

    const report = parseHemisQuizWithReport(noAnswerSample);
    assert.equal(report.totalFound, 1);
    assert.equal(report.needsReviewCount, 1);
    assert.equal(report.questions[0].needsReview, true);
    assert.ok(report.warnings.length > 0, "Ogohlantirish berilishi shart");
  });

  test('QuizCreationService.createFromText: bazaga to\'g\'ri yozadi va limitlarni saqlaydi', () => {
    initDatabase();
    const userId = 'user_quiz_creator_' + Date.now();
    upsertUser({ id: userId, first_name: 'Test Tuzuvchi', role: 'student' });

    const sampleText = `
++++
Quyosh tizimidagi eng katta sayyora qaysi?
====
# Yupiter
====
Mars
====
Saturn
====
Venera
++++
Suvning kimyoviy formulasi qanday?
====
CO2
====
# H2O
====
NaCl
====
CH4
`;

    const result = QuizCreationService.createFromText({
      text: sampleText,
      userId,
      title: "Tabiiy Fanlar Testi"
    });

    assert.equal(result.success, true);
    assert.ok(result.quiz);
    assert.equal(result.quiz?.total_questions, 2);
    assert.equal(result.quiz?.title, "Tabiiy Fanlar Testi");

    // Bazadan tekshirish
    const savedQuiz = getQuiz(result.quiz!.id);
    assert.ok(savedQuiz, "Test bazada saqlangan bo'lishi shart");
    assert.equal(savedQuiz?.total_questions, 2);

    const questions = getQuizQuestions(result.quiz!.id);
    assert.equal(questions.length, 2);
    assert.equal(questions[0].options[questions[0].correctAnswer], "Yupiter");
    assert.equal(questions[1].options[questions[1].correctAnswer], "H2O");
  });

  test('QuizCreationService.createManual: qo\'lda tuzilgan testni saqlaydi', () => {
    initDatabase();
    const userId = 'user_manual_quiz_' + Date.now();
    upsertUser({ id: userId, first_name: 'Manual Creator', role: 'teacher' });

    const manualQuestions = [
      {
        question: "2 + 2 nechaga teng?",
        options: ["3", "4", "5", "6"],
        correctAnswer: 1
      },
      {
        question: "O'zbekiston poytaxti qaysi shahar?",
        options: ["Samarqand", "Buxoro", "Toshkent", "Xiva"],
        correctAnswer: 2
      }
    ];

    const result = QuizCreationService.createManual({
      userId,
      title: "Boshlang'ich Savollar",
      subject: "Matematika va Geografiya",
      questions: manualQuestions as any
    });

    assert.equal(result.success, true);
    assert.equal(result.quiz.total_questions, 2);
    assert.equal(result.quiz.source_type, 'manual');

    const questions = getQuizQuestions(result.quiz.id);
    assert.equal(questions.length, 2);
    assert.equal(questions[0].question, "2 + 2 nechaga teng?");
    assert.equal(questions[0].correctAnswer, 1);
  });

});

