<USER_REQUEST>
0. AI agent uchun ish qoidalari (birinchi o'qing)
1.  Ishni bosqichma-bosqich (12-bo'limdagi M0, M1, M2 ...) bajaring. Har bosqich alohida git commit/branch bo'lsin. Oldingi bosqich qabul mezonlari (acceptance criteria) o'tmasdan keyingisiga o'tmang.
2.  M0 (xavfsizlik) hamma narsadan oldin. Hozirgi kodda foydalanuvchi ma'lumotlari va to'lovlar himoyasiz (1.2-bo'lim).
3.  Barcha serverga kiruvchi ma'lumot zod bilan validatsiya qilinadi. Hech qachon klientdan kelgan userId ga ishonmang — foydalanuvchi faqat server sessiyasidan olinadi.
4.  Obuna/limit/ruxsat mantiqi faqat serverda va bitta joyda (entitlements moduli) bo'ladi. Frontend faqat ko'rsatadi.
5.  Bitta funksionallik web va Telegramda bir xil servis kodidan o'tadi (masalan, test yaratish QuizCreationService). Ikki nusxa yozmang.
6.  Har yangi modul uchun: unit test + kamida bitta integratsiya testi. Parser, obuna hisob-kitobi, to'lov imzolari uchun test majburiy.
7.  Foydalanuvchiga ko'rinadigan barcha matn i18n kalitlari orqali (boshlang'ich til: o'zbek lotin; keyin rus). Kodga qattiq yozilgan matn qoldirmang.
8.  alert() / confirm() ishlatmang — toast va modal komponentlari ishlating.
9.  Noaniq joy bo'lsa, 14-bo'limdagi "Taxminlar" ga qarang; u yerda ham yo'q bo'lsa — eng xavfsiz va eng sodda variantni tanlab, qarorni docs/DECISIONS.md ga yozing.
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
2.  Test yaratish — fayl (HEMIS/.docx/.txt/.pdf), AI (matn/mavzu), qo'lda, matn joylash; web va Telegramda alohida "➕ Test yaratish" tugmasi (8-bo'lim).
3.  Kutubxona — mening testlarim, saqlanganlar, ommaviy kutubxona, kategoriyalar, qidiruv, ulashish (7-bo'lim).
4.  Test yechish — server nazoratidagi urinishlar, rejimlar, natija, xatolar ustida ishlash, reyting.
5.  Flashcards — oraliq takrorlash (spaced repetition) bilan.
6.  Obuna va to'lov — Payme, Click, Telegram invoice, qo'lda (chek) to'lov, promo, sinov (5-bo'lim).
7.  Admin panel — foydalanuvchilarga obuna ochish/yopish, to'lovlar, tariflar, moderatsiya, xabarnoma, statistika (6-bo'lim).
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
5. Obuna va to'lov tizimi (to'liq)
5.1. Tariflar va ruxsatlar matritsasi
Tariflar bazada (plans), admin paneldan tahrirlanadi. Quyidagi — boshlang'ich qiymatlar (seed). Narxlar mavjud tariflar bilan bir xil.
Imkoniyat (kalit)
Bepul
Talaba Start (7 999 so'm, 7 kun)
Sessiya Pro (29 999 so'm, 30 kun)
Grand Master (59 900 so'm, 90 kun)
HEMIS fayldan test yaratish (hemis_import)
cheksiz
cheksiz
cheksiz
cheksiz
AI generatsiya kuniga (ai_daily_limit)
3
10
50
300 (adolatli foydalanish)
Saqlangan testlar (max_quizzes)
20
100
500
2 000
Testdagi maks. savol (max_questions)
300
300
500
1 000
Test muharriri (editor)
yo'q
yo'q
ha
ha
Flashcards (flashcards)
yo'q
yo'q
ha
ha
Faqat xatolar bilan qayta ishlash (wrong_only)
yo'q
ha
ha
ha
Eksport (export_formats)
yo'q
yo'q
hemis_txt
hemis_txt, docx, xlsx, pdf, json
Havola/guruhga ulashish (share_links)
3 ta test
10
10 faol havola
cheksiz
Kutubxonaga saqlash (library_saves)
20
100
500
cheksiz
Ustuvor navbat va yordam (priority)
yo'q
yo'q
yo'q
ha
Eslatma: "Telegramda test yaratish", test yechish, ommaviy kutubxonani ko'rish hamma tarifda ochiq (mahsulotning o'sish dvigateli). Cheklov faqat sonlarga qo'yiladi. Tarifda va'da qilingan har bir imkoniyat kodda haqiqatan bajarilishi shart; bajarilmaydigan va'dani ("24/7 shaxsiy yordam", "VIP tezlik") tarif matnidan olib tashlang yoki real ishlating (priority = AI/fon ishlari navbatida oldinroq).
5.2. entitlements moduli (yagona haqiqat manbai)
• getEffectiveEntitlements(userId) — faol obunalardan eng yuqori darajali tarifni oladi, so'ng user_overrides (admin qo'lda bergan istisno: masalan ai_daily_limit=100, muddati bilan) ni ustiga qo'yadi. Natija 60 soniya keshlanadi, obuna o'zgarganda kesh tozalanadi.
• Server middleware: requireFeature('editor'), requireQuota('ai_generation') (kvotani atomik sarflaydi: INSERT ... ON CONFLICT DO UPDATE ... WHERE count < limit; muvaffaqiyatsiz AI chaqiruvida kvota qaytariladi).
• Cheklangan amalda server HTTP 402 va { code: 'FEATURE_LOCKED' | 'QUOTA_EXCEEDED', feature, requiredPlan, limit, used } qaytaradi.
• Frontend: useEntitlements() hook, <Paywall feature="editor" /> komponenti (qulflangan tugma → tarif taklifi modali). Botda: xuddi shu xato uchun "🔒 Bu imkoniyat Pro tarifda. [💎 Tariflar]" xabari.
• GET /api/me/entitlements — joriy tarif, tugash sanasi, bugungi sarf (AI N/M), barcha kalitlar.
• Eng muhim: Editor, Flashcards, eksport, wrong-only, AI, saqlash limitlari hozir hech qayerda tekshirilmaydi — hammasi shu modul orqali serverda majburlanadi.
5.3. Obuna hayot sikli
Bitta tranzaksion funksiya: activateSubscription(userId, planId, { source, orderId?, grantedBy?, note?, customDays? }). To'lov, admin, promo, sinov, referal — hammasi shu funksiyadan o'tadi.
• Bir xil tarifni qayta olish: muddat max(hozir, joriy expires_at) dan boshlab qo'shiladi.
• Yuqori tarifga o'tish (upgrade): yangi obuna darhol boshlanadi; pastki tarifning qolgan qiymati kunlarga o'giriladi: bonus_days = floor(qolgan_kun × eski_narx_kuniga / yangi_narx_kuniga) va yangi muddatga qo'shiladi; eski obuna cancelled (izoh: upgraded).
• Past tarifni faol yuqori tarif paytida olish: status='scheduled', starts_at = yuqori tarif tugashi. (subscriptions.status ga scheduled qiymati qo'shiladi.)
• Idempotentlik: buyurtma SELECT ... FOR UPDATE bilan qulflanadi, faqat pending → paid o'tishi mumkin; qayta chaqiruv hech narsa o'zgartirmaydi (hozirgi S5 xatosi yopiladi).
• Muddat tugashi (pg-boss cron, har soat): tugagan obunalarni expired qiladi, scheduled ni faollashtiradi; keshni tozalaydi.
• Eslatmalar: tugashiga 3 kun va 1 kun qolganda hamda tugaganda Telegram xabari + [🔄 Uzaytirish] tugmasi (notifications_enabled=false bo'lsa yuborilmaydi).
• Sinov (trial): yangi foydalanuvchiga bir martalik 3 kunlik Pro (settings.trial_enabled, source='trial', bir telegram_id ga faqat bir marta).
• Bekor qilish/qaytarish (refund): faqat admin; status='refunded'|'cancelled', imtiyozlar zudlik bilan olinadi, audit yoziladi.
• Referal (P2): taklif qilgan va taklif qilingan foydalanuvchiga +3 kun Start — faqat taklif qilingan odam birinchi pullik buyurtmani to'lagach (suiiste'molga qarshi).
• Promo kodlar: percent / fixed / free_days, tarifga, muddatga, foydalanish soniga bog'lanadi; narx hisobi serverda, buyurtmada plan_snapshot bilan qotiriladi.
• Avtomatik takroriy yechish yo'q (bir martalik to'lov + eslatma).
5.4. Foydalanuvchi interfeysi
• Tariflar sahifasi: ma'lumot GET /api/plans dan (qattiq yozilgan matn yo'q), joriy tarif kartasi, qolgan kun, sarf chiziqlari (AI 7/50), "Uzaytirish", promo kod maydoni, to'lov usuli tanlash modali, muvaffaqiyat ekrani.
• Profil sahifasi (yangi): tarif, buyurtmalar tarixi (holat, summa, usul, chek), til, bildirishnomalar yoqish/o'chirish, seans qurilmalari, akkauntni o'chirish.
• Bot: /premium, /status — shu API dan olinadi (alohida matn nusxasi yo'q).
5.5. To'lov integratsiyalari
Umumiy interfeys: PaymentProvider { createCheckout(order) ; handleWebhook(req) }. Yoqish/o'chirish settings.payment_methods orqali admin panelda. Faqat serverdagi webhook buyurtmani paid qiladi — klientdan keladigan "to'lov bo'ldi" signali hech qachon ishonchli emas.
a) Payme (Merchant API, JSON-RPC 2.0) — POST /api/payments/payme
• Autentifikatsiya: Authorization: Basic base64("Paycom:<KEY>"); noto'g'ri bo'lsa spetsifikatsiyadagi autentifikatsiya xatosi.
• Metodlar: CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction, CheckTransaction, GetStatement. Summa tiyinda; buyurtma account.order_id orqali topiladi; summa buyurtma summasiga teng bo'lishi shart.
• Tranzaksiya holatlari 1 (yaratilgan), 2 (bajarilgan), −1/−2 (bekor); yaratilgan tranzaksiya muddati 12 soat. Xato kodlari va javob shakllari rasmiy hujjatga (developer.help.paycom.uz) aynan mos bo'lsin.
• Checkout havolasi: https://checkout.paycom.uz/ + base64(m=<MERCHANT_ID>;ac.order_id=<id>;a=<tiyin>;c=<return_url>;l=uz).
b) Click (Shop API) — POST /api/payments/click/prepare, POST /api/payments/click/complete
• Maydonlar: click_trans_id, service_id, merchant_trans_id (= buyurtma ID), amount (so'mda), action (0 prepare / 1 complete), error, sign_time, sign_string.
• Imzo: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + [merchant_prepare_id (faqat complete)] + amount + action + sign_time); mos kelmasa — xato javobi.
• Javob merchant_prepare_id / merchant_confirm_id ni qaytaradi; takroriy chaqiruvda ham bir xil javob (idempotent).
• Checkout: https://my.click.uz/services/pay?service_id=...&merchant_id=...&amount=...&transaction_param=<order_id>&return_url=....
c) Telegram invoice (bot va Mini App ichida)
• createInvoiceLink / sendInvoice (valyuta UZS, narx tiyinda, provider_token BotFather → Payments dagi Payme yoki Click). Mini Appda Telegram.WebApp.openInvoice(link).
• pre_checkout_query ga 10 soniya ichida javob (buyurtma holati va summani tekshirib), successful_payment kelganda buyurtma paid, telegram_payment_charge_id saqlanadi.
• Telegramning raqamli tovarlar uchun Stars qoidalarini rasmiy shartlardan tekshiring; kerak bo'lsa telegram_stars provayderi (valyuta XTR) qo'shimcha usul sifatida qo'shiladi (P3).
d) Qo'lda to'lov (karta o'tkazmasi + chek) — O'zbekistonda eng ishonchli zaxira usul:
1.  Foydalanuvchi buyurtma yaratadi → karta raqami, aniq summa, noyob izoh kodi ko'rsatiladi (settings dan).
2.  Chek rasmini veb yoki botga yuboradi (manual_payment_proofs).
3.  Adminlarga botda bildirishnoma: [✅ Tasdiqlash] [❌ Rad etish (sabab)]; admin panelda "Kutilayotgan to'lovlar" navbati.
4.  Tasdiqlansa → activateSubscription, foydalanuvchiga Telegram xabari; rad etilsa — sabab bilan.
e) Demo to'lov — faqat NODE_ENV !== 'production' va ENABLE_DEMO_PAYMENTS=true. Productionda marshrut ham, tugma ham yo'q.
To'lov xavfsizligi/ishonchliligi: webhook imzosi/autentifikatsiyasi; summa va valyuta solishtirish; payments(provider, provider_txn_id) unique; xom so'rov payments.raw ga; har kuni pending > 24 soat buyurtmalarni cancelled qiluvchi job; kunlik solishtirish hisoboti (admin panelda); barcha provayderlar uchun sandbox bilan test.
Huquqiy talab: Payme/Click ulash uchun saytda Ommaviy oferta, Maxfiylik siyosati, Qaytarish shartlari, kontaktlar sahifalari bo'lishi kerak (9-bo'limda).
5.6. Qabul mezonlari (obuna)
• Bepul foydalanuvchi Editor/Flashcards/eksportga kirganda 402 oladi va paywall ko'radi; Pro ochadi.
• Bir buyurtmani 10 marta "to'landi" qilish obunani faqat bir marta uzaytiradi (test bilan).
• Master foydalanuvchi Start sotib olsa — scheduled; Start foydalanuvchi Pro olsa — bonus kunlar to'g'ri hisoblanadi (unit test).
• Soxta userId yoki anonymous bilan AI so'rov imkonsiz (sessiya shart).
• Payme/Click sandbox testlari o'tadi; imzosi noto'g'ri so'rov hech narsani o'zgartirmaydi.
• Obuna tugashidan 3 kun oldin Telegram eslatmasi keladi.
6. Admin panel (to'liq)
6.1. Umumiy talablar
• Manzil: /admin (veb), alohida lazy-chunk. Faqat admin va superadmin. Ruxsat serverda (requireRole) tekshiriladi; frontend yo'naltirishi faqat qulaylik uchun.
• Mobil va Mini App ichida ham ishlaydigan moslashuvchan interfeys (jadvallar kartalarga aylanadi).
• Har bir o'zgartiruvchi amal audit_log ga yoziladi (kim, nima, oldin/keyin, IP).
• Jadvallar: server tomonidan sahifalash, saralash, filtrlash, CSV eksport.
• Xavfli amallar (bekor qilish, ban, o'chirish) — tasdiqlash modali va majburiy sabab maydoni.
6.2. Modullar
1) Boshqaruv paneli (Dashboard): bugun/hafta/oy bo'yicha yangi foydalanuvchilar, DAU/WAU/MAU, faol obunalar tarif bo'yicha, daromad (kun/oy, usul bo'yicha), konversiya (bepul → pullik), yaratilgan testlar, urinishlar, AI so'rovlar va xatolar soni, tugayotgan obunalar (7 kun), kutilayotgan qo'lda to'lovlar. Grafiklar (chiziqli/ustunli).
2) Foydalanuvchilar:
• Qidiruv: Telegram ID, @username, ism. Filtr: tarif, faol/tugagan, ban, ro'yxatdan o'tgan sana, oxirgi faollik.
• Profil sahifasi: asosiy ma'lumot, joriy tarif va qolgan kun, obuna tarixi, buyurtmalar, testlari, urinishlari, AI sarfi (14 kun), audit tarixi.
• Amallar: obuna berish, uzaytirish/qisqartirish (±kun), bekor qilish, limitni qo'lda o'zgartirish (user_overrides), ban/unban (sabab bilan), rol berish (faqat superadmin), Telegramga xabar yuborish, "foydalanuvchi ko'zi bilan ko'rish" (faqat o'qish, audit bilan).
• Ommaviy amal: Telegram ID ro'yxati yoki CSV yuklab, hammasiga bir vaqtda obuna berish (masalan, guruh/universitet uchun).
3) Obunalar: barcha obunalar ro'yxati; filtr: tarif, manba (payment/admin_grant/promo/trial/referral), holat; "7 kunda tugaydiganlar" tezkor filtri; CSV.
4) Buyurtmalar va to'lovlar: holat/usul/sana filtri, buyurtma kartasi (tranzaksiya ID, xom webhook ma'lumoti), qo'lda to'lovlar navbati (chekni ko'rish, tasdiqlash/rad etish), qo'lda "to'landi" deb belgilash (sabab bilan), refund, kunlik solishtirish hisoboti.
5) Tariflar: yaratish/tahrirlash/yashirish (nom, tavsif, narx, muddat, entitlements shakli, tartib). Narx o'zgarishi mavjud buyurtmalarga ta'sir qilmaydi (plan_snapshot). O'chirish o'rniga is_active=false.
6) Promo kodlar: yaratish, cheklovlar, foydalanish statistikasi, o'chirish.
7) Testlar va moderatsiya: barcha testlar (qidiruv, muallif, ko'rinish, holat), ommaviy testni yashirish/qaytarish/o'chirish, "Tanlangan" (featured) belgisi, shikoyatlar navbati (reports), dublikat testlarni ko'rsatish (content_hash), kategoriyalar CRUD.
8) AI nazorati: kunlik/oylik so'rovlar va taxminiy xarajat, foydalanuvchi bo'yicha eng ko'p sarflaganlar, global o'chirgich (kill-switch), model nomi va maks. matn uzunligi sozlamasi.
9) Xabarnoma (broadcast): Telegram orqali ommaviy xabar; segmentlar (hamma, bepul, pullik, tugayotgan, til bo'yicha); oldindan ko'rish; test yuborish (o'zimga); navbat bilan yuborish (Telegram limitiga mos, sekundiga ~25 xabar), natija: yuborildi/xato/bot bloklangan.
10) Sozlamalar: feature flaglar, texnik ishlar rejimi (foydalanuvchilarga xabar), to'lov usullarini yoqish/o'chirish, qo'lda to'lov rekvizitlari, sinov (trial) sozlamalari, yordam kontaktlari, majburiy kanalga obuna (ixtiyoriy).
11) Audit jurnali: qidiruv va filtr (amal, admin, nishon), o'zgartirib bo'lmaydi.
6.3. "Foydalanuvchiga obuna ochish" — aniq oqim
1.  Admin → Foydalanuvchilar → qidiradi → profilni ochadi → [Obuna berish].
2.  Modal: tarif (tanlov), muddat (tarif standarti / boshqa kun soni / aniq sana), sabab (majburiy), "Foydalanuvchiga Telegramda xabar yuborish" (standart yoqilgan).
3.  POST /api/admin/users/:id/subscription → activateSubscription(source='admin_grant', grantedBy=admin.id) → audit → xabar ("🎁 Sizga <Tarif> obunasi <N> kunga berildi").
4.  Interfeys zudlik bilan yangi holatni ko'rsatadi; foydalanuvchi sahifani yangilamasdan (keyingi so'rovda) yangi imkoniyatlarni oladi.
5.  Teskari amallar: [Bekor qilish] (sabab bilan), [± kun].
6.4. Admin API (barchasi requireRole('admin'), audit bilan)
Marshrut
Vazifa
GET /api/admin/stats?range=
Dashboard ko'rsatkichlari
GET /api/admin/users, GET /api/admin/users/:id
Qidiruv, profil
POST /api/admin/users/:id/subscription
Obuna berish/uzaytirish
POST /api/admin/users/:id/subscription/cancel
Obunani bekor qilish
PUT /api/admin/users/:id/overrides
Individual limitlar
POST /api/admin/users/:id/ban, /unban, /role
Ban va rol
POST /api/admin/users/:id/message
Telegramga xabar
POST /api/admin/subscriptions/bulk
Ommaviy obuna (ID/CSV)
GET /api/admin/orders, GET /api/admin/orders/:id
Buyurtmalar
POST /api/admin/orders/:id/approve, /reject, /refund
Qo'lda to'lov va refund
CRUD /api/admin/plans, /promo-codes, /categories
Tariflar, promo, kategoriyalar
GET /api/admin/quizzes, POST .../:id/hide, /feature, DELETE
Moderatsiya
GET /api/admin/reports, POST .../:id/resolve
Shikoyatlar
GET /api/admin/ai/usage, PUT /api/admin/settings
AI va sozlamalar
POST /api/admin/broadcasts, GET .../:id
Xabarnoma
GET /api/admin/audit
Audit jurnali
6.5. Botdagi admin buyruqlari (faqat admin Telegram ID lar uchun)
/admin (inline menyu), /stats, /user <id|@username>, /grant <id|@username> <tarif> <kun>, /revoke <id>, /pending (qo'lda to'lovlar, tugmalar bilan), /broadcast (matn → preview → tasdiq). Buyruqlar oddiy foydalanuvchilarga ko'rinmaydi (setMyCommands scope: chat admin uchun alohida). Har amal audit ga yoziladi.
6.6. Qabul mezonlari (admin)
• Oddiy foydalanuvchi /api/admin/* ga 403 oladi; /admin sahifasi unga ochilmaydi.
• Admin foydalanuvchiga obuna beradi → u 5 soniya ichida Editor/Flashcardsni ishlata oladi, Telegramga xabar boradi, audit yozuvi bor.
• 500 ta Telegram ID dan iborat CSV bilan ommaviy obuna xatosiz bajariladi va hisobot beradi (muvaffaqiyatli/xato).
• Qo'lda to'lov: chek → tasdiq → obuna → xabar zanjiri uchidan-uchigacha ishlaydi.
• Tarif narxi o'zgartirilsa, ochiq buyurtmaning summasi o'zgarmaydi.
7. Kutubxona (Test kutubxonasi) moduli
Taxmin: "kutubxonada hammasi bo'lishi kerak" — barcha testlar (o'zimniki, saqlanganlar, ommaviy) yagona Kutubxona bo'limida bo'lishi deb tushunildi. Agar boshqacha nazarda tutilgan bo'lsa (masalan, kitoblar kutubxonasi), 14-bo'limdagi savolga qarang.
Kutubxona web, Mini App va botda bir xil ma'lumot bilan ishlaydi.
7.1. Bo'limlar
1.  Mening testlarim — o'zim yaratganlar (qoralama, nashr etilgan), saralash (yangi, mashhur, nom), papkalar, teglar, ommaviy ko'rinishni o'zgartirish.
2.  Saqlanganlar — boshqalarning testlari (⭐ / "Kutubxonamga qo'shish"), papkalarga ajratish. Soni tarif bo'yicha cheklanadi (library_saves).
3.  Ommaviy kutubxona — visibility=public va status=published testlar: qidiruv (nom, teg, muallif), kategoriya (fan/yo'nalish), til, savollar soni, saralash (mashhur, yangi, eng ko'p yechilgan, eng yuqori o'rtacha ball), "Tanlangan" bo'limi (admin belgilaydi).
4.  Oxirgi yechilganlar va davom ettirish — tugallanmagan urinishlar ("Davom etish" tugmasi).
5.  Tarix — urinishlar, natijalar, tendentsiya.
7.2. Test kartochkasi va sahifasi
Kartochka: sarlavha, muallif, kategoriya, savollar soni, vaqt chegarasi, yechilgan soni, o'rtacha ball, ko'rinish belgisi (🔒 yopiq / 🔗 havola bilan / 🌐 ommaviy). Test sahifasi (/q/:slug): tavsif, boshlash (O'rganish / Imtihon), flashcards, saqlash, ulashish, shikoyat qilish, nusxa olish (fork — forked_from), reyting jadvali (server hisoblagan urinishlar bo'yicha).
7.3. Ulashish va deep link
• Veb: https://<domen>/q/<slug> (ommaviy va "havola bilan" testlar uchun OG-teglar bilan SEO).
• Telegram: https://t.me/<bot>/<app>?startapp=quiz_<slug> — Mini App to'g'ridan-to'g'ri testni ochadi. Bot ichida /start quiz_<slug>.
• Inline rejim: istalgan chatda @bot <qidiruv> yozilsa, ommaviy va o'z testlari natija sifatida chiqadi va bitta bosishda yuboriladi (switchInlineQuery bilan Mini Appdan ham).
• Havolani o'chirish/yangilash (slug saqlanadi, unlisted → private).
7.4. Qoidalar
• Yopiq (private) test faqat egasiga ko'rinadi — server tekshiradi (hozirgi S11 xatosi yopiladi).
• Ommaviy testga javoblar ham serverda saqlanadi; to'g'ri javoblar yechish paytida klientga yuborilmaydi (8.5 ga qarang).
• Dublikatni aniqlash: content_hash (savol matnlarining normallashtirilgan xeshi). Bir xil test qayta ommaviy qilinsa ogohlantirish.
• Shikoyat (reports): zo'ravonlik, mualliflik huquqi, noto'g'ri javoblar. 5 ta shikoyatdan keyin test avtomatik hidden_by_admin (moderatsiya navbatiga).
• Ommaviy qilishdan oldin kamida 5 savol, har birida aniqlangan to'g'ri javob (needs_review=false) talab qilinadi.
7.5. API
Marshrut
Vazifa
GET /api/library/mine, /saved, /public, /featured, /recent
Ro'yxatlar (sahifalash cursor, q, category, lang, sort)
POST /api/library/saved/:quizId, DELETE ...
Saqlash / olib tashlash (tarif limiti)
POST /api/library/folders, PUT/DELETE ...
Papkalar
GET /api/quizzes/slug/:slug
Test sahifasi (ruxsat tekshiruvi bilan)
POST /api/quizzes/:id/fork
Nusxa olish
POST /api/quizzes/:id/report
Shikoyat
GET /api/quizzes/:id/leaderboard
Reyting
7.6. Qabul mezonlari
• Foydalanuvchi web da yaratgan testni Telegramda (bot va Mini App) darhol ko'radi va aksincha.
• Boshqa foydalanuvchining yopiq testiga ID bo'yicha so'rov 404/403 qaytaradi.
• Qidiruv 10 000 testda < 300 ms (trigram indeks).
• Inline rejimda @bot fizika natijalar beradi va tanlangan test chatga havola bilan tushadi.
8. Telegram bot va "Test yaratish" (alohida tugma)
Bot faqat test mavzusiga xizmat qiladi: test yaratish, yechish, kutubxona, natijalar, obuna. Boshqa mavzudagi savollarga (suhbat, umumiy AI chat) javob bermaydi — "Men faqat testlar bilan ishlayman" xabari va menyu ko'rsatiladi.
8.1. Asosiy menyu
Doimiy reply keyboard (va Mini App menyu tugmasi setChatMenuButton):
Tugma
Vazifa
➕ Test yaratish
Test yaratish ustasi (8.2) — alohida, asosiy tugma
📚 Kutubxona
Mening testlarim / Saqlanganlar / Ommaviy / Qidiruv
▶️ Test yechish
Oxirgi va davom ettiriladigan testlar
💎 Obuna
Tarif, qolgan kun, sarf, to'lash
👤 Profil
Statistika, til, bildirishnomalar
🎮 Ilovani ochish
Mini App (https bo'lsa)
❓ Yordam
Format qo'llanmasi, aloqa
Buyruqlar (setMyCommands, uz/ru): /start, /create, /library, /premium, /status, /help, /cancel.
8.2. "Test yaratish" ustasi (grammY conversation, holat bot_sessions da)
➕ Test yaratish bosilganda usul tanlanadi (inline tugmalar):
A) 📄 Fayldan (HEMIS) — .docx, .txt, .pdf (15 MB gacha). Bot parser hisobotini ko'rsatadi: "✅ 148 ta savol o'qildi, ⚠️ 3 tasida to'g'ri javob aniqlanmadi (7, 52, 90-savollar), ❌ 2 ta o'tkazib yuborildi (satr 410, 833)". Tugmalar: [👀 Ko'rib chiqish] [✏️ Javoblarni belgilash] [✅ Davom etish].
B) ✍️ Matn ko'chirib tashlash — HEMIS yoki raqamlangan formatdagi matn xabar sifatida (uzun bo'lsa bir necha xabar yig'iladi, [✅ Tugatdim] bilan yakunlanadi). Xuddi shu parser.
C) 🤖 AI bilan (matn yoki mavzu) — matn/fayl yoki "mavzu" yuboriladi; sozlamalar: savollar soni (10/20/30/50), qiyinlik, til. Tarif kvotasi oldindan ko'rsatiladi ("Bugun: 2/3"); tugagan bo'lsa — paywall xabari.
D) 🔢 Savol-savol (qo'lda) — oqim:
1.  "Savol matnini yuboring" → 2. "Variantlarni yuboring (har biri alohida qatorda, 2–6 ta)" yoki bitta xabarda A) ... B) ... → 3. "To'g'ri javobni tanlang" (inline [A][B][C][D]) → 4. (ixtiyoriy) izoh → 5. [➕ Yana savol] [✅ Tugatish] [↩️ Oxirgisini o'chirish] [👁 Ko'rish]. Har savoldan keyin jami soni ko'rsatiladi.
E) 📊 Telegram quiz-so'rovnomadan import — foydalanuvchi quiz turidagi so'rovnomani (poll) botga forward qiladi; bot savol/variant/to'g'ri javobni o'qib testga qo'shadi (Bot API Poll.correct_option_id shaxsiy chatga yuborilgan quiz poll uchun mavjud; yo'q bo'lsa — javobni so'raydi). Ketma-ket bir nechta forward → bitta testga yig'iladi.
Yakuniy qadamlar (hamma usul uchun bir xil):
1.  Nom (standart: fayl nomi / mavzu) → 2. Kategoriya (tugmalar) → 3. Vaqt chegarasi (yo'q / 15 / 30 / 60 daq / boshqa) → 4. Ko'rinish (🔒 Yopiq / 🔗 Havola bilan / 🌐 Ommaviy) → 5. Ko'rib chiqish (birinchi 3 savol + jami) → [✅ Nashr qilish] [✏️ Mini Appda tahrirlash] [❌ Bekor].
Tayyor bo'lgach javob xabari: ✅ "<nom>" tayyor — N ta savol va tugmalar: [▶️ Boshlash (Mini App)] [💬 Chatda yechish] [🎴 Flashcards] [📤 Ulashish] [✏️ Tahrirlash] [📚 Kutubxonada ko'rish].
Umumiy qoidalar:
• Barcha usullar QuizCreationService.create(userId, source, payload) ni chaqiradi — web, bot va admin uchun yagona kod. Tarif limitlari (max_quizzes, max_questions) shu yerda tekshiriladi, ustadan chiqishdan oldin ko'rsatiladi.
• /cancel istalgan bosqichda ishlaydi; 30 daqiqa faolsizlikdan keyin sessiya tozalanadi ("Yaratish bekor qilindi").
• Parser va AI natijalari saqlashdan oldin validatsiya qilinadi (kamida 2 variant, to'g'ri indeks diapazonda, bo'sh matn yo'q); noto'g'ri savollar foydalanuvchiga aniq ko'rsatiladi.
• Foydalanuvchi matni HTML-escape qilinadi (S12).
• Rate limit: bir foydalanuvchiga daqiqada 20 ta xabar, soatiga 10 ta fayl.
8.3. Chatda yechish (botda)
• "💬 Chatda yechish" — savollar Telegramning quiz rejimidagi so'rovnomalari (sendPoll type=quiz) sifatida ketma-ket yuboriladi; to'g'ri javob va izoh (explanation, 200 belgigacha) Telegram o'zi ko'rsatadi.
• Telegram cheklovlari hisobga olinadi: savol ≤ 300, variant ≤ 100, variantlar 2–10 ta. Uzun matnli savollar uchun bot "Bu savolni Mini Appda yeching" deb yo'naltiradi.
• Natija server tomonida hisoblanadi, oxirida xulosa xabar (ball, vaqt, [🔁 Xatolarni takrorlash]).
• Guruhda: bot guruhga qo'shilsa, /quiz <slug> testni ketma-ket so'rovnoma sifatida yuboradi (Master tarifdagi o'qituvchi uchun); guruh reytingi oxirida e'lon qilinadi.
8.4. Bot infratuzilmasi
• grammY, prod da webhook (/api/telegram/webhook, secret_token tekshiriladi), dev da long polling. Bir nechta nusxada 409 xatosi bo'lmaydi.
• Holat bot_sessions da (qayta ishga tushirishda yo'qolmaydi). Idempotentlik: update_id takrorlari e'tiborga olinmaydi.
• Tillar: uz (lotin) birinchi, keyin ru; matnlar i18n fayllarida (packages/shared/i18n).
• Xatolarda foydalanuvchiga tushunarli xabar, adminlarga Sentry/log.
• Bildirishnomalar: natija xabari (yoqilgan bo'lsa), obuna eslatmalari, kunlik "bugun mashq qilmadingiz" (ixtiyoriy, o'chirish mumkin). Bloklangan foydalanuvchilar (403) avtomatik notifications_enabled=false.
8.5. Test yechishni server nazoratiga o'tkazish (web, Mini App, bot uchun umumiy)
1.  POST /api/attempts (quizId, mode) → server urinish yaratadi, question_order va variantlar aralashmasini saqlaydi, deadline_at ni qo'yadi; javobda to'g'ri javoblarsiz savollar.
2.  PUT /api/attempts/:id/answers — javoblarni (batch) saqlaydi (progress yo'qolmaydi, qurilma almashtirsa davom etadi). O'rganish rejimida POST /api/attempts/:id/answer darhol {isCorrect, correctIndex, explanation} qaytaradi.
3.  POST /api/attempts/:id/finish — server ballni hisoblaydi; vaqt tugagan bo'lsa avtomatik yopadi (cron ham yopadi). Natija: score, percentage, xatolar ro'yxati, to'g'ri javoblar.
4.  "Xatolarni qayta ishlash" (mode=retry_wrong) — serverdagi urinishdan yaratiladi, localStorage ga bog'liq emas.
5.  Taymer tugaganda javoblar yo'qolmasligi (hozirgi stale closure xatosi) alohida testlanadi.
8.6. Qabul mezonlari (bot)
• Yangi foydalanuvchi /start → menyu → ➕ Test yaratish → A/B/C/D/E usullarining har biri bilan test yaratib, undan keyin "▶️ Boshlash" bosib Mini Appda testni yecha oladi.
• 150 savolli HEMIS .docx yuborilsa 5 soniya ichida hisobot keladi; javobi aniqlanmagan savollar jimgina "A" bo'lib ketmaydi.
• Qo'lda 5 ta savol qo'shish oqimi xatosiz ishlaydi; /cancel holatni tozalaydi.
• Bot "2+2 nechchi?" kabi mavzudan tashqari xabarga menyu bilan javob beradi.
• Admin bo'lmagan foydalanuvchi /grant yozsa — hech narsa bo'lmaydi.
9. Veb-sayt va Telegram Mini App takomillashtirish
9.1. Sahifalar xaritasi
Yo'l
Vazifa
Kirish
/
Kirmagan: landing (qanday ishlaydi, tariflar, FAQ, bot havolasi). Kirgan: bosh sahifa (davom etish, tezkor yaratish, tavsiyalar)
hamma
/login
Telegram orqali kirish (3.1)
hamma
/create
Test yaratish ustasi (bot bilan bir xil usullar: fayl, matn, AI, qo'lda)
kirgan
/library (+ /library/saved, /public)
Kutubxona
kirgan; ommaviy qismi hamma
/q/:slug
Test sahifasi (OG-teglar)
ruxsatga qarab
/quiz/:id/attempt/:attemptId
Test yechish
kirgan
/result/:attemptId
Natija
egasi
/flashcards/:quizId
Flashcards (flashcards)
Pro+
/editor/:quizId
Muharrir (editor)
Pro+
/pricing, /checkout/:orderId
Tariflar, to'lov
kirgan
/profile
Profil va sozlamalar
kirgan
/admin/*
Admin panel
admin
/oferta, /privacy, /refund, /contacts
Huquqiy sahifalar
hamma
*
404 sahifa
hamma
9.2. Umumiy yaxshilanishlar
• Xato va yuklanish holatlari: React Error Boundary, skeleton'lar, bo'sh holat (empty state) matnlari, alert/confirm o'rniga toast/modal, tarmoq uzilishida qayta urinish.
• Ma'lumot qatlami: fetch o'rniga TanStack Query (kesh, qayta urinish, invalidatsiya); localStorage dan faqat UI afzalliklari (til, mavzu) uchun foydalaning — testlar, natijalar, retry testlari uchun emas.
• Ishlash tezligi: route bo'yicha code-splitting, uzun ro'yxatlar (150+ savol, muharrir) uchun virtualizatsiya, rasmlar lazy.
• i18n: uz (lotin) — asosiy, ru, en; kirill-o'zbek (uz-Cyrl) P3. Matnlar kalit orqali.
• Mavzu: qorong'i/yorug' (Telegramda themeParams bilan sinxron).
• Accessibility: klaviatura bilan boshqarish (1–4 — variant, ←/→ — navigatsiya, F — belgilash), kontrast, aria teglari.
• PWA: manifest, oflayn qobiq, o'rnatish tugmasi (brauzer foydalanuvchilari uchun).
• Haqiqiy gamifikatsiya: statik "1 kun" o'rniga serverdagi streak_days, xp, kunlik maqsad; test bo'yicha reyting (server hisoblagan natijalar asosida).
9.3. Test yechish (Quiz)
• 8.5 dagi server urinishi; qayta ochilganda "Davom etish".
• Rejimlar: O'rganish (darhol javob + izoh), Imtihon (taymer, oxirida natija), Xatolar (retry_wrong).
• Savollar xaritasi, belgilash (flag), o'tkazib yuborish, tasdiqlash modali (javobsiz savollar soni).
• Savol/variantlarni aralashtirish urinishga saqlanadi (sahifa yangilansa o'zgarmaydi).
• Natija sahifasi: ball, vaqt, har savol bo'yicha tahlil (sizning javobingiz/to'g'ri javob/izoh), mavzu bo'yicha tahlil (tegiga qarab), ulashish (rasmli karta), "Xatolarni takrorlash", "Flashcardsga qo'shish".
9.4. Flashcards
• 3D flip kartalar saqlanadi, lekin oraliq takrorlash (Leitner 5 quti yoki SM-2) card_progress bilan serverda: "Bilaman / Bilmayman" → keyingi ko'rsatish vaqti.
• Rejimlar: "Bugungi takrorlash", "Faqat xatolar", "Hammasi"; kunlik karta maqsadi; progress chizig'i.
• Klaviatura (Bo'shliq — aylantirish, ←/→), mobil svayp.
9.5. Muharrir (Editor)
• Avtosaqlash (debounce) va "saqlanmagan o'zgarishlar" ogohlantirishi; savol tartibini sudrab o'zgartirish; savolni nusxalash/o'chirish; ommaviy tahrirlash (kategoriya, tag); variantlar 2–6 ta; to'g'ri javob radio tugma bilan.
• needs_review savollar yuqorida ajratib ko'rsatiladi (parser javobni topa olmaganlar); nashr qilishdan oldin hammasi hal qilinishi shart.
• Dublikat savollarni topish; qidirish va almashtirish; bekor qilish/qaytarish (undo/redo).
• Eksport (tarif bo'yicha): HEMIS .txt (hozirgi), .docx, .xlsx, .pdf, .json; import shu formatlardan.
9.6. Telegram Mini App maxsus talablari
• Ishga tushganda initData serverga yuboriladi (3.1-A); Telegram.WebApp.ready(), expand(), disableVerticalSwipes() (imtihon vaqtida tasodifan yopilmasligi uchun).
• BackButton — ichki navigatsiya uchun (brauzer "orqaga" emas); MainButton — asosiy harakat ("Keyingi", "Yakunlash", "To'lash"); HapticFeedback — to'g'ri/noto'g'ri javobda; enableClosingConfirmation() — imtihon jarayonida.
• themeParams/colorScheme bilan rang sinxronlash; safeAreaInset va pastki navigatsiya bilan to'qnashmaslik; 360 px dan boshlab sinash.
• startParam deep link: quiz_<slug>, lib, pay_<orderId>, ref_<kod>.
• Qoralamalar (yaratish ustasi) CloudStorage da — qurilmalar orasida saqlanadi.
• To'lov: openInvoice (5.5-c) yoki tashqi checkout openLink.
• Ulashish: switchInlineQuery (chatni tanlab yuborish).
• Mini App va oddiy brauzer bir xil kod: isTelegram ni aniqlab, mos komponentlar tanlanadi.
• BotFather: Mini App (/newapp) yaratilib t.me/<bot>/<app> havolasi sozlanadi; bot menyu tugmasi Mini Appga yo'naltiriladi.
9.7. Landing va huquqiy sahifalar
Landing: sarlavha ("HEMIS testlarini soniyalarda testga aylantiring"), 3 qadam, bot va Mini App havolalari, tariflar, FAQ, namuna test, ijtimoiy isbot. Huquqiy sahifalar: Oferta, Maxfiylik siyosati, Qaytarish shartlari, Aloqa (Payme/Click moderatsiyasi uchun majburiy). Footer'da rekvizitlar.
10. HEMIS parser va AI generatsiya
10.1. Parser (packages/shared/hemis-parser)
Parser shared paketga ko'chiriladi (web, server, bot bir xil kodni ishlatadi) va hisobot qaytaradi:
ParseReport {
  format: 'symbol' | 'numbered' | 'lettered' | 'mixed',
  questions: ParsedQuestion[],        // correctIndex: number | null
  stats: { found, ok, needsReview, skipped },
  warnings: { line: number, code: string, message: string }[]
}
Talablar:
• Javob topilmasa correctIndex = null va needsReview = true (jimgina 0-variant EMAS). Nashr qilish va ommaviy qilishdan oldin hal qilinishi shart.
• Variantlar A–F (lotin va kirill harflari), 2–6 ta variant; ko'p qatorli savol/variantlar; #, *, +, (+), Javob: B, To'g'ri javob: B, Ans: B belgilari.
• .docx da formatlangan to'g'ri javob: mammoth.convertToHtml orqali qalin (<strong>), tagi chizilgan yoki ajratilgan rangdagi variant to'g'ri deb olinadi (HEMIS fayllarining ko'pi shunday).
• .docx jadvallari (savol | A | B | C | D | javob) qo'llab-quvvatlanadi.
• Nuqta/qavs: 1., 1), 1-savol, Savol 1; savol matni ichidagi A) kabi soxta moslashuvlarga qarshi qoidalar.
• Dublikat savollar va bo'sh variantlar aniqlanadi (ogohlantirish).
• PDF: matn qatlami bo'lmasa (skaner) — aniq xabar ("Skaner qilingan PDF qo'llab-quvvatlanmaydi"); OCR P3.
• Testlar: kamida 30 ta fixture fayl (haqiqiy HEMIS namunalari, har format, kirill, xatoli), snapshot testlar; 1 000 savolli fayl < 1 soniya.
10.2. AI generatsiya (Gemini)
• POST /api/ai/generate — requireAuth + requireQuota('ai_generation'); userId faqat sessiyadan.
• Kirish: matn/fayl yoki mavzu; parametrlar: savollar soni (5–60), qiyinlik (oson/o'rta/qiyin), til, izoh qo'shish (ha/yo'q).
• Uzun matn: 100 000 belgidan uzun bo'lsa bo'laklarga bo'linadi, har bo'lakdan proporsional savol olinadi, dublikatlar content_hash bilan olib tashlanadi.
• Chiqish validatsiyasi (zod): 4 variant, correctAnswer 0–3, savol/variantlar bo'sh emas, variantlar takrorlanmaydi, to'g'ri javob A ga qiyshaymasligi uchun serverda variantlar aralashtiriladi. Yaroqsiz javobda 2 martagacha qayta urinish; muvaffaqiyatsiz bo'lsa kvota qaytariladi.
• Tizim ko'rsatmasida (prompt) foydalanuvchi matnini "ma'lumot" sifatida ajratish (matn ichidagi ko'rsatmalarni bajarmaslik — prompt injection himoyasi).
• Fon rejimida (pg-boss) ishlaydi: uzoq vazifa uchun jobId, klient GET /api/ai/jobs/:id bilan holatni so'raydi (botda "⏳ tayyorlanmoqda" va tayyor bo'lganda xabar). priority tarifli foydalanuvchilar navbatda oldinroq.
• Hisob: har chaqiruv uchun ai_usage (user, token, model, vaqt, xato) — admin panel AI nazorati uchun. Model nomi va limitlari settings dan; global o'chirgich.
• Moderatsiya: zararli/noqonuniy mavzularga rad javobi.
11. Xavfsizlik, infratuzilma va sifat
11.1. Xavfsizlik (M0 dan boshlab)
• Sirlar: tokenni revoke qilish, .env faqat serverda, .env.example yangilanadi, README dan token olib tashlanadi, git tarixi tozalanadi. Env zod bilan tekshiriladi (yetishmasa server ishga tushmaydi). Kalitlarni aylantirish (rotation) tartibi docs/OPS.md da.
• Auth: 3.1 dagi oqimlar; refresh tokenlar xeshlanib saqlanadi; chiqishda sessions.revoked_at; barcha qurilmalardan chiqish.
• Avtorizatsiya: har marshrutda egalik/rol tekshiruvi (requireAuth, requireOwner, requireRole, requireFeature); userId ni so'rov tanasidan hech qachon olmang.
• Validatsiya: barcha body/query/params zod bilan; xato 400 + aniq maydon xabari; matn uzunligi chegaralari (savol ≤ 2 000, variant ≤ 500 belgi).
• Yuklash: hajm 15 MB; kengaytma + magic bytes tekshiruvi; .docx (zip) bomba himoyasi (ochilgan hajm limiti); xotirada ishlov, diskka yozmaslik.
• HTTP: helmet, CORS (faqat o'z domeni + Telegram), CSP (Telegram skriptlariga ruxsat), express-rate-limit (umumiy, auth, AI, to'lov uchun alohida), HTTPS majburiy, cookie: httpOnly; Secure; SameSite=Lax.
• Telegram: webhook secret_token; initData auth_date tekshiruvi; chiquvchi xabarlarda HTML-escape; broadcast tezligi cheklangan.
• To'lov: 5.5 dagi qoidalar; webhooklar uchun alohida rate-limit istisnosi, lekin imzo majburiy.
• Ma'lumot: parollar yo'q; shaxsiy ma'lumot minimal (Telegram profili); akkauntni o'chirish (DELETE /api/me) — testlar anonimlashtiriladi yoki o'chiriladi; admin amallari audit.
• Bog'liqliklar: npm audit CI da; dependabot/renovate.
• Production static: faqat dist/ beriladi (S14).
11.2. Infratuzilma
• docker-compose.yml: app (Node 22 LTS), postgres:16, (ixtiyoriy) caddy. Healthcheck /healthz va /readyz.
• Migratsiyalar drizzle-kit bilan; npm run db:migrate deployda avtomatik; scripts/migrate-sqlite-to-pg.ts.
• Loglar pino (JSON), so'rov ID, sirlarni yashirish (redaction). Xatolar Sentry'ga (ixtiyoriy).
• Zaxira: kunlik pg_dump → S3-mos xotira yoki boshqa server, 14 kun saqlash; tiklash bo'yicha yo'riqnoma va bir marta sinab ko'rish.
• CI (GitHub Actions): lint, tsc --noEmit, unit + integratsiya testlari (Postgres servis bilan), build, npm audit.
• Node'ning --env-file yoki dotenv; package.json tozalanadi (form-data, node-fetch, ikki marta vite, eskirgan OPENAI_API_KEY).
• README.md qayta yoziladi: o'rnatish, env jadvali, arxitektura sxemasi, deploy, BotFather sozlamalari, to'lov provayderlarini ulash, admin tayinlash.
11.3. Asosiy (yadro) API ro'yxati
Barcha javoblar { ok, data | error: { code, message, fields? } }. userId hech qaysi marshrutda kirishda yo'q.
Guruh
Marshrutlar
Auth
POST /api/auth/tma, /auth/login-request, GET /auth/login-request/:id, POST /auth/widget, /auth/refresh, /auth/logout, GET /api/me, PUT /api/me, DELETE /api/me
Obuna
GET /api/plans, GET /api/me/entitlements, GET /api/me/subscription, POST /api/orders, GET /api/orders, POST /api/orders/:id/proof (chek), POST /api/promo/validate
To'lov (webhook)
POST /api/payments/payme, /payments/click/prepare, /payments/click/complete, /api/telegram/webhook
Test yaratish
POST /api/quizzes/parse (fayl/matn → ParseReport, saqlamaydi), POST /api/quizzes (QuizCreationService), POST /api/ai/generate, GET /api/ai/jobs/:id
Testlar
GET/PUT/DELETE /api/quizzes/:id, POST /api/quizzes/:id/publish, /fork, /report, GET /api/quizzes/:id/export?format=
Urinishlar
POST /api/attempts, PUT /api/attempts/:id/answers, POST .../answer, POST .../finish, GET /api/attempts/:id, GET /api/attempts?cursor=
Flashcards
GET /api/flashcards/:quizId/due, POST /api/flashcards/review
Kutubxona / Admin
6.4 va 7.5 bo'limlarda
12. Bosqichlar (yo'l xaritasi) va qabul mezonlari
Har bosqichdan keyin: testlar o'tadi, docs/CHANGELOG.md yangilanadi, ishlaydigan holat commit qilinadi.
M0 — Xavfsizlik va poydevor (P0, eng birinchi)
• Tokenni revoke qilish, README/git tarixini tozalash; env validatsiya.
• Monorepo tuzilmasi, Postgres + Drizzle, migratsiya skripti, eski SQLite ma'lumotini ko'chirish.
• Server sessiyalari va yangi auth (3.1); demo kirish/to'lov productionda o'chirilgan.
• Barcha marshrutlarda egalik/rol tekshiruvi; zod validatsiya; helmet/CORS/rate-limit; static faqat dist.
• Qabul: 1.2 jadvalidagi S1–S14 ning har biri uchun avtomatik test (yoki qo'lda tekshiruv ro'yxati) o'tadi.
M1 — Obuna yadrosi (P0)
• plans bazada + seed; entitlements moduli; activateSubscription; cron (tugash, eslatma); paywall (web va bot); AI kvotasi atomik.
• Editor, Flashcards, wrong-only, eksport, saqlash limitlari serverda majburlanadi.
• Qabul: 5.6.
M2 — Admin panel v1 (P0)
• Rollar, /admin karkasi, Dashboard, Foydalanuvchilar (qidiruv, profil, obuna berish/bekor qilish, ban, override), Obunalar, Buyurtmalar, Tariflar, Audit; botda /grant, /stats.
• Qabul: 6.6.
M3 — To'lovlar (P0)
• Qo'lda (chek) to'lov → Payme → Click → Telegram invoice; huquqiy sahifalar; promo; buyurtma/to'lov sahifalari; kunlik solishtirish.
• Qabul: 5.5/5.6 (sandbox bilan).
M4 — Test yaratish yadrosi va bot (P0)
• QuizCreationService, parser v2 (hisobot, needs_review, docx formatlash), AI v2 (validatsiya, fon vazifa).
• grammY + webhook; bot menyusi; ➕ Test yaratish ustasi (A, B, C, D, E); chatda yechish; guruh rejimi.
• Qabul: 8.6, 10.
M5 — Server urinishlari va yechish tajribasi (P1)
• 8.5 dagi urinish API; resume; taymer xatosi tuzatilgan; natija tahlili; reyting; real streak/XP.
• Qabul: to'g'ri javoblar yechish paytida tarmoqda ko'rinmaydi; urinishni boshqa qurilmada davom ettirish mumkin.
M6 — Kutubxona (P1)
• 7-bo'lim to'liq: bo'limlar, qidiruv, kategoriyalar, saqlash, papkalar, ulashish, deep link, inline rejim, shikoyatlar, moderatsiya (admin).
M7 — Veb va Mini App sayqali (P1)
• Landing, /create ustasi, profil, Error Boundary/toast, TanStack Query, i18n (uz, ru), mavzu, PWA; Mini App API'lari (BackButton, MainButton, haptic, closing confirmation, CloudStorage, startParam).
• Flashcards (spaced repetition), Muharrir (avtosaqlash, undo, dublikat, eksport formatlari).
M8 — Admin v2 va o'sish (P2)
• Ommaviy obuna (CSV), xabarnoma (broadcast), AI nazorati, moderatsiya navbati, hisobotlar/CSV, referal, trial sozlamalari.
M9 — Sifat va ishga tushirish (P1→P2)
• E2E testlar, yuklama sinovi, zaxira/tiklash sinovi, monitoring, README/OPS hujjatlari, production deploy tekshiruv ro'yxati.
P3 (keyinroq)
OCR (skaner PDF), rasmli savollar, formulalar (KaTeX), Telegram Stars, uz-Cyrl, o'qituvchi guruhlari/sinflar, topshiriq berish va natijalar jadvali, jamoaviy (live) viktorina rejimi.
13. Test strategiyasi (QA)
• Unit (Vitest): parser (30+ fixture), entitlements, activateSubscription (upgrade/queue/extend/idempotent), promo hisobi, Click imzosi, Payme holat mashinasi, SM-2/Leitner, kvota atomikligi (parallel so'rovlar).
• Integratsiya (Supertest + test Postgres): auth oqimlari (yaroqli/muddati o'tgan initData, boshqa brauzerda login-request), IDOR testlari (har marshrut uchun "boshqa foydalanuvchi" holati), 402/403 holatlar, webhook'lar, urinish hayot sikli.
• Bot testlari: Telegram API mock bilan ustalar oqimi (A–E), /cancel, paywall xabarlari, admin buyruqlari ruxsati.
• E2E (Playwright): kirish (test rejimi), fayl yuklash → test → natija; paywall → admin obuna beradi → ochiladi; to'lov sandbox; kutubxona qidiruv va saqlash; mobil viewport (360×740).
• Qo'lda tekshiruv ro'yxati: haqiqiy Telegramda Mini App (iOS, Android, Desktop), orqaga tugma, mavzu almashishi, imtihon paytida yopish ogohlantirishi, to'lov, bot menyusi.
• Yuklama: 500 bir vaqtdagi urinish, 150 savolli test, broadcast navbati.
• Qamrov maqsadi: yadro modullarda (parser, obuna, to'lov, auth) ≥ 80%.
14. Taxminlar va ochiq savollar (egasi javob bersin)
1.  "Kutubxona" — test kutubxonasi deb olindi (7-bo'lim). Agar boshqa ma'no bo'lsa, shu bo'limni qayta yozish kerak.
2.  Baza: SQLite → PostgreSQL ga o'tish taklif qilindi. Agar bitta kichik VPS bo'lsa va murakkablik kerak bo'lmasa, better-sqlite3 (WAL) bilan qolish mumkin — lekin JSON fallback baribir olib tashlanadi.
3.  To'lov provayderlari: Payme va Click uchun merchant akkauntlar (kalitlar, service_id) mavjudmi? Bo'lmasa M3 da avval qo'lda (chek) to'lov ishlaydi.
4.  Bepul tarif chegaralari (5.1 jadvali) — boshlang'ich taklif; biznes qaroriga qarab admin paneldan o'zgartiriladi.
5.  Bot tili: uz (lotin) → ru; ingliz tili keyin.
6.  Ommaviy kutubxona moderatsiyasi: kim moderatsiya qiladi (faqat admin)? Avtomatik filtr kerakmi?
7.  Telegram raqamli tovar qoidalari (Stars) — amaldagi shartlar bo'yicha tekshirilsin (5.5-c).
8.  Domen va HTTPS (Mini App uchun majburiy) mavjudmi? Bot username (quizgenrobot) saqlanadimi?
9.  Ma'lumotni saqlash muddati va maxfiylik: foydalanuvchi ma'lumotlari qancha saqlanadi (Maxfiylik siyosati matni uchun).
15. AI agentga topshirish uchun qisqa ko'rsatma (nusxalab bering)
Sen senior full-stack muhandissan. Ilova qilingan QUIZGEN v3 TZ hujjatini boshidan oxirigacha o'qi va QUIZGEN-main kod bazasida ishla. Qoidalar: (1) 0-bo'lim qoidalariga so'zsiz amal qil; (2) ishni M0 → M9 tartibida bajar, bosqichni tugatmay keyingisiga o'tma; (3) har bosqichdan oldin 3–5 qatorli reja yoz, keyin kodla; (4) har bosqich oxirida testlarni ishga tushir va TZ dagi "Qabul mezonlari" ni bandma-band tekshirib, natijani docs/PROGRESS.md ga yoz; (5) noaniq joyda 14-bo'limga qara, so'ng eng xavfsiz oddiy variantni tanla va docs/DECISIONS.md ga yoz; (6) sirlarni hech qachon kodga yozma; (7) mavjud funksiyalarni (HEMIS parser, test yechish, flashcards, editor) buzma — ularni TZ ga muvofiq takomillashtir. Boshlash: M0 — avval 1.2 jadvalidagi S1–S14 xatolarini tuzat.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-11-17T09:57:17+05:00.

The user's current state is as follows:
Active Document: c:\Users\User\Desktop\Projectst\QUIZGEN v2\server.ts (LANGUAGE_UNSPECIFIED)
Cursor is on line: 962
Other open documents:
- c:\Users\User\Desktop\Projectst\QUIZGEN v2\src\pages\Quiz.tsx (LANGUAGE_UNSPECIFIED)
- c:\Users\User\Desktop\Projectst\QUIZGEN v2\src\contexts\AuthContext.tsx (LANGUAGE_UNSPECIFIED)
- c:\Users\User\Desktop\Projectst\QUIZGEN v2\src\pages\Home.tsx (LANGUAGE_UNSPECIFIED)
- c:\Users\User\Desktop\Projectst\QUIZGEN v2\src\pages\Pricing.tsx (LANGUAGE_UNSPECIFIED)
</ADDITIONAL_METADATA>