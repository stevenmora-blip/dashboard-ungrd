import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Obtener subtareas de una tarea
export async function GET(
  request: NextRequest,
  { params: pendingParams }: { params: Promise<{ id: string }> }
) {
  const params = await pendingParams;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const subtasks = await prisma.subTask.findMany({
      where: { taskId: params.id },
      orderBy: { orden: 'asc' }
    });

    // Calcular progreso automático
    const total = subtasks.length;
    const completed = subtasks.filter(s => s.isCompleted).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return NextResponse.json({ subtasks, progress, total, completed });
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST - Crear nueva subtarea
export async function POST(
  request: NextRequest,
  { params: pendingParams }: { params: Promise<{ id: string }> }
) {
  const params = await pendingParams;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    // Obtener el orden máximo actual
    const maxOrden = await prisma.subTask.aggregate({
      where: { taskId: params.id },
      _max: { orden: true }
    });

    const subtask = await prisma.subTask.create({
      data: {
        taskId: params.id,
        name: name.trim(),
        description: description?.trim() || null,
        orden: (maxOrden._max.orden || 0) + 1,
        createdBy: (session.user as any).id
      }
    });

    // Recalcular y actualizar progreso de la tarea
    await updateTaskProgress(params.id);

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    console.error('Error creating subtask:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PATCH - Actualizar subtarea (toggle completado)
export async function PATCH(
  request: NextRequest,
  { params: pendingParams }: { params: Promise<{ id: string }> }
) {
  const params = await pendingParams;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { subtaskId, isCompleted, name } = body;

    if (!subtaskId) {
      return NextResponse.json({ error: 'ID de subtarea requerido' }, { status: 400 });
    }

    const updateData: any = {};
    
    if (typeof isCompleted === 'boolean') {
      updateData.isCompleted = isCompleted;
      updateData.completedAt = isCompleted ? new Date() : null;
      updateData.completedBy = isCompleted ? (session.user as any).id : null;
    }

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    const subtask = await prisma.subTask.update({
      where: { id: subtaskId },
      data: updateData
    });

    // Recalcular y actualizar progreso de la tarea
    await updateTaskProgress(params.id);

    return NextResponse.json(subtask);
  } catch (error) {
    console.error('Error updating subtask:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE - Eliminar subtarea
export async function DELETE(
  request: NextRequest,
  { params: pendingParams }: { params: Promise<{ id: string }> }
) {
  const params = await pendingParams;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subtaskId = searchParams.get('subtaskId');

    if (!subtaskId) {
      return NextResponse.json({ error: 'ID de subtarea requerido' }, { status: 400 });
    }

    await prisma.subTask.delete({
      where: { id: subtaskId }
    });

    // Recalcular y actualizar progreso de la tarea
    await updateTaskProgress(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// Función auxiliar para actualizar el progreso de la tarea
async function updateTaskProgress(taskId: string) {
  const subtasks = await prisma.subTask.findMany({
    where: { taskId }
  });

  const total = subtasks.length;
  const completed = subtasks.filter(s => s.isCompleted).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Determinar estado basado en progreso
  let status: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' = 'PENDIENTE';
  if (progress === 100) {
    status = 'COMPLETADO';
  } else if (progress > 0) {
    status = 'EN_PROGRESO';
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { progress, status }
  });
}
