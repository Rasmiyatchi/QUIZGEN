# QUIZGEN v3 — Bosqichlar va Rivojlanish Hisoboti (PROGRESS.md)

## Bosqichlar Holati

| Bosqich | Tavsif | Holat | Git Branch |
| :--- | :--- | :--- | :--- |
| **M0** | **Xavfsizlik va Poydevor (S1–S14)** | **Yakunlandi** | `v3/m0-security` |
| **M1** | **Obuna Yadrosi & Entitlements Moduli** | **Yakunlandi** | `v3/m1-billing` |
| **M2** | **Admin Panel v1** | **Yakunlandi** | `v3/m2-admin` |
| **M3** | **To'lovlar (Payme, Click, Telegram, Chek)** | **Yakunlandi** | `v3/m3-payments` |
| **M4** | Test Yaratish Yadrosi va Bot (grammY) | Navbatda | `v3/m4-bot-creation` |
| **M5** | Server Urinishlari & Natijalar Tahlili | Kutilmoqda | `v3/m5-attempts` |
| **M6** | Kutubxona Moduli (Library) | Kutilmoqda | `v3/m6-library` |
| **M7** | Veb va Mini App Sayqali | Kutilmoqda | `v3/m7-web-tma` |
| **M8** | Admin v2 & Xabarnoma | Kutilmoqda | `v3/m8-admin-v2` |
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
