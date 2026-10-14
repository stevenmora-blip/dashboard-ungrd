import { Prisma, RequestTicket } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { assertApprover, assertTransition, assertScopeChangeContext, DomainError, summarizeResources } from './domain';
import { actor, Actor, Db, owner, admin, ticketWhere, ticketInclude, transaction } from './server';
import { ticketActionSchema } from './validation';
type Action = z.infer<typeof ticketActionSchema>;
function comparison(ticket: Prisma.RequestTicketGetPayload<{ include: typeof ticketInclude }>) {
  return { baseline: ticket.scopeVersions.find(v => v.id === ticket.baselineScopeVersionId) ?? null, current: ticket.scopeVersions.find(v => v.id === ticket.currentScopeVersionId) ?? null, actual: summarizeResources(ticket.resourceConsumptions) };
}
export async function ticketDetail(db: Db, user: Actor, id: string) {
  const ticket = await db.requestTicket.findFirst({ where: { id, ...ticketWhere(user) }, include: ticketInclude });
  if (!ticket) throw new DomainError('Ticket no accesible', 404);
  return { ...ticket, comparison: comparison(ticket) };
}
async function activeIdentity(db: Db, id: string, approver = false) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user?.isActive || (approver && !user.canApproveRequests)) throw new DomainError(approver ? 'Configure un aprobador activo habilitado' : 'Seleccione un usuario activo');
  return user;
}
function state(ticket: RequestTicket, expected: string) { if (ticket.status !== expected) throw new DomainError(`La acción requiere ${expected}`); }
function approvedState(ticket: RequestTicket) { if (!['APROBADO', 'EN_EJECUCION'].includes(ticket.status)) throw new DomainError('El cambio requiere ticket aprobado o en ejecución'); }
async function nextVersion(db: Db, ticketId: string) {
  return ((await db.scopeVersion.aggregate({ where: { ticketId }, _max: { version: true } }))._max.version ?? 0) + 1;
}
async function decision(db: Db, user: Actor, ticket: RequestTicket, scopeVersionId: string, decisionValue: string, reason: string, changeId?: string) {
  return db.approvalDecision.create({ data: { ticketId: ticket.id, scopeVersionId, changeId, decision: decisionValue, reason, actorId: user.id, actorName: user.name ?? user.email, actorEmail: user.email } });
}
export async function mutateTicket(id: string, data: Action) {
  return transaction(async db => {
    const user = await actor(db);
    const ticket = await db.requestTicket.findFirst({ where: { id, ...ticketWhere(user) } });
    if (!ticket) throw new DomainError('Ticket no accesible', 404);
    if (ticket.updatedAt.toISOString() !== new Date(data.expectedUpdatedAt).toISOString()) throw new DomainError('El ticket cambió; recargue antes de continuar', 409);
    const updatedAt = new Date(Math.max(Date.now(), ticket.updatedAt.getTime() + 1));
    const claimed = await db.requestTicket.updateMany({ where: { id, updatedAt: ticket.updatedAt }, data: { updatedAt } });
    if (claimed.count !== 1) throw new DomainError('Conflicto de edición', 409);
    let patch: Prisma.RequestTicketUncheckedUpdateInput = {};
    const before = ticket.status;
    switch (data.action) {
      case 'assign': {
        admin(user);
        if (!['RECIBIDO', 'EN_LEVANTAMIENTO'].includes(ticket.status)) throw new DomainError('Sólo se asigna durante recepción/levantamiento');
        await activeIdentity(db, data.ownerId);
        if (data.approverId) await activeIdentity(db, data.approverId, true);
        patch = { ownerId: data.ownerId, approverId: data.approverId ?? null, status: 'EN_LEVANTAMIENTO' };
        if (ticket.status === 'RECIBIDO') assertTransition(ticket.status, 'EN_LEVANTAMIENTO');
        break;
      }
      case 'meeting': {
        owner(user, ticket); state(ticket, 'EN_LEVANTAMIENTO');
        const { action: _action, expectedUpdatedAt: _expected, heldAt, ...meeting } = data;
        await db.ticketMeeting.create({ data: { ...meeting, heldAt: new Date(heldAt), ticketId: id, recordedById: user.id, recordedByName: user.name ?? user.email } });
        break;
      }
      case 'scope': {
        owner(user, ticket); state(ticket, 'EN_LEVANTAMIENTO');
        const { action: _action, expectedUpdatedAt: _expected, proposedDate, ...scope } = data;
        await db.scopeVersion.create({ data: { ...scope, proposedDate: new Date(proposedDate), ticketId: id, version: await nextVersion(db, id), createdById: user.id, createdByName: user.name ?? user.email } });
        break;
      }
      case 'submit': {
        owner(user, ticket); state(ticket, 'EN_LEVANTAMIENTO');
        if (!ticket.ownerId) throw new DomainError('Asigne primero un responsable');
        await activeIdentity(db, ticket.ownerId); await activeIdentity(db, data.approverId, true);
        const scope = await db.scopeVersion.findFirst({ where: { id: data.scopeVersionId, ticketId: id } });
        if (!scope) throw new DomainError('Versión de alcance inválida');
        assertTransition(ticket.status, 'PENDIENTE_APROBACION');
        patch = { status: 'PENDIENTE_APROBACION', approverId: data.approverId, submittedScopeVersionId: scope.id };
        break;
      }
      case 'approve': case 'reject': case 'clarify': {
        assertApprover(user, ticket.approverId); state(ticket, 'PENDIENTE_APROBACION');
        if (!ticket.submittedScopeVersionId) throw new DomainError('Falta alcance presentado');
        const target = data.action === 'approve' ? 'APROBADO' : data.action === 'reject' ? 'RECHAZADO' : 'EN_LEVANTAMIENTO';
        assertTransition(ticket.status, target);
        await decision(db, user, ticket, ticket.submittedScopeVersionId, data.action === 'approve' ? 'APROBADO' : data.action === 'reject' ? 'RECHAZADO' : 'ACLARACION', data.reason ?? 'Aprobado');
        patch = { status: target };
        if (data.action === 'approve') patch = { ...patch, baselineScopeVersionId: ticket.submittedScopeVersionId, currentScopeVersionId: ticket.submittedScopeVersionId };
        break;
      }
      case 'cancel': {
        owner(user, ticket); assertTransition(ticket.status, 'CANCELADO'); patch = { status: 'CANCELADO' }; break;
      }
      case 'transition': {
        owner(user, ticket); assertTransition(ticket.status, data.status); patch = { status: data.status }; break;
      }
      case 'attachProject': {
        admin(user);
        if (['CERRADO', 'RECHAZADO', 'CANCELADO'].includes(ticket.status)) throw new DomainError('Ticket terminal');
        if (ticket.projectId && ticket.projectId !== data.projectId) throw new DomainError('El proyecto ya está vinculado; no se reasignan consumos existentes');
        const project = await db.project.findFirst({ where: { id: data.projectId, isActive: true } });
        if (!project) throw new DomainError('Proyecto activo inexistente');
        patch = { projectId: project.id }; break;
      }
      case 'createProject': {
        admin(user); approvedState(ticket);
        if (ticket.projectId) throw new DomainError('El ticket ya tiene proyecto');
        const project = await db.project.create({ data: { name: data.name, description: data.description } });
        patch = { projectId: project.id }; break;
      }
      case 'requestChange': {
        owner(user, ticket); assertScopeChangeContext(ticket);
        if (!ticket.currentScopeVersionId || ticket.currentScopeVersionId !== data.baseScopeVersionId) throw new DomainError('El alcance base cambió; recargue', 409);
        const { action: _action, expectedUpdatedAt: _expected, proposedDate, ...change } = data;
        await db.scopeChange.create({ data: { ...change, proposedDate: new Date(proposedDate), ticketId: id, createdById: user.id, createdByName: user.name ?? user.email } });
        break;
      }
      case 'approveChange': case 'rejectChange': {
        assertApprover(user, ticket.approverId); assertScopeChangeContext(ticket);
        const change = await db.scopeChange.findFirst({ where: { id: data.changeId, ticketId: id, status: 'PENDIENTE' } });
        if (!change) throw new DomainError('Cambio pendiente inexistente');
        if (data.action === 'rejectChange') {
          await db.scopeChange.update({ where: { id: change.id }, data: { status: 'RECHAZADO', resolvedAt: new Date() } });
          await decision(db, user, ticket, change.baseScopeVersionId, 'CAMBIO_RECHAZADO', data.reason ?? '', change.id);
        } else {
          if (change.baseScopeVersionId !== ticket.currentScopeVersionId) throw new DomainError('Otro cambio modificó la base; solicite un cambio actualizado', 409);
          const base = await db.scopeVersion.findFirst({ where: { id: change.baseScopeVersionId, ticketId: id } });
          if (!base) throw new DomainError('Base inexistente');
          const version = await db.scopeVersion.create({ data: {
            ticketId: id, version: await nextVersion(db, id), scope: `${base.scope}\n\nAmpliación: ${change.additions}`, deliverables: `${base.deliverables}\n\nAmpliación: ${change.additions}`,
            acceptanceCriteria: base.acceptanceCriteria, laborHours: base.laborHours + change.additionalLaborHours, machineHours: base.machineHours + change.additionalMachineHours,
            resourceNotes: `${base.resourceNotes}\n\nRecursos adicionales: ${change.resourceNotes}`, proposedDate: change.proposedDate, createdById: user.id, createdByName: user.name ?? user.email,
          } });
          await db.scopeChange.update({ where: { id: change.id }, data: { status: 'APROBADO', resolvedAt: new Date(), resultingScopeVersionId: version.id } });
          await decision(db, user, ticket, version.id, 'CAMBIO_APROBADO', data.reason ?? 'Cambio aprobado', change.id);
          patch = { currentScopeVersionId: version.id };
        }
        break;
      }
    }
    await db.requestTicket.update({ where: { id }, data: { ...patch, updatedAt } });
    await db.ticketEvent.create({ data: { ticketId: id, action: data.action, actorId: user.id, actorName: user.name ?? user.email, actorEmail: user.email, data: JSON.parse(JSON.stringify({ ...data, previousStatus: before, nextStatus: patch.status ?? before })) } });
    return ticketDetail(db, user, id);
  });
}
export async function readTicket(id: string) { return ticketDetail(prisma, await actor(), id); }
