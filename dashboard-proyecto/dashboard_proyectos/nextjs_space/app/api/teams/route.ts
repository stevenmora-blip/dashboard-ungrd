import { NextRequest, NextResponse } from 'next/server';
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
        members: {
          include: {
            _count: { select: { taskAssignments: true } }
          }
        },
        _count: { select: { members: true } }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Error al obtener equipos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    const team = await prisma.team.create({
      data: { name, description, color }
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Error al crear equipo' }, { status: 500 });
  }
}
