"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/components/gestion/api";
import { ApproverSettings } from "@/components/gestion/approver-settings";
import {
  type Catalogs,
  type Ticket,
  instantDate,
  personName,
  statusLabels,
  ticketNumber,
} from "@/components/gestion/types";
import {
  buttonClass,
  inputClass,
  linkClass,
  Notice,
  Panel,
  Status,
} from "@/components/gestion/ui";
export default function RequestsPage() {
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [revision, setRevision] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [isLocal, setIsLocal] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    ownerId: "",
    area: "",
    projectId: "",
  });
  useEffect(() => {
    setPublicUrl(`${window.location.origin}/solicitar`);
    setIsLocal(["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname));
    const query = new URLSearchParams(window.location.search);
    setShowSettings(query.get("configuracion") === "1");
    setFilters((current) => ({
      ...current,
      projectId: query.get("projectId") || "",
    }));
    setFiltersReady(true);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setCatalogError("");
    api<Catalogs>("/api/gestion/catalogos", { signal: controller.signal })
      .then(setCatalogs)
      .catch((caught) => {
        if (!controller.signal.aborted) setCatalogError(caught.message);
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    if (!filtersReady) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    api<Ticket[]>(`/api/gestion/tickets?${query}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setTickets(data);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(caught.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, filtersReady, revision]);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyMessage("Enlace copiado.");
    } catch {
      setCopyMessage(`Copie este enlace: ${publicUrl}`);
    }
  }
  const filterOptions = {
    status: Object.entries(statusLabels)
      .filter(
        ([key]) =>
          ![
            "PENDIENTE",
            "ACLARACION",
            "CAMBIO_APROBADO",
            "CAMBIO_RECHAZADO",
          ].includes(key),
      )
      .map(([value, label]) => ({ value, label })),
    ownerId:
      catalogs?.users.map((user) => ({
        value: user.id,
        label: personName(user),
      })) || [],
    area: [
      ...new Set(
        [
          ...tickets.map((ticket) => ticket.area),
          ...(catalogs?.areas.map((area) => area.name) || []),
          filters.area,
        ].filter(Boolean),
      ),
    ]
      .sort()
      .map((area) => ({ value: area, label: area })),
    projectId: [
      ...(catalogs?.projects.map((project) => ({
        value: project.id,
        label: project.name,
      })) || []),
      ...(filters.projectId &&
      !catalogs?.projects.some((project) => project.id === filters.projectId)
        ? [
            {
              value: filters.projectId,
              label: "Proyecto del enlace · sin nombre disponible",
            },
          ]
        : []),
    ],
  };
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Gestión de la demanda
          </p>
          <h1 className="text-2xl font-bold text-ungrd-blue">Requerimientos</h1>
          <p className="mt-2 text-sm text-slate-600">
            Recepción, levantamiento y decisiones con trazabilidad.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            className={buttonClass}
            href={publicUrl || "/solicitar"}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir formulario
          </a>
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            onClick={copyLink}
            type="button"
          >
            Copiar enlace
          </button>
          {catalogs?.identity.role === "ADMIN" && (
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
              onClick={() => setShowSettings((value) => !value)}
              type="button"
              aria-expanded={showSettings}
            >
              Configurar aprobadores
            </button>
          )}
        </div>
      </header>
      {isLocal && (
        <p className="text-xs text-slate-600">
          El enlace local sólo funciona en este computador. Compartirlo con otras
          personas requiere una dirección accesible en servidor o intranet.
        </p>
      )}
      {copyMessage && <Notice>{copyMessage}</Notice>}
      {catalogError && <Notice error>{catalogError}</Notice>}
      {showSettings && catalogs?.identity.role === "ADMIN" && (
        <ApproverSettings onSaved={() => setRevision((value) => value + 1)} />
      )}
      <Panel title="Bandeja de solicitudes">
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(filterOptions).map(([key, options]) => (
            <div key={key}>
              <label
                htmlFor={`filter-${key}`}
                className="mb-1 block text-sm font-medium"
              >
                {
                  {
                    status: "Estado",
                    ownerId: "Responsable",
                    area: "Área solicitante",
                    projectId: "Proyecto",
                  }[key]
                }
              </label>
              <select
                id={`filter-${key}`}
                className={inputClass}
                value={filters[key as keyof typeof filters]}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              >
                <option value="">Todos</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <button
            className={linkClass}
            onClick={() =>
              setFilters({ status: "", ownerId: "", area: "", projectId: "" })
            }
            type="button"
          >
            Limpiar filtros
          </button>
          <button
            className={linkClass}
            onClick={() => setRevision((value) => value + 1)}
            type="button"
          >
            Actualizar
          </button>
          <span>Se muestran hasta 500 solicitudes autorizadas.</span>
        </div>
        {loading ? (
          <p role="status" className="py-8">
            Cargando requerimientos…
          </p>
        ) : error ? (
          <Notice error>{error} Use Actualizar para reintentar.</Notice>
        ) : (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Solicitudes visibles", tickets.length],
                [
                  "Pendientes de aprobación",
                  tickets.filter(
                    (ticket) => ticket.status === "PENDIENTE_APROBACION",
                  ).length,
                ],
                [
                  "En ejecución",
                  tickets.filter((ticket) => ticket.status === "EN_EJECUCION")
                    .length,
                ],
              ].map(([label, count]) => (
                <div
                  key={label}
                  className="rounded-lg border-l-4 border-ungrd-yellow bg-slate-50 p-4"
                >
                  <p className="text-2xl font-bold text-ungrd-blue">{count}</p>
                  <p className="text-sm text-slate-600">{label}</p>
                </div>
              ))}
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Conteos de los resultados visibles con los filtros actuales.
            </p>
            {!tickets.length ? (
              <div className="py-8 text-center">
                <h3 className="font-semibold text-slate-800">
                  No hay requerimientos en esta vista
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Revise los filtros o registre una solicitud. Los usuarios ven
                  los tickets en los que están designados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Solicitudes autorizadas según los filtros seleccionados
                  </caption>
                  <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600">
                    <tr>
                      {[
                        "Número / solicitud",
                        "Recepción",
                        "Área / solicitante",
                        "Responsable",
                        "Estado",
                        "Proyecto",
                      ].map((label) => (
                        <th key={label} scope="col" className="px-3 py-3">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50">
                        <td className="min-w-[210px] px-3 py-4">
                          <Link
                            className={linkClass}
                            href={`/dashboard/requerimientos/${encodeURIComponent(ticket.id)}`}
                          >
                            {ticketNumber(ticket.number)}
                          </Link>
                          <p className="mt-1 font-medium">{ticket.title}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          {instantDate(ticket.createdAt)}
                        </td>
                        <td className="px-3 py-4">
                          <p>{ticket.area}</p>
                          <p className="text-xs text-slate-500">
                            {ticket.requesterName}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          {ticket.owner
                            ? personName(ticket.owner)
                            : "Sin asignar"}
                        </td>
                        <td className="px-3 py-4">
                          <Status status={ticket.status} />
                        </td>
                        <td className="px-3 py-4">
                          {ticket.project?.name || "Sin vincular"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Panel>
      <div className="flex flex-wrap gap-5 text-sm">
        <Link className={linkClass} href="/dashboard/esfuerzo">
          Esfuerzo y recursos
        </Link>
        <Link className={linkClass} href="/dashboard/aporte">
          Aporte institucional
        </Link>
      </div>
    </div>
  );
}
