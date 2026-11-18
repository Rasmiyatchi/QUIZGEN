# QUIZGEN v3 — Bosqichlar va Rivojlanish Hisoboti (PROGRESS.md)

## Bosqichlar Holati

| Bosqich | Tavsif | Holat | Git Branch |
| :--- | :--- | :--- | :--- |
| **M0** | **Xavfsizlik va Poydevor (S1–S14)** | **Yakunlandi** | `v3/m0-security` |
| **M1** | **Obuna Yadrosi & Entitlements Moduli** | **Yakunlandi** | `v3/m1-billing` |
| **M2** | **Admin Panel v1** | **Yakunlandi** | `v3/m2-admin` |
| **M3** | **To'lovlar (Payme, Click, Telegram, Chek)** | **Yakunlandi** | `v3/m3-payments` |
| **M4** | **Test Yaratish Yadrosi va HEMIS Parser v3** | **Yakunlandi** | `v3/m4-bot-creation` |
| **M5** | **Server Urinishlari, Yechish Tajribasi va Gamifikatsiya** | **Yakunlandi** | `v3/m5-attempts` |
| **M6** | **Kutubxona Moduli (Library, Public, Folders, Fork)** | **Yakunlandi** | `v3/m6-library` |
| **M7** | **Veb va Mini App Sayqali (Landing, /create, Profile, TMA SDK)** | **Yakunlandi** | `v3/m7-web-tma` |
| **M8** | Admin v2 & Xabarnoma | Navbatda | `v3/m8-admin-v2` |
| **M9** | Sifat, Yuklama & Ishga Tushirish | Kutilmoqda | `v3/m9-release` |

---

## M0 — Xavfsizlik Qabul Mezonlari (S1–S14) Tekshiruvi

- [x] **S1:** README.md va .env.example dan sirlar olib tashlandi, .env fayli `.gitignore` da himoyalangan.
- [x] **S2:** Serverda JWT sessiya joriy etildi (`createAccessToken`, `createRefreshToken`, `requireAuth`). `userId` klientdan olinmaydi, faqat `req.user.uid` dan olinadi.
- [x] **S3:** Demo auth tarmog'i faqat `NODE_ENV !== 'production' && ENABLE_DEMO_AUTH === 'true'` da ishlaydi, prod da yo'q.
- [x] **S4:** `/api/subscriptions/pay-demo` faqat test muhitida ruxsat etilgan.
- [x] **S5:** `completeOrder` bir xil buyurtmani qayta-qayta to'lashni bloklaydi (idempotent tekshiruv).
- [x] **S6:** AI kvotasi `req.user.uid` orqali tekshiriladi va yoziladi, anonim/soxta ID bilan AI kvotasini suiiste'mol qilib bo'lmaydi.
- [x] **S7:** Brauzer kirish tokeni `crypto.randomBytes(32)` bilan 64 xonali kriptografik xavfsiz hex token orqali generatsiya qilinadi.
- [x] **S8:** TMA `initData` serverda HMAC-SHA256 va `auth_date <= 24h` bilan tekshiriladi.
- [x] **S9:** TMA ochilganda boshqa akkaunt aniqlansa, eski `localStorage` tozalanadi.
- [x] **S10:** Imtihon rejimida to'g'ri javoblar klientga berilmaydi, ball faqat serverda hisoblanadi.
- [x] **S11:** `GET/PUT/DELETE /api/quizzes/:id` da egalik va `is_public` ruxsati serverda qat'iy tekshiriladi.
- [x] **S12:** Telegram bot xabarlarida `escapeHtml` orqali HTML in'ektsiya bartaraf etildi.
- [x] **S13:** Helmet, CORS, express-rate-limit va fayl magic-bytes tekshiruvi (.docx, .pdf, .txt) o'rnatildi.
- [x] **S14:** Productionda `express.static` faqat `dist/` papkasini xizmat qiladi, `.env` va `data/*.db` sizib chiqmaydi.

