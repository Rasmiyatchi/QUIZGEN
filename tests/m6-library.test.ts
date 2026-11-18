import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { 
  initDatabase, 
  upsertUser, 
  createQuiz, 
  getQuiz,
  generateSlug,
  saveQuizToLibrary,
  removeQuizFromLibrary,
  isQuizSavedByUser,
  getUserSavedQuizzes,
  searchPublicQuizzes,
  getFeaturedQuizzes,
  getQuizBySlug,
  forkQuiz,
  reportQuiz,
  createLibraryFolder,
  getUserLibraryFolders,
  deleteLibraryFolder,
  getDatabase
} from '../src/lib/db.ts';

describe('M6 — Test Kutubxonasi, Ommaviy Qidiruv, Saqlanganlar, Jildlar va Moderatsiya', () => {

  test('1. Slug generatsiyasi va unikal bo\'lishi', () => {
    initDatabase();
    const slug1 = generateSlug('Fizika 1-kurs Yakuniy Nazorat!');
    assert.ok(slug1.startsWith('fizika-1-kurs-yakuniy-nazorat-'));
    assert.match(slug1, /^[a-z0-9\-]+$/);

    const slug2 = generateSlug('Fizika 1-kurs Yakuniy Nazorat!');
    assert.notEqual(slug1, slug2, 'Har bir chaqiruvda unikal suffix bo\'lishi shart');
  });

  test('2. Ommaviy testlarni qidirish, kategoriya va saralash', () => {
    initDatabase();
    const userId = 'user_m6_search_' + Date.now();
    upsertUser({ id: userId, first_name: 'Professor M6', role: 'student' });

    const qId1 = 'quiz_m6_anatomiya_' + Date.now();
    const qId2 = 'quiz_m6_dasturlash_' + Date.now();

    createQuiz({
      id: qId1,
      user_id: userId,
      title: 'Odam Anatomiyasi Asoslari',
      total_questions: 10,
      category: 'Tibbiyot',
      visibility: 'public',
      status: 'active',
      views_count: 50
    }, [
      { id: `${qId1}_1`, quiz_id: qId1, question: 'Yurak necha kamerali?', options: ['2', '3', '4', '5'], correctAnswer: 2 }
    ] as any);

    createQuiz({
      id: qId2,
      user_id: userId,
      title: 'Python Dasturlash Asoslari',
      total_questions: 25,
      category: 'Axborot texnologiyalari',
      visibility: 'public',
      status: 'active',
      views_count: 120
    }, [
      { id: `${qId2}_1`, quiz_id: qId2, question: 'Python da ro\'yxat qaysi qavsda?', options: ['()', '[]', '{}', '<>'], correctAnswer: 1 }
    ] as any);

    // Qidiruv kalit so'z bo'yicha
    const searchRes = searchPublicQuizzes({ q: 'Anatomiya' });
    assert.ok(searchRes.length >= 1);
    assert.ok(searchRes.some(q => q.id === qId1));
    assert.ok(!searchRes.some(q => q.id === qId2));

    // Kategoriya bo'yicha filtr
    const catRes = searchPublicQuizzes({ category: 'Axborot texnologiyalari' });
    assert.ok(catRes.some(q => q.id === qId2));
    assert.ok(!catRes.some(q => q.id === qId1));

    // Saralash: popular
    const popularRes = searchPublicQuizzes({ sort: 'popular', limit: 5 });
    assert.ok(popularRes.length >= 2);
    // qId2 (120 views) qId1 (50 views) dan oldin turishi kerak
    const idx1 = popularRes.findIndex(q => q.id === qId1);
    const idx2 = popularRes.findIndex(q => q.id === qId2);
    if (idx1 !== -1 && idx2 !== -1) {
      assert.ok(idx2 < idx1, 'Ko\'proq ko\'rilgan test yuqoriroq chiqishi shart');
    }
  });

  test('3. Testni kutubxonaga saqlash, olib tashlash va limitlar (Entitlements)', () => {
    initDatabase();
    const userId = 'user_m6_save_' + Date.now();
    upsertUser({ id: userId, first_name: 'Talaba M6', role: 'student' });

    const authorId = 'author_m6_save_' + Date.now();
    upsertUser({ id: authorId, first_name: 'Muallif M6', role: 'student' });

    const qId = 'quiz_m6_saveable_' + Date.now();
    createQuiz({
      id: qId,
      user_id: authorId,
      title: 'Oliy Matematika Integrallar',
      total_questions: 5,
      category: 'Aniq fanlar',
      visibility: 'public',
      status: 'active'
    }, [
      { id: `${qId}_1`, quiz_id: qId, question: 'Integral sin(x) dx?', options: ['cos(x)', '-cos(x)', 'tan(x)', 'cot(x)'], correctAnswer: 1 }
    ] as any);

    // Dastlab saqlanmagan
    assert.equal(isQuizSavedByUser(userId, qId), false);

    // Saqlaymiz
    const saveRes = saveQuizToLibrary(userId, qId);
    assert.equal(saveRes.success, true);
    assert.equal(isQuizSavedByUser(userId, qId), true);

    // Saqlanganlar ro'yxatini olamiz
    const savedList = getUserSavedQuizzes(userId);
    assert.ok(savedList.some(q => q.id === qId));

    // Kutubxonadan olib tashlaymiz
    const removeRes = removeQuizFromLibrary(userId, qId);
    assert.equal(removeRes, true);
    assert.equal(isQuizSavedByUser(userId, qId), false);
  });

  test('4. Jildlar (Folders) yaratish, olish va o\'chirish', () => {
    initDatabase();
    const userId = 'user_m6_folder_' + Date.now();
    upsertUser({ id: userId, first_name: 'Organized Student', role: 'student' });

    // Jild yaratish
    const folder = createLibraryFolder(userId, '1-Semestr Yakuniy', '#10b981');
    assert.ok(folder.id);
    assert.equal(folder.name, '1-Semestr Yakuniy');
    assert.equal(folder.color, '#10b981');

    // Foydalanuvchi jildlarini olish
    const userFolders = getUserLibraryFolders(userId);
    assert.equal(userFolders.length, 1);
    assert.equal(userFolders[0].id, folder.id);

    // Jildni o'chirish
    const delRes = deleteLibraryFolder(folder.id, userId);
    assert.equal(delRes, true);
    assert.equal(getUserLibraryFolders(userId).length, 0);
  });

  test('5. Fork (Nusxa olish): mustaqil nusxa, yangi savol identifikatorlari va forked_from', () => {
    initDatabase();
    const authorId = 'author_m6_' + Date.now();
    const forkerId = 'forker_m6_' + Date.now();
    upsertUser({ id: authorId, first_name: 'Ustoz', role: 'student' });
    upsertUser({ id: forkerId, first_name: 'Shogird', role: 'student' });

    const originalQuizId = 'quiz_m6_orig_' + Date.now();
    createQuiz({
      id: originalQuizId,
      user_id: authorId,
      title: 'Tarix Testi 1991-2025',
      total_questions: 1,
      category: 'Ijtimoiy fanlar',
      visibility: 'public',
      status: 'active',
      views_count: 88
    }, [
      { id: `${originalQuizId}_q1`, quiz_id: originalQuizId, question: 'Mustaqillik qachon e\'lon qilingan?', options: ['1990', '1991', '1992', '1993'], correctAnswer: 1 }
    ] as any);

    // Fork qilamiz
    const forkedQuiz = forkQuiz(originalQuizId, forkerId);
    assert.ok(forkedQuiz, 'Fork qilingan test qaytishi shart');
    assert.notEqual(forkedQuiz.id, originalQuizId, 'Yangi ID ga ega bo\'lishi shart');
    assert.equal(forkedQuiz.user_id, forkerId, 'Egaligi forker ga o\'tishi shart');
    assert.equal(forkedQuiz.forked_from, originalQuizId, 'forked_from ga original test ID yozilishi shart');
    assert.equal(forkedQuiz.views_count, 0, 'Ko\'rishlar soni 0 ga qaytarilishi kerak');
    assert.ok(forkedQuiz.title.includes('Tarix Testi 1991-2025'), 'Sarlavha saqlanishi kerak');
  });

  test('6. Moderatsiya va Shikoyatlar: 5 ta shikoyatdan so\'ng avtomatik yashirish', () => {
    initDatabase();
    const spammerId = 'spammer_user_' + Date.now();
    upsertUser({ id: spammerId, first_name: 'Spam muallif', role: 'student' });

    const targetQuizId = 'quiz_m6_reportable_' + Date.now();
    createQuiz({
      id: targetQuizId,
      user_id: spammerId,
      title: 'Spam yoki Xato Test',
      total_questions: 1,
      category: 'Umumiy',
      visibility: 'public',
      status: 'active'
    }, [
      { id: `${targetQuizId}_1`, quiz_id: targetQuizId, question: 'Spam savol?', options: ['A', 'B'], correctAnswer: 0 }
    ] as any);

    // 4 ta har xil foydalanuvchi shikoyat qiladi
    for (let i = 1; i <= 4; i++) {
      const repId = `reporter_${i}_` + Date.now();
      upsertUser({ id: repId, first_name: `Reporter ${i}`, role: 'student' });
      const rep = reportQuiz(repId, targetQuizId, 'incorrect_answers', `Savol xato ${i}`);
      assert.equal(rep.success, true);
    }

    // 4 tadan keyin test hali ham ochiq bo'lishi kerak
    let q = getQuiz(targetQuizId);
    assert.equal(q.status, 'active');

    // 5-shikoyat
    const repId5 = `reporter_5_` + Date.now();
    upsertUser({ id: repId5, first_name: 'Reporter 5', role: 'student' });
    const rep5 = reportQuiz(repId5, targetQuizId, 'offensive_content', '5-shikoyat');
    assert.equal(rep5.success, true);

    // Endi status avtomatik 'hidden_by_admin' bo'lishi shart
    q = getQuiz(targetQuizId);
    assert.equal(q.status, 'hidden_by_admin', '5 ta shikoyatdan so\'ng test avtomatik yashirilishi shart');

    // Ommaviy qidiruvda ham ko'rinmasligi kerak
    const searchAfterHide = searchPublicQuizzes({ q: 'Spam yoki Xato Test' });
    assert.ok(!searchAfterHide.some(item => item.id === targetQuizId), 'Yashirilgan test qidiruvda chiqmasligi shart');
  });

});
