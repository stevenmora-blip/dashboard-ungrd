"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "./api";
import { Field, Notice, buttonClass } from "./ui";
import type { Area } from "./effort-impact-types";
function AreaEditor({
  area,
  saved,
}: {
  area?: Area;
  saved: () => Promise<void>;
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
    lock.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api("/api/gestion/configuracion", {
        method: "PATCH",
        body: JSON.stringify({
          action: "area",
          ...(area ? { id: area.id } : {}),
          name: String(raw.get("name") || "").trim(),
          isActive: raw.get("isActive") === "on",
        }),
      });
      if (!area) form.reset();
      setSuccess("Área guardada.");
      await saved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo guardar el área.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-slate-200 p-4"
    >
      <fieldset disabled={busy} className="space-y-3">
        <Field
          name="name"
          label={
            area ? "Nombre oficial del área" : "Nueva área: nombre oficial"
          }
          defaultValue={area?.name}
          maxLength={200}
        />
        <label className="flex gap-2 text-sm">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={area ? area.isActive !== false : true}
            className="h-4 w-4 accent-ungrd-blue"
          />
          Área activa para nuevos registros
        </label>
      </fieldset>
      {error && <Notice error>{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      <button type="submit" className={buttonClass} disabled={busy}>
        {busy ? "Guardando…" : area ? "Actualizar área" : "Crear área"}
      </button>
    </form>
  );
}
export function AreaConfiguration({
  changed,
}: {
  changed: () => Promise<void>;
}) {
  const [areas, setAreas] = useState<Area[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    api<{ areas: Area[] }>("/api/gestion/configuracion", {
      signal: controller.signal,
    })
      .then((data) => setAreas(data.areas))
      .catch((caught) => {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "No se pudo consultar la configuración.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function saved() {
    setError("");
    try {
      const data = await api<{ areas: Area[] }>("/api/gestion/configuracion");
      setAreas(data.areas);
      await changed();
    } catch (caught) {
      setError(
        `El área se guardó; no fue posible actualizar el catálogo: ${caught instanceof Error ? caught.message : "Reintente la consulta."}`,
      );
    }
  }
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer text-lg font-semibold text-ungrd-blue">
        Administrar catálogo de áreas
      </summary>
      <p className="my-4 text-sm text-slate-600">
        Registre únicamente nombres oficiales confirmados. Inactivar un área
        conserva su historial y la retira de nuevas valoraciones y evidencias.
      </p>
      {error && <Notice error>{error}</Notice>}
      {loading ? (
        <Notice>Cargando catálogo…</Notice>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <AreaEditor saved={saved} />
          {areas.map((area) => (
            <AreaEditor key={area.id} area={area} saved={saved} />
          ))}
        </div>
      )}
    </details>
  );
}