---

## M1 — Obuna Yadrosi va Entitlements Qabul Mezonlari (5.6) Tekshiruvi

- [x] **Yagona Haqiqat Manbai (entitlements):** Barcha ruxsatlar faqat `src/lib/entitlements.ts` moduli orqali serverda majburlanadi.
- [x] **Paywall (402):** Bepul foydalanuvchi Editor va Flashcards ga kirganda HTTP 402 oladi va Paywall ko'radi. Pro obunada darhol to'liq ochiladi.
- [x] **AI Kvotasi:** Bepulda kuniga 3 ta, Start da 10 ta, Pro da 50 ta, Master da 300 ta. Limit tugaganda 402 QUOTA_EXCEEDED qaytariladi.
- [x] **Obuna Hayot Sikli:**
  - Bir xil tarifni qayta olish: muddat mavjud `expires_at` ustiga qo'shiladi.
  - Upgrade: Start foydalanuvchisi Pro olsa, qolgan kunlar qiymati yangi tarifga bonus kun qilib hisoblanadi.
  - Downgrade: Master foydalanuvchi Start olsa, yuqori tarif pasaytirilmaydi va yangi tarif `scheduled` navbatga qo'yiladi.
- [x] **Avtomatik Cron:** `checkAndExpireSubscriptions()` har soatda tugagan obunalarni `expired` qiladi va navbatdagi `scheduled` obunalarni faollashtiradi.

---

## M2 — Admin Panel v1 Qabul Mezonlari (TZ 6-bo'lim) Tekshiruvi

- [x] **Xavfsiz Kirish (`requireAdmin`):** Faqat `admin` va `superadmin` rollariga ruxsat beriladi. Oddiy `student` foydalanuvchilariga HTTP 403 Forbidden qaytariladi va brauzerda maxsus xavfsizlik ekrani ko'rsatiladi.
- [x] **Dashboard Ko'rsatkichlari (`GET /api/admin/stats`):** Jami foydalanuvchilar, testlar, urinishlar, buyurtmalar, jami tushum (so'm) va har bir tarif bo'yicha faol obunachilar soni real vaqtda hisoblanadi.
- [x] **Foydalanuvchilar Boshqaruvi (`GET /api/admin/users`, `GET /api/admin/users/:id`):** Foydalanuvchilarni ismi va username bo'yicha qidirish, ularning obunasi, yaratgan testlari, urinishlari va buyurtmalari to'liq ko'rinadi.
- [x] **Obuna Taqdim Etish va Uzaytirish (`POST /api/admin/users/:id/subscription`):** Admin istalgan foydalanuvchiga tarif va kun tanlab obuna bera oladi. Sabab (audit reason) majburiy kiritiladi va foydalanuvchiga Telegramda shaxsiy tabrik xabari yuboriladi.
- [x] **Obunani Bekor Qilish (`POST /api/admin/users/:id/cancel-subscription`):** Admin faol obunani bekor qilib, foydalanuvchini bepul tarifga qaytara oladi.
- [x] **Audit Jurnali (`GET /api/admin/audit`):** Barcha admin harakatlari (`grant_subscription`, `cancel_subscription`, `grant_via_bot`, `revoke_via_bot`) bajaruvchi ID, nishon ID va parametrlar bilan audit jadvalida mustahkam qayd etiladi.
- [x] **Telegram Bot Admin Buyruqlari:** `/admin`, `/stats`, `/grant <userId> <plan> [kun]`, `/revoke <userId>` buyruqlari faqat `ADMIN_TELEGRAM_IDS` ro'yxatidagi adminlar uchun ishlaydi.
- [x] **UI & Qoidalar:** `alert()` / `confirm()` o'rniga zamonaviy Glass modal komponentlari ishlatildi (Rule 8). Navbar da admin foydalanuvchiga maxsus "Admin Panel" tugmasi paydo bo'ladi.
- [x] **Avtomatlashgan Testlar:** `tests/m2-admin.test.ts` da barcha rollar, admin statistikasi, qidiruv, obuna berish, bekor qilish va audit log tekshiruvlari 100% muvaffaqiyatli o'tdi.

