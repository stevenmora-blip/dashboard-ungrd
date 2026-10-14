import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params: pendingParams }: { params: Promise<{ id: string }> }
) {
  const params = await pendingParams;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const responsable = await prisma.responsable.findUnique({
      where: { id: params.id },
      include: {
        team: true,
        taskAssignments: {
          include: {
            task: {
              include: {
                project: { select: { id: true, name: true, color: true } },
                dailyEntries: {
                  orderBy: { fecha: 'desc' },
                },
                attachments: {
                  select: { id: true, fileName: true, createdAt: true, fileSize: true },
                },
                progressLogs: {
                  orderBy: { createdAt: 'desc' },
                },
                subTasks: {
                  select: { id: true, name: true, isCompleted: true },
                },
              },
            },
          },
        },
      },
    });

    if (!responsable) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const tasks = responsable.taskAssignments.map((a) => a.task);
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'COMPLETADO').length;
    const inProgress = tasks.filter((t) => t.status === 'EN_PROGRESO').length;
    const pending = tasks.filter((t) => t.status === 'PENDIENTE').length;
    const avgProgress =
      total > 0
        ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / total)
        : 0;

    // Daily activity
    const allDailies = tasks.flatMap((t) => t.dailyEntries);
    const totalDailies = allDailies.length;

    // Frecuencia: días únicos con daily
    const uniqueDays = new Set(
      allDailies.map((d) => new Date(d.fecha).toISOString().slice(0, 10))
    ).size;

    // Último daily
    const lastDaily =
      allDailies.length > 0 ? allDailies[0].fecha : null;

    // Evidencias totales
    const allAttachments = tasks.flatMap((t) => t.attachments);
    const totalAttachments = allAttachments.length;

    // Evolución del progreso: agrupar por semana
    const allLogs = tasks.flatMap((t) =>
      t.progressLogs.map((l) => ({
        ...l,
        taskName: t.name,
        taskId: t.id,
      }))
    );
    allLogs.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Agrupar evolución por semana (últimas 8 semanas)
    // Para cada tarea: si hay logs antes del fin de semana, usar el último newProgress.
    // Si no hay logs, usar el progreso actual de la tarea (refleja el estado real).
    // Esto evita mostrar 0% plano en semanas sin registros de cambio.
    const weeklyEvolution: { week: string; avgProgress: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7 + 7);
      // Clamp weekEnd to now for the current week
      const effectiveEnd = weekEnd > now ? now : weekEnd;

      const weekLabel = `Sem ${8 - i}`;

      const weekAvg =
        total > 0
          ? Math.round(
              tasks.reduce((sum, task) => {
                const logsBeforeEnd = task.progressLogs.filter(
                  (l) => new Date(l.createdAt) <= effectiveEnd
                );
                if (logsBeforeEnd.length > 0) {
                  const sorted = [...logsBeforeEnd].sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  );
                  return sum + sorted[0].newProgress;
                }
                // Sin logs: para la semana actual usar progreso real; para pasadas usar 0
                // solo si la tarea se creó después de esta semana
                if (new Date(task.createdAt) <= effectiveEnd) {
                  // Tarea existía pero sin logs → usar progreso actual si es semana actual
                  return sum + (i === 0 ? task.progress : 0);
                }
                return sum;
              }, 0) / total
            )
          : 0;

      weeklyEvolution.push({ week: weekLabel, avgProgress: weekAvg });
    }
    // Ensure non-decreasing: carry forward the max seen so far
    let maxSeen = 0;
    for (const w of weeklyEvolution) {
      if (w.avgProgress < maxSeen) {
        w.avgProgress = maxSeen;
      } else {
        maxSeen = w.avgProgress;
      }
    }

    // Detalle de tareas
    const taskDetails = tasks.map((t) => ({
      id: t.id,
      name: t.name,
      project: t.project.name,
      projectColor: t.project.color,
      status: t.status,
      progress: t.progress,
      entregable: t.entregable,
      dailyPresente: t.dailyPresente,
      dailyFuturo: t.dailyFuturo,
      impedimento: t.impedimento,
      dailyCount: t.dailyEntries.length,
      attachmentCount: t.attachments.length,
      attachments: t.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        date: a.createdAt,
        fileSize: a.fileSize,
      })),
      subTasksTotal: t.subTasks.length,
      subTasksCompleted: t.subTasks.filter((s) => s.isCompleted).length,
      lastUpdate: t.updatedAt,
    }));

    // 7 días actividad
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyCount7d = allDailies.filter(
      (d) => new Date(d.fecha) >= sevenDaysAgo
    ).length;
    const uniqueDailyDays7d = new Set(
      allDailies
        .filter((d) => new Date(d.fecha) >= sevenDaysAgo)
        .map((d) => new Date(d.fecha).toISOString().slice(0, 10))
    ).size;

    const recentAttachments = allAttachments.filter(
      (a) => new Date(a.createdAt) >= sevenDaysAgo
    ).length;

    const isActive = dailyCount7d > 0 || allLogs.filter(
      (l) => new Date(l.createdAt) >= sevenDaysAgo
    ).length > 0 || recentAttachments > 0;

    // Tendencia
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const progressDelta7d = allLogs
      .filter((l) => new Date(l.createdAt) >= sevenDaysAgo)
      .reduce((sum, l) => sum + (l.newProgress - l.oldProgress), 0);
    const progressDeltaPrev = allLogs
      .filter(
        (l) =>
          new Date(l.createdAt) >= fourteenDaysAgo &&
          new Date(l.createdAt) < sevenDaysAgo
      )
      .reduce((sum, l) => sum + (l.newProgress - l.oldProgress), 0);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (progressDelta7d > progressDeltaPrev + 2) trend = 'up';
    else if (progressDelta7d < progressDeltaPrev - 2) trend = 'down';

    return NextResponse.json({
      // Info básica
      id: responsable.id,
      name: responsable.name,
      team: responsable.team
        ? { id: responsable.team.id, name: responsable.team.name, color: responsable.team.color }
        : null,
      // Resumen ejecutivo
      summary: {
        avgProgress,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        total,
        completed,
        inProgress,
        pending,
        isActive,
        trend,
        progressDelta7d,
      },
      // Actividad daily
      dailyActivity: {
        totalDailies,
        uniqueDays,
        dailyCount7d,
        uniqueDailyDays7d,
        lastDaily,
      },
      // Evidencias
      evidence: {
        totalAttachments,
        recentAttachments,
      },
      // Evolución
      weeklyEvolution,
      // Detalle de tareas
      tasks: taskDetails,
    });
  } catch (error) {
    console.error('Error fetching person report:', error);
    return NextResponse.json(
      { error: 'Error al obtener reporte' },
      { status: 500 }
    );
  }
}
