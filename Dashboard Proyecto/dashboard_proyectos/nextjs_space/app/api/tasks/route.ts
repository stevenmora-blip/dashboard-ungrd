import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const responsableId = searchParams.get('responsableId');
    const status = searchParams.get('status');
    const teamId = searchParams.get('teamId');
    const search = searchParams.get('search');

    const isAdmin = (session.user as any).role === 'ADMIN';
    const userResponsableId = (session.user as any).responsableId;

    const where: any = {};

    // Si no es admin, solo ver sus tareas
    if (!isAdmin && userResponsableId) {
      where.assignments = {
        some: { responsableId: userResponsableId },
      };
    }

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { entregable: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (responsableId) {
      where.assignments = {
        some: { responsableId },
      };
    }
    if (teamId) {
      where.project = { teamId };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          include: { team: true },
        },
        assignments: {
          include: { responsable: true },
        },
        attachments: {
          select: { id: true, fileName: true },
        },
        _count: {
          select: { attachments: true },
        },
      },
      orderBy: [{ orden: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      tasks,
      pagination: {
        total: tasks.length,
        page: 1,
        limit: tasks.length,
        totalPages: 1,
      },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Error al obtener tareas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isAdmin = (session.user as any).role === 'ADMIN';
    const userResponsableId = (session.user as any).responsableId;

    const body = await request.json();
    const { name, description, entregable, projectId, responsableIds } = body;

    if (!name || !projectId) {
      return NextResponse.json(
        { error: 'Nombre y proyecto son requeridos' },
        { status: 400 }
      );
    }

    // Regular users can only create tasks assigned to themselves
    let finalResponsableIds = responsableIds;
    if (!isAdmin) {
      if (!userResponsableId) {
        return NextResponse.json(
          { error: 'Tu usuario no tiene un responsable asociado. Contacta al administrador.' },
          { status: 403 }
        );
      }
      // Verify project exists and is active
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { isActive: true },
      });
      if (!project || !project.isActive) {
        return NextResponse.json(
          { error: 'Proyecto no encontrado o inactivo' },
          { status: 404 }
        );
      }
      // Force assignment to self only
      finalResponsableIds = [userResponsableId];
    }

    const task = await prisma.task.create({
      data: {
        name,
        description,
        entregable,
        projectId,
        assignments: finalResponsableIds?.length
          ? {
              create: finalResponsableIds.map((id: string) => ({
                responsableId: id,
              })),
            }
          : undefined,
      },
      include: {
        project: true,
        assignments: { include: { responsable: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREAR',
        entity: 'Task',
        entityId: task.id,
        entityName: task.name,
        details: JSON.stringify({ projectId, project: task.project.name, entregable }),
        userId: (session.user as any).id,
        userName: session.user?.name || 'Desconocido',
        userEmail: session.user?.email || '',
      },
    }).catch((e: any) => console.error('Audit log error:', e));

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Error al crear tarea' },
      { status: 500 }
    );
  }
}
