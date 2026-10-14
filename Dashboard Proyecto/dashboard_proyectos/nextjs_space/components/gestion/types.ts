export interface Person {
  id: string;
  name: string | null;
  email: string;
  canApproveRequests: boolean;
}
export interface Project {
  id: string;
  name: string;
  tasks: { id: string; name: string }[];
}
export interface Catalogs {
  identity: Person & { role: string };
  users: Person[];
  projects: Project[];
  areas: { id: string; name: string; isActive?: boolean }[];
}
export interface ResourceSummary {
  quantities: { kind: string; unit: string; quantity: number }[];
  costs: { currency: string; amount: number }[];
  unpricedCount: number;
}
export interface ScopeVersion {
  id: string;
  version: number;
  scope: string;
  deliverables: string;
  acceptanceCriteria: string;
  laborHours: number;
  machineHours: number;
  resourceNotes: string;
  proposedDate: string;
  createdByName: string;
  createdAt: string;
}
export interface ScopeChange {
  id: string;
  baseScopeVersionId: string;
  resultingScopeVersionId: string | null;
  status: string;
  additions: string;
  reason: string;
  requestedBy: string;
  additionalLaborHours: number;
  additionalMachineHours: number;
  resourceNotes: string;
  proposedDate: string;
  createdByName: string;
  createdAt: string;
  resolvedAt: string | null;
}
export interface Ticket {
  id: string;
  number: number;
  title: string;
  status: string;
  requesterName: string;
  requesterEmail: string;
  area: string;
  problem: string;
  expectedResult: string;
  beneficiaries: string;
  sources: string;
  deliverables: string;
  acceptanceCriteria: string;
  desiredDate: string | null;
  desiredDateReason: string | null;
  referenceLinks: string[];
  ownerId: string | null;
  approverId: string | null;
  projectId: string | null;
  submittedScopeVersionId: string | null;
  updatedAt: string;
  createdAt: string;
  owner: Person | null;
  approver: Person | null;
  project: { id: string; name: string } | null;
}
export interface TicketDetail extends Ticket {
  scopeVersions: ScopeVersion[];
  scopeChanges: ScopeChange[];
  events: {
    id: string;
    action: string;
    actorName: string;
    actorEmail: string | null;
    createdAt: string;
    data: Record<string, unknown>;
  }[];
  meetings: {
    id: string;
    heldAt: string;
    participants: string;
    summary: string;
    clarifiedNeeds: string;
    agreements: string;
    evidenceLinks: string[];
    recordedByName: string;
  }[];
  decisions: {
    id: string;
    scopeVersionId: string;
    changeId: string | null;
    decision: string;
    actorName: string;
    actorEmail: string;
    reason: string;
    createdAt: string;
  }[];
  comparison: {
    baseline: ScopeVersion | null;
    current: ScopeVersion | null;
    actual: ResourceSummary;
  };
}
export const statusLabels: Record<string, string> = {
  RECIBIDO: "Recibido",
  EN_LEVANTAMIENTO: "En levantamiento",
  PENDIENTE_APROBACION: "Pendiente de aprobación",
  APROBADO: "Aprobado",
  EN_EJECUCION: "En ejecución",
  ENTREGADO: "Entregado",
  CERRADO: "Cerrado",
  RECHAZADO: "Rechazado",
  CANCELADO: "Cancelado",
  PENDIENTE: "Pendiente",
  ACLARACION: "Requiere aclaración",
  CAMBIO_APROBADO: "Cambio aprobado",
  CAMBIO_RECHAZADO: "Cambio rechazado",
};
export const ticketNumber = (number: number) =>
  `REQ-${String(number).padStart(6, "0")}`;
export const personName = (person: Person) =>
  person.name ? `${person.name} (${person.email})` : person.email;
export const civilDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(value.slice(0, 10) + "T00:00:00Z"))
    : "Sin fecha";
export const instantDate = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
