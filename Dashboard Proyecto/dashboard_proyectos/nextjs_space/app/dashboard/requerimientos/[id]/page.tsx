"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/components/gestion/api";
import {
  type Catalogs,
  type TicketDetail,
  civilDate,
  instantDate,
  personName,
  ticketNumber,
} from "@/components/gestion/types";
import { TicketActions } from "@/components/gestion/ticket-actions";
import { TicketHistory } from "@/components/gestion/ticket-history";
import {
  buttonClass,
  DraftProvider,
  DraftRecovery,
  linkClass,
  Notice,
  Panel,
  References,
  Status,
  TextItem,
} from "@/components/gestion/ui";
export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const saving = useRef(false);
  const endpoint = `/api/gestion/tickets/${encodeURIComponent(params.id)}`;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      api<TicketDetail>(endpoint, { signal: controller.signal }),
      api<Catalogs>("/api/gestion/catalogos", { signal: controller.signal }),
    ])
      .then(([detail, data]) => {
        setTicket(detail);
        setCatalogs(data);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(caught.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint, revision]);
  async function mutate(
    action: string,
    values: Record<string, unknown>,
  ): Promise<boolean> {
    if (!ticket || saving.current) return false;
    saving.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await api<TicketDetail>(`${endpoint}/acciones`, {
        method: "POST",
        body: JSON.stringify({
          ...values,
          action,
          expectedUpdatedAt: ticket.updatedAt,
        }),
      });
      setTicket(updated);
      setMessage("Acción registrada. El historial está actualizado.");
      return true;
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        try {
          setTicket(await api<TicketDetail>(endpoint));
          setError(
            "El ticket cambió mientras lo editaba. Se cargó su estado actual; conservamos los campos de su formulario. Revise la información y vuelva a enviar si corresponde.",
          );
        } catch (refreshError) {
          setError(
            `No se guardó la acción por un conflicto. Tampoco se pudo actualizar el ticket: ${refreshError instanceof Error ? refreshError.message : "Reintente la actualización."}`,
          );
        }
      } else
        setError(
          caught instanceof Error
            ? caught.message
            : "No se pudo registrar la acción.",
        );
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  if (loading)
    return (
      <p role="status" className="py-8">
        Cargando requerimiento…
      </p>
    );
  if (!ticket || !catalogs)
    return (
      <div className="space-y-4">
        <Link className={linkClass} href="/dashboard/requerimientos">
          Volver a requerimientos
        </Link>
        <Notice error>{error || "No se pudo cargar el requerimiento."}</Notice>
        <button
          className={buttonClass}
          onClick={() => setRevision((value) => value + 1)}
          type="button"
        >
          Reintentar
        </button>
      </div>
    );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link className={`${linkClass} text-sm`} href="/dashboard/requerimientos">
        ← Volver a requerimientos
      </Link>
      <header className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {ticketNumber(ticket.number)}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ungrd-blue">
            {ticket.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Recibido {instantDate(ticket.createdAt)} · hora de Bogotá
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <Status status={ticket.status} />
          <a
            className={linkClass}
            href={`/api/gestion/reporte?ticketId=${encodeURIComponent(ticket.id)}&format=html`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Reporte imprimible
          </a>
        </div>
      </header>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <Panel title="Solicitud original">
        <dl className="grid gap-5 sm:grid-cols-2">
          <TextItem label="Solicitante">
            {ticket.requesterName} ·{" "}
            <a className={linkClass} href={`mailto:${ticket.requesterEmail}`}>
              {ticket.requesterEmail}
            </a>
          </TextItem>
          <TextItem label="Área solicitante">{ticket.area}</TextItem>
          <TextItem label="Problema">{ticket.problem}</TextItem>
          <TextItem label="Resultado esperado">
            {ticket.expectedResult}
          </TextItem>
          <TextItem label="Beneficiarios">{ticket.beneficiaries}</TextItem>
          <TextItem label="Información y fuentes">{ticket.sources}</TextItem>
          <TextItem label="Entregables solicitados">
            {ticket.deliverables}
          </TextItem>
          <TextItem label="Criterios de aceptación">
            {ticket.acceptanceCriteria}
          </TextItem>
          <TextItem label="Fecha deseada del solicitante">
            {civilDate(ticket.desiredDate)}
            {ticket.desiredDate && " · No constituye compromiso del equipo"}
          </TextItem>
          <TextItem label="Motivo de la fecha">
            {ticket.desiredDateReason}
          </TextItem>
          <TextItem label="Responsable">
            {ticket.owner ? personName(ticket.owner) : "Sin asignar"}
          </TextItem>
          <TextItem label="Aprobador designado">
            {ticket.approver ? personName(ticket.approver) : "Sin designar"}
          </TextItem>
          <TextItem label="Proyecto vinculado">
            {ticket.project?.name || "Sin vincular"}
          </TextItem>
          <TextItem label="Referencias">
            <References links={ticket.referenceLinks} />
          </TextItem>
        </dl>
        {ticket.projectId && (
          <div className="mt-5 flex flex-wrap gap-5 border-t pt-4 text-sm">
            <Link
              className={linkClass}
              href={`/dashboard/esfuerzo?projectId=${encodeURIComponent(ticket.projectId)}&ticketId=${encodeURIComponent(ticket.id)}`}
            >
              Registrar o consultar esfuerzo
            </Link>
            <Link
              className={linkClass}
              href={`/dashboard/aporte?projectId=${encodeURIComponent(ticket.projectId)}`}
            >
              Aporte del proyecto
            </Link>
          </div>
        )}
      </Panel>
      <DraftProvider>
        {error && <DraftRecovery />}
        <TicketActions
          ticket={ticket}
          catalogs={catalogs}
          mutate={mutate}
          busy={busy}
        />
        <TicketHistory
          ticket={ticket}
          catalogs={catalogs}
          mutate={mutate}
          busy={busy}
        />
      </DraftProvider>
    </div>
  );
}
