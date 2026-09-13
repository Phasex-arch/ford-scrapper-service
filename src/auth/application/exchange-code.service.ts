import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { JwtPayload } from '../domain/authenticated-user.js';

interface ExchangeEntry {
  payload: JwtPayload;
  expiresAt: number;
}

/**
 * Códigos de troca de uso único e curta duração, usados na ponte de sessão
 * portal -> dealership: em vez de o portal colocar o JWT de 8h direto no
 * fragmento da URL (onde pode ficar em histórico do navegador, extensões,
 * etc.), ele pede um código aqui, repassa só o código na URL, e o
 * dealership troca esse código pelo JWT de verdade via POST /auth/exchange.
 *
 * Guardado em memória (Map) — aceitável para este deploy de instância
 * única; um deploy com múltiplas réplicas do backend precisaria de um
 * store compartilhado (Redis, etc.) para o código funcionar não importa
 * qual réplica atenda a troca.
 */
@Injectable()
export class ExchangeCodeService {
  private readonly codes = new Map<string, ExchangeEntry>();
  private readonly ttlMs = 30_000;

  create(payload: JwtPayload): string {
    this.cleanup();
    const code = randomUUID();
    this.codes.set(code, { payload, expiresAt: Date.now() + this.ttlMs });
    return code;
  }

  /** Uso único: o código é removido mesmo se inválido/expirado. */
  redeem(code: string): JwtPayload | null {
    const entry = this.codes.get(code);
    this.codes.delete(code);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.payload;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.codes) {
      if (entry.expiresAt < now) this.codes.delete(key);
    }
  }
}
