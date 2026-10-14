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

    const teams = await prisma.team.findMany({
      where: { isActive: true },
      include: {
        members: true,
        projects: {
          include: {
            tasks: true,
          },
        },
      },
    });

    const teamStats = teams.map((team) => {
      const allTasks = team.projects.flatMap((p) => p.tasks);
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(
        (t) => t.status === 'COMPLETADO'
      ).length;
      const inProgressTasks = allTasks.filter(
        (t) => t.status === 'EN_PROGRESO'
      ).length;

      const weightedProgress =
        totalTasks > 0
          ? Math.round(
              allTasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks
            )
          : 0;

      return {
        id: team.id,
        name: team.name,
        color: team.color,
        memberCount: team.members.length,
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks: 0,
        completionRate:
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        weightedProgress,
      };
    });

    return NextResponse.json(teamStats);
  } catch (error) {
    console.error('Error fetching team stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas de equipos' },
      { status: 500 }
    );
  }
}
