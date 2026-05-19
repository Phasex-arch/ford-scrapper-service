import { randomUUID } from 'node:crypto';
import type { Params } from 'nestjs-pino';

/**
 * Pino logging configuration (slide 24).
 *
 * - JSON output in production for log aggregators.
 * - Pretty output in dev so the team can read it.
 * - Redaction prevents passwords, JWTs and CPFs from ever being persisted
 *   to log files (slide 22 "exposição acidental").
 * - Genitalized trace_id propagation is handled by the
 *   `RequestIdInterceptor`; we also expose `req.id` for pino-http.
 */
export function buildPinoConfig(): Params {
  const isProd = process.env.NODE_ENV === 'production';
  const level = process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug');

  return {
    pinoHttp: {
      level,
      genReqId: (req) => {
        const traceHeader = req.headers['x-trace-id'];
        if (
          typeof traceHeader === 'string' &&
          /^[\w-]{8,128}$/.test(traceHeader)
        ) {
          return traceHeader;
        }
        return randomUUID();
      },
      customProps: (req) => ({
        traceId: (req as { traceId?: string }).traceId,
      }),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-signature"]',
          'req.headers["idempotency-key"]',
          'req.body.password',
          'req.body.senha',
          'req.body.cpf',
          'req.body.refreshToken',
          'req.body.token',
          'res.headers["set-cookie"]',
          '*.password',
          '*.senha',
          '*.cpf',
          '*.token',
          '*.accessToken',
          '*.refreshToken',
          '*.refreshHash',
          '*.passwordHash',
          '*.cpfEncrypted',
          '*.telefoneEnc',
        ],
        censor: '[REDACTED]',
      },
      ...(isProd
        ? {}
        : {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: true,
                translateTime: 'SYS:HH:MM:ss.l',
                ignore: 'pid,hostname',
              },
            },
          }),
    },
  };
}
