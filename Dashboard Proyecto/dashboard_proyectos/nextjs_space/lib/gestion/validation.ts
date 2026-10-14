import { z } from 'zod';
import { isSafeHttpLink } from './domain';
export const text = (max = 4000) => z.string().trim().min(1).max(max).refine(v => !/[<>\u0000]/.test(v), 'Use texto plano, sin HTML');
export const optionalText = (max = 4000) => text(max).optional();
export const id = z.string().min(1).max(100);
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v + 'T00:00:00.000Z'); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v; }, 'Fecha inválida');
export const instant = z.string().datetime({ offset: true });
export const link = z.string().max(2000).refine(isSafeHttpLink, 'Enlace HTTP(S) sin credenciales');
export const links = z.array(link).max(20).default([]);
export const nonnegative = z.number().finite().min(0).max(10000000);
export const publicRequestSchema = z.object({
  requesterName: text(150), requesterEmail: z.string().trim().email().max(254), area: text(200), title: text(200),
  problem: text(), expectedResult: text(), beneficiaries: text(), sources: text(), deliverables: text(), acceptanceCriteria: text(),
  desiredDate: date.optional(), desiredDateReason: optionalText(1000), referenceLinks: links,
}).strict().refine(v => !v.desiredDate || !!v.desiredDateReason, { message: 'Indique motivo de la fecha deseada', path: ['desiredDateReason'] });
export const scopeSchema = z.object({ scope: text(12000), deliverables: text(8000), acceptanceCriteria: text(8000), laborHours: nonnegative, machineHours: nonnegative, resourceNotes: text(6000), proposedDate: date });
const expected = { expectedUpdatedAt: instant };
const reason = { reason: text(4000) };
export const ticketActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('assign'), ...expected, ownerId: id, approverId: id.nullable().optional() }).strict(),
  z.object({ action: z.literal('meeting'), ...expected, heldAt: instant, participants: text(2000), summary: text(8000), clarifiedNeeds: text(6000), agreements: text(6000), evidenceLinks: links }).strict(),
  z.object({ action: z.literal('scope'), ...expected, ...scopeSchema.shape }).strict(),
  z.object({ action: z.literal('submit'), ...expected, scopeVersionId: id, approverId: id }).strict(),
  z.object({ action: z.literal('approve'), ...expected, reason: optionalText() }).strict(),
  z.object({ action: z.literal('reject'), ...expected, ...reason }).strict(),
  z.object({ action: z.literal('clarify'), ...expected, ...reason }).strict(),
  z.object({ action: z.literal('cancel'), ...expected, ...reason }).strict(),
  z.object({ action: z.literal('transition'), ...expected, status: z.enum(['EN_EJECUCION', 'ENTREGADO', 'CERRADO']), note: text(4000) }).strict(),
  z.object({ action: z.literal('attachProject'), ...expected, projectId: id }).strict(),
  z.object({ action: z.literal('createProject'), ...expected, name: text(200), description: text(8000) }).strict(),
  z.object({ action: z.literal('requestChange'), ...expected, baseScopeVersionId: id, additions: text(12000), ...reason, requestedBy: text(200), additionalLaborHours: nonnegative, additionalMachineHours: nonnegative, resourceNotes: text(6000), proposedDate: date }).strict(),
  z.object({ action: z.literal('approveChange'), ...expected, changeId: id, reason: optionalText() }).strict(),
  z.object({ action: z.literal('rejectChange'), ...expected, changeId: id, ...reason }).strict(),
]);
export const resourceSchema = z.object({
  projectId: id, ticketId: id.optional(), taskId: id.optional(), personId: id.optional(),
  kind: z.enum(['PERSONA', 'MAQUINA', 'TECNOLOGIA', 'OTRO']), resourceName: optionalText(200), quantity: z.number().finite().positive().max(10000000), unit: text(40),
  unitRate: nonnegative.optional(), currency: z.string().regex(/^[A-Z]{3}$/).optional(), day: date, description: text(6000),
}).strict().refine(v => !['PERSONA', 'MAQUINA'].includes(v.kind) || v.unit === 'horas', 'Personas y máquinas se registran en horas').refine(v => (v.unitRate === undefined) === (v.currency === undefined), 'Tarifa y moneda se registran juntas').refine(v => v.kind === 'PERSONA' ? !!v.personId && !v.resourceName : !!v.resourceName && !v.personId, 'Personas requieren identidad; otros recursos requieren nombre');
export const distributionSchema = z.object({
  action: z.literal('distribution'), projectId: id, expectedVersion: z.number().int().nonnegative(), reason: text(6000), assessedAt: date,
  beneficiaries: z.array(z.object({ areaId: id, percent: z.number().finite().positive().max(100) }).strict()).min(1).max(100),
}).strict();
export const evidenceSchema = z.object({
  action: z.literal('evidence'), projectId: id, title: text(200), areaIds: z.array(id).min(1).max(100), producerTeam: text(200), technicalResponsible: text(200),
  source: text(6000), cutoffDate: date, validationResponsible: optionalText(200), url: link.optional(), description: text(8000), result: text(8000),
}).strict();
export const impactSchema = z.discriminatedUnion('action', [distributionSchema, evidenceSchema]);
export const configSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approver'), userId: id, canApproveRequests: z.boolean() }).strict(),
  z.object({ action: z.literal('area'), id: id.optional(), name: text(200), isActive: z.boolean().default(true) }).strict(),
]);
