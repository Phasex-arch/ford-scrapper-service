import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

/**
 * AES-256-GCM encryption-at-rest provider.
 * Provides authenticated encryption (slide 19): random 96-bit IV per record,
 * 128-bit auth tag protects against ciphertext tampering.
 *
 * Output format: base64(iv || authTag || ciphertext)
 */
@Injectable()
export class AesGcmService implements OnModuleInit {
  private readonly logger = new Logger(AesGcmService.name);
  private key!: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const raw = this.config.get<string>('DATA_ENCRYPTION_KEY');
    if (!raw) {
      throw new Error(
        'DATA_ENCRYPTION_KEY is required. Generate one with: openssl rand -base64 32',
      );
    }
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length !== KEY_LENGTH) {
      throw new Error(
        `DATA_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${decoded.length}). ` +
          'Generate with: openssl rand -base64 32',
      );
    }
    this.key = decoded;
    this.logger.log('AES-256-GCM key loaded');
  }

  encrypt(plaintext: string): string {
    if (plaintext === null || plaintext === undefined) {
      throw new Error('Cannot encrypt null or undefined');
    }
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, enc]).toString('base64');
  }

  decrypt(payload: string): string {
    const raw = Buffer.from(payload, 'base64');
    if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Ciphertext too short / corrupted');
    }
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return dec.toString('utf8');
  }

  /**
   * Constant-time string comparison wrapper. Use whenever comparing
   * secrets, HMACs, or tokens to defeat timing side-channels.
   */
  safeEquals(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  }
}
