const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createClient, createDatabaseClient, localAdminAccess, appRequire } = require('./gestion-test-client.cjs');

test('recorrido completo conserva decisiones, versiones y consumo sin duplicar el aporte', { timeout: 180000 }, async () => {
  const db = createDatabaseClient();
  const tag = `QA-GESTION-${crypto.randomUUID()}`;
  const password = crypto.randomBytes(20).toString('hex');
  const created = { tickets: [], users: [], projects: [], tasks: [], areas: [] };
  const before = { projects: await db.project.count(), tasks: await db.task.count(), users: await db.user.count() };
  const admin = createClient();
  const owner = createClient();
  const approver = createClient();
  const outsider = createClient();
  const anonymous = createClient();
  const access = localAdminAccess();
  let ticket;
  async function action(client, data) {
    const result = await client.json(`/api/gestion/tickets/${ticket.id}/acciones`, 'POST', {
      expectedUpdatedAt: ticket.updatedAt, ...data,
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    ticket = result.body;
    return ticket;
  }
  try {
    const hash = await appRequire('bcryptjs').hash(password, 12);
    for (const label of ['owner', 'approver', 'outsider']) {
      const user = await db.user.create({ data: { name: `${tag}-${label}`, email: `${label}-${tag.toLowerCase()}@example.invalid`, password: hash, role: 'USER' } });
      created.users.push(user);
    }
    const [ownerUser, approverUser, outsiderUser] = created.users;
    const project = await db.project.create({ data: { name: tag, tecnologias: [] } });
    created.projects.push(project.id);
    const responsable = await db.responsable.create({ data: { name: tag } });
    await db.user.update({ where: { id: ownerUser.id }, data: { responsableId: responsable.id } });
    await db.projectMembership.create({ data: { projectId: project.id, responsableId: responsable.id } });
    const task = await db.task.create({ data: { name: tag, projectId: project.id } });
    created.tasks.push(task.id);
    await admin.login(access.email, access.password);
    await owner.login(ownerUser.email, password);
    await approver.login(approverUser.email, password);
    await outsider.login(outsiderUser.email, password);
    let response = await admin.json('/api/gestion/configuracion', 'PATCH', { action: 'approver', userId: approverUser.id, canApproveRequests: true });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    for (const suffix of ['Area-A', 'Area-B']) {
      response = await admin.json('/api/gestion/configuracion', 'PATCH', { action: 'area', name: `${tag}-${suffix}` });
      assert.ok([200, 201].includes(response.status), JSON.stringify(response.body));
      const area = await db.area.findUnique({ where: { name: `${tag}-${suffix}` } });
      assert.ok(area);
      created.areas.push(area.id);
    }
    response = await anonymous.json('/api/solicitudes', 'POST', {
      requesterName: 'Solicitante de prueba', requesterEmail: `${tag.toLowerCase()}@example.invalid`,
      area: 'Área de prueba', title: tag, problem: 'Información dispersa entre fuentes',
      expectedResult: 'Reporte normalizado', beneficiaries: 'Dos áreas de prueba',
      sources: 'Datos de prueba controlados', deliverables: 'Reporte verificable',
      acceptanceCriteria: 'Validar los datos contra las fuentes', desiredDate: '2026-11-30',
      desiredDateReason: 'Fecha propuesta para evaluación', referenceLinks: ['https://example.invalid/referencia'],
    });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.deepEqual(Object.keys(response.body).sort(), ['createdAt', 'number']);
    ticket = await db.requestTicket.findUnique({ where: { number: response.body.number } });
    created.tickets.push(ticket.id);
    const unlinkedReport = await admin.request(`/api/gestion/reporte?ticketId=${ticket.id}`);
    assert.equal(unlinkedReport.status, 200);
    assert.deepEqual(unlinkedReport.body.projects, [], 'un ticket sin proyecto no exporta otros proyectos');
    response = await outsider.request(`/api/gestion/tickets/${ticket.id}`);
    assert.equal(response.status, 404, 'un tercero no puede consultar ni confirmar la existencia del ticket');
    await action(admin, { action: 'assign', ownerId: ownerUser.id, approverId: approverUser.id });
    assert.equal(ticket.status, 'EN_LEVANTAMIENTO');
    const staleVersion = ticket.updatedAt;
    await action(owner, { action: 'meeting', heldAt: '2026-10-14T19:00:00.000Z', participants: 'Solicitante y responsable', summary: 'Se precisó el requerimiento', clarifiedNeeds: 'Unificar fuentes', agreements: 'Preparar propuesta de alcance', evidenceLinks: [] });
    response = await owner.json(`/api/gestion/tickets/${ticket.id}/acciones`, 'POST', { action: 'cancel', expectedUpdatedAt: staleVersion, reason: 'Conflicto de prueba' });
    assert.equal(response.status, 409);
    await action(owner, { action: 'scope', scope: 'Normalizar y entregar reporte', deliverables: 'Reporte y diccionario', acceptanceCriteria: 'Validación por área solicitante', laborHours: 10, machineHours: 2, resourceNotes: 'Servicio de procesamiento', proposedDate: '2026-11-30' });
    const first = ticket.scopeVersions.find(version => version.version === 1);
    assert.ok(first);
    await action(owner, { action: 'submit', scopeVersionId: first.id, approverId: approverUser.id });
    response = await admin.json(`/api/gestion/tickets/${ticket.id}/acciones`, 'POST', { action: 'approve', expectedUpdatedAt: ticket.updatedAt });
    assert.equal(response.status, 403, 'ser administrador no equivale a ser aprobador designado');
    await action(approver, { action: 'approve', reason: 'Alcance de prueba validado' });
    assert.equal(ticket.comparison.current.laborHours, 10);
    response = await owner.json(`/api/gestion/tickets/${ticket.id}/acciones`, 'POST', {
      action: 'requestChange', expectedUpdatedAt: ticket.updatedAt, baseScopeVersionId: first.id,
      additions: 'Agregar un indicador', reason: 'Solicitud adicional del área', requestedBy: 'Solicitante de prueba',
      additionalLaborHours: 3, additionalMachineHours: 1, resourceNotes: 'Nuevo procesamiento', proposedDate: '2026-12-02',
    });
    assert.equal(response.status, 400, 'un cambio requiere proyecto vinculado');
    await action(admin, { action: 'attachProject', projectId: project.id });
    await action(owner, { action: 'requestChange', baseScopeVersionId: first.id, additions: 'Agregar un indicador', reason: 'Solicitud adicional del área', requestedBy: 'Solicitante de prueba', additionalLaborHours: 3, additionalMachineHours: 1, resourceNotes: 'Nuevo procesamiento', proposedDate: '2026-12-02' });
    const change = ticket.scopeChanges.find(item => item.status === 'PENDIENTE');
    assert.ok(change);
    assert.equal(ticket.comparison.current.laborHours, 10, 'un cambio pendiente no altera el plan');
    await action(approver, { action: 'approveChange', changeId: change.id, reason: 'Esfuerzo adicional aceptado' });
    assert.equal(ticket.comparison.baseline.laborHours, 10);
    assert.equal(ticket.comparison.current.laborHours, 13);
    assert.equal(ticket.scopeVersions.length, 2);
    assert.equal(ticket.decisions.length, 2);
    assert.ok(ticket.events.length >= 8);
    for (const data of [
      { kind: 'PERSONA', personId: ownerUser.id, quantity: 4, unit: 'horas', unitRate: 10, currency: 'COP' },
      { kind: 'MAQUINA', resourceName: 'Equipo de prueba', quantity: 2, unit: 'horas', unitRate: 3, currency: 'USD' },
      { kind: 'TECNOLOGIA', resourceName: 'Servicio de prueba', quantity: 1, unit: 'ejecuciones' },
    ]) {
      response = await owner.json('/api/gestion/recursos', 'POST', { projectId: project.id, ticketId: ticket.id, taskId: task.id, day: '2026-10-14', description: 'Consumo registrado en prueba', ...data });
      assert.equal(response.status, 201, JSON.stringify(response.body));
    }
    const otherProject = await db.project.create({ data: { name: `${tag}-otro`, tecnologias: [] } });
    created.projects.push(otherProject.id);
    const taskMove = await admin.json(`/api/tasks/${task.id}`, 'PATCH', { projectId: otherProject.id });
    assert.equal(taskMove.status, 409, 'las tareas con consumo no se trasladan silenciosamente a otro proyecto');
    assert.equal((await db.task.findUnique({ where: { id: task.id } })).projectId, project.id);
    response = await outsider.json('/api/gestion/recursos', 'POST', { projectId: project.id, kind: 'PERSONA', personId: outsiderUser.id, quantity: 1, unit: 'horas', day: '2026-10-14', description: 'Intento sin permiso' });
    assert.equal(response.status, 403);
    response = await admin.json('/api/gestion/aporte', 'POST', { action: 'distribution', projectId: project.id, expectedVersion: 0, reason: 'Distribución declarada de prueba', assessedAt: '2026-10-14', beneficiaries: [{ areaId: created.areas[0], percent: 60 }, { areaId: created.areas[1], percent: 30 }] });
    assert.equal(response.status, 400);
    response = await admin.json('/api/gestion/aporte', 'POST', { action: 'distribution', projectId: project.id, expectedVersion: 0, reason: 'Distribución declarada de prueba', assessedAt: '2026-10-14', beneficiaries: [{ areaId: created.areas[0], percent: 60 }, { areaId: created.areas[1], percent: 40 }] });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    response = await admin.json('/api/gestion/aporte', 'POST', { action: 'evidence', projectId: project.id, title: 'Reporte entregado', areaIds: created.areas, producerTeam: 'Equipo productor de prueba', technicalResponsible: 'Responsable técnico de prueba', source: 'Fuente controlada de prueba', cutoffDate: '2026-10-14', description: 'Entrega con procedencia', result: 'Información estandarizada disponible', url: 'https://example.invalid/evidencia' });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    response = await admin.request(`/api/gestion/aporte?projectId=${project.id}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.summary.projectCount, 1);
    assert.deepEqual(response.body.summary.withoutDistribution, []);
    assert.equal(response.body.summary.resources.quantities.find(item => item.kind === 'PERSONA').quantity, 4);
    assert.deepEqual(response.body.summary.resources.costs.sort((a, b) => a.currency.localeCompare(b.currency)), [{ currency: 'COP', amount: 40 }, { currency: 'USD', amount: 6 }]);
    assert.equal(response.body.summary.resources.unpricedCount, 1);
    response = await admin.request(`/api/gestion/reporte?projectId=${project.id}`);
    assert.equal(response.status, 200);
    assert.ok(response.body.generatedAt);
    assert.equal(response.body.tickets[0].decisions.length, 2);
    assert.equal(response.body.projects[0].evidence[0].producerTeam, 'Equipo productor de prueba');
    const printable = await admin.request(`/api/gestion/reporte?projectId=${project.id}&format=html`);
    assert.equal(printable.status, 200);
    assert.match(printable.headers.get('content-type'), /text\/html/);
    assert.ok(printable.body.includes(`/dashboard/requerimientos/${ticket.id}`));
    assert.ok(printable.body.includes(`/dashboard/proyectos?projectId=${project.id}`));
    for (const data of [
      { quantity: 1, day: '2026-10-14' },
      { quantity: 7, day: '2026-11-03', ticketId: ticket.id },
    ]) {
      response = await admin.json('/api/gestion/recursos', 'POST', {
        projectId: project.id, kind: 'PERSONA', personId: ownerUser.id, unit: 'horas',
        description: 'Consumo para comprobar filtros de prueba', ...data,
      });
      assert.equal(response.status, 201, JSON.stringify(response.body));
    }
    const filteredReport = await admin.request(`/api/gestion/reporte?ticketId=${ticket.id}&from=2026-10-01&to=2026-10-31`);
    assert.equal(filteredReport.status, 200);
    assert.equal(filteredReport.body.projects.length, 1);
    assert.equal(filteredReport.body.resources.length, 3);
    assert.equal(filteredReport.body.projects[0].resources.length, 3, 'los filtros aplican también a recursos dentro de cada proyecto');
    assert.equal(filteredReport.body.projects[0].resourceSummary.quantities.find(item => item.kind === 'PERSONA').quantity, 4);
    assert.equal(filteredReport.body.summary.resources.quantities.find(item => item.kind === 'PERSONA').quantity, 4);
    const crossOrigin = await admin.request('/api/gestion/configuracion', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: 'https://example.invalid' }, body: JSON.stringify({ action: 'approver', userId: approverUser.id, canApproveRequests: false }) });
    assert.equal(crossOrigin.status, 403);
    await db.user.update({ where: { id: approverUser.id }, data: { isActive: false } });
    response = await approver.request('/api/gestion/catalogos');
    assert.equal(response.status, 401, 'una sesión emitida previamente no habilita un usuario desactivado');
  } finally {
    // Limpiar únicamente los registros identificados de esta prueba, aun si falla una comprobación.
    await db.$transaction(async tx => {
      const tickets = created.tickets;
      const projects = created.projects;
      const areas = created.areas;
      const artifacts = (await Promise.all([
        tx.resourceConsumption.findMany({ where: { projectId: { in: projects } }, select: { id: true } }),
        tx.benefitDistribution.findMany({ where: { projectId: { in: projects } }, select: { id: true } }),
        tx.impactEvidence.findMany({ where: { projectId: { in: projects } }, select: { id: true } }),
      ])).flat().map(record => record.id);
      await tx.approvalDecision.deleteMany({ where: { ticketId: { in: tickets } } });
      await tx.scopeChange.deleteMany({ where: { ticketId: { in: tickets } } });
      await tx.ticketMeeting.deleteMany({ where: { ticketId: { in: tickets } } });
      await tx.ticketEvent.deleteMany({ where: { ticketId: { in: tickets } } });
      await tx.resourceConsumption.deleteMany({ where: { projectId: { in: projects } } });
      await tx.scopeVersion.deleteMany({ where: { ticketId: { in: tickets } } });
      await tx.requestTicket.deleteMany({ where: { id: { in: tickets } } });
      await tx.impactEvidenceRecipient.deleteMany({ where: { evidence: { projectId: { in: projects } } } });
      await tx.impactEvidence.deleteMany({ where: { projectId: { in: projects } } });
      await tx.projectBeneficiary.deleteMany({ where: { distribution: { projectId: { in: projects } } } });
      await tx.benefitDistribution.deleteMany({ where: { projectId: { in: projects } } });
      await tx.projectMembership.deleteMany({ where: { projectId: { in: projects } } });
      await tx.task.deleteMany({ where: { id: { in: created.tasks } } });
      await tx.project.deleteMany({ where: { id: { in: projects } } });
      await tx.auditLog.deleteMany({ where: { entityId: { in: [...areas, ...tickets, ...projects, ...created.tasks, ...artifacts, ...created.users.map(user => user.id)] } } });
      await tx.area.deleteMany({ where: { id: { in: areas } } });
      await tx.user.deleteMany({ where: { id: { in: created.users.map(user => user.id) } } });
      await tx.responsable.deleteMany({ where: { name: tag } });
    });
    const after = { projects: await db.project.count(), tasks: await db.task.count(), users: await db.user.count() };
    await db.$disconnect();
    assert.deepEqual(after, before, 'se conservan los registros históricos');
  }
});
