# QUIZGEN v3 — Bosqichlar va Rivojlanish Hisoboti (PROGRESS.md)

## Bosqichlar Holati

| Bosqich | Tavsif | Holat | Git Branch |
| :--- | :--- | :--- | :--- |
| **M0** | **Xavfsizlik va Poydevor (S1–S14)** | **Yakunlandi** | `v3/m0-security` |
| **M1** | Obuna Yadrosi & PostgreSQL Migratsiya | Navbatda | `v3/m1-billing` |
| **M2** | Admin Panel v1 | Kutilmoqda | `v3/m2-admin` |
| **M3** | To'lovlar (Payme, Click, Telegram) | Kutilmoqda | `v3/m3-payments` |
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
