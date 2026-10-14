import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeAreaProjects } from "../components/gestion/impact-summary";
import type { ImpactProject } from "../components/gestion/effort-impact-types";
function project(id: string): ImpactProject {
  return {
    id,
    name: id,
    historicArea: null,
    hasDistribution: true,
    distributions: [
      {
        id: `distribution-${id}`,
        version: 1,
        assessorName: "Valorador documental",
        assessedAt: "2026-10-14",
        reason: "Prueba de agrupación",
        beneficiaries: [
          {
            areaId: "area-a",
            percent: 100,
            area: { id: "area-a", name: "Área de prueba" },
          },
        ],
      },
    ],
    evidence: [],
    resourceSummary: { quantities: [], costs: [], unpricedCount: 0 },
  };
}
test("deduplicates projects linked by both declaration and evidence without allocating effort by percentage", () => {
  const first = project("project-1");
  first.distributions[0].beneficiaries[0].percent = 25;
  first.distributions[0].beneficiaries.push({
    areaId: "area-b",
    percent: 75,
    area: { id: "area-b", name: "Otra área de prueba" },
  });
  first.resourceSummary = {
    quantities: [{ kind: "PERSONA", unit: "horas", quantity: 8 }],
    costs: [{ currency: "COP", amount: 100 }],
    unpricedCount: 1,
  };
  first.evidence = [
    {
      id: "evidence-1",
      title: "Uso documentado",
      producerTeam: "Equipo documental",
      technicalResponsible: "Responsable documental",
      source: "Prueba local",
      cutoffDate: "2026-10-14",
      validationResponsible: null,
      url: null,
      description: "Uso",
      result: "Resultado",
      recordedByName: "Usuario de prueba",
      recipients: [{ area: { id: "area-a", name: "Área de prueba" } }],
    },
  ];
  const summary = summarizeAreaProjects([first, first], "area-a");
  assert.equal(summary.projects.length, 1);
  assert.equal(summary.evidenceCount, 1);
  assert.equal(summary.resources.quantities[0].quantity, 8);
  assert.deepEqual(summary.resources, first.resourceSummary);
});
test("groups matching physical quantities and currencies while preserving different kinds and units", () => {
  const first = project("project-1"),
    second = project("project-2");
  first.resourceSummary = {
    quantities: [
      { kind: "PERSONA", unit: "horas", quantity: 8 },
      { kind: "MAQUINA", unit: "horas", quantity: 3 },
      { kind: "TECNOLOGIA", unit: "licencias", quantity: 1 },
    ],
    costs: [{ currency: "COP", amount: 100 }],
    unpricedCount: 2,
  };
  second.resourceSummary = {
    quantities: [
      { kind: "PERSONA", unit: "horas", quantity: 2 },
      { kind: "TECNOLOGIA", unit: "licencias", quantity: 2 },
      { kind: "TECNOLOGIA", unit: "GB", quantity: 4 },
    ],
    costs: [
      { currency: "COP", amount: 50 },
      { currency: "USD", amount: 10 },
    ],
    unpricedCount: 1,
  };
  const summary = summarizeAreaProjects([first, second], "area-a");
  assert.deepEqual(summary.resources, {
    quantities: [
      { kind: "PERSONA", unit: "horas", quantity: 10 },
      { kind: "MAQUINA", unit: "horas", quantity: 3 },
      { kind: "TECNOLOGIA", unit: "licencias", quantity: 3 },
      { kind: "TECNOLOGIA", unit: "GB", quantity: 4 },
    ],
    costs: [
      { currency: "COP", amount: 150 },
      { currency: "USD", amount: 10 },
    ],
    unpricedCount: 3,
  });
  assert.equal(summary.projects.length, 2);
  assert.equal(first.resourceSummary.quantities[0].quantity, 8);
  assert.equal(second.resourceSummary.quantities[0].quantity, 2);
});
test("relates an area through latest declaration or evidence, excluding superseded declarations", () => {
  const old = project("old"),
    evidenceOnly = project("evidence-only");
  old.distributions.unshift({
    ...old.distributions[0],
    id: "new",
    version: 2,
    beneficiaries: [
      {
        areaId: "area-b",
        percent: 100,
        area: { id: "area-b", name: "Otra área" },
      },
    ],
  });
  evidenceOnly.distributions = [];
  evidenceOnly.evidence = [
    {
      id: "evidence-2",
      title: "Uso",
      producerTeam: "Equipo",
      technicalResponsible: "Responsable",
      source: "Fuente",
      cutoffDate: "2026-10-14",
      validationResponsible: null,
      url: null,
      description: "Descripción",
      result: "Resultado",
      recordedByName: "Usuario",
      recipients: [{ area: { id: "area-a", name: "Área de prueba" } }],
    },
  ];
  assert.deepEqual(
    summarizeAreaProjects([old, evidenceOnly], "area-a").projects.map(
      (row) => row.id,
    ),
    ["evidence-only"],
  );
  assert.deepEqual(
    summarizeAreaProjects([old, evidenceOnly], "absent").resources,
    { quantities: [], costs: [], unpricedCount: 0 },
  );
});
