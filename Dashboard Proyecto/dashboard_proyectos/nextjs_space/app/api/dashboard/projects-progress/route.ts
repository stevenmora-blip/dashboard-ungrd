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

    // Solo proyectos principales (sin subproyectos como 3.1, 3.2, etc.)
    const projects = await prisma.project.findMany({
      where: { 
        isActive: true,
        NOT: {
          prioridad: { contains: '.' }
        }
      },
      include: {
        team: true,
        tasks: {
          select: {
            id: true,
            status: true,
            progress: true,
          },
        },
      },
      orderBy: [
        { prioridad: 'asc' },
        { name: 'asc' },
      ],
    });

    const projectsProgress = projects.map((project) => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(
        (t) => t.status === 'COMPLETADO'
      ).length;
      const inProgressTasks = project.tasks.filter(
        (t) => t.status === 'EN_PROGRESO'
      ).length;
      
      // Progreso ponderado: promedio del progreso de todas las tareas
      const weightedProgress = totalTasks > 0
        ? Math.round(
            project.tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks
          )
        : 0;

      return {
        id: project.id,
        name: project.name,
        color: project.color,
        prioridad: project.prioridad,
        subdireccion: project.subdireccion,
        liderSNI: project.liderSNI,
        liderUNGRD: project.liderUNGRD,
        teamName: project.team?.name || 'Sin equipo',
        teamColor: project.team?.color || '#1A365D',
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks: totalTasks - completedTasks - inProgressTasks,
        // Progreso basado en tareas completadas
        progress: totalTasks > 0
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0,
        // Progreso ponderado basado en el progreso individual de cada tarea
        weightedProgress,
      };
    });

    return NextResponse.json(projectsProgress);
  } catch (error) {
    console.error('Error fetching projects progress:', error);
    return NextResponse.json(
      { error: 'Error al obtener progreso de proyectos' },
      { status: 500 }
    );
  }
}
