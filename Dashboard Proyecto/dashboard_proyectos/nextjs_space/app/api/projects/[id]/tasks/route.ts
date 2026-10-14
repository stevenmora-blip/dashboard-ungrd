import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: List all tasks in a project (for joining purposes)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: params.id },
      include: {
        assignments: {
          include: { responsable: { select: { id: true, name: true } } },
        },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ orden: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    return NextResponse.json(
      { error: 'Error al obtener tareas del proyecto' },
      { status: 500 }
    );
  }
}
