"use client";
import {
  type Catalogs,
  type TicketDetail,
  type ScopeVersion,
  civilDate,
  instantDate,
  personName,
  statusLabels,
} from "./types";
import {
  ActionForm,
  type Mutate,
  Panel,
  References,
  Status,
  TextItem,
} from "./ui";
function Scope({ version }: { version: ScopeVersion }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <TextItem label="Alcance">{version.scope}</TextItem>
      <TextItem label="Entregables">{version.deliverables}</TextItem>
      <TextItem label="Aceptación">{version.acceptanceCriteria}</TextItem>
      <TextItem label="Recursos previstos">{version.resourceNotes}</TextItem>
      <TextItem label="Trabajo estimado">{version.laborHours} horas</TextItem>
      <TextItem label="Máquina estimada">{version.machineHours} horas</TextItem>
      <TextItem label="Fecha propuesta">
        {civilDate(version.proposedDate)}
      </TextItem>
      <TextItem label="Registró">
        {version.createdByName} · {instantDate(version.createdAt)}
      </TextItem>
    </dl>
  );
}
const eventLabels: Record<string, string> = {
  received: "Solicitud recibida",
  reception: "Solicitud recibida",
  assign: "Responsable asignado",
  meeting: "Reunión registrada",
  scope: "Nueva versión de alcance",
  submit: "Versión enviada a aprobación",
  approve: "Alcance aprobado",
  reject: "Solicitud rechazada",
  clarify: "Aclaraciones solicitadas",
  cancel: "Solicitud cancelada",
  transition: "Estado actualizado",
  attachProject: "Proyecto vinculado",
  createProject: "Proyecto creado y vinculado",
  requestChange: "Cambio de alcance solicitado",
  approveChange: "Cambio aprobado",
  rejectChange: "Cambio rechazado",
};
const dataLabels: Record<string, string> = {
  reason: "Motivo",
  note: "Nota",
  previousStatus: "Estado anterior",
  nextStatus: "Estado resultante",
  status: "Estado",
  ownerId: "Responsable",
  approverId: "Aprobador",
  projectId: "Proyecto",
  scopeVersionId: "Versión",
  baseScopeVersionId: "Versión base",
  changeId: "Cambio",
  heldAt: "Reunión",
  participants: "Participantes",
  summary: "Resumen",
  clarifiedNeeds: "Necesidades aclaradas",
  agreements: "Acuerdos",
  scope: "Alcance",
  deliverables: "Entregables",
  acceptanceCriteria: "Aceptación",
  laborHours: "Horas de trabajo",
  machineHours: "Horas de máquina",
  resourceNotes: "Recursos",
  proposedDate: "Fecha propuesta",
  additions: "Adiciones",
  requestedBy: "Solicitó",
  additionalLaborHours: "Trabajo adicional (horas)",
  additionalMachineHours: "Máquina adicional (horas)",
  name: "Nombre del proyecto",
  description: "Descripción",
  number: "Número",
  title: "Título",
  area: "Área solicitante",
  desiredDate: "Fecha deseada",
  desiredDateReason: "Motivo de la fecha deseada",
  requesterName: "Solicitante",
};
export function TicketHistory({
  ticket,
  catalogs,
  mutate,
  busy,
}: {
  ticket: TicketDetail;
  catalogs: Catalogs;
  mutate: Mutate;
  busy: boolean;
}) {
  const versionName = (id: string) => {
    const version = ticket.scopeVersions.find((item) => item.id === id);
    return version ? `Versión ${version.version}` : "Versión no disponible";
  };
  const canDecide =
    catalogs.identity.canApproveRequests &&
    ticket.approverId === catalogs.identity.id &&
    !!ticket.projectId &&
    ["APROBADO", "EN_EJECUCION"].includes(ticket.status);
  function eventValue(key: string, value: unknown): string {
    if (value === null) return "Sin asignar";
    const string = String(value);
    if (key.endsWith("Status") || key === "status")
      return statusLabels[string] || string;
    if (["scopeVersionId", "baseScopeVersionId"].includes(key))
      return versionName(string);
    if (key === "changeId")
      return `Cambio ${ticket.scopeChanges.findIndex((item) => item.id === string) + 1}`;
    if (["ownerId", "approverId"].includes(key)) {
      const person =
        catalogs.users.find((user) => user.id === string) ||
        [ticket.owner, ticket.approver].find((user) => user?.id === string);
      return person
        ? personName(person)
        : "Identidad histórica no disponible en el catálogo activo";
    }
    if (key === "projectId")
      return (
        catalogs.projects.find((project) => project.id === string)?.name ||
        ticket.project?.name ||
        "Proyecto histórico"
      );
    if (["proposedDate", "desiredDate"].includes(key)) return civilDate(string);
    if (key === "heldAt") return instantDate(string);
    return string;
  }
  return (
    <div className="space-y-6">
      <Panel title="Plan aprobado y ejecución real">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="mb-3 text-left text-xs text-slate-600">
              Las horas de personas y máquinas se comparan por separado. Los
              cambios pendientes no alteran el plan.
            </caption>
            <thead className="border-b bg-slate-50">
              <tr>
                {[
                  "Concepto",
                  "Plan inicial",
                  "Plan vigente",
                  "Real registrado",
                ].map((label) => (
                  <th className="p-3" scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <th scope="row" className="p-3 font-medium">
                  Trabajo (horas)
                </th>
                <td className="p-3">
                  {ticket.comparison.baseline?.laborHours ?? "Sin aprobar"}
                </td>
                <td className="p-3">
                  {ticket.comparison.current?.laborHours ?? "Sin aprobar"}
                </td>
                <td className="p-3">
                  {ticket.comparison.actual.quantities.find(
                    (row) => row.kind === "PERSONA" && row.unit === "horas",
                  )?.quantity ?? 0}
                </td>
              </tr>
              <tr className="border-b">
                <th scope="row" className="p-3 font-medium">
                  Máquina (horas)
                </th>
                <td className="p-3">
                  {ticket.comparison.baseline?.machineHours ?? "Sin aprobar"}
                </td>
                <td className="p-3">
                  {ticket.comparison.current?.machineHours ?? "Sin aprobar"}
                </td>
                <td className="p-3">
                  {ticket.comparison.actual.quantities.find(
                    (row) => row.kind === "MAQUINA" && row.unit === "horas",
                  )?.quantity ?? 0}
                </td>
              </tr>
              <tr>
                <th scope="row" className="p-3 font-medium">
                  Fecha propuesta
                </th>
                <td className="p-3">
                  {civilDate(ticket.comparison.baseline?.proposedDate || null)}
                </td>
                <td className="p-3">
                  {civilDate(ticket.comparison.current?.proposedDate || null)}
                </td>
                <td className="p-3">No es una medida de consumo</td>
              </tr>
            </tbody>
          </table>
        </div>
        {ticket.comparison.actual.quantities
          .filter((row) => !["PERSONA", "MAQUINA"].includes(row.kind))
          .map((row) => (
            <p className="mt-3 text-sm" key={`${row.kind}-${row.unit}`}>
              {row.kind === "TECNOLOGIA" ? "Tecnología" : "Otro recurso"}:{" "}
              {row.quantity} {row.unit}
            </p>
          ))}
        {ticket.comparison.actual.costs.map((cost) => (
          <p className="mt-2 text-sm" key={cost.currency}>
            Importe calculado: {cost.amount.toLocaleString("es-CO")}{" "}
            {cost.currency}
          </p>
        ))}
        <p className="mt-3 text-xs text-slate-600">
          {ticket.comparison.actual.unpricedCount} consumos sin tarifa; su
          importe no está calculado.
        </p>
      </Panel>
      <Panel title="Versiones de alcance · historial inmutable">
        {!ticket.scopeVersions.length && (
          <p className="text-sm text-slate-500">
            No hay versiones de alcance registradas.
          </p>
        )}
        <div className="space-y-4">
          {ticket.scopeVersions.map((version) => (
            <details
              key={version.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <summary className="cursor-pointer font-medium text-ungrd-blue">
                Versión {version.version}
                {ticket.comparison.baseline?.id === version.id
                  ? " · Plan inicial"
                  : ""}
                {ticket.comparison.current?.id === version.id
                  ? " · Plan vigente"
                  : ""}
                {ticket.submittedScopeVersionId === version.id
                  ? " · Presentada a aprobación"
                  : ""}
              </summary>
              <div className="pt-4">
                <Scope version={version} />
              </div>
            </details>
          ))}
        </div>
      </Panel>
      <Panel title="Cambios de alcance">
        {!ticket.scopeChanges.length && (
          <p className="text-sm text-slate-500">
            Sin solicitudes de cambio registradas.
          </p>
        )}
        <div className="space-y-5">
          {ticket.scopeChanges.map((change, index) => (
            <article
              key={change.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <div className="mb-4 flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">
                  Cambio {index + 1} · Base:{" "}
                  {versionName(change.baseScopeVersionId)}
                </h3>
                <Status status={change.status} />
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <TextItem label="Adiciones">{change.additions}</TextItem>
                <TextItem label="Motivo">{change.reason}</TextItem>
                <TextItem label="Solicitó">{change.requestedBy}</TextItem>
                <TextItem label="Registró">
                  {change.createdByName} · {instantDate(change.createdAt)}
                </TextItem>
                <TextItem label="Trabajo adicional">
                  {change.additionalLaborHours} horas
                </TextItem>
                <TextItem label="Máquina adicional">
                  {change.additionalMachineHours} horas
                </TextItem>
                <TextItem label="Recursos adicionales">
                  {change.resourceNotes}
                </TextItem>
                <TextItem label="Fecha propuesta">
                  {civilDate(change.proposedDate)}
                </TextItem>
                {change.resolvedAt && (
                  <TextItem label="Resuelto">
                    {instantDate(change.resolvedAt)}
                  </TextItem>
                )}
                {change.resultingScopeVersionId && (
                  <TextItem label="Alcance resultante">
                    {versionName(change.resultingScopeVersionId)}
                  </TextItem>
                )}
              </dl>
              {change.status === "PENDIENTE" && (
                <p className="mt-3 text-xs text-amber-800">
                  Este cambio no modifica el plan vigente mientras esté
                  pendiente.
                </p>
              )}
              {canDecide && change.status === "PENDIENTE" && (
                <div className="mt-5 space-y-5 border-t pt-4">
                  {change.baseScopeVersionId ===
                  ticket.comparison.current?.id ? (
                    <ActionForm
                      action="approveChange"
                      title="Aprobar cambio"
                      values={{ changeId: change.id }}
                      fields={[
                        {
                          name: "reason",
                          label: "Observación de aprobación",
                          type: "textarea",
                          required: false,
                        },
                      ]}
                      mutate={mutate}
                      busy={busy}
                    />
                  ) : (
                    <p className="text-sm text-amber-800">
                      La versión base ya no es vigente. Registre un cambio
                      actualizado antes de aprobarlo.
                    </p>
                  )}
                  <ActionForm
                    action="rejectChange"
                    title="Rechazar cambio"
                    values={{ changeId: change.id }}
                    fields={[
                      {
                        name: "reason",
                        label: "Motivo del rechazo",
                        type: "textarea",
                      },
                    ]}
                    mutate={mutate}
                    busy={busy}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      </Panel>
      <Panel title="Decisiones autenticadas">
        {!ticket.decisions.length && (
          <p className="text-sm text-slate-500">Sin decisiones registradas.</p>
        )}
        <ol className="space-y-4">
          {ticket.decisions.map((decision) => (
            <li
              key={decision.id}
              className="border-l-4 border-ungrd-yellow pl-4"
            >
              <p className="font-semibold text-sm">
                {statusLabels[decision.decision] || decision.decision} ·{" "}
                {versionName(decision.scopeVersionId)}
                {decision.changeId
                  ? ` · Cambio ${ticket.scopeChanges.findIndex((change) => change.id === decision.changeId) + 1}`
                  : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {decision.actorName} ({decision.actorEmail}) ·{" "}
                {instantDate(decision.createdAt)}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {decision.reason}
              </p>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel title="Reuniones del levantamiento">
        {!ticket.meetings.length && (
          <p className="text-sm text-slate-500">Sin reuniones registradas.</p>
        )}
        <div className="space-y-5">
          {ticket.meetings.map((meeting) => (
            <article key={meeting.id} className="rounded-lg border p-4">
              <h3 className="mb-3 font-semibold text-sm">
                {instantDate(meeting.heldAt)} · Registró{" "}
                {meeting.recordedByName}
              </h3>
              <dl className="grid gap-4 sm:grid-cols-2">
                <TextItem label="Participantes">
                  {meeting.participants}
                </TextItem>
                <TextItem label="Resumen">{meeting.summary}</TextItem>
                <TextItem label="Necesidades aclaradas">
                  {meeting.clarifiedNeeds}
                </TextItem>
                <TextItem label="Acuerdos">{meeting.agreements}</TextItem>
                <TextItem label="Evidencia">
                  <References links={meeting.evidenceLinks} />
                </TextItem>
              </dl>
            </article>
          ))}
        </div>
      </Panel>
      <Panel title="Trazabilidad cronológica">
        <p className="mb-4 text-xs text-slate-500">
          Fechas y horas de Bogotá. Los eventos se conservan y no se editan.
        </p>
        <ol className="space-y-5">
          {ticket.events.map((event) => (
            <li key={event.id} className="border-l-2 border-slate-200 pl-4">
              <h3 className="text-sm font-semibold">
                {eventLabels[event.action] || "Evento registrado"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {event.actorName}
                {event.actorEmail ? ` (${event.actorEmail})` : ""} ·{" "}
                {instantDate(event.createdAt)}
              </p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {Object.entries(event.data)
                  .filter(
                    ([key, value]) => dataLabels[key] && value !== undefined,
                  )
                  .map(([key, value]) => (
                    <TextItem key={key} label={dataLabels[key]}>
                      {eventValue(key, value)}
                    </TextItem>
                  ))}
              </dl>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
