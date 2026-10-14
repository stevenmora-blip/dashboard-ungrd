import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        project: { include: { team: true } },
        assignments: { include: { responsable: true } },
        attachments: true,
        progressLogs: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Error al obtener tarea' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isAdmin = (session.user as any).role === 'ADMIN';
    const userId = (session.user as any).id;
    const userResponsableId = (session.user as any).responsableId;

    const body = await request.json();

    // Obtener tarea actual para log de progreso
    const currentTask = await prisma.task.findUnique({
      where: { id: params.id },
      include: { assignments: true },
    });

    if (!currentTask) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    // Si no es admin, verificar que está asignado a la tarea
    if (!isAdmin) {
      const isAssigned = currentTask.assignments.some(
        (a) => a.responsableId === userResponsableId
      );
      if (!isAssigned) {
        return NextResponse.json(
          { error: 'No tienes permiso para editar esta tarea' },
          { status: 403 }
        );
      }

      // Check if user is the sole assignee (owns the task exclusively)
      const isSoleOwner = currentTask.assignments.length === 1 && isAssigned;

      // Allowed fields for all assigned users
      const allowedFields = ['progress', 'status', 'comments', 'impedimento', 'dailyPresente', 'dailyFuturo'];
      // Sole owners can also edit name, description, entregable
      if (isSoleOwner) {
        allowedFields.push('name', 'description', 'entregable', 'descripcionEntregable', 'plannedWeeks');
      }

      const updateData: any = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }

      // Registrar log de progreso
      if (body.progress !== undefined || body.status !== undefined) {
        await prisma.taskProgressLog.create({
          data: {
            taskId: params.id,
            userId,
            oldProgress: currentTask.progress,
            newProgress: body.progress ?? currentTask.progress,
            oldStatus: currentTask.status,
            newStatus: body.status ?? currentTask.status,
            comment: body.comments,
          },
        });
      }

      const task = await prisma.task.update({
        where: { id: params.id },
        data: updateData,
        include: {
          project: { include: { team: true } },
          assignments: { include: { responsable: true } },
        },
      });

      // Audit log for user update
      const changedFields = Object.keys(updateData).filter(k => {
        return (currentTask as any)[k] !== updateData[k];
      });
      if (changedFields.length > 0) {
        await prisma.auditLog.create({
          data: {
            action: 'MODIFICAR',
            entity: 'Task',
            entityId: params.id,
            entityName: task.name,
            details: JSON.stringify({ campos: changedFields, proyecto: task.project.name }),
            userId,
            userName: session.user?.name || 'Desconocido',
            userEmail: session.user?.email || '',
          },
        }).catch((e: any) => console.error('Audit log error:', e));
      }

      return NextResponse.json(task);
    }

    // Admin puede actualizar todo
    const { responsableIds, ...updateData } = body;

    // Keep logged consumption attached to its original task/project. The
    // composite FK below the API also enforces this against concurrent writes.
    if (updateData.projectId !== undefined && updateData.projectId !== currentTask.projectId &&
        await prisma.resourceConsumption.count({ where: { taskId: params.id } })) {
      return NextResponse.json(
        { error: 'No se puede trasladar una tarea con consumos registrados a otro proyecto' },
        { status: 409 }
      );
    }

    // Registrar log si hay cambio de progreso/status
    if (body.progress !== undefined || body.status !== undefined) {
      await prisma.taskProgressLog.create({
        data: {
          taskId: params.id,
          userId,
          oldProgress: currentTask.progress,
          newProgress: body.progress ?? currentTask.progress,
          oldStatus: currentTask.status,
          newStatus: body.status ?? currentTask.status,
          comment: body.comments,
        },
      });
    }

    // Actualizar asignaciones si se proporcionan
    if (responsableIds !== undefined) {
      await prisma.taskAssignment.deleteMany({
        where: { taskId: params.id },
      });

      if (responsableIds.length > 0) {
        await prisma.taskAssignment.createMany({
          data: responsableIds.map((id: string) => ({
            taskId: params.id,
            responsableId: id,
          })),
        });
      }
    }

    const task = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        project: { include: { team: true } },
        assignments: { include: { responsable: true } },
      },
    });

    // Audit log for admin update
    const adminChangedFields = Object.keys(updateData).filter(k => {
      return (currentTask as any)[k] !== updateData[k];
    });
    if (adminChangedFields.length > 0 || responsableIds !== undefined) {
      await prisma.auditLog.create({
        data: {
          action: 'MODIFICAR',
          entity: 'Task',
          entityId: params.id,
          entityName: task.name,
          details: JSON.stringify({ campos: adminChangedFields, proyecto: task.project.name, responsableIds: responsableIds !== undefined ? 'actualizado' : undefined }),
          userId,
          userName: session.user?.name || 'Desconocido',
          userEmail: session.user?.email || '',
        },
      }).catch((e: any) => console.error('Audit log error:', e));
    }

    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003' &&
        await prisma.resourceConsumption.count({ where: { taskId: params.id } })) {
      return NextResponse.json(
        { error: 'No se puede trasladar una tarea con consumos registrados a otro proyecto' },
        { status: 409 }
      );
    }
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Error al actualizar tarea' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isAdmin = (session.user as any).role === 'ADMIN';
    const userResponsableId = (session.user as any).responsableId;

    if (!isAdmin) {
      // Regular users can only delete tasks where they are the sole assignee
      const task = await prisma.task.findUnique({
        where: { id: params.id },
        include: { assignments: true },
      });
      if (!task) {
        return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
      }
      const isSoleOwner =
        task.assignments.length === 1 &&
        task.assignments[0].responsableId === userResponsableId;
      if (!isSoleOwner) {
        return NextResponse.json(
          { error: 'Solo puedes eliminar actividades que te pertenecen exclusivamente' },
          { status: 403 }
        );
      }
    }

    // Get task info before deleting for audit
    const taskToDelete = await prisma.task.findUnique({
      where: { id: params.id },
      include: { project: true, assignments: { include: { responsable: true } } },
    });

    await prisma.task.delete({
      where: { id: params.id },
    });

    // Audit log for delete
    if (taskToDelete) {
      await prisma.auditLog.create({
        data: {
          action: 'ELIMINAR',
          entity: 'Task',
          entityId: params.id,
          entityName: taskToDelete.name,
          details: JSON.stringify({
            proyecto: taskToDelete.project.name,
            responsables: taskToDelete.assignments.map(a => a.responsable.name),
            entregable: taskToDelete.entregable,
          }),
          userId: (session.user as any).id,
          userName: session.user?.name || 'Desconocido',
          userEmail: session.user?.email || '',
        },
      }).catch((e: any) => console.error('Audit log error:', e));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003' &&
        await prisma.resourceConsumption.count({ where: { taskId: params.id } })) {
      return NextResponse.json(
        { error: 'No se puede eliminar una tarea con consumos registrados; preserve su trazabilidad' },
        { status: 409 }
      );
    }
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Error al eliminar tarea' },
      { status: 500 }
    );
  }
}
