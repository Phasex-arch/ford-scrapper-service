/**
 * Unico ponto de leitura do JWT_SECRET. Falha fechado: sem segredo, ou com um
 * segredo curto o bastante para forca bruta, a aplicacao nao sobe.
 *
 * 32 caracteres e o minimo para HS256 (tamanho do bloco do SHA-256); abaixo
 * disso a chave e mais fraca que o algoritmo que a usa.
 */
export const JWT_SECRET_MIN_LENGTH = 32;

export function assertJwtSecret(secret: string | undefined): string {
  if (!secret) {
    throw new Error('JWT_SECRET nao definido no ambiente');
  }
  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET muito curto: ${secret.length} caracteres, minimo ${JWT_SECRET_MIN_LENGTH}. ` +
        'Gere um novo com `openssl rand -base64 48`.',
    );
  }
  return secret;
}
