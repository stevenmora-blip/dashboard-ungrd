"use client";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError, httpLinks } from "./api";
import { Field, Notice, buttonClass, inputClass } from "./ui";
import type { Area, ImpactProject } from "./effort-impact-types";
import { quantityText } from "./effort-summary";
export function DistributionForm({
  project,
  areas,
  reload,
}: {
  project: ImpactProject;
  areas: Area[];
  reload: () => Promise<void>;
}) {
  const latest = project.distributions[0];
  const [rows, setRows] = useState(
    () =>
      latest?.beneficiaries.map((row) => ({
        areaId: row.areaId,
        percent: String(row.percent),
      })) || [{ areaId: "", percent: "" }],
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const lock = useRef(false);
  const total = rows.reduce((sum, row) => sum + (Number(row.percent) || 0), 0);
  const valid =
    rows.length > 0 &&
    rows.every(
      (row) =>
        areas.some((area) => area.id === row.areaId) &&
        Number.isFinite(Number(row.percent)) &&
        Number(row.percent) > 0 &&
        Number(row.percent) <= 100,
    ) &&
    new Set(rows.map((row) => row.areaId)).size === rows.length &&
    Math.abs(total - 100) <= 0.000001;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    setError("");
    setSuccess("");
    if (!valid) {
      setError(
        "Seleccione áreas activas únicas con porcentajes positivos que sumen 100%.",
      );
      return;
    }
    const raw = new FormData(event.currentTarget);
    lock.current = true;
    setBusy(true);
    try {
      await api("/api/gestion/aporte", {
        method: "POST",
        body: JSON.stringify({
          action: "distribution",
          projectId: project.id,
          expectedVersion: latest?.version || 0,
          assessedAt: raw.get("assessedAt"),
          reason: String(raw.get("reason") || "").trim(),
          beneficiaries: rows.map((row) => ({
            areaId: row.areaId,
            percent: Number(row.percent),
          })),
        }),
      });
      setSuccess("Nueva versión de distribución registrada.");
      await reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo guardar. El formulario se conserva.",
      );
      if (caught instanceof ApiError && caught.status === 409) {
        try {
          await reload();
        } catch {
          setError(
            "La distribución cambió y no fue posible recargarla. Reintente la actualización antes de guardar. Su formulario se conserva.",
          );
        }
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Se guardará una nueva versión inmutable, basada en la versión{" "}
        {latest?.version || 0}. La valoración declara beneficio; no mide impacto
        observado.
      </p>
      <fieldset disabled={busy} className="space-y-4">
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              className="grid gap-3 sm:grid-cols-[1fr_140px_auto]"
              key={index}
            >
              <label className="text-sm font-medium">
                Área beneficiaria {index + 1} *
                <select
                  required
                  className={`${inputClass} mt-1.5`}
                  value={row.areaId}
                  onChange={(event) =>
                    setRows(
                      rows.map((item, i) =>
                        i === index
                          ? { ...item, areaId: event.target.value }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="">Seleccione…</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Porcentaje *
                <input
                  className={`${inputClass} mt-1.5`}
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="any"
                  value={row.percent}
                  onChange={(event) =>
                    setRows(
                      rows.map((item, i) =>
                        i === index
                          ? { ...item, percent: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <button
                className={`${buttonClass} self-end`}
                type="button"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
                aria-label={`Retirar área ${index + 1}`}
              >
                Retirar
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={linkClassLocal}
          onClick={() => setRows([...rows, { areaId: "", percent: "" }])}
        >
          Añadir área beneficiaria
        </button>
        <p
          aria-live="polite"
          className={`text-sm font-semibold ${valid ? "text-emerald-700" : "text-amber-800"}`}
        >
          Suma declarada: {quantityText(total)}% de 100%
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="assessedAt" label="Fecha de valoración" type="date" />
          <Field
            name="reason"
            label="Justificación de la distribución"
            type="textarea"
          />
        </div>
      </fieldset>
      {error && <Notice error>{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      <button
        className={buttonClass}
        disabled={busy || !areas.length || !valid}
        type="submit"
      >
        {busy ? "Guardando…" : "Guardar nueva versión"}
      </button>
    </form>
  );
}
const linkClassLocal =
  "text-sm font-medium text-ungrd-blue underline underline-offset-4 disabled:opacity-50";
export function EvidenceForm({
  projectId,
  areas,
  reload,
}: {
  projectId: string;
  areas: Area[];
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const lock = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget,
      raw = new FormData(form);
    setError("");
    setSuccess("");
    try {
      const areaIds = raw.getAll("areaIds").map(String);
      if (!areaIds.length)
        throw new Error("Seleccione al menos un área destinataria.");
      const links = httpLinks(String(raw.get("url") || ""));
      if (links.length > 1)
        throw new Error("Registre un solo enlace de evidencia.");
      const payload: Record<string, unknown> = {
        action: "evidence",
        projectId,
        areaIds,
      };
      for (const name of [
        "title",
        "producerTeam",
        "technicalResponsible",
        "source",
        "cutoffDate",
        "description",
        "result",
      ])
        payload[name] = String(raw.get(name) || "").trim();
      const validationResponsible = String(
        raw.get("validationResponsible") || "",
      ).trim();
      if (validationResponsible)
        payload.validationResponsible = validationResponsible;
      if (links[0]) payload.url = links[0];
      lock.current = true;
      setBusy(true);
      await api("/api/gestion/aporte", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      form.reset();
      setSuccess("Evidencia registrada con su procedencia y atribución.");
      await reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo guardar. El formulario se conserva.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Documente un resultado o uso concreto con fuente y fecha de corte. La
        persona autenticada quedará identificada como quien registra.
      </p>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <Field name="title" label="Título de la evidencia" />
        <Field name="producerTeam" label="Equipo productor" />
        <Field name="technicalResponsible" label="Responsable técnico" />
        <Field name="source" label="Fuente o referencia documental" />
        <Field name="cutoffDate" label="Fecha de corte" type="date" />
        <Field
          name="validationResponsible"
          label="Responsable de validación"
          required={false}
        />
        <Field name="url" label="Enlace HTTP(S)" type="url" required={false} />
        <fieldset className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
          <legend className="px-1 text-sm font-medium">
            Áreas destinatarias *
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {areas.map((area) => (
              <label key={area.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="areaIds"
                  value={area.id}
                  className="h-4 w-4 accent-ungrd-blue"
                />
                {area.name}
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          name="description"
          label="Descripción del entregable o uso"
          type="textarea"
        />
        <Field
          name="result"
          label="Resultado observado y documentado"
          type="textarea"
        />
      </fieldset>
      {error && <Notice error>{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      <button
        className={buttonClass}
        disabled={busy || !areas.length}
        type="submit"
      >
        {busy ? "Guardando…" : "Registrar evidencia"}
      </button>
    </form>
  );
}
