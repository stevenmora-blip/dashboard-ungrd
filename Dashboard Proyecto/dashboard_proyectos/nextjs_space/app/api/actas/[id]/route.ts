import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

    const acta = await prisma.acta.findUnique({
      where: { id: params.id },
      include: {
        compromisos: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!acta) {
      return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });
    }

    return NextResponse.json(acta);
  } catch (error) {
    console.error('Error fetching acta:', error);
    return NextResponse.json(
      { error: 'Error al obtener acta' },
      { status: 500 }
    );
  }
}

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
    const {
      numero,
      area,
      fecha,
      proyecto,
      descripcion,
      responsables,
      estado,
      observaciones,
    } = body;

    const updateData: any = {};
    if (numero !== undefined) updateData.numero = numero;
    if (area !== undefined) updateData.area = area;
    if (fecha !== undefined) updateData.fecha = new Date(fecha);
    if (proyecto !== undefined) updateData.proyecto = proyecto;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (responsables !== undefined) updateData.responsables = responsables;
    if (observaciones !== undefined) updateData.observaciones = observaciones;
    if (estado !== undefined) {
      updateData.estado = estado;
      if (estado === 'CERRADA') {
        updateData.fechaCierre = new Date();
      }
    }

    const acta = await prisma.acta.update({
      where: { id: params.id },
      data: updateData,
      include: {
        compromisos: true,
      },
    });

    return NextResponse.json(acta);
  } catch (error) {
    console.error('Error updating acta:', error);
    return NextResponse.json(
      { error: 'Error al actualizar acta' },
      { status: 500 }
    );
  }
}

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

    const isAdmin = (session.user as any).role === 'ADMIN';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Solo administradores pueden eliminar actas' },
        { status: 403 }
      );
    }

    await prisma.acta.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Acta eliminada' });
  } catch (error) {
    console.error('Error deleting acta:', error);
    return NextResponse.json(
      { error: 'Error al eliminar acta' },
      { status: 500 }
    );
  }
}
