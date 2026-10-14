export class DomainError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type TicketState = 'RECIBIDO' | 'EN_LEVANTAMIENTO' | 'PENDIENTE_APROBACION' | 'APROBADO' | 'EN_EJECUCION' | 'ENTREGADO' | 'CERRADO' | 'RECHAZADO' | 'CANCELADO';
const transitions: Record<TicketState, TicketState[]> = {
  RECIBIDO: ['EN_LEVANTAMIENTO', 'CANCELADO'],
  EN_LEVANTAMIENTO: ['PENDIENTE_APROBACION', 'CANCELADO'],
  PENDIENTE_APROBACION: ['APROBADO', 'RECHAZADO', 'EN_LEVANTAMIENTO', 'CANCELADO'],
  APROBADO: ['EN_EJECUCION', 'CANCELADO'],
  EN_EJECUCION: ['ENTREGADO', 'CANCELADO'],
  ENTREGADO: ['CERRADO', 'CANCELADO'],
  CERRADO: [], RECHAZADO: [], CANCELADO: [],
};
export function assertTransition(from: TicketState, to: TicketState) {
  if (!transitions[from]?.includes(to)) throw new DomainError(`Transición inválida: ${from} → ${to}`);
}
export function assertApprover(actor: { id: string; isActive: boolean; canApproveRequests: boolean }, approverId: string | null) {
  if (!actor.isActive || !actor.canApproveRequests || actor.id !== approverId) throw new DomainError('Debe decidir el aprobador activo designado y habilitado', 403);
}
export function validateDistribution(rows: { areaId: string; percent: number }[]) {
  if (!rows.length || new Set(rows.map(r => r.areaId)).size !== rows.length || rows.some(r => !r.areaId || !Number.isFinite(r.percent) || r.percent <= 0 || r.percent > 100) || Math.abs(rows.reduce((n, r) => n + r.percent, 0) - 100) > 0.000001) {
    throw new DomainError('Áreas únicas y porcentajes positivos deben sumar 100%');
  }
}
export interface PhysicalResource { kind: string; quantity: number; unit: string; unitRate: number | null; currency: string | null }
export function summarizeResources(rows: PhysicalResource[]) {
  const quantities = new Map<string, { kind: string; unit: string; quantity: number }>();
  const costs = new Map<string, number>();
  let unpricedCount = 0;
  for (const row of rows) {
    const key = JSON.stringify([row.kind, row.unit]);
    const group = quantities.get(key) ?? { kind: row.kind, unit: row.unit, quantity: 0 };
    group.quantity += row.quantity; quantities.set(key, group);
    if (row.unitRate === null || !row.currency) unpricedCount++;
    else costs.set(row.currency, (costs.get(row.currency) ?? 0) + row.quantity * row.unitRate);
  }
  return { quantities: [...quantities.values()], costs: [...costs].map(([currency, amount]) => ({ currency, amount })), unpricedCount };
}
export function uniqueProjectSummary(rows: { id: string; hasDistribution: boolean }[]) {
  const projects = [...new Map(rows.map(p => [p.id, p])).values()];
  return { projectCount: projects.length, withoutDistribution: projects.filter(p => !p.hasDistribution).map(p => p.id) };
}
export function isSafeHttpLink(value: string) {
  if (/[\u0000-\u0020\u007f]/.test(value)) return false;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !!url.hostname; } catch { return false; }
}

export function assertScopeChangeContext(ticket: { status: TicketState; projectId: string | null }) {
  if (!['APROBADO', 'EN_EJECUCION'].includes(ticket.status)) throw new DomainError('El cambio requiere ticket aprobado o en ejecución');
  if (!ticket.projectId) throw new DomainError('Vincule primero el ticket a un proyecto para solicitar un cambio de alcance');
}
export function appRecordLink(baseUrl: string, kind: 'ticket' | 'project', id: string) {
  if (!isSafeHttpLink(baseUrl)) throw new DomainError('URL de aplicación inválida', 500);
  const origin = new URL(baseUrl).origin;
  if (kind === 'ticket') return `${origin}/dashboard/requerimientos/${encodeURIComponent(id)}`;
  return `${origin}/dashboard/proyectos?projectId=${encodeURIComponent(id)}`;
}

export function scopeReportProjects<T extends { id: string; hasDistribution: boolean }, R extends PhysicalResource & { projectId: string }>(projects: T[], resources: R[], projectId?: string | null) {
  const scoped = [...new Map(projects.filter(p => projectId === undefined || p.id === projectId).map(p => [p.id, p])).values()];
  const projectIds = new Set(scoped.map(p => p.id));
  const includedResources = resources.filter(r => projectIds.has(r.projectId));
  return {
    projects: scoped.map(p => {
      const rows = includedResources.filter(r => r.projectId === p.id);
      return { ...p, resources: rows, resourceSummary: summarizeResources(rows) };
    }),
    summary: { ...uniqueProjectSummary(scoped), resources: summarizeResources(includedResources) },
  };
}
