import { z } from 'zod';
import { prisma } from '@/lib/db';
import { DomainError, summarizeResources, uniqueProjectSummary, validateDistribution } from './domain';
import { actor, Actor, admin, audit, Db, projectWhere, requireProject, transaction } from './server';
import { impactSchema } from './validation';
import { resourceWhere } from './resources';
export const distributionInclude = { beneficiaries: { include: { area: true } } } as const;
export const evidenceInclude = { recipients: { include: { area: true } } } as const;
async function activeAreas(db: Db, ids: string[]) {
  if (new Set(ids).size !== ids.length) throw new DomainError('Áreas repetidas');
  if ((await db.area.count({ where: { id: { in: ids }, isActive: true } })) !== ids.length) throw new DomainError('Seleccione áreas activas del catálogo');
}
export async function impactList(user: Actor, projectId?: string) {
  if (projectId) await requireProject(prisma, user, projectId);
  const [projects, areas, resources] = await Promise.all([
    prisma.project.findMany({ where: { AND: [{ isActive: true }, projectWhere(user), ...(projectId ? [{ id: projectId }] : [])] }, select: { id: true, name: true, subdireccion: true, benefitDistributions: { include: distributionInclude, orderBy: { version: 'desc' } }, impactEvidence: { include: evidenceInclude, orderBy: { cutoffDate: 'desc' } } }, orderBy: { name: 'asc' } }),
    prisma.area.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.resourceConsumption.findMany({ where: resourceWhere(user, new URLSearchParams(projectId ? { projectId } : {})) }),
  ]);
  const result = projects.map(p => {
    const rows = resources.filter(r => r.projectId === p.id);
    return { id: p.id, name: p.name, historicArea: p.subdireccion, distributions: p.benefitDistributions, evidence: p.impactEvidence, resources: rows, resourceSummary: summarizeResources(rows), hasDistribution: p.benefitDistributions.length > 0 };
  });
  return { projects: result, areas, summary: { ...uniqueProjectSummary(result), resources: summarizeResources(resources) } };
}
export async function createImpact(data: z.infer<typeof impactSchema>) {
  return transaction(async db => {
    const user = await actor(db); admin(user); await requireProject(db, user, data.projectId);
    if (data.action === 'distribution') {
      validateDistribution(data.beneficiaries); await activeAreas(db, data.beneficiaries.map(r => r.areaId));
      const latest = await db.benefitDistribution.findFirst({ where: { projectId: data.projectId }, orderBy: { version: 'desc' } });
      if ((latest?.version ?? 0) !== data.expectedVersion) throw new DomainError('La distribución cambió; recargue', 409);
      const record = await db.benefitDistribution.create({ data: { projectId: data.projectId, version: data.expectedVersion + 1, reason: data.reason, assessedAt: new Date(data.assessedAt), assessorId: user.id, assessorName: user.name ?? user.email, beneficiaries: { create: data.beneficiaries } }, include: distributionInclude });
      await audit(db, user, 'CREAR', 'BenefitDistribution', record.id, data); return record;
    }
    await activeAreas(db, data.areaIds);
    const { action: _action, areaIds, cutoffDate, ...evidence } = data;
    const record = await db.impactEvidence.create({ data: { ...evidence, cutoffDate: new Date(cutoffDate), recordedById: user.id, recordedByName: user.name ?? user.email, recipients: { create: areaIds.map(areaId => ({ areaId })) } }, include: evidenceInclude });
    await audit(db, user, 'CREAR', 'ImpactEvidence', record.id, data); return record;
  });
}