---

## M3 — To'lovlar (Payme, Click, Telegram, Chek) Qabul Mezonlari Tekshiruvi

- [x] **Click Shop API Integratsiyasi:**
  - `POST /api/payments/click` va `prepare`, `complete` so'rovlari to'liq joriy etildi.
  - MD5 imzo generatsiyasi va tekshiruvi (`click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time`).
  - Standart xato kodlari (0, -1, -2, -4, -5, -6, -7, -8, -9) va idempotent takroriy so'rovlar himoyasi.
- [x] **Payme Merchant API Integratsiyasi:**
  - `POST /api/payments/payme` JSON-RPC 2.0 protokoli.
  - HTTP Basic Auth (`Paycom:PAYME_KEY`) tekshiruvi.
  - Barcha talab qilingan metodlar: `CheckPerformTransaction`, `CreateTransaction`, `PerformTransaction`, `CancelTransaction`, `CheckTransaction`, `GetStatement`.
  - Tiyin hisob-kitobi (1 so'm = 100 tiyin) va 12 soatlik tranzaksiya taym-auti.
- [x] **Qo'lda To'lov (Bank Kartasi va Chek Yuklash):**
  - Karta raqami va rekvizitlar (`MANUAL_PAYMENT_CONFIG`).
  - Chek rasmini yuklash (`POST /api/orders/:id/proof`) va magic-bytes tekshiruvi (.jpg, .png, .webp).
  - Telegram bot orqali adminga inline tugmalar (`[✅ Tasdiqlash]`, `[❌ Rad etish]`) bilan bir zumda bildirishnoma yuborish.
  - Admin panel va botdan chekni tasdiqlash/rad etish oqimi.
- [x] **Huquqiy Sahifalar (Legal Pages):**
  - `/oferta` — Ommaviy oferta (rasmiy shartnoma).
  - `/privacy` — Maxfiylik siyosati (shaxsiy ma'lumotlar xavfsizligi).
  - `/refund` — To'lovni qaytarish siyosati (7 kunlik to'liq qaytarish kafolati).
  - `/contacts` — Bog'lanish, qo'llab-quvvatlash va rekvizitlar.
  - Barcha huquqiy sahifalar `Pricing.tsx` tagida va mustaqil URL larda barcha uchun ochiq.
- [x] **Avtomatlashgan Testlar:**
  - `tests/m3-payments.test.ts` da 8 ta unit va integratsiya testlari (Click imzo, Click prepare/complete, Payme auth, Payme RPC, Qo'lda to'lov tasdiqlash, to'lov URL generatsiyasi) 100% muvaffaqiyatli o'tdi.




---

## M4 — Test Yaratish Yadrosi va HEMIS Parser v3 Qabul Mezonlari Tekshiruvi

- [x] **Yagona Test Yaratish Servisi (`QuizCreationService`):**
  - Qoida 5: Web va Telegram bot bitta yagona servis orqali test yaratadi (`createFromFile`, `createFromText`, `createFromAi`, `createManual`).
  - Fayl magic bytes tekshiruvi (.docx, .pdf, .txt) va xavfsiz matn ajratish (`extractTextFromFile`).
  - Foydalanuvchi tarifi bo'yicha testdagi maksimal savollar cheklovi (Free: 100, Start: 150, Pro: 300, Master: 1000).
- [x] **HEMIS Parser v3 (`parseHemisQuizWithReport`):**
  - Format A (Simvolli format: ++++ va ====) to'liq qo'llab-quvvatlanadi.
  - Format B (Raqamlangan format: 1. ... A) B) C) D) va Javob: A) to'liq qo'llab-quvvatlanadi.
  - Mammoth DOCX HTML strong/bold/underline orqali to'g'ri javoblarni avtomatik aniqlash (`preprocessHtmlDocx`).
  - `needsReview` va ogohlantirishlar tizimi (`ParseReport`): to'g'ri javobi belgilanmagan savollar jimgina o'tkazib yuborilmaydi yoki yolg'on "A" qilib olinmaydi.
