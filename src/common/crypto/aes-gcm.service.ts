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
  private key: Buffer | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const raw = this.config.get<string>('DATA_ENCRYPTION_KEY');
    if (!raw) {
      this.logger.warn(
        'DATA_ENCRYPTION_KEY ausente; AES-256-GCM em repouso ficará indisponível. Gere com: openssl rand -base64 32',
      );
      return;
    }
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length !== KEY_LENGTH) {
      this.logger.error(
        `DATA_ENCRYPTION_KEY deve decodificar para ${KEY_LENGTH} bytes (recebido ${decoded.length}). Gere com: openssl rand -base64 32`,
      );
      return;
    }
    this.key = decoded;
    this.logger.log('AES-256-GCM key carregada com sucesso');
  }

  /** Garante que a chave está disponível; usado por encrypt/decrypt. */
  private requireKey(): Buffer {
    if (!this.key) {
      throw new Error(
        'AES-256-GCM indisponível: defina DATA_ENCRYPTION_KEY (32 bytes base64) no ambiente',
      );
    }
    return this.key;
  }

  isAvailable(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): string {
    if (plaintext === null || plaintext === undefined) {
      throw new Error('Cannot encrypt null or undefined');
    }
    const key = this.requireKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, enc]).toString('base64');
  }

  decrypt(payload: string): string {
    const key = this.requireKey();
    const raw = Buffer.from(payload, 'base64');
    if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Ciphertext too short / corrupted');
    }
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
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
