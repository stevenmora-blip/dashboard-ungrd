import { prisma } from '@/lib/db';
import { appRecordLink, DomainError, scopeReportProjects } from './domain';
import { Actor, requireProject, safeIdentity, ticketInclude, ticketWhere } from './server';
import { ticketDetail } from './tickets';
import { impactList } from './impact';
import { resourceList } from './resources';
export async function buildReport(user: Actor, params: URLSearchParams) {
  const query = new URLSearchParams(params);
  const ticketId = query.get('ticketId');
  let ticketProjectId: string | null | undefined;
  if (ticketId) {
    const ticket = await ticketDetail(prisma, user, ticketId);
    ticketProjectId = ticket.projectId;
    if (query.get('projectId') && query.get('projectId') !== ticket.projectId) throw new DomainError('El proyecto no corresponde al ticket');
    if (ticket.projectId) {
      await requireProject(prisma, user, ticket.projectId);
      query.set('projectId', ticket.projectId);
    }
  }
  const projectId = query.get('projectId') || undefined;
  if (projectId) await requireProject(prisma, user, projectId);
  const [tickets, resources, impact] = await Promise.all([
    prisma.requestTicket.findMany({ where: { AND: [ticketWhere(user), ...(ticketId ? [{ id: ticketId }] : []), ...(projectId ? [{ projectId }] : [])] }, include: ticketInclude, orderBy: { number: 'asc' } }),
    resourceList(user, query, true), ticketProjectId === null ? Promise.resolve({ projects: [] }) : impactList(user, projectId),
  ]);
  const projectScope = scopeReportProjects(impact.projects, resources.records, ticketId ? ticketProjectId : projectId);
  const scopedTickets = tickets.map(ticket => ({ ...ticket, resourceConsumptions: resources.records.filter(record => record.ticketId === ticket.id) }));
  return { generatedAt: new Date().toISOString(), generatedBy: safeIdentity(user), tickets: scopedTickets, resources: resources.records, resourceSummary: resources.summary, plans: resources.plans, projects: projectScope.projects, summary: projectScope.summary, interpretation: 'La distribución es beneficio declarado. El esfuerzo de proyectos con varias áreas es compartido; el total cuenta cada proyecto una vez. Una tarifa ausente significa importe no calculado.' };
}
export type ExecutiveReport = Awaited<ReturnType<typeof buildReport>>;
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}
function cell(value: unknown) { return `<td>${escapeHtml(value)}</td>`; }
function table(headers: string[], rows: unknown[][]) {
  if (!rows.length) return '<p class="missing">Sin registros.</p>';
  return `<table><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell).join('')}</tr>`).join('')}</tbody></table>`;
}
function jsonBlock(value: unknown) { return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`; }
export function reportHtml(report: ExecutiveReport) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3040';
  const sections = report.tickets.map(t => `<section><h2><a href="${escapeHtml(appRecordLink(baseUrl, 'ticket', t.id))}">Solicitud #${t.number}: ${escapeHtml(t.title)}</a></h2>
<p>Estado: ${escapeHtml(t.status)} · Recibido: ${escapeHtml(t.createdAt.toISOString())} · Proyecto: ${escapeHtml(t.project?.name ?? 'Sin vincular')}</p>
${table(['Solicitante','Área','Responsable','Aprobador'], [[`${t.requesterName} (${t.requesterEmail})`, t.area, t.owner?.name ?? t.owner?.email ?? 'Sin asignar', t.approver?.name ?? t.approver?.email ?? 'Sin configurar']])}
${table(['Problema','Resultado esperado','Beneficiarios','Fuentes'], [[t.problem,t.expectedResult,t.beneficiaries,t.sources]])}
${table(['Entregables solicitados','Aceptación','Fecha deseada','Motivo'], [[t.deliverables,t.acceptanceCriteria,t.desiredDate?.toISOString().slice(0,10),t.desiredDateReason]])}
<p>Referencias: ${escapeHtml(t.referenceLinks.join(' · '))}</p>
<h3>Versiones de alcance y compromiso</h3>${table(['Versión','Tipo','Alcance','Entregables','Aceptación','Trabajo (h)','Máquina (h)','Recursos','Fecha propuesta','Preparó'], t.scopeVersions.map(v => [v.version, [v.id === t.baselineScopeVersionId ? 'Inicial aprobado' : '', v.id === t.currentScopeVersionId ? 'Actual aprobado' : '', v.id === t.submittedScopeVersionId ? 'Presentado' : ''].filter(Boolean).join(' · ') || 'Preparado',v.scope,v.deliverables,v.acceptanceCriteria,v.laborHours,v.machineHours,v.resourceNotes,v.proposedDate.toISOString().slice(0,10),`${v.createdByName} (${v.createdById})`]))}
<h3>Decisiones autenticadas</h3>${table(['Decisión','Versión','Cambio','Actor','Fecha','Motivo'], t.decisions.map(d => [d.decision,d.scopeVersionId,d.changeId,`${d.actorName} (${d.actorEmail}; ${d.actorId})`,d.createdAt.toISOString(),d.reason]))}
<h3>Cambios de alcance</h3>${table(['Cambio','Estado','Base','Adiciones','Motivo','Solicitó','Trabajo adicional (h)','Máquina adicional (h)','Recursos','Fecha propuesta'], t.scopeChanges.map(c => [c.id,c.status,c.baseScopeVersionId,c.additions,c.reason,c.requestedBy,c.additionalLaborHours,c.additionalMachineHours,c.resourceNotes,c.proposedDate.toISOString().slice(0,10)]))}
<h3>Reuniones</h3>${table(['Fecha','Participantes','Resumen','Necesidades','Acuerdos','Evidencia','Registró'], t.meetings.map(m => [m.heldAt.toISOString(),m.participants,m.summary,m.clarifiedNeeds,m.agreements,m.evidenceLinks.join(' · '),m.recordedByName]))}
<h3>Trazabilidad completa</h3>${table(['Fecha','Acción','Actor','Contenido'], t.events.map(e => [e.createdAt.toISOString(),e.action,`${e.actorName} (${e.actorId ?? 'solicitante'})`,JSON.stringify(e.data)]))}</section>`).join('');
  const projects = report.projects.map(p => `<section><h2><a href="${escapeHtml(appRecordLink(baseUrl, 'project', p.id))}">Beneficio y evidencias: ${escapeHtml(p.name)}</a></h2><p>${p.hasDistribution ? 'Distribución declarada registrada' : 'Sin distribución registrada'}. Campo histórico: ${escapeHtml(p.historicArea)}</p>
${p.distributions.map(d => `<h3>Distribución versión ${d.version}</h3><p>Valoró ${escapeHtml(d.assessorName)} (${escapeHtml(d.assessorId)}) · Fecha ${escapeHtml(d.assessedAt.toISOString().slice(0,10))} · Justificación: ${escapeHtml(d.reason)}</p>${table(['Área','Beneficio declarado (%)'], d.beneficiaries.map(b => [b.area.name,b.percent]))}`).join('')}
<h3>Evidencias de resultado</h3>${table(['Producto/evidencia','Destinatarios','Equipo productor','Responsable técnico','Fuente','Corte','Validación','Descripción','Resultado','Referencia','Registró'], p.evidence.map(e => [e.title,e.recipients.map(r => r.area.name).join(' · '),e.producerTeam,e.technicalResponsible,e.source,e.cutoffDate.toISOString().slice(0,10),e.validationResponsible,e.description,e.result,e.url,e.recordedByName]))}</section>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reporte ejecutivo UNGRD</title><style>body{font:14px system-ui;color:#172b4d;margin:32px;line-height:1.5}h1{font-size:28px}h2{margin-top:32px;border-bottom:2px solid #1a365d;padding-bottom:8px}h3{margin-top:24px}table{border-collapse:collapse;width:100%;margin:12px 0;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}th{background:#e9eef5}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}.missing{color:#576579}.notice{background:#edf4fa;padding:16px}@media print{body{margin:0;font-size:10pt}table{font-size:8pt}thead{display:table-header-group}tr{break-inside:avoid}h2,h3{break-after:avoid}.screen{display:none}@page{size:A4 landscape;margin:12mm}}</style></head><body><h1>Reporte ejecutivo · Dashboard UNGRD</h1><p>Generado ${escapeHtml(report.generatedAt)} por ${escapeHtml(report.generatedBy.name ?? report.generatedBy.email)}.</p><p class="screen">Para guardar PDF o imprimir use Imprimir en el navegador (⌘P / Ctrl+P).</p><p class="notice">${escapeHtml(report.interpretation)}</p><h2>Resumen institucional</h2><p>Proyectos únicos: ${report.summary.projectCount}. Sin distribución: ${escapeHtml(report.summary.withoutDistribution.join(', ') || 'Ninguno dentro del alcance')}.</p><h3>Consumos registrados en el alcance consultado</h3>${table(['Tipo','Unidad','Cantidad'], report.resourceSummary.quantities.map(q => [q.kind,q.unit,q.quantity]))}${table(['Moneda','Importe calculado'],report.resourceSummary.costs.map(c => [c.currency,c.amount]))}<p>Registros sin tarifa: ${report.resourceSummary.unpricedCount} (importe no calculado).</p>
<h3>Detalle de ejecución</h3>${table(['Fecha','Proyecto','Ticket','Tarea','Tipo','Persona/recurso','Cantidad','Unidad','Tarifa','Moneda','Importe','Descripción','Registró'], report.resources.map(r => [r.day.toISOString().slice(0,10),r.project.name,r.ticket?.number,r.task?.name,r.kind,r.person?.name ?? r.person?.email ?? r.resourceName,r.quantity,r.unit,r.unitRate,r.currency,r.unitRate === null ? 'No calculado' : r.quantity*r.unitRate,r.description,r.recordedByName]))}${sections}${projects}<details><summary>Identificadores y resumen trazable</summary>${jsonBlock({ generatedBy: report.generatedBy, plans: report.plans })}</details></body></html>`;
}
