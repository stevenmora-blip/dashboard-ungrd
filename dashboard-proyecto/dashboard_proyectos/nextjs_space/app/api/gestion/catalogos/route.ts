import { prisma } from '@/lib/db';
import { actor, endpoint, personSelect, projectWhere, safeIdentity } from '@/lib/gestion/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  return endpoint(async () => {
    const user = await actor();
    const [users, projects, areas] = await Promise.all([
      prisma.user.findMany({ where: { isActive: true }, select: personSelect, orderBy: { name: 'asc' } }),
      prisma.project.findMany({ where: { AND: [{ isActive: true }, projectWhere(user)] }, select: { id: true, name: true, tasks: { select: { id: true, name: true }, orderBy: { orden: 'asc' } } }, orderBy: { name: 'asc' } }),
      prisma.area.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);
    return { identity: safeIdentity(user), users, projects, areas };
  });
}
