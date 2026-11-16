import crypto from 'crypto';

export interface TelegramUserData {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: number | string;
  hash?: string;
}

/**
 * Telegram Login Widget ma'lumotlarini tekshirish
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramWidgetAuth(data: Record<string, any>, botToken: string): boolean {
  if (!botToken || !data.hash) return false;

  const { hash, ...userData } = data;

  const checkString = Object.keys(userData)
    .sort()
    .map(key => `${key}=${userData[key]}`)
    .join('\n');

  // SHA256(bot_token)
  const secretKey = crypto.createHash('sha256').update(botToken).digest();

  // HMAC-SHA256(check_string, secret_key)
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  return hmac === hash;
}

/**
 * Telegram Mini App (TMA) initData ma'lumotlarini tekshirish
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramWebAppData(initData: string, botToken: string): { valid: boolean; user?: TelegramUserData } {
  if (!botToken || !initData) return { valid: false };

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return { valid: false };

    urlParams.delete('hash');

    const pairs: string[] = [];
    urlParams.forEach((val, key) => {
      pairs.push(`${key}=${val}`);
    });
    pairs.sort();
    const dataCheckString = pairs.join('\n');

    // HMAC-SHA256("WebAppData", botToken)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    // HMAC-SHA256(dataCheckString, secretKey)
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      return { valid: false };
    }

    const userRaw = urlParams.get('user');
    const user = userRaw ? JSON.parse(userRaw) : undefined;

    return { valid: true, user };
  } catch (err) {
    console.error('verifyTelegramWebAppData error:', err);
    return { valid: false };
  }
}

