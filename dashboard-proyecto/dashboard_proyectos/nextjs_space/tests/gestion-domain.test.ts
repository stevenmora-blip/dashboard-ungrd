import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition, assertApprover, assertScopeChangeContext, appRecordLink, scopeReportProjects, validateDistribution, summarizeResources, uniqueProjectSummary, isSafeHttpLink } from '../lib/gestion/domain';

test('state transitions cannot skip approval or reopen terminal tickets', () => {
  assert.throws(() => assertTransition('RECIBIDO', 'APROBADO'));
  assert.throws(() => assertTransition('CERRADO', 'EN_EJECUCION'));
  assert.throws(() => assertTransition('APROBADO', 'RECHAZADO'));
  assert.doesNotThrow(() => assertTransition('PENDIENTE_APROBACION', 'EN_LEVANTAMIENTO'));
  assert.doesNotThrow(() => assertTransition('APROBADO', 'EN_EJECUCION'));
});
test('approvals belong to appointed active enabled identity even for administrators', () => {
  assert.throws(() => assertApprover({ id: 'admin', isActive: true, canApproveRequests: true }, 'other'));
  assert.throws(() => assertApprover({ id: 'a', isActive: true, canApproveRequests: false }, 'a'));
  assert.throws(() => assertApprover({ id: 'a', isActive: false, canApproveRequests: true }, 'a'));
  assert.doesNotThrow(() => assertApprover({ id: 'a', isActive: true, canApproveRequests: true }, 'a'));
});
test('declared benefit uses unique areas and finite positive shares totaling 100', () => {
  assert.doesNotThrow(() => validateDistribution([{ areaId: 'a', percent: 35 }, { areaId: 'b', percent: 65 }]));
  for (const rows of [[{ areaId: 'a', percent: 99 }], [{ areaId: 'a', percent: NaN }], [{ areaId: 'a', percent: Infinity }], [{ areaId: 'a', percent: 100 }, { areaId: 'b', percent: 0 }], [{ areaId: 'a', percent: 50 }, { areaId: 'a', percent: 50 }]]) {
    assert.throws(() => validateDistribution(rows));
  }
});
test('physical totals never mix kinds/units; monetary totals keep currency and missing tariffs', () => {
  const summary = summarizeResources([
    { kind: 'PERSONA', quantity: 3, unit: 'hora', unitRate: 10, currency: 'COP' },
    { kind: 'PERSONA', quantity: 2, unit: 'hora', unitRate: null, currency: null },
    { kind: 'MAQUINA', quantity: 4, unit: 'hora', unitRate: 2, currency: 'USD' },
    { kind: 'TECNOLOGIA', quantity: 2, unit: 'licencia', unitRate: 5, currency: 'COP' },
  ]);
  assert.deepEqual(summary.quantities, [{ kind: 'PERSONA', unit: 'hora', quantity: 5 }, { kind: 'MAQUINA', unit: 'hora', quantity: 4 }, { kind: 'TECNOLOGIA', unit: 'licencia', quantity: 2 }]);
  assert.deepEqual(summary.costs, [{ currency: 'COP', amount: 40 }, { currency: 'USD', amount: 8 }]);
  assert.equal(summary.unpricedCount, 1);
});
test('institutional total counts a multi-area project once and reports missing distribution', () => {
  assert.deepEqual(uniqueProjectSummary([{ id: 'a', hasDistribution: true }, { id: 'a', hasDistribution: true }, { id: 'b', hasDistribution: false }]), { projectCount: 2, withoutDistribution: ['b'] });
});
test('reference links accept http(s) only without credentials or control characters', () => {
  assert.equal(isSafeHttpLink('https://example.org/reporte?a=1'), true);
  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'https://user:pass@example.org', 'https://example.org\n/x', 'file:///tmp/a']) assert.equal(isSafeHttpLink(url), false);
});

test('a supplied zero tariff is a known zero cost, while absent tariff stays unknown', () => {
  const summary = summarizeResources([
    { kind: 'TECNOLOGIA', quantity: 1, unit: 'licencia', unitRate: 0, currency: 'COP' },
    { kind: 'TECNOLOGIA', quantity: 1, unit: 'licencia', unitRate: null, currency: null },
  ]);
  assert.deepEqual(summary.costs, [{ currency: 'COP', amount: 0 }]);
  assert.equal(summary.unpricedCount, 1);
});


test('scope changes need an approved ticket attached to a project', () => {
  assert.throws(() => assertScopeChangeContext({ status: 'APROBADO', projectId: null }), /Vincule primero/);
  assert.throws(() => assertScopeChangeContext({ status: 'EN_LEVANTAMIENTO', projectId: 'p' }), /aprobado o en ejecución/);
  assert.doesNotThrow(() => assertScopeChangeContext({ status: 'APROBADO', projectId: 'p' }));
  assert.doesNotThrow(() => assertScopeChangeContext({ status: 'EN_EJECUCION', projectId: 'p' }));
});

test('report links use validated application origin and encode record identifiers', () => {
  assert.equal(appRecordLink('http://localhost:3040', 'ticket', 'abc'), 'http://localhost:3040/dashboard/requerimientos/abc');
  assert.equal(appRecordLink('http://localhost:3040', 'project', 'p&unsafe'), 'http://localhost:3040/dashboard/proyectos?projectId=p%26unsafe');
  assert.throws(() => appRecordLink('javascript:alert(1)', 'ticket', 'abc'));
  assert.throws(() => appRecordLink('https://user:pass@example.org', 'ticket', 'abc'));
});


test('report project sections replace all original resources with the filtered ticket/date records', () => {
  const full = [{ id: 'p1', hasDistribution: true, resources: [{ id: 'other-ticket' }] }, { id: 'p2', hasDistribution: false, resources: [{ id: 'unrelated-project' }] }];
  const selected = [{ id: 'selected', projectId: 'p1', kind: 'PERSONA', unit: 'horas', quantity: 2, unitRate: 3, currency: 'COP' }];
  const report = scopeReportProjects(full, selected, 'p1');
  assert.equal(report.projects.length, 1);
  assert.deepEqual(report.projects[0].resources, selected);
  assert.deepEqual(report.projects[0].resourceSummary, summarizeResources(selected));
  assert.deepEqual(report.summary.resources, summarizeResources(selected));
  assert.equal(report.summary.projectCount, 1);
});

test('an unlinked ticket report includes no authorized unrelated projects or resources', () => {
  const selected = [{ projectId: 'p1', kind: 'PERSONA', unit: 'horas', quantity: 4, unitRate: null, currency: null }];
  const report = scopeReportProjects([{ id: 'p1', hasDistribution: false }], selected, null);
  assert.deepEqual(report.projects, []);
  assert.deepEqual(report.summary, { projectCount: 0, withoutDistribution: [], resources: { quantities: [], costs: [], unpricedCount: 0 } });
});