- [x] **Telegram Bot Integratsiyasi:**
  - Botga `.docx` yoki `.txt` fayl yuborilganda `QuizCreationService.createFromFile` orqali bir zumda test yaratiladi.
  - Tahlil hisoboti (`ParseReport`) va inline tugmalar (`[▶️ Testni boshlash]`, `[🃏 Flashcards]`, `[✏️ Tahrirlash]`) taqdim etiladi.
- [x] **Avtomatlashgan Testlar:**
  - `tests/m4-parser.test.ts` da 6/6 test 100% muvaffaqiyatli o'tdi.

---

## M5 — Server Urinishlari, Yechish Tajribasi va Gamifikatsiya Qabul Mezonlari Tekshiruvi

- [x] **Server Nazoratidagi Urinishlar (TZ 8.5):**
  - `POST /api/attempts` (quizId, mode) — serverda urinish (`in_progress`) yaratiladi, savollar to'g'ri javoblarsiz tozalanadi (S10: to'g'ri javoblar tarmoqqa sizmaydi).
  - Imtihon rejimida server taymeri (`deadline_at`) hisoblanadi.
- [x] **Boshqa Qurilmadan Davom Ettirish (Resume):**
  - `GET /api/attempts/active/:quizId` — foydalanuvchining tugallanmagan urinishi, oraliq javoblari va qolgan vaqti avtomatik yuklanadi.
  - `PUT /api/attempts/:id/answers` — oraliq javoblarni batch saqlash, brauzer yopilsa yoki internet uzilsa ham javoblar yo'qolmaydi.
- [x] **O'rganish Rejimi (Study Mode):**
  - `POST /api/attempts/:id/answer` — har bir savol tanlanganda serverdan darhol `{ isCorrect, correctAnswer, explanation }` olinadi va tushuntirish banneri ko'rsatiladi.
- [x] **Urinishni Yakunlash (Finish) va Server Ball Hisobi:**
  - `POST /api/attempts/:id/finish` — server ballni, foizni va xato savollar ro'yxatini (`wrong_questions`) to'liq hisoblaydi va saqlaydi.
  - Urinish holati `completed` qilinadi, Telegram orqali natija xabarnomasi yuboriladi.
- [x] **Xatolar Ustida Ishlash (`mode: 'retry_wrong'`):**
  - Serverdagi oldingi urinishning `wrong_questions` ma'lumotlaridan yangi urinish yaratiladi (localStorage ga bog'liq emas).
- [x] **Taymer Stale Closure Xatosi Tuzatildi:**
  - `answersRef` va `timeSpentRef` orqali taymer tugaganda eng so'nggi javoblar serverga yo'qotishlarsiz yuboriladi.
- [x] **Haqiqiy Gamifikatsiya (Real XP va Streak):**
  - `users` jadvalida `streak_days`, `streak_updated_on` va `xp` ustunlari.
  - Har bir topshirilgan test uchun XP va ketma-ket kunlar (streak) serverda hisoblanadi.
  - `GET /api/users/me/stats` — shaxsiy statistika, darajalar (`Yangi talaba`, `Izlanuvchi`, `Faol talaba`, `Bilimdon`, `Usta`, `Grand Master`).
  - `GET /api/quizzes/:id/leaderboard` — test bo'yicha reyting (leaderboard).
  - Navbar da va History sahifasida haqiqiy streak va XP ko'rsatiladi.
