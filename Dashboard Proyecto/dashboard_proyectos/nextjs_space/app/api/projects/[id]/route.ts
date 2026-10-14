import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Obtener detalle de un proyecto con métricas
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        team: true,
        tasks: {
          include: {
            assignments: {
              include: { responsable: true }
            },
            subTasks: true,
            attachments: true
          },
          orderBy: { orden: 'asc' }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    // Para subproyectos (3.1, 3.2, etc.), heredar tareas del proyecto padre
    let tasks = project.tasks;
    let isSubproject = false;
    let parentProject = null;

    if (project.prioridad && project.prioridad.includes('.')) {
      isSubproject = true;
      const parentPrioridad = project.prioridad.split('.')[0]; // "3.1" -> "3"
      
      parentProject = await prisma.project.findFirst({
        where: { prioridad: parentPrioridad, isActive: true },
        include: {
          tasks: {
            include: {
              assignments: {
                include: { responsable: true }
              },
              subTasks: true,
              attachments: true
            },
            orderBy: { orden: 'asc' }
          }
        }
      });

      if (parentProject) {
        tasks = parentProject.tasks;
      }
    }

    // Calcular métricas usando las tareas (heredadas o propias)
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETADO').length;
    const inProgressTasks = tasks.filter(t => t.status === 'EN_PROGRESO').length;
    const pendingTasks = tasks.filter(t => t.status === 'PENDIENTE').length;
    
    // Calcular progreso ponderado (promedio de progreso de todas las tareas)
    const totalProgress = tasks.reduce((sum, t) => sum + t.progress, 0);
    const weightedProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;

    // Obtener responsables únicos
    const responsablesSet = new Set<string>();
    const responsables: { id: string; name: string }[] = [];
    tasks.forEach(task => {
      task.assignments.forEach((a: { responsable: { id: string; name: string } }) => {
        if (!responsablesSet.has(a.responsable.id)) {
          responsablesSet.add(a.responsable.id);
          responsables.push({ id: a.responsable.id, name: a.responsable.name });
        }
      });
    });

    // Contar archivos totales
    const totalFiles = tasks.reduce((sum, t) => sum + t.attachments.length, 0);

    return NextResponse.json({
      ...project,
      tasks, // Devolver las tareas heredadas si es subproyecto
      isSubproject,
      parentProjectName: parentProject?.name || null,
      metrics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        weightedProgress,
        totalFiles,
        responsables
      }
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PATCH - Actualizar proyecto
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, liderSNI, liderUNGRD, tecnologias, expectativas } = body;

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(liderSNI !== undefined && { liderSNI }),
        ...(liderUNGRD !== undefined && { liderUNGRD }),
        ...(tecnologias && { tecnologias }),
        ...(expectativas !== undefined && { expectativas })
      }
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
