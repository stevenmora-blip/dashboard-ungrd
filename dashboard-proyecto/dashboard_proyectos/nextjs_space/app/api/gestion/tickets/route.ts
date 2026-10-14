import { NextRequest } from 'next/server';
import { RequestStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { actor, endpoint, personSelect, ticketWhere } from '@/lib/gestion/server';
import { DomainError } from '@/lib/gestion/domain';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  return endpoint(async () => {
    const user = await actor(); const q = req.nextUrl.searchParams; const status = q.get('status');
    if (status && !Object.values(RequestStatus).includes(status as RequestStatus)) throw new DomainError('Estado inválido');
    return prisma.requestTicket.findMany({ where: { AND: [ticketWhere(user), { ...(status ? { status: status as RequestStatus } : {}), ...(q.get('ownerId') ? { ownerId: q.get('ownerId')! } : {}), ...(q.get('area') ? { area: q.get('area')! } : {}), ...(q.get('projectId') ? { projectId: q.get('projectId')! } : {}) }] }, include: { owner: { select: personSelect }, approver: { select: personSelect }, project: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 500 });
  });
}
