# QUIZGEN v3 — Bosqichlar va Rivojlanish Hisoboti (PROGRESS.md)

## Bosqichlar Holati

| Bosqich | Tavsif | Holat | Git Branch |
| :--- | :--- | :--- | :--- |
| **M0** | **Xavfsizlik va Poydevor (S1–S14)** | **Yakunlandi** | `v3/m0-security` |
| **M1** | **Obuna Yadrosi & Entitlements Moduli** | **Yakunlandi** | `v3/m1-billing` |
| **M2** | **Admin Panel v1** | **Yakunlandi** | `v3/m2-admin` |
| **M3** | To'lovlar (Payme, Click, Telegram) | Navbatda | `v3/m3-payments` |
| **M4** | Test Yaratish Yadrosi va Bot (grammY) | Kutilmoqda | `v3/m4-bot-creation` |
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


