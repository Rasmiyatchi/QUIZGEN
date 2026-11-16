# ⚡ QUIZGEN v2 — HEMIS, AI & Telegram Test Platformasi

<div align="center">

![QUIZGEN Banner](https://img.shields.io/badge/QUIZGEN-v2.0.0-blue?style=for-the-badge&logo=telegram)
![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-22.x-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-19-cyan?style=for-the-badge&logo=react)
![SQLite](https://img.shields.io/badge/Database-SQLite-lightgrey?style=for-the-badge&logo=sqlite)

**O'zbekiston OTMlarining HEMIS test fayllarini 0 AI sarfi bilan bepul tahlil qiluvchi, Google Gemini 2.5 Flash sun'iy intellekti, 3D Flashcardlar, Test Muharriri va 3-bosqichli Premium obuna tizimiga ega to'liq Telegram WebApp va Veb platforma.**

</div>

---

## 🌟 Asosiy Imkoniyatlar

### 1. ⚡ HEMIS Avtomatik Tahlil Modeli (0 AI Xarajat, 100% Bepul)
* OTM HEMIS test hujjatlari (`.docx`, `.pdf`, `.txt`) uchun sun'iy intellekt API kaliti umuman talab qilinmaydi.
* **1-Shablon (Simvolli):** `++++` savollar ajratuvchisi, `====` variantlar ajratuvchisi, `#` to'g'ri javob belgisi.
* **2-Shablon (Raqamlangan):** `1. Savol... A) ... B) ... C) ... D) ... Javob: A` (yoki `#A)`).
* 0.05 soniyada yuzlab savollarni xatosiz, oflayn rejimda testga aylantiradi.

### 2. 🤖 Google Gemini 2.5 Flash Sun'iy Intellekti
* Erkin kitob, ma'ruza matnlari va konspektlardan sifatli 4 variantli testlar tuzish.
* OpenAI API'dan to'liq voz kechilgan — Google AI Studio'ning tekin Gemini kaliti ishlatiladi.

### 3. 🔐 Qat'iy Telegram Orqali Kirish (Strict Telegram Auth)
* Saytda ortiqcha login/parol talab qilinmaydi.
* **Telegram Mini App (TMA):** Telegram ichidan ochilganda 0 soniyada avtomatik ro'yxatdan o'tadi va kiradi.
* **Brauzer / Kompyuter:** Saytda "Telegram orqali 1 bosishda kirish" bosiladi (`t.me/quizgenrobot?start=login_TOKEN`) yoki 8 xonali kod botga yuborilishi bilanoq sayt avtomatik profilga kiradi.

### 4. 💎 3-Bosqichli Obuna va To'lov Tizimi (Tariflar)
* 🥉 **Talaba Start — 7 999 so'm** (7 kunlik oraliq/yakuniy nazorat haftaligi uchun).
* 🥈 **Sessiya Pro — 29 999 so'm** (30 kunlik sessiya tayyorgarligi, cheksiz HEMIS, kuniga 50 ta AI test, 3D Flashcards, Test muharriri).
* 🥇 **Grand Master — 59 900 so'm** (90 kunlik semestr, mutlaqo CHEKSIZ AI testlar, guruhlarga havola ulashish, barcha eksportlar).
* Click, Payme va Tezkor Sinov To'lovi (Demo) to'liq ishlaydi.

### 5. 🎴 3D Interaktiv Flashcardlar & Test Muharriri
* **3D Flashcards:** Savollarni xotirada mustahkamlash uchun 3D fazoda aylanuvchi kartalar, klaviatura strelkalari va o'zlashtirish indikatori.
* **Test Muharriri (Editor):** HEMIS testidagi istalgan savolni tahrirlash, yangi savol qo'shish va qayta HEMIS `.txt` formatida yuklab olish.
* **O'rganish vs Imtihon rejimi:** Taymer, Savollar xaritasi (Question Palette) va natijada rang-barang konfetti hamda medallar.

### 6. 🗄️ Mahalliy SQLite Ma'lumotlar Bazasi
* Firebase butkul olib tashlangan.
* Ma'lumotlar `data/quizgen.db` (SQLite) faylida doimiy va ishonchli saqlanadi.

---

## 🛠 Texnologiyalar Steki

* **Frontend:** React 19, Vite 6, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
* **Backend:** Node.js 22, Express, TypeScript (`tsx`).
* **Ma'lumotlar bazasi:** SQLite (`node:sqlite` / `DatabaseSync`).
* **Hujjatlarni o'qish:** `mammoth` (.docx), `pdf-parse` v2 (.pdf).
* **AI:** Google Gen AI SDK (`@google/genai` - Gemini 2.5 Flash).
* **Telegram Bot:** Telegram Bot API (Long polling daemon, Deep-link Auth, WebApp).

---

## 🚀 O'rnatish va Ishga Tushirish

### 1. Repozitoriyni klonlash
```bash
git clone https://github.com/Rasmiyatchi/QUIZGEN.git
cd QUIZGEN
```

### 2. Kutubxonalarni o'rnatish
```bash
npm install
```

### 3. Sozlamalar (.env)
`.env.example` faylidan nusxa olib `.env` yarating:
```bash
cp .env.example .env
```
`.env` faylini oching va kerakli kalitlarni kiriting:
```env
# Google AI Studio bepul kaliti (erkin matnlardan test tuzish uchun)
GEMINI_API_KEY="AIzaSy..."

# Telegram Bot sozlamalari
TELEGRAM_BOT_TOKEN="8933287872:AAGpCMiMvAh5ux1lA7AyTjboAa_FQ5m9bvk"
TELEGRAM_BOT_USERNAME="quizgenrobot"

# Server porti
PORT=3000
```

> [!NOTE]
> HEMIS formatidagi testlarni ishlatish uchun `GEMINI_API_KEY` shart emas! Tizim 100% oflayn va tekin ishlaydi.

### 4. Dasturni ishga tushirish
```bash
npm run dev
```

Brauzerda oching: **[http://localhost:3000](http://localhost:3000)**  
Telegram bot: **[@quizgenrobot](https://t.me/quizgenrobot)**

---

## 📦 Loyiha Tuzilishi

```text
├── data/                   # SQLite ma'lumotlar bazasi (quizgen.db)
├── src/
│   ├── components/         # Navbar va yordamchi UI komponentlar
│   ├── contexts/           # AuthContext (Telegram & Obuna holati)
│   ├── lib/
│   │   ├── db.ts           # SQLite ma'lumotlar bazasi va CRUD metodlar
│   │   ├── hemis-parser.ts # HEMIS testlarini AI-siz 0 soniyada tahlil qiluvchi dvigatel
│   │   ├── telegram-auth.ts# HMAC-SHA256 xavfsiz Telegram imzo tekshiruvchisi
│   │   └── utils.ts        # Yordamchi funksiyalar
│   ├── pages/
│   │   ├── Home.tsx        # Bosh sahifa (Fayl yuklash va test generatsiyasi)
│   │   ├── Login.tsx       # Qat'iy Telegram orqali kirish sahifasi
│   │   ├── Pricing.tsx     # 3-bosqichli Premium tariflar sahifasi
│   │   ├── Quiz.tsx        # Test topshirish (Study & Exam mode)
│   │   ├── Editor.tsx      # Test savollarini tahrirlash va eksport
│   │   ├── Flashcards.tsx  # 3D aylanuvchi xotira kartalari
│   │   ├── Result.tsx      # Natijalar, medal va tahlil
│   │   └── History.tsx     # Testlar va urinishlar tarixi
│   └── services/
│       └── telegram-bot.ts # Telegram Bot servisi (Polling, to'lovlar, tahlil)
├── server.ts               # Express backend va API marshrutlari
└── package.json
```

---

## 📄 Litsenziya

MIT License © 2026 QUIZGEN Team.