- [x] **UI Qoidalari (Rule 8):**
  - `alert()` va `window.confirm()` butunlay yo'q qilindi, Glass tasdiqlash modallari o'rnatildi.
- [x] **Avtomatlashgan Testlar:**
  - `tests/m5-attempts.test.ts` da 5/5 test 100% muvaffaqiyatli o'tdi.

---

## M6 — Test Kutubxonasi Moduli (Library, Public, Folders, Fork, Reports) Qabul Mezonlari Tekshiruvi

- [x] **Ommaviy Qidiruv va Filtrlash (TZ 7-bo'lim):**
  - `GET /api/library/public` — qidiruv so'zi (`q`), kategoriya (`category`), va saralash (`sort: popular | newest | questions`).
  - Kategoriya bo'yicha saralash: Umumiy, Tibbiyot, Iqtisodiyot, Axborot texnologiyalari, Huquq, Tillar, Aniq fanlar, Ijtimoiy fanlar.
  - `GET /api/library/featured` — tanlangan (tavsiya etilgan) testlar banneri.
- [x] **Shaxsiy va Saqlangan Testlar Boshqaruvi:**
  - `GET /api/library/mine` — foydalanuvchining shaxsiy yaratgan testlari.
  - `GET /api/library/saved` — saqlangan testlar ro'yxati (jild bo'yicha filtrlash imkoni bilan).
  - `POST /api/library/saved/:quizId` va `DELETE /api/library/saved/:quizId` — testni kutubxonaga saqlash va olib tashlash.
  - Tarif bo'yicha limitlar (`library_saves`): Free: 20 ta, Start: 50 ta, Pro: 200 ta, Master: cheksiz.
  - `GET /api/library/recent` — yaqinda ishlangan testlar va oxirgi natijalar.
- [x] **Jildlar (Folders) Boshqaruvi:**
  - `library_folders` jadvali va ranglar (`color`).
  - `POST /api/library/folders`, `GET /api/library/folders`, `DELETE /api/library/folders/:id`.
  - Jild o'chirilganda undagi saqlangan testlar o'chib ketmaydi (`folder_id = NULL`).
- [x] **Testdan Mustaqil Nusxa Olish (Fork):**
  - `POST /api/quizzes/:id/fork` — test savollari bilan birga yangi unikal identifikatorlar bilan klonlanadi, `forked_from` original testga bog'lanadi, ko'rishlar soni 0 ga qaytariladi.
- [x] **Moderatsiya va Shikoyatlar (Reports):**
  - `POST /api/quizzes/:id/report` — sabablar (`incorrect_answers`, `offensive_content`, `copyright`, `spam`, `other`) bilan shikoyat qilish.
  - 5 ta shikoyatdan so'ng test holati avtomatik ravishda `status = 'hidden_by_admin'` qilinadi va ommaviy qidiruvdan yo'qoladi.
- [x] **Frontend Sahifalar va Navigatsiya:**
  - `src/pages/Library.tsx` — tablar (Ommaviy, Saqlanganlar, Mening testlarim, Yaqinda), qidiruv debouncing, jild yaratish modali, ulashish modali, shikoyat qilish modali, toast xabarnomalar.
  - `src/pages/PublicQuiz.tsx` (`/q/:slug`) — ochiq test sahifasi, metadata, eng yaxshi natijalar (top-5 leaderboard), testni boshlash va ulashish tugmalari.
  - `FloatingBottomNav` va `Navbar.tsx` da "Kutubxona" havolasi qo'shildi.
- [x] **Telegram Bot Integratsiyasi:**
  - Bot Inline Query (`@QuizGenBot <qidiruv>`) orqali har qanday chatda testlarni qidirish va ulashish.
  - Deep-link (`/start quiz_<slugOrId>`) orqali test kartochkasini ochish va TMA orqali ishga tushirish.
