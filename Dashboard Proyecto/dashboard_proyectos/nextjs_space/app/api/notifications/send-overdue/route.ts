import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Get tasks that are pending or in progress
    const tasks = await prisma.task.findMany({
      where: {
        status: { in: ['PENDIENTE', 'EN_PROGRESO'] },
      },
      include: {
        project: true,
        assignments: { include: { responsable: true } },
      },
    });

    // Group by status
    const pendingTasks = tasks.filter((t) => t.status === 'PENDIENTE');
    const inProgressTasks = tasks.filter((t) => t.status === 'EN_PROGRESO');

    const summary = {
      total: tasks.length,
      pending: pendingTasks.length,
      inProgress: inProgressTasks.length,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      summary,
      message: 'Resumen de tareas generado',
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Error al enviar notificación' },
      { status: 500 }
    );
  }
}
