/**
 * End-to-End Encryption Utilities
 *
 * Uses ECDH (Elliptic Curve Diffie-Hellman) for key exchange
 * and AES-GCM for symmetric encryption.
 */

// Key pair for ECDH key exchange
export interface KeyPairData {
  publicKey: JsonWebKey;
  privateKey: CryptoKey;
}

// Encrypted message format
export interface EncryptedData {
  ciphertext: string;  // Base64 encoded
  iv: string;          // Base64 encoded initialization vector
}

// Store for derived shared secrets with other users
const sharedSecrets = new Map<string, CryptoKey>();

/**
 * Generate an ECDH key pair for key exchange
 */
export async function generateKeyPair(): Promise<KeyPairData> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true, // extractable (for public key export)
    ['deriveKey']
  );

  // Export public key as JWK for transmission
  const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

  return {
    publicKey,
    privateKey: keyPair.privateKey
  };
}

/**
 * Import a public key from JWK format
 */
export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    []
  );
}

/**
 * Derive a shared secret from our private key and their public key
 */
export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKeyJwk: JsonWebKey
): Promise<CryptoKey> {
  const publicKey = await importPublicKey(publicKeyJwk);

  // Derive an AES-GCM key from the ECDH shared secret
  const sharedSecret = await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  );

  return sharedSecret;
}

/**
 * Store a derived shared secret for a user
 */
export function storeSharedSecret(userId: string, secret: CryptoKey): void {
  sharedSecrets.set(userId, secret);
}

/**
 * Get a stored shared secret for a user
 */
export function getSharedSecret(userId: string): CryptoKey | undefined {
  return sharedSecrets.get(userId);
}

/**
 * Remove a shared secret (when user leaves)
 */
export function removeSharedSecret(userId: string): void {
  sharedSecrets.delete(userId);
}

/**
 * Clear all shared secrets
 */
export function clearSharedSecrets(): void {
  sharedSecrets.clear();
}

/**
 * Encrypt a message using AES-GCM
 */
export async function encryptMessage(
  message: string,
  sharedSecret: CryptoKey
): Promise<EncryptedData> {
  // Generate a random initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encode message as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    sharedSecret,
    data
  );

  // Convert to base64 for transmission
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv)
  };
}

/**
 * Decrypt a message using AES-GCM
 */
export async function decryptMessage(
  encryptedData: EncryptedData,
  sharedSecret: CryptoKey
): Promise<string> {
  const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
  const iv = base64ToArrayBuffer(encryptedData.iv);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    sharedSecret,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt data for multiple recipients
 * Returns a map of userId -> encrypted data
 */
export async function encryptForAll(
  message: string,
  recipientIds: string[]
): Promise<Map<string, EncryptedData>> {
  const results = new Map<string, EncryptedData>();

  for (const recipientId of recipientIds) {
    const sharedSecret = getSharedSecret(recipientId);
    if (sharedSecret) {
      const encrypted = await encryptMessage(message, sharedSecret);
      results.set(recipientId, encrypted);
    }
  }

  return results;
}

/**
 * Encrypt a file/blob
 */
export async function encryptFile(
  data: ArrayBuffer,
  sharedSecret: CryptoKey
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    sharedSecret,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv)
  };
}

/**
 * Decrypt a file/blob
 */
export async function decryptFile(
  encryptedData: EncryptedData,
  sharedSecret: CryptoKey
): Promise<ArrayBuffer> {
  const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
  const iv = base64ToArrayBuffer(encryptedData.iv);

  return crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    sharedSecret,
    ciphertext
  );
}

// Utility functions for base64 conversion
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a fingerprint for a public key (for verification)
 */
export async function getKeyFingerprint(publicKey: JsonWebKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(publicKey));
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));

  // Take first 8 bytes and format as hex pairs
  return hashArray
    .slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();
}

/**
 * Check if encryption is supported in this browser
 */
export function isEncryptionSupported(): boolean {
  try {
    return !!(
      typeof crypto !== 'undefined' &&
      crypto.subtle
    );
  } catch {
    return false;
  }
}
