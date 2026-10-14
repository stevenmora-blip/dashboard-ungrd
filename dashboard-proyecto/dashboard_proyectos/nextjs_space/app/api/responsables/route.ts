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

    const responsables = await prisma.responsable.findMany({
      where: { isActive: true },
      include: {
        team: true,
        _count: {
          select: { taskAssignments: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(responsables);
  } catch (error) {
    console.error('Error fetching responsables:', error);
    return NextResponse.json(
      { error: 'Error al obtener responsables' },
      { status: 500 }
    );
  }
}
