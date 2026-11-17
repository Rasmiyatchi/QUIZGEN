# QUIZGEN v3 — Arxitektura va Texnik Qarorlar (DECISIONS.md)

Ushbu hujjat TZ talablariga muvofiq qabul qilingan barcha texnik va xavfsizlik qarorlarini qayd etadi.

## [DEC-001] M0: JWT Sessiya va Autentifikatsiya Arxitekturasi
- **Muammo (S2, S8, S9):** Eski tizimda server sessiyasi yo'q edi. `userId` so'rov tanasidan ishonib olinar va IDOR xavfi mavjud edi.
- **Qaror:**
  - Access token: 15 daqiqalik qisqa muddatli JWT (`uid`, `role`, `plan`).
  - Refresh token: 30 kunlik JWT, serverda `httpOnly`, `Secure`, `SameSite=Lax` cookie ichida saqlanadi.
  - TMA ichida har ochilishda `initData` serverga yuborilib HMAC-SHA256 va `auth_date <= 24h` tekshiriladi.
  - TMA da `initData.user.id` localStorage dagi eski `uid` dan farq qilsa, eski kesh tozalanadi.
- **Natija:** Barcha API larda `userId` faqat `req.user.uid` dan olinadi. Soxta `userId` yuborish imkonsiz.

## [DEC-002] M0: Server Tomonida Ball Hisoblash va To'g'ri Javoblar Himoyasi
- **Muammo (S10):** To'g'ri javoblar test boshida klientga to'liq yuborilar va ball klientda hisoblanar edi.
- **Qaror:**
  - Imtihon rejimida (`GET /api/quizzes/:id`) savollar tarkibidagi `correctAnswer` butunlay olib tashlanadi.
  - Faqat o'rganish rejimida yoki test egasi ko'rganda `correctAnswer` taqdim etiladi.
  - Test topshirilganda (`POST /api/attempts`), klient faqat `answersGiven` (tanlangan variantlar indekslari) ni yuboradi.
  - Ball, foiz va to'g'ri/noto'g'ri tahlili faqat server ma'lumotlar bazasidagi haqiqiy savollar bilan solishtirilib hisoblanadi.

## [DEC-003] M0: Buyurtmalar Idempotentligi va To'lovlar Xavfsizligi
- **Muammo (S4, S5):** Demo to'lov productionda ochiq edi va `completeOrder` bir xil buyurtmani cheksiz marta bajarishi mumkin edi.
- **Qaror:**
  - `completeOrder` atomik holat tekshiruviga ega: agar `order.status === 'completed'` bo'lsa, qayta to'lov qat'iyan rad etiladi.
  - Pastroq tarif sotib olinganda yuqori tarif pastga tushirilmaydi; yuqori tarif saqlanib, muddat qo'shiladi.
  - Demo to'lov va demo kirish faqat `NODE_ENV !== 'production' && ENABLE_DEMO_AUTH === 'true'` bo'lganda faollashadi.

## [DEC-004] M0: Kriptografik Xavfsiz Telegram Deep-Link Kirish
- **Muammo (S7):** 8 xonali `Math.random` kodi phishing hujumlariga ochiq edi.
- **Qaror:**
  - `crypto.randomBytes(32).toString('hex')` orqali 64 xonali kriptorafik xavfsiz token yaratiladi.
  - Token muddati 10 daqiqa.
  - Tasdiqlash faqat botdagi tugma orqali bajariladi, kodni qo'lda yozish olib tashlandi.

## [DEC-005] M0: Xavfsizlik Infratuzilmasi
- **Muammo (S1, S12, S13, S14):** Helmet, rate limiting, magic bytes yo'q edi. Botda HTML in'ektsiya, productionda root fayllar ochiq edi.
- **Qaror:**
  - Helmet HTTP xavfsizlik sarlavhalari ulandi.
  - Rate limit: auth uchun soatiga 20 ta, AI uchun daqiqasiga 5 ta, umumiy API uchun 15 daqiqada 200 ta.
  - Fayl yuklashda magic bytes tekshiruvi (.docx: PK\x03\x04, .pdf: %PDF, .txt: UTF-8).
  - Telegram bot xabarlarida `escapeHtml` majburiy qilindi.
  - Production static: faqat `dist/` papkasi ko'rsatiladi, `.env` va `data/` ochiq bo'lmaydi.
