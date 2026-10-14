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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Recent progress changes - get MORE to group properly, deduplicate per person
    const recentProgressLogs = await prisma.taskProgressLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      include: {
        task: {
          select: {
            id: true, name: true,
            project: { select: { name: true, color: true } },
            assignments: { include: { responsable: { select: { name: true } } } },
          },
        },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Recent dailies
    const recentDailies = await prisma.dailyEntry.findMany({
      where: { fecha: { gte: sevenDaysAgo } },
      include: {
        task: { select: { id: true, name: true, project: { select: { name: true } } } },
        user: { select: { name: true } },
      },
      orderBy: { fecha: 'desc' },
      take: 15,
    });

    // Recent file uploads
    const recentFiles = await prisma.taskAttachment.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      include: {
        task: { select: { id: true, name: true, project: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    // Active impediments
    const tasksWithImpediments = await prisma.task.findMany({
      where: {
        impedimento: { not: null },
        status: { not: 'COMPLETADO' },
      },
      select: {
        id: true,
        name: true,
        impedimento: true,
        project: { select: { name: true, color: true } },
        assignments: {
          include: { responsable: { select: { name: true } } },
        },
      },
    });

    // People with no activity in 7 days + all persons progress
    const allResponsables = await prisma.responsable.findMany({
      where: { isActive: true },
      include: {
        team: { select: { name: true } },
        taskAssignments: {
          include: {
            task: {
              select: {
                id: true, status: true, progress: true,
                dailyEntries: { where: { fecha: { gte: sevenDaysAgo } }, select: { id: true } },
                progressLogs: { where: { createdAt: { gte: sevenDaysAgo } }, select: { id: true } },
              },
            },
          },
        },
      },
    });

    const inactivePersons = allResponsables
      .filter((r) => {
        const hasTasks = r.taskAssignments.length > 0;
        if (!hasTasks) return false;
        const hasDailies = r.taskAssignments.some((a) => a.task.dailyEntries.length > 0);
        const hasLogs = r.taskAssignments.some((a) => a.task.progressLogs.length > 0);
        return !hasDailies && !hasLogs;
      })
      .map((r) => ({ id: r.id, name: r.name, taskCount: r.taskAssignments.length }));

    // Summary counts
    const dailyCountWeek = await prisma.dailyEntry.count({
      where: { fecha: { gte: sevenDaysAgo } },
    });
    const filesCountWeek = await prisma.taskAttachment.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });
    const progressChangesWeek = await prisma.taskProgressLog.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    // Group progress logs by RESPONSABLE (not by the user who clicked), so all assigned people get credit
    const personTaskMap: Record<string, {
      userName: string;
      tasks: Record<string, {
        taskId: string; taskName: string; projectName: string; projectColor: string;
        oldProgress: number; newProgress: number; date: string;
      }>;
      totalDelta: number;
    }> = {};

    recentProgressLogs.forEach(l => {
      const responsableNames = l.task.assignments.map(a => a.responsable.name);
      // Attribute progress to ALL responsables assigned to the task
      const personsToCredit = responsableNames.length > 0 ? responsableNames : [l.user.name || 'Desconocido'];
      
      for (const personName of personsToCredit) {
        if (!personTaskMap[personName]) {
          personTaskMap[personName] = { userName: personName, tasks: {}, totalDelta: 0 };
        }
        const existing = personTaskMap[personName].tasks[l.task.id];
        if (!existing) {
          personTaskMap[personName].tasks[l.task.id] = {
            taskId: l.task.id,
            taskName: l.task.name,
            projectName: l.task.project.name,
            projectColor: l.task.project.color,
            oldProgress: l.oldProgress,
            newProgress: l.newProgress,
            date: l.createdAt.toISOString(),
          };
        } else {
          // Extend range: keep earliest old and latest new
          if (l.oldProgress < existing.oldProgress) existing.oldProgress = l.oldProgress;
          if (l.newProgress > existing.newProgress) existing.newProgress = l.newProgress;
        }
      }
    });

    // Calculate total delta per person
    Object.values(personTaskMap).forEach(p => {
      p.totalDelta = Object.values(p.tasks).reduce((s, t) => s + (t.newProgress - t.oldProgress), 0);
    });

    // Build grouped progress summary sorted by totalDelta desc
    const groupedProgress = Object.values(personTaskMap)
      .filter(p => p.totalDelta > 0)
      .sort((a, b) => b.totalDelta - a.totalDelta)
      .map(p => ({
        userName: p.userName,
        totalDelta: p.totalDelta,
        taskCount: Object.keys(p.tasks).length,
        tasks: Object.values(p.tasks).sort((a, b) => (b.newProgress - b.oldProgress) - (a.newProgress - a.oldProgress)).slice(0, 3),
      }));

    // Also build flat list for detail panel (max 1 per person-task combo, sorted by date)
    const deduplicatedLogs = Object.values(personTaskMap)
      .flatMap(p => Object.values(p.tasks).map(t => ({ ...t, userName: p.userName })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);

    // Build ALL persons progress (not just those with recent changes)
    const allPersonsProgress = allResponsables
      .filter(r => r.taskAssignments.length > 0)
      .map(r => {
        const rTasks = r.taskAssignments.map(a => a.task);
        const rTotal = rTasks.length;
        const rCompleted = rTasks.filter(t => t.status === 'COMPLETADO').length;
        const rInProgress = rTasks.filter(t => t.status === 'EN_PROGRESO').length;
        const rAvg = rTotal > 0 ? Math.round(rTasks.reduce((s, t) => s + t.progress, 0) / rTotal) : 0;
        const hasRecentActivity = rTasks.some(t => t.dailyEntries.length > 0 || t.progressLogs.length > 0);
        // Get delta from grouped progress if available
        const personGroup = personTaskMap[r.name];
        const delta7d = personGroup ? personGroup.totalDelta : 0;
        return {
          id: r.id,
          name: r.name,
          team: r.team?.name || 'Sin equipo',
          totalTasks: rTotal,
          completed: rCompleted,
          inProgress: rInProgress,
          avgProgress: rAvg,
          delta7d,
          hasRecentActivity,
        };
      })
      .sort((a, b) => b.avgProgress - a.avgProgress);

    return NextResponse.json({
      summary: {
        dailyCountWeek,
        filesCountWeek,
        progressChangesWeek,
        impedimentsCount: tasksWithImpediments.filter((t) => t.impedimento && t.impedimento.trim() !== '').length,
        inactiveCount: inactivePersons.length,
      },
      allPersonsProgress,
      groupedProgress,
      recentProgressLogs: deduplicatedLogs.map((l) => ({
        id: l.taskId,
        taskName: l.taskName,
        projectName: l.projectName,
        projectColor: l.projectColor,
        userName: l.userName,
        oldProgress: l.oldProgress,
        newProgress: l.newProgress,
        date: l.date,
      })),
      recentDailies: recentDailies.map((d) => ({
        id: d.id,
        taskName: d.task.name,
        projectName: d.task.project.name,
        userName: d.user.name || d.userName,
        dailyPresente: d.dailyPresente,
        dailyFuturo: d.dailyFuturo,
        impedimento: d.impedimento,
        date: d.fecha,
      })),
      recentFiles: recentFiles.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        taskName: f.task.name,
        projectName: f.task.project.name,
        date: f.createdAt,
        fileSize: f.fileSize,
      })),
      impediments: tasksWithImpediments
        .filter((t) => t.impedimento && t.impedimento.trim() !== '')
        .map((t) => ({
          taskId: t.id,
          taskName: t.name,
          projectName: t.project.name,
          projectColor: t.project.color,
          impedimento: t.impedimento,
          responsables: t.assignments.map((a) => a.responsable.name),
        })),
      inactivePersons,
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return NextResponse.json(
      { error: 'Error al obtener actividad reciente' },
      { status: 500 }
    );
  }
}
