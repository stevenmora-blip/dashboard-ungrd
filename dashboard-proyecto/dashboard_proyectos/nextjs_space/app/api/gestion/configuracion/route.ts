import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { actor, admin, audit, body, endpoint, personSelect, transaction } from '@/lib/gestion/server';
import { configSchema } from '@/lib/gestion/validation';
import { DomainError } from '@/lib/gestion/domain';
export const dynamic = 'force-dynamic';
export async function GET() {
  return endpoint(async () => {
    admin(await actor());
    const [users, areas] = await Promise.all([prisma.user.findMany({ where: { isActive: true }, select: personSelect, orderBy: { name: 'asc' } }), prisma.area.findMany({ orderBy: { name: 'asc' } })]);
    return { users, areas };
  });
}
export async function PATCH(req: NextRequest) {
  return endpoint(async () => {
    admin(await actor());
    const data = await body(req, configSchema);
    return transaction(async db => {
      const user = await actor(db); admin(user);
      if (data.action === 'approver') {
        const target = await db.user.findUnique({ where: { id: data.userId } });
        if (!target?.isActive) throw new DomainError('Usuario activo inexistente');
        const result = await db.user.update({ where: { id: target.id }, data: { canApproveRequests: data.canApproveRequests }, select: personSelect });
        await audit(db, user, 'MODIFICAR', 'RequestApprover', target.id, { before: target.canApproveRequests, after: data.canApproveRequests });
        return result;
      }
      const before = data.id ? await db.area.findUnique({ where: { id: data.id } }) : null;
      if (data.id && !before) throw new DomainError('Área inexistente');
      const area = data.id ? await db.area.update({ where: { id: data.id }, data: { name: data.name, isActive: data.isActive } }) : await db.area.create({ data: { name: data.name, isActive: data.isActive } });
      await audit(db, user, before ? 'MODIFICAR' : 'CREAR', 'Area', area.id, { before, after: area });
      return area;
    });
  });
}
