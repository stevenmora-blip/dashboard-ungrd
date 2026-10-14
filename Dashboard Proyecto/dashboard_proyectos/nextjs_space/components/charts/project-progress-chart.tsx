'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ProjectProgress } from '@/lib/types';

interface Props {
  data: ProjectProgress[];
}

export function ProjectProgressChart({ data }: Props) {
  const chartData = (data ?? []).map((p) => ({
    name: p?.projectName?.length > 25 ? p.projectName.substring(0, 25) + '...' : p?.projectName ?? '',
    progress: p?.progressPercent ?? 0,
    color: p?.color ?? '#3b82f6',
    fullName: p?.projectName ?? '',
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
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <XAxis type="number" domain={[0, 100]} tickLine={false} tick={{ fontSize: 10 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={180}
          tickLine={false}
          tick={{ fontSize: 10 }}
        />
        <Tooltip
          formatter={(value: number) => [`${value}%`, 'Progreso']}
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
        <Bar dataKey="progress" radius={[0, 4, 4, 0]} barSize={20}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry?.color ?? '#3b82f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
