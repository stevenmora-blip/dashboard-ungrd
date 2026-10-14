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

    // Get IDs of people who appear in the workload Excel (have memberships or are explicitly listed)
    const membershipsDistinct = await prisma.projectMembership.findMany({
      select: { responsableId: true },
      distinct: ['responsableId'],
    });
    const memberIds = new Set(membershipsDistinct.map((m) => m.responsableId));

    // Sebastián Gámez and William Triana appear in the Excel with 0 projects
    const extraPeopleInExcel = ['cmltgx5lf0010ytven7kubpbb', 'cmlvbfqyw000lunkoygltjqy8'];
    extraPeopleInExcel.forEach((id) => memberIds.add(id));

    const allowedIds = Array.from(memberIds);

    // Get only the people from the Excel with their project memberships and task data
    const responsables = await prisma.responsable.findMany({
      where: { id: { in: allowedIds }, isActive: true },
      include: {
        team: { select: { id: true, name: true, color: true } },
        projectMemberships: {
          include: {
            project: { select: { id: true, name: true, prioridad: true, color: true, isActive: true } },
          },
        },
        taskAssignments: {
          include: {
            task: {
              select: {
                id: true,
                status: true,
                progress: true,
                project: { select: { id: true, name: true, isActive: true } },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build workload data for each person
    const workloadData = responsables
      .map((resp) => {
        // Projects come from the membership table (source of truth)
        const memberProjects = resp.projectMemberships
          .filter((pm) => pm.project.isActive)
          .map((pm) => {
            // Count tasks in this project for this person
            const tasksInProject = resp.taskAssignments.filter(
              (ta) => ta.task.project.id === pm.projectId && ta.task.project.isActive
            );
            const taskCount = tasksInProject.length;
            const completedTasks = tasksInProject.filter((t) => t.task.status === 'COMPLETADO').length;
            const inProgressTasks = tasksInProject.filter((t) => t.task.status === 'EN_PROGRESO').length;
            const pendingTasks = tasksInProject.filter((t) => t.task.status === 'PENDIENTE').length;
            const avgProgress = taskCount > 0
              ? Math.round(tasksInProject.reduce((s, t) => s + (t.task.progress || 0), 0) / taskCount)
              : 0;

            return {
              id: pm.project.id,
              name: pm.project.name,
              prioridad: pm.project.prioridad,
              color: pm.project.color,
              taskCount,
              completedTasks,
              inProgressTasks,
              pendingTasks,
              avgProgress,
            };
          })
          .sort((a, b) => {
            const pa = parseFloat(a.prioridad || '999');
            const pb = parseFloat(b.prioridad || '999');
            return pa - pb;
          });

        // Global task stats (from all active project tasks)
        const activeTasks = resp.taskAssignments.filter((ta) => ta.task.project.isActive);
        const totalTasks = activeTasks.length;
        const totalCompleted = activeTasks.filter((t) => t.task.status === 'COMPLETADO').length;
        const totalInProgress = activeTasks.filter((t) => t.task.status === 'EN_PROGRESO').length;
        const totalPending = activeTasks.filter((t) => t.task.status === 'PENDIENTE').length;
        const totalProgress = activeTasks.reduce((s, t) => s + (t.task.progress || 0), 0);

        return {
          id: resp.id,
          name: resp.name,
          email: resp.email,
          team: resp.team,
          totalProjects: memberProjects.length,
          totalTasks,
          totalCompleted,
          totalInProgress,
          totalPending,
          avgProgress: totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0,
          projects: memberProjects,
        };
      })
      .sort((a, b) => b.totalProjects - a.totalProjects || b.totalTasks - a.totalTasks);

    // Project summary: how many people per project (from memberships)
    const projectSummaryMap = new Map<string, { id: string; name: string; prioridad: string | null; color: string | null; totalPeople: number; peopleNames: string[] }>();
    for (const w of workloadData) {
      for (const proj of w.projects) {
        const existing = projectSummaryMap.get(proj.id);
        if (existing) {
          existing.totalPeople++;
          existing.peopleNames.push(w.name);
        } else {
          projectSummaryMap.set(proj.id, {
            id: proj.id,
            name: proj.name,
            prioridad: proj.prioridad,
            color: proj.color,
            totalPeople: 1,
            peopleNames: [w.name],
          });
        }
      }
    }
    const projectSummary = Array.from(projectSummaryMap.values())
      .sort((a, b) => b.totalPeople - a.totalPeople);

    return NextResponse.json({
      workload: workloadData,
      projectSummary,
      totalPeople: workloadData.length,
      avgProjectsPerPerson: workloadData.length > 0
        ? Math.round((workloadData.reduce((s, w) => s + w.totalProjects, 0) / workloadData.length) * 10) / 10
        : 0,
      maxProjects: workloadData.length > 0 ? workloadData[0].totalProjects : 0,
    });
  } catch (error) {
    console.error('Error fetching workload:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}