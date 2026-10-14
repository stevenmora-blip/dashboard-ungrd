import { DomainError } from './domain';
// One global bucket per service instance: a caller cannot evade it by spoofing
// forwarded headers. Multi-instance deployments must use a shared durable store.
const state = globalThis as typeof globalThis & { gestionIntakeLimit?: { windowStart: number; count: number } };
export function limitPublicIntake() {
  const now = Date.now();
  const bucket = state.gestionIntakeLimit ??= { windowStart: now, count: 0 };
  if (now - bucket.windowStart >= 60000) { bucket.windowStart = now; bucket.count = 0; }
  if (++bucket.count > 30) throw new DomainError('Límite de recepción alcanzado; reintente en un minuto', 429);
}
