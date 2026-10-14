import Link from "next/link";
import { civilDate } from "./types";
import type { ImpactProject, ImpactResponse } from "./effort-impact-types";
import { Panel, TextItem, References, linkClass } from "./ui";
import { quantityText, ResourceTotals } from "./effort-summary";
import { summarizeAreaProjects } from "./impact-summary";
export function AreaSummary({ data }: { data: ImpactResponse }) {
  return (
    <Panel title="Áreas beneficiarias">
      <p className="mb-4 text-sm text-slate-600">
        Un proyecto puede beneficiar a varias áreas. Su esfuerzo es compartido;
        los subtotales por área no se suman para obtener el total institucional.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <caption className="mb-3 text-left text-slate-600">
            Proyectos y evidencias documentadas por área, dentro del filtro
            activo.
          </caption>
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="p-3">
                Área
              </th>
              <th scope="col" className="p-3">
                Proyectos relacionados
              </th>
              <th scope="col" className="p-3">
                Evidencias
              </th>
              <th scope="col" className="p-3">
                Beneficio declarado por proyecto
              </th>
              <th scope="col" className="p-3">
                Esfuerzo compartido de los proyectos relacionados
              </th>
            </tr>
          </thead>
          <tbody>
            {data.areas.map((area) => {
              const { projects, resources, evidenceCount } =
                summarizeAreaProjects(data.projects, area.id);
              return (
                <tr
                  className="border-b border-slate-100 align-top"
                  key={area.id}
                >
                  <th scope="row" className="p-3 font-medium">
                    {area.name}
                  </th>
                  <td className="p-3">{projects.length}</td>
                  <td className="p-3">{evidenceCount}</td>
                  <td className="p-3">
                    <ul className="space-y-1">
                      {projects.map((project) => {
                        const beneficiary =
                          project.distributions[0]?.beneficiaries.find(
                            (row) => row.areaId === area.id,
                          );
                        return (
                          <li key={project.id}>
                            <a
                              className={linkClass}
                              href={`#proyecto-${project.id}`}
                            >
                              {project.name}
                            </a>
                            :{" "}
                            {beneficiary
                              ? `${quantityText(beneficiary.percent)}% declarado`
                              : "Sin porcentaje declarado para esta área"}
                          </li>
                        );
                      })}
                    </ul>
                    {!projects.length && "Sin registros relacionados"}
                  </td>
                  <td className="min-w-[300px] p-3">
                    <p className="mb-3 text-xs text-slate-600">
                      Esfuerzo completo de cada proyecto, contado una vez para
                      esta área. No se reparte según los porcentajes declarados.
                    </p>
                    <ResourceTotals summary={resources} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
export function ImpactProjectDetail({ project }: { project: ImpactProject }) {
  return (
    <section id={`proyecto-${project.id}`} className="space-y-4 scroll-mt-4">
      <Panel title={project.name}>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            className={linkClass}
            href={`/dashboard/proyectos?projectId=${encodeURIComponent(project.id)}`}
          >
            Consultar proyecto y avance
          </Link>
          <Link
            className={linkClass}
            href={`/dashboard/requerimientos?projectId=${encodeURIComponent(project.id)}`}
          >
            Requerimientos e historial
          </Link>
          <Link
            className={linkClass}
            href={`/dashboard/esfuerzo?projectId=${encodeURIComponent(project.id)}`}
          >
            Registro de esfuerzo
          </Link>
          <a
            className={linkClass}
            href={`/api/gestion/reporte?projectId=${encodeURIComponent(project.id)}&format=html`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Reporte ejecutivo imprimible
          </a>
        </div>
        <p className="my-4 text-sm text-slate-600">
          Área histórica: {project.historicArea || "No registrada"}. Este texto
          conserva la referencia original; no asigna automáticamente
          beneficiarios.
        </p>
        <ResourceTotals summary={project.resourceSummary} />
      </Panel>
      <Panel title="Distribución declarada de beneficio">
        <p className="mb-4 text-sm text-slate-600">
          Los porcentajes suman 100% por proyecto y expresan una valoración
          declarada. Las versiones anteriores conservan su justificación.
        </p>
        {!project.hasDistribution && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            Sin distribución registrada
          </p>
        )}
        <div className="space-y-4">
          {project.distributions.map((distribution, index) => (
            <article
              key={distribution.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <h3 className="font-semibold text-ungrd-blue">
                Versión {distribution.version}
                {index === 0 ? " · Vigente" : " · Histórica"}
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Valoró {distribution.assessorName} ·{" "}
                {civilDate(distribution.assessedAt)}
              </p>
              <ul className="my-3 space-y-1 text-sm">
                {distribution.beneficiaries.map((row) => (
                  <li key={row.areaId}>
                    {row.area.name}:{" "}
                    <strong>{quantityText(row.percent)}%</strong>
                    {row.area.isActive === false
                      ? " (área actualmente inactiva)"
                      : ""}
                  </li>
                ))}
              </ul>
              <p className="whitespace-pre-wrap text-sm">
                {distribution.reason}
              </p>
            </article>
          ))}
        </div>
      </Panel>
      <Panel title="Evidencias de beneficio observado">
        <p className="mb-4 text-sm text-slate-600">
          Registros documentales manuales de resultados o usos concretos, con
          atribución y fuente.
        </p>
        <div className="space-y-4">
          {project.evidence.map((evidence) => (
            <article
              key={evidence.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <h3 className="mb-3 font-semibold text-ungrd-blue">
                {evidence.title}
              </h3>
              <dl className="grid gap-4 sm:grid-cols-2">
                <TextItem label="Equipo productor">
                  {evidence.producerTeam}
                </TextItem>
                <TextItem label="Responsable técnico">
                  {evidence.technicalResponsible}
                </TextItem>
                <TextItem label="Fuente">{evidence.source}</TextItem>
                <TextItem label="Fecha de corte">
                  {civilDate(evidence.cutoffDate)}
                </TextItem>
                <TextItem label="Responsable de validación">
                  {evidence.validationResponsible}
                </TextItem>
                <TextItem label="Áreas destinatarias">
                  {evidence.recipients.map((row) => row.area.name).join(" · ")}
                </TextItem>
                <TextItem label="Descripción">{evidence.description}</TextItem>
                <TextItem label="Resultado documentado">
                  {evidence.result}
                </TextItem>
                <TextItem label="Registró">{evidence.recordedByName}</TextItem>
              </dl>
              {evidence.url && (
                <div className="mt-4">
                  <References links={[evidence.url]} />
                </div>
              )}
            </article>
          ))}
        </div>
        {!project.evidence.length && (
          <p className="text-sm text-slate-500">
            Sin evidencias documentadas para este proyecto.
          </p>
        )}
      </Panel>
    </section>
  );
}
