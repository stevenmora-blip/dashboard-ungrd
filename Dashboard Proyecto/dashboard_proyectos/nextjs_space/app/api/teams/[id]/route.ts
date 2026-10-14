import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params: pendingParams }: { params: Promise<{ id: string }> }) {
  const params = await pendingParams;
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, memberIds } = body;

    // Update team
    const team = await prisma.team.update({
      where: { id: params.id },
      data: { name, description, color }
    });

    // Update members if provided
    if (memberIds && Array.isArray(memberIds)) {
      // Remove team from all current members
      await prisma.responsable.updateMany({
        where: { teamId: params.id },
        data: { teamId: null }
      });

      // Add team to new members
      await prisma.responsable.updateMany({
        where: { id: { in: memberIds } },
        data: { teamId: params.id }
      });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Error al actualizar equipo' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params: pendingParams }: { params: Promise<{ id: string }> }) {
  const params = await pendingParams;
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Remove team from members first
    await prisma.responsable.updateMany({
      where: { teamId: params.id },
      data: { teamId: null }
    });

    // Delete team
    await prisma.team.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Error al eliminar equipo' }, { status: 500 });
  }
}
