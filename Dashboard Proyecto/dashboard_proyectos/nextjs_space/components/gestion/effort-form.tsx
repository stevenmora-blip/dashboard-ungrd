"use client";
import { useRef, useState, type FormEvent } from "react";
import { api } from "./api";
import { Field, Notice, buttonClass, inputClass } from "./ui";
import { personName, ticketNumber, type Catalogs, type Ticket } from "./types";
import { kindLabels, type ResourceKind } from "./effort-impact-types";
export function ResourceForm({
  catalogs,
  tickets,
  initialProjectId,
  initialTicketId,
  saved,
}: {
  catalogs: Catalogs;
  tickets: Ticket[];
  initialProjectId: string;
  initialTicketId: string;
  saved: () => void;
}) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [ticketId, setTicketId] = useState(initialTicketId);
  const [taskId, setTaskId] = useState("");
  const [kind, setKind] = useState<ResourceKind>("PERSONA");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const lock = useRef(false);
  const project = catalogs.projects.find((row) => row.id === projectId);
  const matchingTickets = tickets.filter(
    (row) =>
      row.projectId === projectId &&
      !["CANCELADO", "RECHAZADO", "CERRADO"].includes(row.status) &&
      (catalogs.identity.role === "ADMIN" ||
        row.ownerId === catalogs.identity.id),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget,
      raw = new FormData(form);
    setError("");
    setSuccess("");
    try {
      const quantity = Number(raw.get("quantity"));
      if (!Number.isFinite(quantity) || quantity <= 0)
        throw new Error("La cantidad debe ser mayor que cero.");
      const rateText = String(raw.get("unitRate") || "").trim();
      const rate = rateText ? Number(rateText) : undefined;
      const currency = String(raw.get("currency") || "")
        .trim()
        .toUpperCase();
      if (
        rate !== undefined &&
        (!Number.isFinite(rate) || rate < 0 || !/^[A-Z]{3}$/.test(currency))
      )
        throw new Error(
          "La tarifa debe ser cero o positiva y requiere una moneda de tres letras (por ejemplo, COP).",
        );
      if (!project) throw new Error("Seleccione un proyecto autorizado.");
      if (ticketId && !matchingTickets.some((row) => row.id === ticketId))
        throw new Error("Seleccione un ticket abierto del proyecto.");
      const payload = {
        projectId,
        ...(ticketId ? { ticketId } : {}),
        ...(taskId ? { taskId } : {}),
        kind,
        ...(kind === "PERSONA"
          ? {
              personId:
                catalogs.identity.role === "ADMIN"
                  ? String(raw.get("personId") || "")
                  : catalogs.identity.id,
            }
          : { resourceName: String(raw.get("resourceName") || "").trim() }),
        quantity,
        unit: ["PERSONA", "MAQUINA"].includes(kind)
          ? "horas"
          : String(raw.get("unit") || "").trim(),
        ...(rate !== undefined ? { unitRate: rate, currency } : {}),
        day: String(raw.get("day")),
        description: String(raw.get("description") || "").trim(),
      };
      lock.current = true;
      setBusy(true);
      await api("/api/gestion/recursos", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      form.reset();
      setSuccess("Consumo registrado.");
      saved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo guardar el consumo. El formulario se conserva.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Registre consumos reales. El plan aprobado se consulta debajo y conserva
        sus versiones.
      </p>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Proyecto *
          <select
            className={`${inputClass} mt-1.5`}
            required
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value);
              setTicketId("");
              setTaskId("");
            }}
          >
            <option value="">Seleccione…</option>
            {catalogs.projects.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Ticket (opcional)
          <select
            className={`${inputClass} mt-1.5`}
            value={ticketId}
            onChange={(event) => setTicketId(event.target.value)}
          >
            <option value="">Sin ticket</option>
            {matchingTickets.map((row) => (
              <option key={row.id} value={row.id}>
                {ticketNumber(row.number)} · {row.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Actividad (opcional)
          <select
            className={`${inputClass} mt-1.5`}
            value={taskId}
            onChange={(event) => setTaskId(event.target.value)}
          >
            <option value="">Sin actividad</option>
            {project?.tasks.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Tipo de recurso *
          <select
            className={`${inputClass} mt-1.5`}
            value={kind}
            onChange={(event) => setKind(event.target.value as ResourceKind)}
          >
            {Object.entries(kindLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Field name="day" label="Fecha del consumo" type="date" />
        {kind === "PERSONA" ? (
          catalogs.identity.role === "ADMIN" ? (
            <Field
              name="personId"
              label="Persona"
              options={catalogs.users.map((row) => ({
                value: row.id,
                label: personName(row),
              }))}
            />
          ) : (
            <div className="text-sm">
              <span className="block font-medium">Persona</span>
              <p className="mt-2">{personName(catalogs.identity)}</p>
              <p className="mt-1 text-xs text-slate-500">
                Su identidad autenticada registra este esfuerzo.
              </p>
            </div>
          )
        ) : (
          <Field name="resourceName" label="Nombre del recurso" />
        )}
        <Field name="quantity" label="Cantidad" type="number" />
        {["PERSONA", "MAQUINA"].includes(kind) ? (
          <div className="text-sm">
            <span className="block font-medium">Unidad</span>
            <p className="mt-2">horas</p>
          </div>
        ) : (
          <Field
            name="unit"
            label="Unidad"
            hint="Indique la unidad real del servicio o recurso."
          />
        )}
        <Field
          name="unitRate"
          label="Tarifa por unidad"
          type="number"
          required={false}
          hint="Una tarifa de 0 es válida. Si queda vacía, el importe no se calcula."
        />
        <Field
          name="currency"
          label="Moneda de la tarifa"
          required={false}
          maxLength={3}
          hint="Tres letras; se guarda únicamente cuando hay tarifa."
        />
        <Field
          name="description"
          label="Descripción del trabajo o consumo"
          type="textarea"
        />
      </fieldset>
      {error && <Notice error>{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      <button
        className={buttonClass}
        type="submit"
        disabled={busy || !catalogs.projects.length}
      >
        {busy ? "Guardando…" : "Registrar consumo"}
      </button>
    </form>
  );
}
