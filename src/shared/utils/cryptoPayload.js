import crypto from 'crypto';

const DEFAULT_SECRET = 'realestate_payload_encrypt_secret_32b'; // 32 characters fallback

/**
 * Normalizes secret key to 32 bytes for aes-256-cbc
 */
function getKey(secret) {
  const keyStr = secret || process.env.RESPONSE_ENCRYPT_KEY || DEFAULT_SECRET;
  return crypto.createHash('sha256').update(String(keyStr)).digest();
}

/**
 * Encrypts data object or string into iv:encryptedData hex format using AES-256-CBC
 */
export function encryptPayload(data, secretKey) {
  if (data === undefined || data === null) return data;
  
  const key = getKey(secretKey);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts iv:encryptedData hex string back into original parsed JSON object or string
 */
export function decryptPayload(encryptedPayload, secretKey) {
  if (!encryptedPayload || typeof encryptedPayload !== 'string' || !encryptedPayload.includes(':')) {
    return encryptedPayload;
  }
  
  const [ivHex, encryptedText] = encryptedPayload.split(':');
  const key = getKey(secretKey);
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
}
