import type { ImpactProject } from "./effort-impact-types";
import type { ResourceSummary } from "./types";
export function summarizeAreaProjects(
  projects: ImpactProject[],
  areaId: string,
) {
  const related = [
    ...new Map(
      projects
        .filter(
          (project) =>
            project.distributions[0]?.beneficiaries.some(
              (row) => row.areaId === areaId,
            ) ||
            project.evidence.some((evidence) =>
              evidence.recipients.some((row) => row.area.id === areaId),
            ),
        )
        .map((project) => [project.id, project]),
    ).values(),
  ];
  const quantities = new Map<string, ResourceSummary["quantities"][number]>();
  const costs = new Map<string, number>();
  let unpricedCount = 0;
  let evidenceCount = 0;
  for (const project of related) {
    evidenceCount += project.evidence.filter((evidence) =>
      evidence.recipients.some((row) => row.area.id === areaId),
    ).length;
    unpricedCount += project.resourceSummary.unpricedCount;
    for (const row of project.resourceSummary.quantities) {
      const key = JSON.stringify([row.kind, row.unit]);
      const group = quantities.get(key) || {
        kind: row.kind,
        unit: row.unit,
        quantity: 0,
      };
      group.quantity += row.quantity;
      quantities.set(key, group);
    }
    for (const row of project.resourceSummary.costs)
      costs.set(row.currency, (costs.get(row.currency) || 0) + row.amount);
  }
  const resources: ResourceSummary = {
    quantities: [...quantities.values()],
    costs: [...costs].map(([currency, amount]) => ({ currency, amount })),
    unpricedCount,
  };
  return { projects: related, resources, evidenceCount };
}
