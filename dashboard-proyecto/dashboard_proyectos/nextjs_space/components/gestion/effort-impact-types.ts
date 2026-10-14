import type { Person, ResourceSummary, ScopeVersion } from "./types";
export type ResourceKind = "PERSONA" | "MAQUINA" | "TECNOLOGIA" | "OTRO";
export const kindLabels: Record<string, string> = {
  PERSONA: "Trabajo de personas",
  MAQUINA: "Máquina",
  TECNOLOGIA: "Tecnología",
  OTRO: "Otro recurso",
};
export interface ResourceRecord {
  id: string;
  projectId: string;
  ticketId: string | null;
  taskId: string | null;
  kind: ResourceKind;
  personId: string | null;
  resourceName: string | null;
  quantity: number;
  unit: string;
  unitRate: number | null;
  currency: string | null;
  day: string;
  description: string;
  recordedByName: string;
  person: Person | null;
  project: { id: string; name: string };
  ticket: { id: string; number: number; title: string } | null;
  task: { id: string; name: string } | null;
}
export interface EffortResponse {
  records: ResourceRecord[];
  summary: ResourceSummary;
  truncated?: boolean;
  plans: {
    ticketId: string;
    number: number;
    baseline: ScopeVersion | null;
    current: ScopeVersion | null;
    actual: ResourceSummary;
  }[];
}
export interface Area {
  id: string;
  name: string;
  isActive?: boolean;
}
export interface Distribution {
  id: string;
  version: number;
  assessorName: string;
  assessedAt: string;
  reason: string;
  beneficiaries: { areaId: string; percent: number; area: Area }[];
}
export interface ImpactEvidence {
  id: string;
  title: string;
  producerTeam: string;
  technicalResponsible: string;
  source: string;
  cutoffDate: string;
  validationResponsible: string | null;
  url: string | null;
  description: string;
  result: string;
  recordedByName: string;
  recipients: { area: Area }[];
}
export interface ImpactProject {
  id: string;
  name: string;
  historicArea: string | null;
  distributions: Distribution[];
  evidence: ImpactEvidence[];
  resourceSummary: ResourceSummary;
  hasDistribution: boolean;
}
export interface ImpactResponse {
  projects: ImpactProject[];
  areas: Area[];
  summary: {
    projectCount: number;
    withoutDistribution: string[];
    resources: ResourceSummary;
  };
}
