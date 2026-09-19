import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.ENCRYPTION_SECRET
  ? crypto.createHash('sha256').update(process.env.ENCRYPTION_SECRET).digest()
  : crypto.createHash('sha256').update('nexus_suite_secure_default_key_2026').digest();

/**
 * Encrypt sensitive OAuth tokens before saving in database
 */
export function encryptToken(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive OAuth tokens from database
 */
export function decryptToken(cipherText: string): string {
  if (!cipherText) return '';
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 2) return cipherText; // Fallback if plain text stored
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt token:', err);
    return cipherText;
  }
}

/**
 * Verify Meta HMAC-SHA256 signature for Meta WhatsApp & Facebook webhooks
 */
export function verifyMetaWebhookSignature(
  rawPayload: string | Buffer,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader) return false;
  try {
    const parts = signatureHeader.split('=');
    const signature = parts[1] || signatureHeader;
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawPayload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  } catch (err) {
    return false;
  }
}

/**
 * Generate secure random API key for Website contact form submissions
 */
export function generateWebsiteApiKey(): string {
  const randomHex = crypto.randomBytes(24).toString('hex');
  return `nx_live_${randomHex}`;
}
