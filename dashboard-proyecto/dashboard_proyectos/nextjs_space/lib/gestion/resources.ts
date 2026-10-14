import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { DomainError, summarizeResources } from './domain';
import { actor, Actor, audit, owner, personSelect, projectWhere, requireProject, ticketWhere, transaction } from './server';
import { date, resourceSchema } from './validation';
export const resourceInclude = { person: { select: personSelect }, project: { select: { id: true, name: true } }, ticket: { select: { id: true, number: true, title: true } }, task: { select: { id: true, name: true } } } as const;
export function resourceWhere(user: Actor, query: URLSearchParams): Prisma.ResourceConsumptionWhereInput {
  const from = query.get('from'), to = query.get('to');
  if (from) date.parse(from); if (to) date.parse(to);
  if (from && to && from > to) throw new DomainError('Intervalo de fechas inválido');
  return { AND: [
    { project: { isActive: true, ...projectWhere(user) } },
    ...(user.role === 'ADMIN' ? [] : [{ OR: [{ ticketId: null }, { ticket: ticketWhere(user) }] }]),
    ...(query.get('projectId') ? [{ projectId: query.get('projectId')! }] : []),
    ...(query.get('ticketId') ? [{ ticketId: query.get('ticketId')! }] : []),
    ...((from || to) ? [{ day: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }] : []),
  ] };
}
export async function validateResourceFilters(user: Actor, query: URLSearchParams) {
  if (query.get('projectId')) await requireProject(prisma, user, query.get('projectId')!);
  if (query.get('ticketId')) {
    const ticket = await prisma.requestTicket.findFirst({ where: { id: query.get('ticketId')!, ...ticketWhere(user) } });
    if (!ticket) throw new DomainError('Ticket no accesible', 403);
    if (ticket.projectId) await requireProject(prisma, user, ticket.projectId);
  }
}
export async function resourceList(user: Actor, query: URLSearchParams, unlimited = false) {
  await validateResourceFilters(user, query);
  const rows = await prisma.resourceConsumption.findMany({ where: resourceWhere(user, query), include: resourceInclude, orderBy: [{ day: 'desc' }, { createdAt: 'desc' }], ...(unlimited ? {} : { take: 5001 }) });
  const truncated = !unlimited && rows.length > 5000;
  const records = truncated ? rows.slice(0, 5000) : rows;
  const tickets = await prisma.requestTicket.findMany({ where: { AND: [ticketWhere(user), { project: { isActive: true, ...projectWhere(user) } }, ...(query.get('projectId') ? [{ projectId: query.get('projectId')! }] : []), ...(query.get('ticketId') ? [{ id: query.get('ticketId')! }] : [])] }, include: { scopeVersions: { orderBy: { version: 'asc' } } } });
  return { records, truncated, summary: summarizeResources(records), plans: tickets.map(t => ({ ticketId: t.id, number: t.number, baseline: t.scopeVersions.find(s => s.id === t.baselineScopeVersionId) ?? null, current: t.scopeVersions.find(s => s.id === t.currentScopeVersionId) ?? null, actual: summarizeResources(records.filter(r => r.ticketId === t.id)) })) };
}
export async function createResource(data: z.infer<typeof resourceSchema>) {
  return transaction(async db => {
    const user = await actor(db); await requireProject(db, user, data.projectId);
    if (data.ticketId) {
      const ticket = await db.requestTicket.findFirst({ where: { id: data.ticketId, projectId: data.projectId, ...ticketWhere(user) } });
      if (!ticket) throw new DomainError('Ticket no pertenece al proyecto o no es accesible', 403);
      owner(user, ticket);
      if (['CANCELADO', 'RECHAZADO', 'CERRADO'].includes(ticket.status)) throw new DomainError('Ticket terminal; no se registran nuevos consumos');
    }
    if (data.taskId && !await db.task.findFirst({ where: { id: data.taskId, projectId: data.projectId } })) throw new DomainError('Tarea no pertenece al proyecto');
    if (data.personId) {
      const person = await db.user.findFirst({ where: { id: data.personId, isActive: true } });
      if (!person) throw new DomainError('Persona activa inexistente');
      if (user.role !== 'ADMIN' && data.personId !== user.id) throw new DomainError('Sólo puede registrar su propio esfuerzo', 403);
    }
    const record = await db.resourceConsumption.create({ data: { ...data, day: new Date(data.day), recordedById: user.id, recordedByName: user.name ?? user.email }, include: resourceInclude });
    await audit(db, user, 'CREAR', 'ResourceConsumption', record.id, data);
    if (data.ticketId) await db.ticketEvent.create({ data: { ticketId: data.ticketId, action: 'resource', actorId: user.id, actorName: user.name ?? user.email, actorEmail: user.email, data: { ...data, resourceConsumptionId: record.id } } });
    return record;
  });
}
