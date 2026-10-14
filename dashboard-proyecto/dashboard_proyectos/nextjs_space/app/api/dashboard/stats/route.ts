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

    const isAdmin = (session.user as any).role === 'ADMIN';
    const userResponsableId = (session.user as any).responsableId;

    // Base where clause
    const taskWhere: any = {};
    if (!isAdmin && userResponsableId) {
      taskWhere.assignments = {
        some: { responsableId: userResponsableId },
      };
    }

    // Contar proyectos activos principales (sin subproyectos 3.x)
    const activeProjects = await prisma.project.findMany({
      where: { 
        isActive: true,
        tasks: { some: {} },
        NOT: {
          prioridad: { contains: '.' }
        }
      },
      select: { id: true }
    });
    const totalProjects = activeProjects.length;

    // Obtener todas las tareas con su progreso para calcular progreso ponderado
    const allTasks = await prisma.task.findMany({
      where: taskWhere,
      select: {
        id: true,
        status: true,
        progress: true,
      },
    });

    const pendientes = allTasks.filter(t => t.status === 'PENDIENTE').length;
    const enProgreso = allTasks.filter(t => t.status === 'EN_PROGRESO').length;
    const completadas = allTasks.filter(t => t.status === 'COMPLETADO').length;
    const totalTasks = allTasks.length;

    // Tasa de completitud basada en tareas completadas
    const completionRate = totalTasks > 0
      ? Math.round((completadas / totalTasks) * 100)
      : 0;

    // Progreso ponderado global: promedio del progreso de todas las tareas
    const weightedProgress = totalTasks > 0
      ? Math.round(allTasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks)
      : 0;

    // Tareas completadas esta semana
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const tasksCompletedThisWeek = await prisma.taskProgressLog.count({
      where: {
        newStatus: 'COMPLETADO',
        createdAt: { gte: oneWeekAgo },
        ...(userResponsableId && !isAdmin
          ? { task: { assignments: { some: { responsableId: userResponsableId } } } }
          : {}),
      },
    });

    // Contar equipos
    const totalTeams = await prisma.team.count({ where: { isActive: true } });

    // Contar responsables
    const totalResponsables = await prisma.responsable.count({
      where: { isActive: true },
    });

    return NextResponse.json({
      totalProjects,
      totalTasks,
      completionRate,
      weightedProgress, // Nuevo: progreso ponderado global
      tasksCompletedThisWeek,
      tasksDueThisWeek: 0,
      overdueTasks: 0,
      totalTeams,
      totalResponsables,
      tasksByStatus: {
        PENDIENTE: pendientes,
        EN_PROGRESO: enProgreso,
        COMPLETADO: completadas,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
