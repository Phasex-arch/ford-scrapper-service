import { Transform } from 'class-transformer';
import { safeFreeText } from './string.sanitizer.js';

/**
 * P0-2: sanitiza texto livre no proprio DTO — antes da validacao e antes de
 * chegar ao banco. O dealership renderiza esses campos (busca global, listas),
 * entao tag que e persistida crua vira XSS armazenado na sessao de um
 * atendente. `safeFreeText` ja cobre os payloads do spec do sanitizador.
 */
export const SanitizeFreeText = (maxLen: number) =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? safeFreeText(value, maxLen) : value,
  );
