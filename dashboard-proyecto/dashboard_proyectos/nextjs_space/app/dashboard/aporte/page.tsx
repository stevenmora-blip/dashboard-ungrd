"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/components/gestion/api";
import type { Catalogs } from "@/components/gestion/types";
import type { ImpactResponse } from "@/components/gestion/effort-impact-types";
import {
  Notice,
  Panel,
  inputClass,
  linkClass,
  buttonClass,
} from "@/components/gestion/ui";
import { ResourceTotals } from "@/components/gestion/effort-summary";
import { AreaConfiguration } from "@/components/gestion/impact-areas";
import {
  DistributionForm,
  EvidenceForm,
} from "@/components/gestion/impact-forms";
import {
  AreaSummary,
  ImpactProjectDetail,
} from "@/components/gestion/impact-display";
function ImpactPage() {
  const search = useSearchParams();
  const [projectId, setProjectId] = useState(search.get("projectId") || "");
  const [editorId, setEditorId] = useState(search.get("projectId") || "");
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [data, setData] = useState<ImpactResponse | null>(null);
  const [error, setError] = useState(""),
    [catalogError, setCatalogError] = useState(""),
    [loading, setLoading] = useState(true);
  const requestSerial = useRef(0);
  const reload = useCallback(async () => {
    const serial = ++requestSerial.current;
    setLoading(true);
    setError("");
    try {
      const response = await api<ImpactResponse>(
        `/api/gestion/aporte${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`,
      );
      if (serial === requestSerial.current) setData(response);
    } catch (caught) {
      if (serial === requestSerial.current)
        setError(
          caught instanceof Error
            ? caught.message
            : "No se pudo cargar el aporte institucional.",
        );
    } finally {
      if (serial === requestSerial.current) setLoading(false);
    }
  }, [projectId]);
  useEffect(() => {
    const controller = new AbortController();
    api<Catalogs>("/api/gestion/catalogos", { signal: controller.signal })
      .then(setCatalogs)
      .catch((caught) => {
        if (!controller.signal.aborted)
          setCatalogError(
            caught instanceof Error
              ? caught.message
              : "No se pudo cargar el catálogo de proyectos.",
          );
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    setData(null);
    void reload();
    return () => {
      requestSerial.current++;
    };
  }, [reload]);
  const editor = data?.projects.find((row) => row.id === editorId);
  const admin = catalogs?.identity.role === "ADMIN";
  const reportQuery = projectId
    ? `projectId=${encodeURIComponent(projectId)}&`
    : "";
  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="border-l-4 border-ungrd-yellow pl-4">
        <h1 className="text-2xl font-bold text-ungrd-blue">
          Aporte institucional
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Avance: tareas y entregables. Esfuerzo: consumos reales. Beneficio:
          distribución declarada y evidencias documentadas. Cada indicador
          conserva su significado.
        </p>
      </header>
      <Panel title="Alcance del reporte">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm font-medium">
            Proyecto
            <select
              className={`${inputClass} mt-1.5`}
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                setEditorId(event.target.value);
              }}
            >
              <option value="">Todos los proyectos autorizados</option>
              {catalogs?.projects.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className={buttonClass}
            type="button"
            disabled={loading}
            onClick={() => void reload()}
          >
            Actualizar
          </button>
          <a
            className={linkClass}
            target="_blank"
            rel="noopener noreferrer"
            href={`/api/gestion/reporte?${reportQuery}format=html`}
          >
            Abrir reporte ejecutivo imprimible
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          El reporte conserva solicitudes, decisiones, versiones de alcance,
          esfuerzo, distribuciones y procedencia de evidencias. Use Imprimir del
          navegador para obtener un PDF.
        </p>
      </Panel>
      {catalogError && <Notice error>{catalogError}</Notice>}
      {error && <Notice error>{error}</Notice>}
      {loading && <Notice>Cargando aporte institucional…</Notice>}
      {data && (
        <>
          <Panel title="Resumen institucional del filtro activo">
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <p className="rounded-lg bg-slate-50 p-3 text-sm">
                <strong>{data.summary.projectCount}</strong> proyectos únicos
              </p>
              <p className="rounded-lg bg-amber-50 p-3 text-sm">
                <strong>{data.summary.withoutDistribution.length}</strong> sin
                distribución registrada
              </p>
            </div>
            <ResourceTotals summary={data.summary.resources} />
            <p className="mt-3 text-xs text-slate-600">
              Cada proyecto se cuenta una sola vez en este resumen, aunque tenga
              varias áreas beneficiarias.
            </p>
          </Panel>
          {!data.areas.length ? (
            <Notice>
              No hay áreas activas en el catálogo. Los nombres oficiales de las
              subdirecciones están pendientes de confirmación; no se asignarán
              nombres ni porcentajes automáticamente.
            </Notice>
          ) : (
            <AreaSummary data={data} />
          )}
          {!data.projects.length && (
            <Notice>No hay proyectos autorizados para este alcance.</Notice>
          )}
          {admin && (
            <>
              <AreaConfiguration changed={reload} />
              <Panel title="Registrar valoración y evidencias">
                <label className="block text-sm font-medium">
                  Proyecto que se va a documentar
                  <select
                    className={`${inputClass} mt-1.5`}
                    value={editorId}
                    onChange={(event) => setEditorId(event.target.value)}
                  >
                    <option value="">Seleccione un proyecto…</option>
                    {data.projects.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
                {editor ? (
                  <div className="mt-5 space-y-6">
                    <section>
                      <h3 className="mb-3 font-semibold text-ungrd-blue">
                        Nueva versión de distribución declarada
                      </h3>
                      <DistributionForm
                        key={`distribution-${editor.id}`}
                        project={editor}
                        areas={data.areas}
                        reload={reload}
                      />
                    </section>
                    <section className="border-t border-slate-200 pt-5">
                      <h3 className="mb-3 font-semibold text-ungrd-blue">
                        Nueva evidencia de beneficio observado
                      </h3>
                      <EvidenceForm
                        key={`evidence-${editor.id}`}
                        projectId={editor.id}
                        areas={data.areas}
                        reload={reload}
                      />
                    </section>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Seleccione el proyecto real al que pertenece la valoración o
                    evidencia.
                  </p>
                )}
              </Panel>
            </>
          )}
          {data.projects.map((project) => (
            <ImpactProjectDetail key={project.id} project={project} />
          ))}
        </>
      )}
    </main>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<Notice>Cargando aporte institucional…</Notice>}>
      <ImpactPage />
    </Suspense>
  );
}
