<USER_REQUEST>
QUIZGEN v3 — To'liq Texnik Topshiriq (TZ)
Hujjat maqsadi: mavjud QUIZGEN v2 loyihasini (React 19 + Vite + Express + SQLite + Telegram bot) to'liq, xavfsiz va sotishga tayyor mahsulotga aylantirish. Hujjat AI agentga (Claude Code, Cursor va h.k.) bevosita topshirish uchun yozilgan.
Sana: 2026-yil 16-noyabr · Asos: QUIZGEN-main.zip kod bazasini to'liq o'rganish natijasi (28 ta fayl, ~6 400 qator kod).
0. AI agent uchun ish qoidalari (birinchi o'qing)
1.  Ishni bosqichma-bosqich (11-bo'limdagi M0, M1, M2 ...) bajaring. Har bosqich alohida git commit/branch bo'lsin. Oldingi bosqich qabul mezonlari (acceptance criteria) o'tmasdan keyingisiga o'tmang.
2.  M0 (xavfsizlik) hamma narsadan oldin. Hozirgi kodda foydalanuvchi ma'lumotlari va to'lovlar himoyasiz (1.2-bo'lim).
3.  Barcha serverga kiruvchi ma'lumot zod bilan validatsiya qilinadi. Hech qachon klientdan kelgan userId ga ishonmang — foydalanuvchi faqat server sessiyasidan olinadi.
4.  Obuna/limit/ruxsat mantiqi faqat serverda va bitta joyda (entitlements moduli) bo'ladi. Frontend faqat ko'rsatadi.
5.  Bitta funksionallik web va Telegramda bir xil servis kodidan o'tadi (masalan, test yaratish QuizCreationService). Ikki nusxa yozmang.
6.  Har yangi modul uchun: unit test + kamida bitta integratsiya testi. Parser, obuna hisob-kitobi, to'lov imzolari uchun test majburiy.
7.  Foydalanuvchiga ko'rinadigan barcha matn i18n kalitlari orqali (boshlang'ich til: o'zbek lotin; keyin rus). Kodga qattiq yozilgan matn qoldirmang.
8.  alert() / confirm() ishlatmang — toast va modal komponentlari ishlating.
9.  Noaniq joy bo'lsa, 12-bo'limdagi "Taxminlar" ga qarang; u yerda ham yo'q bo'lsa — eng xavfsiz va eng sodda variantni tanlab, qarorni docs/DECISIONS.md ga yozing.
10.  Sirlar (token, kalit) hech qachon repoga, README ga, logga yozilmaydi.
1. Mavjud holat tahlili
1.1. Hozir nima bor
• Stack: React 19, Vite 6, Tailwind 4, react-router 7; Express 4 (server.ts, 605 qator); node:sqlite (+ JSON fayl fallback); mammoth (.docx), pdf-parse; Gemini 2.5 Flash; Telegram bot (long polling, src/services/telegram-bot.ts).
• Ishlayotgan qismlar: HEMIS parser (2 shablon: ++++/====/# va 1. ... A) B) ... Javob: A), fayldan test yaratish, test yechish (o'rganish/imtihon rejimi, taymer, savollar xaritasi), natija sahifasi, 3D flashcards, test muharriri (HEMIS .txt eksport), tarix, tariflar sahifasi, botga .docx/.txt yuborib test yaratish, /start, /premium, /status.
• Sahifalar: Home, Login, Quiz, Result, History, Editor, Flashcards, Pricing. Admin panel, kutubxona, profil, sozlamalar, landing, huquqiy sahifalar yo'q.
1.2. KRITIK xavfsizlik va mantiq xatolari (M0 da tuzatiladi)
#
Muammo
Joyi
Oqibati
S1
Bot tokeni README.md ichida ochiq yozilgan
README.md
Botni har kim boshqara oladi. Darhol @BotFather → /revoke, yangi token .env ga, git tarixidan tozalash (git filter-repo).
S2
Serverda sessiya yo'q. Token 'tma_token_' + id oddiy qator, hech qayerda tekshirilmaydi. Barcha API userId ni so'rovdan ishonib oladi
server.ts
Istalgan odam boshqa foydalanuvchining testlari, natijalari, buyurtmalarini ko'radi/o'chiradi (IDOR)
S3
/api/auth/telegram da demoUser tarmog'i production'da ham ochiq; "Sinov hisobi" tugmasi Login sahifasida
server.ts, Login.tsx
Istalgan ID bilan akkaunt yaratish/egallash
S4
/api/subscriptions/pay-demo va botdagi pay_demo_ callback to'lovsiz obunani faollashtiradi
server.ts, telegram-bot.ts
Har kim bepul Grand Master oladi
S5
completeOrder buyurtma holatini tekshirmaydi
db.ts
Bir buyurtmani qayta-qayta bosib obunani cheksiz uzaytirish
S6
recordAiTest foydalanuvchi bazada bo'lmasa hech narsa yozmaydi; userId formdan olinadi
db.ts, server.ts
Soxta userId yoki anonymous bilan cheksiz AI so'rov (Gemini kvotasi yonadi)
S7
Telegram orqali brauzerga kirish: 8 belgili kod Math.random() bilan, botga istalgan foydalanuvchi kodni yuborsa avtorizatsiya qiladi, brauzerga bog'lanmagan
db.ts, telegram-bot.ts
Fishing: hujumchi o'z brauzeridagi kodni qurbonga yuboradi — qurbon akkauntiga kiradi
S8
TMA ichida initData serverga yuborilmaydi; initDataUnsafe ga ishoniladi, auth_date tekshirilmaydi
AuthContext.tsx, telegram-auth.ts
Soxta TMA foydalanuvchi; replay hujumi
S9
Saqlangan foydalanuvchi localStorage da; Telegramda boshqa akkaunt bilan ochilsa eski akkaunt qoladi
AuthContext.tsx
Akkauntlar aralashuvi
S10
To'g'ri javoblar klientga yuboriladi, ball klientda hisoblanadi va serverga ishonib yoziladi
Quiz.tsx, server.ts
Natijani soxtalashtirish (reyting/imtihon uchun yaroqsiz)
S11
GET /api/quizzes/:id is_public ni tekshirmaydi; PUT /api/quizzes/:id egalikni tekshirmaydi
server.ts
Yopiq testlarni o'qish va boshqalar testini o'zgartirish
S12
Bot xabarlarida first_name, quiz.title HTML-escape qilinmaydi (parse_mode: HTML)
telegram-bot.ts
HTML in'ektsiya, xabar yuborilmay qolishi
S13
Rate limit, helmet, CORS siyosati, fayl magic-bytes tekshiruvi yo'q
server.ts
Suiiste'mol, DoS
S14
Production rejimida express.static(__dirname) — bundle'siz ishga tushirilsa loyiha ildizi (.env, data/*.db) ochiq bo'ladi
server.ts
Sirlar va baza sizib chiqishi
1.3. Mantiqiy xatolar va chala joylar
Obuna:
• Yuqori tarif faol turganda pastroq tarif sotib olinsa, plan pastga tushadi, muddat esa qo'shiladi (updateUserSubscription).
• Limitlar ikki joyda qattiq yozilgan: PRICING_PLANS va getUserSubscription ichida (10/50/99999). Bot matnlarida ham narxlar qo'lda yozilgan.
• Obuna muddati tugaganda eslatma, avtomatik holat o'zgarishi, pastga tushish, qaytarish (refund), promo, sinov muddati — yo'q.
• Premium funksiyalar hech qayerda cheklanmagan: Editor, Flashcards, HEMIS eksport, "faqat xatolar" rejimi barcha uchun ochiq. Tariflarda va'da qilingan Word/Excel eksport, guruhlarga ulashish, ustuvor tezlik, 24/7 yordam kodda yo'q.
• Click va Payme faqat tashqi ko'rinish — backend integratsiya yo'q (README "to'liq ishlaydi" deydi — noto'g'ri).
Test yechish / natija:
• Taymer tugaganda autoSubmitOnTimeUp effect yaratilgan paytdagi eski answers holati bilan ishlashi ehtimoli yuqori (stale closure) — vaqt tugaganda javoblar yo'qolishi mumkin. Tekshirib tuzating.
• Urinish serverda boshlanmaydi: davom ettirish (resume) yo'q, brauzer yopilsa progress yo'qoladi.
• "Xatolarni qayta ishlash" (retry_... test) faqat localStorage da — boshqa qurilmada/TMA da yo'qoladi.
• History sahifasi serverdagi va localStorage dagi ma'lumotni aralashtiradi (dublikat va "anonymous" yozuvlar).
• Navbar dagi "1 kun" seriyasi statik (soxta). Haqiqiy streak/XP/reyting yo'q.
HEMIS parser (hemis-parser.ts):
• To'g'ri javob topilmasa jimgina 0-variant (A) to'g'ri deb olinadi — bu o'quvchini noto'g'ri o'rgatadi. Buning o'rniga savol "javobi aniqlanmadi" deb belgilanishi va foydalanuvchiga ko'rsatilishi shart.
• Tahlil hisoboti yo'q (nechta savol o'qildi / o'tkazib yuborildi / ogohlantirish).
• Variant harflari faqat A–D (kod letterToIndex da E–F bor, regexlarda yo'q). Aralash format, jadval ko'rinishidagi .docx, qalin/tagiga chizilgan to'g'ri javob (mammoth extractRawText formatni yo'qotadi) qo'llab-quvvatlanmaydi.
• Parser faqat serverda (src/lib); testlari yo'q.
Telegram bot:
• Faqat .docx/.txt (veb .pdf ni ham qabul qiladi). Test yaratilgach botda boshlash tugmasi yo'q ("saytga kiring" deydi), AI generatsiya botda yo'q, qo'lda yaratish yo'q.
• Long polling Express ichida: bir nechta nusxada 409 xatosi; webhook yo'q; bot holati (state) xotirada ham yo'q — ko'p bosqichli dialog qurib bo'lmaydi.
• Bot buyruqlari rolga/tilga qarab ajratilmagan; admin buyruqlari yo'q.
Veb va Mini App:
• Landing, ommaviy test sahifasi (SEO/OG), 404, error boundary, profil/sozlamalar, huquqiy sahifalar (Oferta, Maxfiylik — Payme/Click ulash uchun shart) yo'q.
• Mini App: BackButton, MainButton, HapticFeedback (qisman), themeParams, safe-area, enableClosingConfirmation, CloudStorage, startParam deep link ishlatilmaydi.
• UI faqat o'zbekcha (i18n yo'q), xatolar alert() bilan.
Kod sifati va infratuzilma:
• Har bir db funksiyasi ikki yo'lli (SQLite + JSON fallback) — kod ikki baravar, xato ehtimoli yuqori. node:sqlite hali eksperimental. Migratsiya tizimi yo'q (ALTER TABLE try/catch).
• ID lar Math.random().toString(36).substring(7) (qisqa, to'qnashuvi mumkin), buyurtma ID si 6 xonali tasodifiy son.
• Testlar, CI/CD, Docker, logging, monitoring, backup, env validatsiya — yo'q.
• Tozalash: vite.config.ts da eskirgan OPENAI_API_KEY; metadata.json nomi "Remix: AI Quiz Generator"; vite dependencies va devDependencies da ikki marta; form-data, node-fetch keraksiz (Node 22 da global fetch/FormData bor).
2. Maqsadli mahsulot (nima bo'lishi kerak)
Mahsulot: o'zbek tilidagi test platformasi: HEMIS/OTM test fayllarini bepul testga aylantiradi, AI orqali matndan test tuzadi, test kutubxonasi (barcha testlar bir joyda) bor, flashcards va xatolar ustida ishlash, obuna bilan monetizatsiya. Bir xil hisob va bir xil ma'lumot veb-saytda ham, Telegram botda ham, Telegram Mini App da ham ishlaydi.
Asosiy modullar:
1.  Auth va sessiyalar — xavfsiz Telegram orqali kirish (web + TMA + bot).
2.  Test yaratish — fayl (HEMIS/.docx/.txt/.pdf), AI (matn/mavzu), qo'lda, matn joylash; web va Telegramda alohida "➕ Test yaratish" tugmasi (6-bo'lim).
3.  Kutubxona — mening testlarim, saqlanganlar, ommaviy kutubxona, kategoriyalar, qidiruv, ulashish (5-bo'lim).
4.  Test yechish — server nazoratidagi urinishlar, rejimlar, natija, xatolar ustida ishlash, reyting.
5.  Flashcards — oraliq takrorlash (spaced repetition) bilan.
6.  Obuna va to'lov — Payme, Click, Telegram invoice, qo'lda (chek) to'lov, promo, sinov (3-bo'lim).
7.  Admin panel — foydalanuvchilarga obuna ochish/yopish, to'lovlar, tariflar, moderatsiya, xabarnoma, statistika (4-bo'lim).
8.  Bot — menyu, test yaratish, kutubxona, chatda yechish, obuna, bildirishnomalar, admin buyruqlari.
Funksional bo'lmagan talablar: 1 000 bir vaqtdagi foydalanuvchi; API javobi p95 < 400 ms (AI dan tashqari); 150 savolli testni ochish < 1.5 s; Mini App mobil 360 px dan boshlab to'g'ri ko'rinadi; mavjud ma'lumotlar yo'qolmaydi (migratsiya skripti bilan).
3. Arxitektura qarorlari
Mavjud stack saqlanadi (React + Vite + Express + TypeScript), lekin quyidagilar o'zgaradi:
Soha
Qaror
Sabab
Baza
PostgreSQL 16 + Drizzle ORM + migratsiyalar. node:sqlite va JSON fallback o'chiriladi
Bir nechta jarayon, tranzaksiya, indekslar, to'lov idempotentligi
Ma'lumot o'tkazish
scripts/migrate-sqlite-to-pg.ts — eski data/quizgen.db dan users/quizzes/questions/attempts/orders ko'chiriladi
Mavjud foydalanuvchilar yo'qolmasin
Validatsiya
zod (server + packages/shared da umumiy sxemalar)
Tur xavfsizligi
Bot
grammY + conversations/session (DB bilan), webhook (prod), long polling (dev)
Ko'p bosqichli dialog, ishonchlilik
Fon ishlari
pg-boss (Postgres ustida, Redis shart emas): obuna muddati, eslatmalar, xabarnoma navbati, AI generatsiya
Oddiy deploy
Sessiya
Server sessiyasi: qisqa muddatli access JWT (15 daq) + httpOnly, Secure, SameSite=Lax refresh cookie; TMA uchun har ishga tushishda initData tekshiruvi
1.2 dagi S2, S8, S9
Loyiha tuzilishi
Monorepo: apps/web, apps/server, packages/shared (turlar, zod sxemalar, tarif/entitlement turlari, HEMIS parser), docs/
Parser va turlar web/server/bot da umumiy
Deploy
docker-compose.yml (app, postgres), Caddy/Nginx + HTTPS, .env validatsiya (zod, noto'g'ri bo'lsa server ishga tushmaydi)
Bir buyruq bilan ko'tarish
Kuzatuv
pino loglar, Sentry (ixtiyoriy), /healthz, kunlik pg_dump zaxira
Barqarorlik
Rollar: user, admin, superadmin. Birinchi admin ADMIN_TELEGRAM_IDS env orqali belgilanadi; qolganini superadmin admin paneldan tayinlaydi.
3.1. Autentifikatsiya oqimlari (qayta yoziladi)
A) Telegram Mini App: klient Telegram.WebApp.initData ni POST /api/auth/tma ga yuboradi → server HMAC-SHA256 (WebAppData) bilan tekshiradi, auth_date ≤ 24 soat, foydalanuvchini upsert qiladi → sessiya beradi. Mini App har ochilganda qayta tekshiriladi; localStorage dagi eski foydalanuvchi bilan solishtiriladi (ID boshqa bo'lsa — eski sessiya tozalanadi).
B) Brauzerda Telegram bilan kirish (deep link):
1.  Web POST /api/auth/login-request → server crypto.randomBytes(32) dan request_id (URL uchun) va browser_secret (faqat brauzerga qaytariladi, bazada hash saqlanadi) yaratadi, muddat 5 daqiqa, 1 marta ishlatiladi.
2.  Brauzer https://t.me/<bot>?start=login_<request_id> ni ochadi. Bot foydalanuvchiga "Brauzerdan kirishni tasdiqlaysizmi?" + qurilma/IP/vaqt va [✅ Tasdiqlash] [❌ Rad etish] tugmalarini ko'rsatadi. Kod yozib yuborish usuli olib tashlanadi.
3.  Tasdiqlangach, web GET /api/auth/login-request/:id ni browser_secret bilan so'raydi → faqat o'sha brauzer sessiya oladi.
4.  IP bo'yicha rate limit (soatiga 20 so'rov).
C) Telegram Login Widget (zaxira): auth_date ≤ 1 soat tekshiriladi, hash tekshiriladi.
D) Demo/sinov kirishi faqat NODE_ENV !== 'production' va ENABLE_DEMO_AUTH=true bo'lganda ishlaydi; productionda marshrut mavjud emas.
Qabul mezonlari: boshqa foydalanuvchi ID siga so'rov yuborish 403 qaytaradi; muddati o'tgan initData rad etiladi; deep-link kodi boshqa brauzerda ishlamaydi; sessiya tugaganda klient avtomatik qayta kiradi (TMA ichida).
4. Ma'lumotlar modeli (PostgreSQL)
Hamma jadvalda id — UUID (gen_random_uuid()), created_at, updated_at. Pul summalari tiyinda (integer). Vaqtlar timestamptz.
users — telegram_id (bigint, unique), first_name, last_name, username, photo_url, language (uz/ru/en), role, is_banned, ban_reason, last_seen_at, notifications_enabled, referred_by, streak_days, streak_updated_on, xp.
sessions — user_id, refresh_token_hash, user_agent, ip, expires_at, revoked_at.
login_requests — id, secret_hash, status (pending/approved/rejected/expired/used), telegram_user_id, meta (IP/UA), expires_at.
categories — slug, name_uz, name_ru, name_en, parent_id, sort.
quizzes — owner_id, slug (qisqa, o'qiladigan, unique), title, description, category_id, language, tags text[], visibility (private/unlisted/public), status (draft/published/hidden_by_admin), source (hemis/ai/manual/poll_import), time_limit_minutes, questions_count, attempts_count, avg_score, forked_from, is_featured, content_hash, deleted_at (soft delete).
questions — quiz_id, position, text, options jsonb (massiv: {text, image?}), correct_index (null bo'lishi mumkin — "javobi aniqlanmadi"), explanation, image_url?, needs_review boolean.
quiz_attempts — user_id, quiz_id, mode (study/exam/retry_wrong), status (in_progress/finished/expired), started_at, deadline_at, finished_at, question_order int[], option_orders jsonb, score, total, percentage, time_spent_sec.
attempt_answers — attempt_id, question_id, chosen_index, is_correct, answered_at.
library_items — user_id, quiz_id, kind (saved/favorite), folder_id?; folders — user_id, name.
card_progress — user_id, question_id, box (1–5), ease, due_at, last_reviewed_at (Leitner/SM-2).
plans — code, name, description, price_tiyin, duration_days, entitlements jsonb, is_active, is_public, sort. (Tariflar bazada, admin tahrirlaydi.)
subscriptions — user_id, plan_id, starts_at, expires_at, status (active/expired/cancelled/refunded), source (payment/admin_grant/promo/trial/referral), order_id?, granted_by?, note.
orders — user_id, plan_id, plan_snapshot jsonb (narx va shartlar to'lov paytidagi holati), amount_tiyin, currency, status (pending/paid/cancelled/failed/refunded), provider (payme/click/telegram/manual), promo_code_id?, paid_at.
payments — order_id, provider, provider_txn_id (unique per provider), state, amount_tiyin, raw jsonb, performed_at, cancelled_at, cancel_reason. (Idempotentlik shu yerda.)
manual_payment_proofs — order_id, file_id (Telegram) yoki file_url, status, reviewed_by, reject_reason.
promo_codes — code, kind (percent/fixed/free_days), value, plan_ids, max_uses, used_count, valid_from, valid_until, is_active.
usage_counters — user_id, feature (ai_generation), day (date), count — unique (user_id, feature, day); atomik INSERT ... ON CONFLICT DO UPDATE ... WHERE count < limit.
reports — reporter_id, quiz_id, reason, status, handled_by.
broadcasts / broadcast_deliveries — xabar matni, segment, holat, yuborilgan/xato soni.
bot_sessions — telegram_id, state jsonb, updated_at (ko'p bosqichli dialog holati).
settings — key, value jsonb (feature flag, texnik rejim, to'lov usullari yoqilgan/o'chirilgan).
audit_log — actor_id, action, target_type, target_id, before jsonb, after jsonb, ip, created_at. Faqat INSERT (o'zgartirish/o'chirish yo'q).
Indekslar: quizzes(visibility,status,created_at desc), GIN quizzes(tags), pg_trgm bilan quizzes(title) qidiruv, subscriptions(user_id,status,expires_at), payments(provider,provider_txn_id) unique, quiz_attempts(user_id,finished_at desc).
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-11-16T20:58:46+05:00.

The user's current state is as follows:
Active Document: c:\Users\User\Desktop\Projectst\QUIZGEN v2\.env.example (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- c:\Users\User\Desktop\Projectst\QUIZGEN v2\README.md (LANGUAGE_UNSPECIFIED)
- c:\Users\User\Desktop\Projectst\QUIZGEN v2\.gitignore (LANGUAGE_UNSPECIFIED)
- c:\Users\User\Desktop\Projectst\QUIZGEN v2\src\pages\Login.tsx (LANGUAGE_UNSPECIFIED)
- c:\Users\User\Desktop\Projectst\QUIZGEN v2\src\pages\Pricing.tsx (LANGUAGE_UNSPECIFIED)
- c:\Users\User\Desktop\Projectst\QUIZGEN v2\src\services\telegram-bot.ts (LANGUAGE_UNSPECIFIED)
</ADDITIONAL_METADATA>
<USER_SETTINGS_CHANGE>
The user changed setting `Model Selection` from Gemini 3.8 Flash (High) to Claude Sonnet 4.6 (Thinking). No need to comment on this change if the user doesn't ask about it. If reporting what model you are, please use a human readable name instead of the exact string.
</USER_SETTINGS_CHANGE>