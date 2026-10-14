export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      "El servidor devolvió una respuesta no válida. Reintente.",
      response.status,
    );
  }
  if (!response.ok) {
    const error = payload as {
      error?: string;
      issues?:
        | { path?: (string | number)[]; message: string }[]
        | {
            formErrors?: string[];
            fieldErrors?: Record<string, string[] | undefined>;
          };
    };
    const labels: Record<string, string> = {
      requesterEmail: "Correo",
      requesterName: "Nombre",
      area: "Área",
      title: "Título",
      desiredDate: "Fecha deseada",
      desiredDateReason: "Motivo de la fecha",
      referenceLinks: "Referencias",
      ownerId: "Responsable",
      approverId: "Aprobador",
      scopeVersionId: "Versión de alcance",
      proposedDate: "Fecha propuesta",
      laborHours: "Horas de trabajo",
      machineHours: "Horas de máquina",
      reason: "Motivo",
      scope: "Alcance",
      deliverables: "Entregables",
      acceptanceCriteria: "Criterios de aceptación",
      resourceNotes: "Recursos",
      heldAt: "Fecha y hora",
      projectId: "Proyecto",
    };
    const issues = error.issues;
    const details = Array.isArray(issues)
      ? issues
          .map(
            (issue) =>
              `${labels[String(issue.path?.[0])] || issue.path?.join(".") || "Formulario"}: ${issue.message}`,
          )
          .join(" · ")
      : issues
        ? [
            ...(issues.formErrors || []),
            ...Object.entries(issues.fieldErrors || {}).flatMap(
              ([field, messages]) =>
                (messages || []).map(
                  (message) =>
                    `${labels[field] || "Campo del formulario"}: ${message}`,
                ),
            ),
          ].join(" · ")
        : "";
    throw new ApiError(
      [
        error.error ||
          `No se pudo completar la operación (${response.status}).`,
        details,
      ]
        .filter(Boolean)
        .join(" "),
      response.status,
    );
  }
  return payload as T;
}
export function httpLinks(value: string): string[] {
  const links = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (links.length > 20) throw new Error("Puede registrar hasta 20 enlaces.");
  for (const link of links) {
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      throw new Error(
        "Cada referencia debe ser un enlace HTTP o HTTPS válido.",
      );
    }
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error("Use enlaces HTTP o HTTPS sin credenciales.");
  }
  return links;
}
