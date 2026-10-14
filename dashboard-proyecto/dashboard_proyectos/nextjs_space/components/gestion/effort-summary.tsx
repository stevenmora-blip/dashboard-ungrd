import type { ResourceSummary } from "./types";
import { kindLabels } from "./effort-impact-types";
export const quantityText = (value: number) =>
  new Intl.NumberFormat("es-CO", { maximumSignificantDigits: 15 }).format(value);
export function ResourceTotals({ summary }: { summary: ResourceSummary }) {
  return (
    <div className="space-y-3 text-sm">
      <ul className="grid gap-2 sm:grid-cols-2">
        {summary.quantities.map((row) => (
          <li
            key={`${row.kind}:${row.unit}`}
            className="rounded-lg bg-slate-50 p-3"
          >
            <span className="block text-slate-600">
              {kindLabels[row.kind] || row.kind}
            </span>
            <strong>
              {quantityText(row.quantity)} {row.unit}
            </strong>
          </li>
        ))}
      </ul>
      {!summary.quantities.length && (
        <p className="text-slate-500">
          Sin consumos registrados para este alcance.
        </p>
      )}
      <ul className="space-y-1">
        {summary.costs.map((row) => (
          <li key={row.currency}>
            Importe registrado:{" "}
            <strong>
              {quantityText(row.amount)} {row.currency}
            </strong>
          </li>
        ))}
      </ul>
      <p className="text-slate-600">
        {summary.unpricedCount} registro(s) con importe no calculado por falta
        de tarifa. Las cantidades y monedas se presentan por separado.
      </p>
    </div>
  );
}
