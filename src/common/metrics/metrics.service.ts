import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import type { SecurityEventType } from '../security/security-event.logger.js';

// Séries nascem em 0: sem uma amostra anterior, o increase() do Prometheus
// ignora o primeiro evento e o alerta de brute force nunca dispara.
const SECURITY_EVENT_TYPES: (SecurityEventType | 'brute_force_suspected')[] = [
  'login_failed',
  'login_success',
  'invalid_token',
  'expired_token',
  'access_denied',
  'suspicious_activity',
  'brute_force_suspected',
];

/**
 * Métricas no formato Prometheus, expostas em GET /api/metrics e lidas pelo
 * stack de observability/ (Prometheus + Grafana). Registry próprio, e não o
 * global do prom-client, para cada instância da app ter o seu (testes sobem
 * várias).
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpRequests = new Counter({
    name: 'http_requests_total',
    help: 'Requisições HTTP por método, rota e status',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });

  readonly httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Latência das requisições HTTP',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  readonly securityEvents = new Counter({
    name: 'security_events_total',
    help: 'Eventos de segurança (login_failed, access_denied, brute_force_suspected, ...)',
    labelNames: ['type'] as const,
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    for (const type of SECURITY_EVENT_TYPES) this.securityEvents.inc({ type }, 0);
  }
}
