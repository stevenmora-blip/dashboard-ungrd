"use client";
import Link from "next/link";
import {
  type Catalogs,
  type TicketDetail,
  personName,
  statusLabels,
} from "./types";
import {
  ActionForm,
  type FieldSpec,
  type Mutate,
  linkClass,
  Notice,
  Panel,
} from "./ui";
const text = (name: string, label: string, maxLength = 4000): FieldSpec => ({
  name,
  label,
  type: "textarea",
  maxLength,
});
const hours = (name: string, label: string): FieldSpec => ({
  name,
  label,
  type: "number",
});
const reason = text("reason", "Motivo de la decisión");
export function TicketActions({
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
  const admin = catalogs.identity.role === "ADMIN";
  const manages = admin || ticket.ownerId === catalogs.identity.id;
  const terminal = ["RECHAZADO", "CANCELADO", "CERRADO"].includes(
    ticket.status,
  );
  const preparing = ticket.status === "EN_LEVANTAMIENTO";
  const approved = ["APROBADO", "EN_EJECUCION"].includes(ticket.status);
  const approvers = catalogs.users
    .filter((user) => user.canApproveRequests)
    .map((user) => ({ value: user.id, label: personName(user) }));
  const decides =
    catalogs.identity.canApproveRequests &&
    ticket.approverId === catalogs.identity.id;
  const versions = ticket.scopeVersions.map((version) => ({
    value: version.id,
    label: `Versión ${version.version} · ${version.createdByName}`,
  }));
  const nextStatus: Record<string, string> = {
    APROBADO: "EN_EJECUCION",
    EN_EJECUCION: "ENTREGADO",
    ENTREGADO: "CERRADO",
  };
  return (
    <div className="space-y-6">
      {admin && ["RECIBIDO", "EN_LEVANTAMIENTO"].includes(ticket.status) && (
        <Panel title="Asignar levantamiento">
          <p className="mb-4 text-sm text-slate-600">
            Elija a un usuario real del equipo. Guardar la asignación inicia o
            mantiene el levantamiento.
          </p>
          <ActionForm
            action="assign"
            title="Guardar asignación"
            fields={[
              {
                name: "ownerId",
                label: "Responsable del levantamiento",
                options: catalogs.users.map((user) => ({
                  value: user.id,
                  label: personName(user),
                })),
              },
              {
                name: "approverId",
                label: "Aprobador designado",
                required: false,
                options: approvers,
              },
            ]}
            mutate={mutate}
            busy={busy}
            values={{ approverId: null }}
          />
        </Panel>
      )}
      {!approvers.length && !terminal && (
        <Notice>
          Falta habilitar un aprobador activo para solicitar una decisión.{" "}
          {admin ? (
            <Link
              className={linkClass}
              href="/dashboard/requerimientos?configuracion=1"
            >
              Configurar aprobadores
            </Link>
          ) : (
            "Solicite al administrador la configuración de los usuarios reales."
          )}
        </Notice>
      )}
      {manages && preparing && (
        <>
          <Panel title="Registrar reunión realizada">
            <p className="mb-4 text-sm text-slate-600">
              Conserve los acuerdos del levantamiento. La fecha y hora se
              interpretan en la zona horaria de este dispositivo; el historial
              se muestra en hora de Bogotá.
            </p>
            <ActionForm
              action="meeting"
              title="Registrar reunión"
              fields={[
                {
                  name: "heldAt",
                  label: "Fecha y hora de la reunión",
                  type: "datetime-local",
                },
                text("participants", "Participantes", 2000),
                text("summary", "Resumen", 8000),
                text("clarifiedNeeds", "Necesidades aclaradas", 6000),
                text("agreements", "Acuerdos", 6000),
                {
                  ...text("evidenceLinks", "Enlaces a evidencia", 40000),
                  required: false,
                  hint: "Un enlace HTTP(S) por línea; hasta 20.",
                },
              ]}
              mutate={mutate}
              busy={busy}
            />
          </Panel>
          <Panel title="Preparar una nueva versión de alcance">
            <p className="mb-4 text-sm text-slate-600">
              Cada registro crea una versión inmutable. Las horas y la fecha
              propuestas sólo se convierten en plan cuando el aprobador decide.
            </p>
            <ActionForm
              action="scope"
              title="Guardar versión de alcance"
              fields={[
                text("scope", "Alcance propuesto", 12000),
                text("deliverables", "Entregables acordados", 8000),
                text("acceptanceCriteria", "Criterios de aceptación", 8000),
                hours("laborHours", "Horas de trabajo estimadas"),
                hours("machineHours", "Horas de máquina estimadas"),
                text("resourceNotes", "Recursos y tecnología previstos", 6000),
                {
                  name: "proposedDate",
                  label: "Fecha de entrega propuesta",
                  type: "date",
                },
              ]}
              mutate={mutate}
              busy={busy}
            />
          </Panel>
          <Panel title="Solicitar aprobación">
            <ActionForm
              action="submit"
              title="Enviar versión a aprobación"
              fields={[
                {
                  name: "scopeVersionId",
                  label: "Versión a presentar",
                  options: versions,
                },
                {
                  name: "approverId",
                  label: "Aprobador habilitado",
                  options: approvers,
                },
              ]}
              mutate={mutate}
              busy={busy}
              disabled={
                !ticket.ownerId || !versions.length || !approvers.length
              }
            />
            <p className="mt-3 text-xs text-slate-600">
              Se requiere responsable asignado, versión registrada y aprobador
              activo habilitado. Seleccione ambos campos expresamente.
            </p>
          </Panel>
        </>
      )}
      {decides && ticket.status === "PENDIENTE_APROBACION" && (
        <Panel title="Decidir sobre la versión presentada">
          <p className="mb-4 text-sm text-slate-600">
            Versión presentada:{" "}
            {ticket.scopeVersions.find(
              (version) => version.id === ticket.submittedScopeVersionId,
            )?.version || "No disponible"}
            . Su decisión queda registrada con su identidad.
          </p>
          <div className="space-y-6">
            <ActionForm
              action="approve"
              title="Aprobar alcance"
              fields={[{ ...reason, required: false }]}
              mutate={mutate}
              busy={busy}
            />
            <ActionForm
              action="clarify"
              title="Solicitar aclaraciones"
              fields={[reason]}
              mutate={mutate}
              busy={busy}
            />
            <ActionForm
              action="reject"
              title="Rechazar requerimiento"
              fields={[reason]}
              mutate={mutate}
              busy={busy}
            />
          </div>
        </Panel>
      )}
      {admin && !terminal && !ticket.projectId && (
        <Panel title="Vincular proyecto">
          <p className="mb-4 text-sm text-slate-600">
            Seleccione un proyecto existente. El vínculo se guarda mediante esta
            acción explícita.
          </p>
          <ActionForm
            action="attachProject"
            title="Vincular proyecto existente"
            fields={[
              {
                name: "projectId",
                label: "Proyecto",
                options: catalogs.projects.map((project) => ({
                  value: project.id,
                  label: project.name,
                })),
              },
            ]}
            mutate={mutate}
            busy={busy}
          />
          {approved && (
            <div className="mt-6 border-t pt-5">
              <h3 className="mb-3 font-semibold">
                Crear proyecto desde la solicitud aprobada
              </h3>
              <ActionForm
                action="createProject"
                title="Crear y vincular proyecto"
                fields={[
                  {
                    name: "name",
                    label: "Nombre del nuevo proyecto",
                    maxLength: 200,
                  },
                  text("description", "Descripción del proyecto", 8000),
                ]}
                mutate={mutate}
                busy={busy}
              />
            </div>
          )}
        </Panel>
      )}
      {manages && approved && (
        <Panel title="Solicitar cambio de alcance">
          {!ticket.projectId ? (
            <Notice>
              Vincule explícitamente un proyecto antes de registrar cambios de
              alcance.
            </Notice>
          ) : !ticket.comparison.current ? (
            <Notice>Falta un alcance vigente aprobado.</Notice>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600">
                El cambio se solicita sobre la versión vigente{" "}
                {ticket.comparison.current.version}. Mientras esté pendiente no
                modifica el plan aprobado.
              </p>
              <ActionForm
                action="requestChange"
                title="Registrar cambio pendiente"
                values={{ baseScopeVersionId: ticket.comparison.current.id }}
                fields={[
                  text(
                    "additions",
                    "Adiciones o modificaciones solicitadas",
                    12000,
                  ),
                  text("reason", "Motivo del cambio"),
                  {
                    name: "requestedBy",
                    label: "Quién pidió el cambio",
                    maxLength: 200,
                  },
                  hours("additionalLaborHours", "Horas adicionales de trabajo"),
                  hours(
                    "additionalMachineHours",
                    "Horas adicionales de máquina",
                  ),
                  text("resourceNotes", "Recursos adicionales previstos", 6000),
                  {
                    name: "proposedDate",
                    label: "Nueva fecha propuesta",
                    type: "date",
                  },
                ]}
                mutate={mutate}
                busy={busy}
              />
            </>
          )}
        </Panel>
      )}
      {manages && nextStatus[ticket.status] && (
        <Panel title="Avanzar en la ejecución">
          <ActionForm
            action="transition"
            title={`Registrar: ${statusLabels[nextStatus[ticket.status]]}`}
            values={{ status: nextStatus[ticket.status] }}
            fields={[text("note", "Nota de ejecución, entrega o cierre")]}
            mutate={mutate}
            busy={busy}
          />
        </Panel>
      )}
      {manages && !terminal && (
        <details className="rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            Cancelar requerimiento
          </summary>
          <div className="pt-4">
            <p className="mb-3 text-sm text-slate-600">
              La cancelación es un estado final y conserva el historial.
            </p>
            <ActionForm
              action="cancel"
              title="Registrar cancelación"
              fields={[reason]}
              mutate={mutate}
              busy={busy}
            />
          </div>
        </details>
      )}
    </div>
  );
}