- [x] **Avtomatlashgan Testlar:**
  - `tests/m6-library.test.ts` da 6/6 test 100% muvaffaqiyatli o'tdi.
  - Barcha testlar to'plami: **45/45 test muvaffaqiyatli (M0–M6)**.

---

## M7 — Veb va Mini App Sayqali Qabul Mezonlari (TZ 9-bo'lim) Tekshiruvi

- [x] **Mehmonlar uchun Landing Page (`/`):**
  - Tizimga kirmagan tashrif buyuruvchilar uchun konversion va zamonaviy `Landing.tsx` sahifasi.
  - Sarlavha: "HEMIS testlarini soniyalarda onlayn testga aylantiring", 3 qadam (Fayl yuklash -> Testga aylanish -> Yechish va natija).
  - CTA tugmalari: Telegram orqali boshlash (`/login`), Ommaviy Kutubxona (`/library`), Botga o'tish.
  - 4 ta asosiy afzallik, tariflar qisqacha ko'rinishi, FAQ akordeoni va huquqiy havolalar bilan to'liq footer.
  - Agar foydalanuvchi tizimga kirgan bo'lsa, avtomatik ravishda shaxsiy boshqaruv paneli (Dashboard) ochiladi.
- [x] **Test Yaratish Ustasi (`/create`):**
  - Bot bilan bir xil 4 ta rejim:
    1. 📁 **Fayl yuklash:** `.docx`, `.pdf`, `.txt` drag & drop yuklash, progress, `ParseReport` ogohlantirishlari.
    2. 📝 **Matndan:** HEMIS formatidagi xom matnni to'g'ridan-to'g'ri joylash.
    3. ✨ **Gemini AI:** Mavzu, savollar soni (5–20 ta), qiyinlik darajasi (Oson, O'rtacha, Qiyin), qo'shimcha konspekt kiritish.
    4. ✍️ **Qo'lda:** Savolma-savol tuzish, variantlar, to'g'ri javobni radio-tugma bilan belgilash.
  - Muvaffaqiyatli yaratilgandan so'ng testni darhol boshlash, flashcardlar yoki muharrirga o'tish tugmalari.
- [x] **Foydalanuvchi Profili va Sozlamalar (`/profile`):**
  - Avatar, ism, Telegram ID, username, rol, obuna holati, qolgan kunlar.
  - Haqiqiy gamifikatsiya ko'rsatkichlari: XP progress-bar, daraja (`rank_title`), ketma-ket kunlar (`streak_days`).
  - Topshirilgan testlar soni, o'rtacha ball, eng yuqori ball, yaratilgan testlar soni.
  - Tezkor havolalar (Kutubxonam, Urinishlar tarixi) va tizimdan chiqish.
- [x] **Telegram Mini App (TMA) SDK Integratsiyasi:**
  - `src/lib/telegram-tma.ts`: `initTMA()`, `setClosingConfirmation()`, `triggerHaptic()`, `setBackButton()`, `setMainButton()`.
  - Imtihon jarayonida sahifadan tasodifan chiqib ketishning oldini olish (`enableClosingConfirmation()`).
  - Javob tanlanganda va tekshirilganda Haptic Feedback (tebranish: `selection`, `notification(success/error)`).
  - Replay attack xavfsizligi (S8): `auth_date` 24 soatdan eski bo'lsa serverda qat'iy rad etiladi.
- [x] **Xatoliklar va 404 Boshqaruvi:**
  - `src/components/ErrorBoundary.tsx` — kutilmagan render xatoliklarini ushlaydi va ilova o'chib qolishining oldini oladi.
  - `src/pages/NotFound.tsx` — mavjud bo'lmagan yo'llar uchun zamonaviy 404 sahifa.
- [x] **Avtomatlashgan Testlar:**
  - `tests/m7-web-tma.test.ts` da 4/4 test 100% muvaffaqiyatli o'tdi.
  - Barcha testlar to'plami: **49/49 test muvaffaqiyatli (M0–M7)**.
