"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/components/gestion/api";
import {
  Notice,
  Panel,
  buttonClass,
  inputClass,
  linkClass,
} from "@/components/gestion/ui";
import {
  ticketNumber,
  type Catalogs,
  type Ticket,
} from "@/components/gestion/types";
import type { EffortResponse } from "@/components/gestion/effort-impact-types";
import { ResourceForm } from "@/components/gestion/effort-form";
import { ResourceTotals } from "@/components/gestion/effort-summary";
import { EffortPlans, ResourceTable } from "@/components/gestion/effort-tables";
function EffortPage() {
  const search = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    projectId: search.get("projectId") || "",
    ticketId: search.get("ticketId") || "",
    from: search.get("from") || "",
    to: search.get("to") || "",
  }));
  const [active, setActive] = useState(filters);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [data, setData] = useState<EffortResponse | null>(null);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const query = new URLSearchParams(
    Object.entries(active).filter(([, value]) => !!value),
  ).toString();
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api<Catalogs>("/api/gestion/catalogos", { signal: controller.signal }),
      api<Ticket[]>("/api/gestion/tickets", { signal: controller.signal }),
    ])
      .then(([catalog, rows]) => {
        setCatalogs(catalog);
        setTickets(rows);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No se pudieron cargar los catálogos.",
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    api<EffortResponse>(`/api/gestion/recursos?${query}`, {
      signal: controller.signal,
    })
      .then(setData)
      .catch((caught) => {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "No se pudieron cargar los consumos.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, revision]);
  const saved = useCallback(() => setRevision((value) => value + 1), []);
  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="border-l-4 border-ungrd-yellow pl-4">
        <h1 className="text-2xl font-bold text-ungrd-blue">
          Esfuerzo y recursos
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Consumos reales y comparación con el alcance aprobado. El avance de
          tareas se consulta en el plan de trabajo.
        </p>
      </header>
      <Panel title="Filtros del registro">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (filters.from && filters.to && filters.from > filters.to) {
              setFilterError(
                "La fecha inicial debe ser anterior o igual a la final.",
              );
              return;
            }
            setFilterError("");
            setActive(filters);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium">
              Proyecto
              <select
                className={`${inputClass} mt-1.5`}
                value={filters.projectId}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    projectId: event.target.value,
                    ticketId: "",
                  })
                }
              >
                <option value="">Todos los autorizados</option>
                {catalogs?.projects.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Ticket
              <select
                className={`${inputClass} mt-1.5`}
                value={filters.ticketId}
                onChange={(event) =>
                  setFilters({ ...filters, ticketId: event.target.value })
                }
              >
                <option value="">Todos los visibles</option>
                {tickets
                  .filter(
                    (row) =>
                      !filters.projectId || row.projectId === filters.projectId,
                  )
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {ticketNumber(row.number)} · {row.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Desde
              <input
                className={`${inputClass} mt-1.5`}
                type="date"
                value={filters.from}
                onChange={(event) =>
                  setFilters({ ...filters, from: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium">
              Hasta
              <input
                className={`${inputClass} mt-1.5`}
                type="date"
                value={filters.to}
                onChange={(event) =>
                  setFilters({ ...filters, to: event.target.value })
                }
              />
            </label>
          </div>
          {filterError && <Notice error>{filterError}</Notice>}
          <div className="flex flex-wrap items-center gap-4">
            <button className={buttonClass} type="submit" disabled={loading}>
              Aplicar filtros
            </button>
            <a
              className={linkClass}
              target="_blank"
              rel="noopener noreferrer"
              href={`/api/gestion/reporte?${query}${query ? "&" : ""}format=html`}
            >
              Abrir reporte imprimible de los filtros activos
            </a>
          </div>
          <p className="text-xs text-slate-500">
            Filtros activos: proyecto{" "}
            {catalogs?.projects.find((row) => row.id === active.projectId)
              ?.name ||
              active.projectId ||
              "todos"}{" "}
            · ticket{" "}
            {tickets.find((row) => row.id === active.ticketId)
              ? ticketNumber(
                  tickets.find((row) => row.id === active.ticketId)!.number,
                )
              : active.ticketId || "todos"}{" "}
            · {active.from || "sin inicio"} a {active.to || "sin fin"}.
          </p>
        </form>
      </Panel>
      {error && <Notice error>{error}</Notice>}
      {loading && <Notice>Cargando consumos…</Notice>}
      {data && (
        <>
          {data.truncated && (
            <Notice>
              Se muestran los primeros {data.records.length} registros. Los
              totales y la ejecución en esta pantalla son parciales; reduzca los
              filtros o use el reporte imprimible completo.
            </Notice>
          )}
          <Panel
            title={
              data.truncated
                ? "Totales de los registros mostrados (parciales)"
                : "Totales del alcance filtrado"
            }
          >
            <ResourceTotals summary={data.summary} />
          </Panel>
          <Panel title="Registro de consumos">
            <ResourceTable records={data.records} />
          </Panel>
          <EffortPlans plans={data.plans} />
        </>
      )}
      {catalogs && (
        <Panel title="Registrar esfuerzo o recurso">
          <ResourceForm
            catalogs={catalogs}
            tickets={tickets}
            initialProjectId={
              active.projectId ||
              tickets.find((row) => row.id === active.ticketId)?.projectId ||
              ""
            }
            initialTicketId={active.ticketId}
            saved={saved}
          />
        </Panel>
      )}
    </main>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<Notice>Cargando esfuerzo y recursos…</Notice>}>
      <EffortPage />
    </Suspense>
  );
}
