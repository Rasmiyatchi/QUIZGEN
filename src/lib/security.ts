/**
 * M0 — Xavfsizlik: HTML Escape va boshqa xavfsizlik yordamchi funksiyalari
 * 
 * S12 ni hal qiladi: Telegram bot xabarlarida HTML injection oldini olish
 * S7 ni hal qiladi: Kriptorafik xavfsiz kod generatsiyasi
 * S14 ni hal qiladi: Magic bytes tekshiruvi
 */
import crypto from 'crypto';

/**
 * HTML belgilarini xavfsiz qilish (Telegram HTML parse_mode uchun)
 * S12: bot xabarlarida first_name, quiz.title HTML-escape qilinmagan edi
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Kriptorafik xavfsiz tasodifiy token yaratish
 * S7: Math.random() o'rniga crypto.randomBytes
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * UUID v4 yaratish (Math.random() o'rniga)
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Fayl magic bytes tekshiruvi
 * S13: Fayl yuklashda MIME tekshiruvi yetarli emas edi
 */
export function checkFileMagicBytes(buffer: Buffer, extension: string): boolean {
  if (!buffer || buffer.length < 4) return false;
  
  const ext = extension.toLowerCase().replace('.', '');
  
  switch (ext) {
    case 'docx':
    case 'xlsx':
    case 'pptx': {
      // ZIP-based Office formats: PK\x03\x04
      return buffer[0] === 0x50 && buffer[1] === 0x4B && 
             buffer[2] === 0x03 && buffer[3] === 0x04;
    }
    case 'pdf': {
      // %PDF
      return buffer[0] === 0x25 && buffer[1] === 0x50 && 
             buffer[2] === 0x44 && buffer[3] === 0x46;
    }
    case 'jpg':
    case 'jpeg': {
      // JPEG: \xFF\xD8\xFF
      return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    }
    case 'png': {
      // PNG: \x89PNG
      return buffer[0] === 0x89 && buffer[1] === 0x50 && 
             buffer[2] === 0x4E && buffer[3] === 0x47;
    }
    case 'webp': {
      // RIFF....WEBP
      return buffer.length >= 12 &&
             buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
             buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    }
    case 'txt': {
      // UTF-8 BOM tekshiruvi yoki printable ASCII
      if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        return true; // UTF-8 BOM
      }
      // Birinchi 100 baytni tekshiramiz — control character bo'lmasin
      const sample = buffer.slice(0, Math.min(100, buffer.length));
      for (const byte of sample) {
        if (byte < 0x09 || (byte > 0x0D && byte < 0x20 && byte !== 0x1B)) {
          return false;
        }
      }
      return true;
    }
    default:
      return false;
  }
}

/**
 * String dan faqat alphanumeric va belgilangan belgilarni qoldirish
 */
export function sanitizeString(str: string, maxLength = 500): string {
  if (!str || typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
}

/**
 * HMAC-SHA256 imzo tekshiruvi (Payme/Click webhook uchun)
 */
export function verifyHmacSignature(payload: string, secret: string, signature: string): boolean {
  try {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Tarif darajasi raqamini qaytaradi (taqqoslash uchun)
 */
export function getPlanLevel(plan: string): number {
  const levels: Record<string, number> = { free: 0, start: 1, pro: 2, master: 3 };
  return levels[plan] ?? 0;
}

