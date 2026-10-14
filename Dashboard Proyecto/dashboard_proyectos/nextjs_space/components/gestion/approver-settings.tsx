"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { type Person, personName } from "./types";
import { buttonClass, Notice, Panel } from "./ui";
export function ApproverSettings({ onSaved }: { onSaved: () => void }) {
  const [users, setUsers] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const saving = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    api<{ users: Person[] }>("/api/gestion/configuracion", {
      signal: controller.signal,
    })
      .then((data) => {
        setUsers(data.users);
        setSelected(
          Object.fromEntries(
            data.users.map((user) => [user.id, user.canApproveRequests]),
          ),
        );
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(caught.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function save(user: Person) {
    if (saving.current) return;
    saving.current = true;
    setBusy(user.id);
    setError("");
    setMessage("");
    try {
      await api("/api/gestion/configuracion", {
        method: "PATCH",
        body: JSON.stringify({
          action: "approver",
          userId: user.id,
          canApproveRequests: selected[user.id],
        }),
      });
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, canApproveRequests: selected[user.id] }
            : item,
        ),
      );
      setMessage(`Permiso actualizado para ${personName(user)}.`);
      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo guardar el permiso.",
      );
    } finally {
      saving.current = false;
      setBusy("");
    }
  }
  return (
    <Panel title="Configurar aprobadores">
      <p className="mb-4 text-sm text-slate-600">
        Seleccione el permiso y guárdelo para cada usuario real. La habilitación
        permite decidir únicamente los tickets en los que se designe a esa
        persona como aprobador.
      </p>
      {loading && <p role="status">Cargando usuarios…</p>}
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <ul className="divide-y divide-slate-100">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={!!selected[user.id]}
                disabled={!!busy}
                onChange={(event) =>
                  setSelected((current) => ({
                    ...current,
                    [user.id]: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-blue-900"
              />
              <span>Habilitar a {personName(user)}</span>
            </label>
            <button
              onClick={() => save(user)}
              disabled={!!busy || selected[user.id] === user.canApproveRequests}
              className={buttonClass}
              type="button"
            >
              {busy === user.id ? "Guardando…" : "Guardar permiso"}
            </button>
          </li>
        ))}
      </ul>
      {!loading && !error && !users.length && (
        <p className="text-sm">
          No hay usuarios activos disponibles. Incorpore sus identidades reales
          antes de habilitar aprobadores.
        </p>
      )}
    </Panel>
  );
}
