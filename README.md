# ⚡ QUIZGEN v3 — Professional HEMIS, AI & Telegram Test Platformasi

<div align="center">

![QUIZGEN Banner](https://img.shields.io/badge/QUIZGEN-v3.0.0-blue?style=for-the-badge&logo=telegram)
![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-22.x-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-19-cyan?style=for-the-badge&logo=react)
![SQLite WAL](https://img.shields.io/badge/Database-SQLite%20WAL-lightgrey?style=for-the-badge&logo=sqlite)
![Tests](https://img.shields.io/badge/Tests-59%2F59%20Passing-success?style=for-the-badge)

**O'zbekiston OTMlarining HEMIS test fayllarini 0 AI sarfi bilan tahlil qiluvchi, Google Gemini 2.5 Flash sun'iy intellekti, 3D Flashcardlar, Test Muharriri, Ommaviy Test Kutubxonasi, 3-bosqichli Obuna (Click, Payme, Manual Chek) va Telegram WebApp (TMA) ga ega to'liq xavfsiz ta'lim ekotizimi.**

</div>

---

## 🌟 Ekotizim Imkoniyatlari

### 1. ⚡ HEMIS Parser v3 (0 AI Xarajat, 100% Bepul va Aniq)
* **Format A (Simvolli):** `++++` savollar ajratuvchisi, `====` variantlar ajratuvchisi, `#` to'g'ri javob belgisi.
* **Format B (Raqamlangan):** `1. Savol... A) ... B) ... C) ... D) ... Javob: A` (yoki `#A)`).
* **HTML/Word Tahlili:** Word hujjatlaridagi qalin (`strong`, `b`) yoki tagiga chizilgan (`u`) to'g'ri javoblarni avtomatik aniqlaydi.
* **Tahlil Hisoboti (`ParseReport`):** To'g'ri javobi belgilanmagan savollar jimgina o'tkazib yuborilmaydi yoki soxta qilib olinmaydi, moderator va foydalanuvchiga ogohlantirish beriladi.

### 2. 🔐 Yuqori Xavfsizlik va Arxitektura (M0–M3)
* **Sessiyalar:** Kriptografik xavfsiz JWT (Access + Refresh tokenlar) va HttpOnly xavfsizlik.
* **TMA Autentifikatsiyasi:** Telegram `initData` HMAC-SHA256 imzosi serverda tekshiriladi; `auth_date` 24 soatdan eski soxta so'rovlar qat'iy rad etiladi (Replay attack himoyasi).
* **Imtihon Himoyasi (S10):** To'g'ri javoblar test yechish paytida klientga yuborilmaydi; ballar va natijalar faqat serverda hisoblanadi.
* **Fayl Himoyasi:** Magic-bytes tekshiruvi (faqat haqiqiy DOCX, PDF, TXT qabul qilinadi).

### 3. 💎 3-Bosqichli Obuna va To'lovlar
* 🥉 **Talaba Start — 7 999 so'm** (7 kun, oraliq/yakuniy nazorat haftaligi uchun).
* 🥈 **Sessiya Pro — 29 999 so'm** (30 kun, 3D Flashcards, Test Muharriri, kunlik 50 ta AI test).
* 🥇 **Grand Master — 59 900 so'm** (90 kun, cheksiz testlar, ommaviy kutubxona jildlari, eksportlar).
* **To'lov usullari:** Click Shop API, Payme JSON-RPC 2.0, Qo'lda to'lov (Karta orqali kassa chekini yuklash va admin tasdig'i).
* **Promokodlar:** Foizli chegirma, qat'iy chegirma va bepul kunlar beruvchi vaucherlar.

### 4. 📚 Ommaviy Test Kutubxonasi va Gamifikatsiya (M5–M6)
* Ommaviy testlarni qidirish, kategoriyalar bo'yicha saralash, o'z kutubxonasiga saqlash.
* Testlardan mustaqil nusxa olish (**Fork**).
* Haqiqiy Gamifikatsiya: Test topshirish, to'g'ri javoblar orqali **XP** yig'ish, darajalar (**Rank**) va ketma-ket o'qish kunlari (**Streak**).
* Testlar bo'yicha peshqadamlar jadvali (**Leaderboard**).

### 5. 🛡️ Admin Panel v2 (M8)
* Foydalanuvchilar, rollar va obunalar boshqaruvi.
* Foydalanuvchilarni bloklash (`ban`) va blokdan chiqarish (`unban`).
* Ommaviy obuna berish (**Bulk Grant**).
* Shikoyat qilingan testlar moderatsiyasi navbati (**Report Queue**).
* Segmentlangan ommaviy xabarnomalar (**Broadcasts**).
* Foydalanuvchilar va testlar ro'yxatini CSV formatida yuklab olish.

---

## 🛠 Texnologiyalar Steki

* **Frontend:** React 19, Vite 6, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
* **Backend:** Node.js 22, Express 4, TypeScript (`tsx`).
* **Ma'lumotlar bazasi:** SQLite (`node:sqlite` DatabaseSync) WAL (Write-Ahead Logging) rejimida.
* **Hujjatlarni o'qish:** `mammoth` (.docx), `pdf-parse` (.pdf).
* **AI:** Google Gen AI SDK (`@google/genai` — Gemini 2.5 Flash).
* **Telegram Bot:** Telegram Bot API (Long polling daemon, deep-linklar, inline query, TMA).

---

## 🚀 Ishga Tushirish (Quick Start)

### 1. Repozitoriyni klonlash
```bash
git clone https://github.com/Rasmiyatchi/QUIZGEN.git
cd QUIZGEN
```

### 2. Kutubxonalarni o'rnatish
```bash
npm install
```

### 3. Muhit o'zgaruvchilari (.env)
`.env.example` faylidan nusxa olib `.env` yarating:
```bash
cp .env.example .env
```
`.env` fayliga o'zingizning Telegram bot tokeningiz va JWT kalitlaringizni kiriting.

### 4. Dasturni ishga tushirish (Development)
```bash
npm run dev
```
Brauzerda oching: `http://localhost:3000`

### 5. Ishlab chiqarish (Production Build & Run)
```bash
npm run build
npm start
```

---

## 🐳 Docker orqali Ishga Tushirish

QUIZGEN v3 multi-stage Docker konteynerida to'liq izolyatsiyalangan holda ishlaydi:

```bash
# Konteynerni yig'ish va fonda ishga tushirish
docker compose up -d --build

# Loglarni ko'rish
docker compose logs -f
```

---

## 🧪 Avtomatlashtirilgan Testlar (Quality Assurance)

Loyihada 10 ta maxsus test to'plami mavjud:

```bash
# Barcha testlarni ketma-ket ishga tushirish
npx tsx --test --test-concurrency=1 tests/*.test.ts
```

| Modul | Tavsif | Natija |
|---|---|:---:|
| `tests/m0-security.test.ts` | S1–S14 xavfsizlik va kriptografiya | ✅ 9/9 |
| `tests/m1-entitlements.test.ts` | Obuna yadrosi, tarif huquqlari va kvotalar | ✅ 6/6 |
| `tests/m2-admin.test.ts` | Admin v1, rollar va audit jurnali | ✅ 5/5 |
| `tests/m3-payments.test.ts` | Click, Payme va Karta cheklari to'lovlari | ✅ 8/8 |
| `tests/m4-parser.test.ts` | HEMIS Parser v3 va DOCX HTML tahlili | ✅ 6/6 |
| `tests/m5-attempts.test.ts` | Server urinishlari, taymer, ballar va XP | ✅ 5/5 |
| `tests/m6-library.test.ts` | Kutubxona, qidiruv, jildlar, fork va shikoyatlar | ✅ 6/6 |
| `tests/m7-web-tma.test.ts` | Landing, test yaratish ustasi, profil va TMA | ✅ 4/4 |
| `tests/m8-admin-v2.test.ts` | Admin v2, bulk grant, ban, promo va CSV | ✅ 6/6 |
| `tests/m9-release.test.ts` | E2E to'liq tsikl va tizim zaxirasi tekshiruvi | ✅ 4/4 |
| **JAMI** | **M0 — M9 To'liq Kafolatlangan Qamrov** | **✅ 59/59 (100%)** |

---

## 💾 Ma'lumotlar Bazasini Zaxiralash (Backup)

SQLite bazasining xavfsiz va yaxlit nusxasini yaratish uchun:

```bash
npx tsx scripts/backup.ts
```
Zaxira nusxalari `./data/backups/` katalogida vaqt tamg'asi bilan saqlanadi va eski nusxalar (14 kundan oshgan) avtomatik tozalanadi.

---

## ⚖️ Litsenziya

MIT License © 2026 QUIZGEN Team.
