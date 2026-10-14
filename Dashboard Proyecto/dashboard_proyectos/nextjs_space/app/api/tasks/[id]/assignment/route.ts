import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper: ensure user has a responsable, auto-create if missing
async function ensureResponsable(session: any): Promise<string | null> {
  const userId = (session.user as any).id;
  const userName = (session.user as any).name;
  let responsableId = (session.user as any).responsableId;

  if (responsableId) return responsableId;

  if (!userId || !userName) return null;

  // Try to find existing responsable by name
  const existing = await prisma.responsable.findFirst({
    where: { name: { equals: userName, mode: 'insensitive' } },
  });

  if (existing) {
    // Link user to existing responsable
    await prisma.user.update({
      where: { id: userId },
      data: { responsableId: existing.id },
    });
    return existing.id;
  }

  // Get the task's project team, or use first team as default
  const firstTeam = await prisma.team.findFirst({ where: { isActive: true } });

  // Create new responsable
  const newResp = await prisma.responsable.create({
    data: {
      name: userName,
      email: (session.user as any).email || null,
      isActive: true,
      teamId: firstTeam?.id || null,
    },
  });

  // Link user
  await prisma.user.update({
    where: { id: userId },
    data: { responsableId: newResp.id },
  });

  return newResp.id;
}

// POST: Join a task (add self as assignee)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userResponsableId = await ensureResponsable(session);
    if (!userResponsableId) {
      return NextResponse.json(
        { error: 'No se pudo determinar tu perfil de responsable. Contacta al administrador.' },
        { status: 403 }
      );
    }

    // Check task exists
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: { assignments: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    // Check not already assigned
    const alreadyAssigned = task.assignments.some(
      (a) => a.responsableId === userResponsableId
    );
    if (alreadyAssigned) {
      return NextResponse.json(
        { error: 'Ya estás asignado a esta tarea' },
        { status: 400 }
      );
    }

    await prisma.taskAssignment.create({
      data: {
        taskId: params.id,
        responsableId: userResponsableId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error joining task:', error);
    return NextResponse.json(
      { error: 'Error al unirse a la tarea' },
      { status: 500 }
    );
  }
}

// DELETE: Leave a task (remove self as assignee)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userResponsableId = await ensureResponsable(session);
    if (!userResponsableId) {
      return NextResponse.json(
        { error: 'No se pudo determinar tu perfil de responsable. Contacta al administrador.' },
        { status: 403 }
      );
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: { assignments: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    // Check user is assigned
    const assignment = task.assignments.find(
      (a) => a.responsableId === userResponsableId
    );
    if (!assignment) {
      return NextResponse.json(
        { error: 'No estás asignado a esta tarea' },
        { status: 400 }
      );
    }

    // Cannot leave if sole assignee (would orphan the task)
    if (task.assignments.length === 1) {
      return NextResponse.json(
        { error: 'No puedes retirarte si eres el único responsable. Elimina la tarea en su lugar.' },
        { status: 400 }
      );
    }

    await prisma.taskAssignment.delete({
      where: { id: assignment.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving task:', error);
    return NextResponse.json(
      { error: 'Error al retirarse de la tarea' },
      { status: 500 }
    );
  }
}
