import Link from "next/link";
import {
  civilDate,
  personName,
  ticketNumber,
  type ScopeVersion,
} from "./types";
import { kindLabels, type EffortResponse } from "./effort-impact-types";
import { quantityText, ResourceTotals } from "./effort-summary";
import { linkClass, Panel } from "./ui";
export function ResourceTable({ records }: Pick<EffortResponse, "records">) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <caption className="mb-3 text-left text-slate-600">
          Consumos reales; importes calculados sólo con tarifas registradas.
        </caption>
        <thead className="bg-slate-50">
          <tr>
            {[
              "Fecha / tipo",
              "Persona o recurso",
              "Proyecto / ticket / actividad",
              "Cantidad",
              "Tarifa",
              "Importe",
              "Descripción",
            ].map((label) => (
              <th className="p-3" scope="col" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((row) => (
            <tr className="border-b border-slate-100 align-top" key={row.id}>
              <td className="p-3">
                {civilDate(row.day)}
                <p className="text-xs text-slate-500">{kindLabels[row.kind]}</p>
              </td>
              <td className="p-3">
                {row.person ? personName(row.person) : row.resourceName}
                <p className="mt-1 text-xs text-slate-500">
                  Registró: {row.recordedByName}
                </p>
              </td>
              <td className="p-3">
                <Link
                  className={linkClass}
                  href={`/dashboard/proyectos?projectId=${encodeURIComponent(row.project.id)}`}
                >
                  {row.project.name}
                </Link>
                {row.ticket && (
                  <p className="mt-1">
                    <Link
                      className={linkClass}
                      href={`/dashboard/requerimientos/${encodeURIComponent(row.ticket.id)}`}
                    >
                      {ticketNumber(row.ticket.number)} · {row.ticket.title}
                    </Link>
                  </p>
                )}
                <p className="mt-1 text-slate-600">
                  {row.task?.name || "Sin actividad vinculada"}
                </p>
              </td>
              <td className="p-3 whitespace-nowrap">
                {quantityText(row.quantity)} {row.unit}
              </td>
              <td className="p-3">
                {row.unitRate === null
                  ? "No registrada"
                  : `${quantityText(row.unitRate)} ${row.currency || ""}`}
              </td>
              <td className="p-3">
                {row.unitRate === null || !row.currency
                  ? "No calculado"
                  : `${quantityText(row.quantity * row.unitRate)} ${row.currency}`}
              </td>
              <td className="p-3 whitespace-pre-wrap break-words max-w-xs">
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!records.length && (
        <p className="py-6 text-sm text-slate-500">
          Sin consumos para los filtros seleccionados.
        </p>
      )}
    </div>
  );
}
function PlanVersion({
  title,
  plan,
}: {
  title: string;
  plan: ScopeVersion | null;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      {plan ? (
        <dl className="space-y-1 text-sm">
          <div>Versión {plan.version}</div>
          <div>
            Trabajo: <strong>{quantityText(plan.laborHours)} horas</strong>
          </div>
          <div>
            Máquina: <strong>{quantityText(plan.machineHours)} horas</strong>
          </div>
          <div>Entrega propuesta: {civilDate(plan.proposedDate)}</div>
          <div className="whitespace-pre-wrap">
            Recursos: {plan.resourceNotes}
          </div>
        </dl>
      ) : (
        <p className="text-sm text-slate-500">Sin plan aprobado.</p>
      )}
    </div>
  );
}
export function EffortPlans({ plans }: Pick<EffortResponse, "plans">) {
  return (
    <Panel title="Plan aprobado y ejecución por ticket">
      <p className="mb-4 text-sm text-slate-600">
        El plan inicial y vigente corresponde al alcance aprobado. La ejecución
        respeta los filtros de fecha activos; el plan conserva el compromiso
        completo.
      </p>
      <div className="space-y-5">
        {plans.map((row) => (
          <article
            key={row.ticketId}
            className="rounded-lg border border-slate-200 p-4"
          >
            <Link
              className={linkClass}
              href={`/dashboard/requerimientos/${encodeURIComponent(row.ticketId)}`}
            >
              {ticketNumber(row.number)} · Consultar versiones e historial
            </Link>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <PlanVersion title="Plan inicial" plan={row.baseline} />
              <PlanVersion title="Plan vigente" plan={row.current} />
              <div className="rounded-lg bg-blue-50 p-4">
                <h3 className="mb-2 font-semibold">Ejecución registrada</h3>
                <ResourceTotals summary={row.actual} />
              </div>
            </div>
          </article>
        ))}
      </div>
      {!plans.length && (
        <p className="text-sm text-slate-500">
          Sin tickets vinculados para estos filtros.
        </p>
      )}
    </Panel>
  );
}
