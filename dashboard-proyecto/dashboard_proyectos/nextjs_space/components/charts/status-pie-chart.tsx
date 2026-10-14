'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface Props {
  data: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: '#94a3b8',
  EN_PROGRESO: '#3b82f6',
  COMPLETADO: '#10b981',
  BLOQUEADO: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En Progreso',
  COMPLETADO: 'Completado',
  BLOQUEADO: 'Bloqueado',
};

export function StatusPieChart({ data }: Props) {
  const chartData = Object.entries(data ?? {}).map(([key, value]) => ({
    name: STATUS_LABELS[key] ?? key,
    value: value ?? 0,
    color: STATUS_COLORS[key] ?? '#94a3b8',
  }));

  const total = chartData.reduce((sum, item) => sum + (item?.value ?? 0), 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No hay datos disponibles
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry?.color ?? '#94a3b8'} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [value, 'Tareas']}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: 11,
          }}
        />
        <Legend
          verticalAlign="top"
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
