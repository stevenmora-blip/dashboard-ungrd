"use client";
import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { httpLinks } from "./api";
import { statusLabels } from "./types";
export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ungrd-blue focus:border-ungrd-blue";
export const buttonClass =
  "inline-flex items-center justify-center rounded-lg bg-ungrd-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-ungrd-blue-dark disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungrd-blue";
export const linkClass =
  "font-medium text-ungrd-blue underline underline-offset-4 hover:text-ungrd-blue-dark";
export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-ungrd-blue">{title}</h2>
      {children}
    </section>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`rounded-lg border p-3 text-sm whitespace-pre-wrap ${error ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-900"}`}
    >
      {children}
    </div>
  );
}
export function Status({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${["RECHAZADO", "CANCELADO"].includes(status) ? "bg-red-50 text-red-800" : ["APROBADO", "CERRADO"].includes(status) ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
    >
      {statusLabels[status] || status}
    </span>
  );
}
export interface FieldSpec {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
  maxLength?: number;
  options?: { value: string; label: string }[];
  defaultValue?: string;
}
export function Field({
  name,
  label,
  type = "text",
  required = true,
  hint,
  maxLength = 4000,
  options,
  defaultValue,
}: FieldSpec) {
  const unique = useId();
  const id = `${name}-${unique}`;
  return (
    <div className={type === "textarea" ? "sm:col-span-2" : ""}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-800"
      >
        {label}
        {required ? " *" : " (opcional)"}
      </label>
      {options ? (
        <select
          id={id}
          name={name}
          required={required}
          defaultValue={defaultValue || ""}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={inputClass}
        >
          <option value="">Seleccione…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          id={id}
          name={name}
          rows={3}
          required={required}
          maxLength={maxLength}
          defaultValue={defaultValue}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={inputClass}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          maxLength={maxLength}
          min={type === "number" ? 0 : undefined}
          max={type === "number" ? 10000000 : undefined}
          step={type === "number" ? "any" : undefined}
          defaultValue={defaultValue}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={inputClass}
        />
      )}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">
          {hint}
        </p>
      )}
    </div>
  );
}
export function TextItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
        {children || "No registrado"}
      </dd>
    </div>
  );
}
export function References({ links }: { links: string[] }) {
  return links.length ? (
    <ul className="space-y-1">
      {links.map((link, index) => (
        <li key={`${link}-${index}`}>
          <a
            className={`${linkClass} break-all`}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link}
          </a>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-slate-500">Sin enlaces registrados.</p>
  );
}
export type Mutate = (
  action: string,
  values: Record<string, unknown>,
) => Promise<boolean>;
type Draft = {
  title: string;
  fields: { name: string; label: string; value: string }[];
};
const DraftContext = createContext<{
  drafts: Record<string, Draft>;
  save: (key: string, draft: Draft | null) => void;
} | null>(null);
export function DraftProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  function save(key: string, draft: Draft | null) {
    setDrafts((current) => {
      const updated = { ...current };
      if (draft) updated[key] = draft;
      else delete updated[key];
      return updated;
    });
  }
  return (
    <DraftContext.Provider value={{ drafts, save }}>
      {children}
    </DraftContext.Provider>
  );
}
export function DraftRecovery() {
  const context = useContext(DraftContext);
  const drafts = Object.entries(context?.drafts || {}).filter(([, draft]) =>
    draft.fields.some((field) => field.value),
  );
  if (!drafts.length) return null;
  return (
    <details className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-amber-900">
        Consultar los borradores conservados en esta pantalla
      </summary>
      <p className="mt-3 text-xs text-slate-600">
        Los borradores no se han guardado en el servidor. Puede copiar estos
        datos si el estado actual ya no permite la acción. Se conservan mientras
        permanezca en esta pantalla.
      </p>
      <div className="mt-4 space-y-4">
        {drafts.map(([key, draft]) => (
          <section key={key}>
            <h3 className="mb-2 text-sm font-semibold">{draft.title}</h3>
            <dl className="grid gap-3 sm:grid-cols-2">
              {draft.fields
                .filter((field) => field.value)
                .map((field) => (
                  <TextItem key={field.name} label={field.label}>
                    {field.value}
                  </TextItem>
                ))}
            </dl>
          </section>
        ))}
      </div>
    </details>
  );
}
export function ActionForm({
  action,
  title,
  fields,
  mutate,
  busy,
  values = {},
  disabled = false,
  children,
}: {
  action: string;
  title: string;
  fields: FieldSpec[];
  mutate: Mutate;
  busy: boolean;
  values?: Record<string, unknown>;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const submitting = useRef(false);
  const [error, setError] = useState("");
  const draftContext = useContext(DraftContext);
  const draftKey = `${action}:${String(values.changeId || "")}`;
  const initialDraft = useRef(draftContext?.drafts[draftKey]);
  function saveDraft(form: HTMLFormElement) {
    const data = new FormData(form);
    draftContext?.save(draftKey, {
      title,
      fields: fields.map((field) => ({
        name: field.name,
        label: field.label,
        value: String(data.get(field.name) || ""),
      })),
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || busy) return;
    const form = event.currentTarget;
    saveDraft(form);
    submitting.current = true;
    setError("");
    try {
      const data: Record<string, unknown> = { ...values };
      const raw = new FormData(form);
      for (const field of fields) {
        const value = String(raw.get(field.name) || "").trim();
        if (!value && field.required === false) continue;
        data[field.name] =
          field.type === "number"
            ? Number(value)
            : field.type === "datetime-local"
              ? new Date(value).toISOString()
              : field.name.endsWith("Links")
                ? httpLinks(value)
                : value;
      }
      if (await mutate(action, data)) {
        initialDraft.current = undefined;
        form.reset();
        for (const field of fields) {
          const control = form.elements.namedItem(field.name);
          if (
            control instanceof HTMLInputElement ||
            control instanceof HTMLSelectElement ||
            control instanceof HTMLTextAreaElement
          )
            control.value = field.defaultValue || "";
        }
        draftContext?.save(draftKey, null);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Revise los datos e intente nuevamente.",
      );
    } finally {
      submitting.current = false;
    }
  }
  return (
    <form
      onSubmit={submit}
      onChange={(event) => saveDraft(event.currentTarget)}
      className="space-y-4"
    >
      <fieldset
        disabled={busy || disabled}
        className="grid gap-4 sm:grid-cols-2"
      >
        {fields.map((field) => (
          <Field
            key={field.name}
            {...field}
            defaultValue={
              initialDraft.current?.fields.find(
                (saved) => saved.name === field.name,
              )?.value ?? field.defaultValue
            }
          />
        ))}
        {children}
      </fieldset>
      {error && <Notice error>{error}</Notice>}
      <button className={buttonClass} disabled={busy || disabled} type="submit">
        {busy ? "Guardando…" : title}
      </button>
    </form>
  );
}
