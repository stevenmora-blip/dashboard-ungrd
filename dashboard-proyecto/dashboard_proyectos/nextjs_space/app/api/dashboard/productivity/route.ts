import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Fecha de hace 7 días para tendencia
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fecha de hace 14 días para comparación de tendencia
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const responsables = await prisma.responsable.findMany({
      where: { isActive: true },
      include: {
        team: true,
        taskAssignments: {
          include: {
            task: {
              include: {
                dailyEntries: {
                  orderBy: { fecha: 'desc' },
                  take: 30,
                },
                attachments: {
                  select: { id: true, createdAt: true },
                },
                progressLogs: {
                  orderBy: { createdAt: 'desc' },
                  take: 10,
                },
              },
            },
          },
        },
      },
    });

    const productivityData = responsables.map((resp) => {
      const tasks = resp.taskAssignments.map((a) => a.task);
      const total = tasks.length;
      if (total === 0) return null;

      const completed = tasks.filter((t) => t.status === 'COMPLETADO').length;
      const inProgress = tasks.filter((t) => t.status === 'EN_PROGRESO').length;
      const pending = tasks.filter((t) => t.status === 'PENDIENTE').length;

      // MÉTRICA PRINCIPAL: Avance promedio ponderado (promedio de progress de todas las tareas)
      const avgProgress = Math.round(
        tasks.reduce((sum, t) => sum + t.progress, 0) / total
      );

      // Tasa de completitud (solo como referencia secundaria)
      const completionRate = Math.round((completed / total) * 100);

      // ACTIVIDAD DAILY: contar dailies únicos de esta persona en los últimos 7 días
      const allDailies = tasks.flatMap((t) => t.dailyEntries);
      const recentDailies = allDailies.filter(
        (d) => new Date(d.fecha) >= sevenDaysAgo
      );
      const dailyCount7d = recentDailies.length;
      // Días únicos con daily en últimos 7 días
      const uniqueDailyDays = new Set(
        recentDailies.map((d) => new Date(d.fecha).toISOString().slice(0, 10))
      ).size;
      const hasDailyActivity = dailyCount7d > 0;
      const totalDailies = allDailies.length;

      // EVIDENCIAS: archivos subidos en las tareas asignadas
      const totalAttachments = tasks.reduce(
        (sum, t) => sum + t.attachments.length,
        0
      );
      const recentAttachments = tasks.reduce(
        (sum, t) =>
          sum +
          t.attachments.filter((a) => new Date(a.createdAt) >= sevenDaysAgo)
            .length,
        0
      );

      // TENDENCIA: comparar progreso promedio actual vs hace 7 días
      // Buscar en progressLogs el promedio de progreso de hace 7-14 días
      const progressLogsAll = tasks.flatMap((t) => t.progressLogs);
      const recentLogs = progressLogsAll.filter(
        (l) => new Date(l.createdAt) >= sevenDaysAgo
      );
      const olderLogs = progressLogsAll.filter(
        (l) =>
          new Date(l.createdAt) >= fourteenDaysAgo &&
          new Date(l.createdAt) < sevenDaysAgo
      );

      // Calcular delta de progreso en últimos 7 días
      const progressDelta7d = recentLogs.reduce(
        (sum, l) => sum + (l.newProgress - l.oldProgress),
        0
      );
      const progressDeltaPrev7d = olderLogs.reduce(
        (sum, l) => sum + (l.newProgress - l.oldProgress),
        0
      );

      // Tendencia: 'up' si mejoró, 'down' si empeoró, 'stable' si igual
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (progressDelta7d > progressDeltaPrev7d + 2) trend = 'up';
      else if (progressDelta7d < progressDeltaPrev7d - 2) trend = 'down';

      // INDICADOR DE ACTIVIDAD: activo si tiene dailies o cambios de progreso en últimos 7 días
      const isActive = hasDailyActivity || recentLogs.length > 0 || recentAttachments > 0;

      // SCORE COMPUESTO (para ranking justo):
      // 60% avance promedio + 20% actividad daily + 20% evidencias
      const dailyScore = Math.min(uniqueDailyDays / 5, 1) * 100; // max 5 días = 100%
      const evidenceScore = Math.min(totalAttachments / 3, 1) * 100; // max 3 archivos = 100%
      const compositeScore = Math.round(
        avgProgress * 0.6 + dailyScore * 0.2 + evidenceScore * 0.2
      );

      return {
        id: resp.id,
        name: resp.name,
        teamId: resp.teamId,
        team: resp.team
          ? { id: resp.team.id, name: resp.team.name, color: resp.team.color }
          : null,
        total,
        completed,
        inProgress,
        pending,
        // Métricas principales
        avgProgress,
        completionRate,
        compositeScore,
        // Actividad
        hasDailyActivity,
        dailyCount7d,
        uniqueDailyDays,
        totalDailies,
        isActive,
        // Evidencias
        totalAttachments,
        recentAttachments,
        // Tendencia
        trend,
        progressDelta7d,
        // Compatibilidad con interfaz anterior
        rate: avgProgress,
      };
    });

    const filtered = productivityData.filter(
      (p): p is NonNullable<typeof p> => p !== null && p.total > 0
    );

    // Ordenar por score compuesto (justo y progresivo)
    filtered.sort((a, b) => b.compositeScore - a.compositeScore);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error fetching productivity:', error);
    return NextResponse.json(
      { error: 'Error al obtener productividad' },
      { status: 500 }
    );
  }
}
