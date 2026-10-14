"use client";
import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { api, httpLinks } from "@/components/gestion/api";
import { buttonClass, Field, Notice, Panel } from "@/components/gestion/ui";
import { instantDate, ticketNumber } from "@/components/gestion/types";

export default function RequestPage() {
  const [desiredDate, setDesiredDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [receipt, setReceipt] = useState<{
    number: number;
    createdAt: string;
  } | null>(null);
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const raw = new FormData(event.currentTarget);
      const payload: Record<string, unknown> = {};
      for (const name of [
        "requesterName",
        "requesterEmail",
        "area",
        "title",
        "problem",
        "expectedResult",
        "beneficiaries",
        "sources",
        "deliverables",
        "acceptanceCriteria",
      ])
        payload[name] = String(raw.get(name) || "").trim();
      payload.referenceLinks = httpLinks(
        String(raw.get("referenceLinks") || ""),
      );
      if (desiredDate) {
        payload.desiredDate = desiredDate;
        payload.desiredDateReason = String(
          raw.get("desiredDateReason") || "",
        ).trim();
      }
      setReceipt(
        await api("/api/solicitudes", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo enviar. Conserve los datos y reintente.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function copy() {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(ticketNumber(receipt.number));
      setCopyMessage("Número copiado.");
    } catch {
      setCopyMessage(
        "No se pudo copiar automáticamente. Seleccione el número y cópielo.",
      );
    }
  }
  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="border-b-4 border-ungrd-yellow bg-ungrd-blue px-5 py-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-5">
          <div className="rounded-lg bg-white p-3">
            <Image src="/ungrd-logo.png" width={170} height={55} alt="UNGRD" />
          </div>
          <div className="text-white">
            <p className="text-sm text-blue-100">Gestión de proyectos · SNI</p>
            <h1 className="text-2xl font-bold">Solicitar un requerimiento</h1>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl space-y-6 px-4 pt-8 sm:px-6">
        {receipt ? (
          <Panel title="Solicitud recibida">
            <div className="space-y-5">
              <Notice>
                El requerimiento quedó registrado. Guarde este comprobante para
                identificar su solicitud ante el equipo.
              </Notice>
              <p className="text-4xl font-bold tracking-tight text-ungrd-blue">
                {ticketNumber(receipt.number)}
              </p>
              <p className="text-sm text-slate-600">
                Recibido: {instantDate(receipt.createdAt)} (hora de Bogotá)
              </p>
              <button className={buttonClass} onClick={copy} type="button">
                Copiar número
              </button>
              {copyMessage && (
                <p role="status" className="text-sm">
                  {copyMessage}
                </p>
              )}
              <p className="text-sm text-slate-600">
                La recepción inicia la evaluación del requerimiento. Las fechas
                y el alcance se acordarán con el equipo.
              </p>
              <button
                className="text-sm font-medium text-ungrd-blue underline"
                onClick={() => {
                  setReceipt(null);
                  setDesiredDate("");
                  setCopyMessage("");
                }}
                type="button"
              >
                Registrar otra solicitud
              </button>
            </div>
          </Panel>
        ) : (
          <>
            <p className="text-slate-700">
              Cuéntenos qué necesita y cómo se reconocerá el resultado. Esta
              información permite al equipo preparar el levantamiento y evaluar
              el alcance. Los campos con * son obligatorios.
            </p>
            <form onSubmit={submit} className="space-y-6">
              <fieldset disabled={busy} className="space-y-6">
                <Panel title="1. Contacto">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      name="requesterName"
                      label="Nombre del solicitante"
                      maxLength={150}
                    />
                    <Field
                      name="requesterEmail"
                      label="Correo del solicitante"
                      type="email"
                      maxLength={254}
                    />
                    <Field
                      name="area"
                      label="Área solicitante"
                      maxLength={200}
                      hint="Nombre del área o dependencia que solicita el trabajo."
                    />
                  </div>
                </Panel>
                <Panel title="2. Necesidad">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      name="title"
                      label="Título del requerimiento"
                      maxLength={200}
                    />
                    <Field
                      name="problem"
                      label="Problema o necesidad actual"
                      type="textarea"
                    />
                    <Field
                      name="expectedResult"
                      label="Resultado esperado"
                      type="textarea"
                    />
                    <Field
                      name="beneficiaries"
                      label="Usuarios y áreas beneficiarias"
                      type="textarea"
                    />
                  </div>
                </Panel>
                <Panel title="3. Alcance solicitado">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      name="sources"
                      label="Información disponible y fuentes"
                      type="textarea"
                    />
                    <Field
                      name="deliverables"
                      label="Entregables solicitados"
                      type="textarea"
                    />
                    <Field
                      name="acceptanceCriteria"
                      label="Criterios para aceptar el resultado"
                      type="textarea"
                      hint="Describa cómo comprobarán que el entregable satisface la necesidad."
                    />
                    <Field
                      name="referenceLinks"
                      label="Enlaces de referencia"
                      type="textarea"
                      required={false}
                      maxLength={40000}
                      hint="Un enlace HTTP o HTTPS por línea, hasta 20. No incluya credenciales."
                    />
                  </div>
                </Panel>
                <Panel title="4. Fechas">
                  <p className="mb-4 text-sm text-slate-600">
                    La fecha deseada orienta la evaluación y no constituye un
                    compromiso de entrega del equipo.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="desiredDate"
                        className="mb-1.5 block text-sm font-medium text-slate-800"
                      >
                        Fecha deseada (opcional)
                      </label>
                      <input
                        id="desiredDate"
                        name="desiredDate"
                        type="date"
                        value={desiredDate}
                        onChange={(event) => setDesiredDate(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-ungrd-blue"
                      />
                    </div>
                    {desiredDate && (
                      <Field
                        name="desiredDateReason"
                        label="Motivo de la fecha deseada"
                        type="textarea"
                        maxLength={1000}
                      />
                    )}
                  </div>
                </Panel>
              </fieldset>
              {error && <Notice error>{error}</Notice>}
              <button className={buttonClass} type="submit" disabled={busy}>
                {busy ? "Enviando solicitud…" : "Enviar solicitud"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
