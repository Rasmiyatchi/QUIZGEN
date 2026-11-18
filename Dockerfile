# ===================================================
# QUIZGEN v3 — Multi-Stage Production Dockerfile
# ===================================================

# 1. Build bosqichi
FROM node:22-alpine AS builder

WORKDIR /app

# Paket menejeri fayllarini nusxalash
COPY package*.json ./
RUN npm ci

# Kod bazasini nusxalash va build qilish
COPY . .
RUN npm run build

# 2. Production Runtime bosqichi
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Faqat ishlab chiqarish uchun zarur fayllar
COPY package*.json ./
RUN npm ci --omit=dev

# Dist katalogini builder bosqichidan olish
COPY --from=builder /app/dist ./dist

# Doimiy saqlash kataloglari
RUN mkdir -p /app/data /app/data/backups /app/uploads

# Port ochish
EXPOSE 3000

# Ishga tushirish
CMD ["node", "dist/server.js"]
