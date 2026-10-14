'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ProductivityData } from '@/lib/types';

interface Props {
  data: ProductivityData[];
}

export function ProductivityChart({ data }: Props) {
  const chartData = (data ?? [])
    .slice(0, 10)
    .map((p) => ({
      name: (p?.responsableName ?? '').split(' ')[0] || 'N/A',
      fullName: p?.responsableName ?? '',
      completadas: p?.completedTasks ?? 0,
      enProgreso: p?.inProgressTasks ?? 0,
      pendientes: p?.pendingTasks ?? 0,
      bloqueadas: p?.blockedTasks ?? 0,
    }));

  if ((chartData?.length ?? 0) === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No hay datos disponibles
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
        <XAxis
          dataKey="name"
          tickLine={false}
          tick={{ fontSize: 10 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis tickLine={false} tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(value: number, name: string) => [value, name]}
          labelFormatter={(label, payload) => {
            const item = payload?.[0]?.payload;
            return item?.fullName ?? label;
          }}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: 11,
          }}
        />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="completadas" name="Completadas" fill="#10b981" stackId="a" />
        <Bar dataKey="enProgreso" name="En Progreso" fill="#3b82f6" stackId="a" />
        <Bar dataKey="pendientes" name="Pendientes" fill="#94a3b8" stackId="a" />
        <Bar dataKey="bloqueadas" name="Bloqueadas" fill="#ef4444" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
