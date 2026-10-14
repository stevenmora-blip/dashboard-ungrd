import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    const { descripcion, responsable, fechaLimite } = body;

    if (!descripcion || !responsable) {
      return NextResponse.json(
        { error: 'Campos requeridos: descripcion, responsable' },
        { status: 400 }
      );
    }

    const compromiso = await prisma.compromiso.create({
      data: {
        actaId: params.id,
        descripcion,
        responsable,
        fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
      },
    });

    return NextResponse.json(compromiso, { status: 201 });
  } catch (error) {
    console.error('Error creating compromiso:', error);
    return NextResponse.json(
      { error: 'Error al crear compromiso' },
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
    const { compromisoId, cumplido, observaciones } = body;

    if (!compromisoId) {
      return NextResponse.json(
        { error: 'compromisoId requerido' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (cumplido !== undefined) {
      updateData.cumplido = cumplido;
      if (cumplido) {
        updateData.fechaCumplimiento = new Date();
      } else {
        updateData.fechaCumplimiento = null;
      }
    }
    if (observaciones !== undefined) updateData.observaciones = observaciones;

    const compromiso = await prisma.compromiso.update({
      where: { id: compromisoId },
      data: updateData,
    });

    // Verificar si todos los compromisos del acta están cumplidos
    const acta = await prisma.acta.findUnique({
      where: { id: params.id },
      include: { compromisos: true },
    });

    if (acta) {
      const todosCumplidos = acta.compromisos.every(c => c.cumplido);
      if (todosCumplidos && acta.compromisos.length > 0) {
        await prisma.acta.update({
          where: { id: params.id },
          data: { estado: 'CERRADA', fechaCierre: new Date() },
        });
      }
    }

    return NextResponse.json(compromiso);
  } catch (error) {
    console.error('Error updating compromiso:', error);
    return NextResponse.json(
      { error: 'Error al actualizar compromiso' },
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

    const { searchParams } = new URL(request.url);
    const compromisoId = searchParams.get('compromisoId');

    if (!compromisoId) {
      return NextResponse.json(
        { error: 'compromisoId requerido' },
        { status: 400 }
      );
    }

    await prisma.compromiso.delete({
      where: { id: compromisoId },
    });

    return NextResponse.json({ message: 'Compromiso eliminado' });
  } catch (error) {
    console.error('Error deleting compromiso:', error);
    return NextResponse.json(
      { error: 'Error al eliminar compromiso' },
      { status: 500 }
    );
  }
}
