import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma, User } from '@prisma/client';
import { z, ZodError } from 'zod';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { DomainError } from './domain';
export type Db = Prisma.TransactionClient;
export const identitySelect = { id: true, name: true, email: true, role: true, isActive: true, canApproveRequests: true, responsableId: true } as const;
export type Actor = Pick<User, keyof typeof identitySelect>;
export async function actor(db: Db = prisma): Promise<Actor> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) throw new DomainError('No autorizado', 401);
  const current = await db.user.findUnique({ where: { id: user.id }, select: identitySelect });
  if (!current?.isActive) throw new DomainError('No autorizado', 401);
  return current;
}
export function admin(user: Actor) { if (user.role !== 'ADMIN') throw new DomainError('Sólo administradores', 403); }
export function owner(user: Actor, ticket: { ownerId: string | null }) { if (user.role !== 'ADMIN' && ticket.ownerId !== user.id) throw new DomainError('Sólo el responsable del levantamiento', 403); }
export function ticketWhere(user: Actor): Prisma.RequestTicketWhereInput {
  return user.role === 'ADMIN' ? {} : { OR: [{ ownerId: user.id }, { approverId: user.id }] };
}
export function projectWhere(user: Actor): Prisma.ProjectWhereInput {
  if (user.role === 'ADMIN') return {};
  if (!user.responsableId) return { id: { in: [] } };
  return { OR: [{ projectMemberships: { some: { responsableId: user.responsableId } } }, { tasks: { some: { assignments: { some: { responsableId: user.responsableId } } } } }] };
}
export async function requireProject(db: Db, user: Actor, projectId: string) {
  const project = await db.project.findFirst({ where: { AND: [{ id: projectId, isActive: true }, projectWhere(user)] } });
  if (!project) throw new DomainError('Proyecto no accesible', 403);
  return project;
}
export async function body<T extends z.ZodTypeAny>(req: NextRequest, schema: T, max = 65536): Promise<z.infer<T>> {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) throw new DomainError('Origen no permitido', 403);
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new DomainError('Se requiere application/json', 415);
  const length = Number(req.headers.get('content-length'));
  if (Number.isFinite(length) && length > max) throw new DomainError('Solicitud demasiado grande', 413);
  const reader = req.body?.getReader();
  if (!reader) throw new DomainError('Cuerpo requerido');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const item = await reader.read(); if (item.done) break;
    size += item.value.byteLength;
    if (size > max) { await reader.cancel(); throw new DomainError('Solicitud demasiado grande', 413); }
    chunks.push(item.value);
  }
  const data = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)); } catch { throw new DomainError('JSON inválido'); }
  return schema.parse(value);
}
export async function endpoint(run: () => Promise<unknown>, status = 200) {
  try {
    const result = await run();
    if (result instanceof NextResponse) return result;
    return NextResponse.json(result, { status, headers: { 'Cache-Control': 'no-store' } });
  }
  catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError) return NextResponse.json({ error: 'Datos inválidos', issues: error.flatten() }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (['P2034', 'P2002'].includes(error.code)) return NextResponse.json({ error: 'Conflicto; recargue y reintente' }, { status: 409 });
      if (['P2025', 'P2003'].includes(error.code)) return NextResponse.json({ error: 'Referencia inexistente o no disponible' }, { status: 400 });
    }
    console.error('Gestión: error interno', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
export async function audit(db: Db, user: Actor, action: string, entity: string, entityId: string, details: unknown) {
  await db.auditLog.create({ data: { action, entity, entityId, details: JSON.stringify(details), userId: user.id, userName: user.name ?? user.email, userEmail: user.email } });
}
export function transaction<T>(fn: (db: Db) => Promise<T>) {
  return prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
}
export const safeIdentity = (user: Actor) => ({ id: user.id, name: user.name, email: user.email, role: user.role, canApproveRequests: user.canApproveRequests });
export const personSelect = { id: true, name: true, email: true, canApproveRequests: true } as const;
export const ticketInclude = {
  owner: { select: personSelect }, approver: { select: personSelect }, project: { select: { id: true, name: true } },
  events: { orderBy: { createdAt: 'asc' as const } }, meetings: { orderBy: { heldAt: 'asc' as const } },
  scopeVersions: { orderBy: { version: 'asc' as const } }, decisions: { orderBy: { createdAt: 'asc' as const } },
  scopeChanges: { orderBy: { createdAt: 'asc' as const } }, resourceConsumptions: { include: { person: { select: personSelect } }, orderBy: { day: 'asc' as const } },
};
