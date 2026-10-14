import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Obtener todas las entradas de daily de una tarea (historial completo)
export async function GET(
  request: NextRequest,
  { params: pendingParams }: { params: Promise<{ id: string }> }
) {
  const params = await pendingParams;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const taskId = params.id;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Construir filtro de fecha si se proporcionan
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const dailyEntries = await prisma.dailyEntry.findMany({
      where: {
        taskId,
        ...(Object.keys(dateFilter).length > 0 && { fecha: dateFilter })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    return NextResponse.json({
      entries: dailyEntries,
      total: dailyEntries.length
    });
  } catch (error) {
    console.error('Error fetching daily entries:', error);
    return NextResponse.json(
      { error: 'Error al obtener entradas de daily' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva entrada de daily (NUNCA SE BORRA)
export async function POST(
  request: NextRequest,
  { params: pendingParams }: { params: Promise<{ id: string }> }
) {
  const params = await pendingParams;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const taskId = params.id;
    const body = await request.json();
    const { impedimento, dailyPresente, dailyFuturo } = body;

    // Verificar que al menos un campo tenga contenido
    if (!impedimento && !dailyPresente && !dailyFuturo) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos un campo del daily' },
        { status: 400 }
      );
    }

    // Verificar que la tarea existe
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: true }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      );
    }

    // Obtener información del usuario
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Crear la entrada de daily (almacenamiento permanente)
    const dailyEntry = await prisma.dailyEntry.create({
      data: {
        taskId,
        userId: userId,
        userName: user?.name || session.user.name || session.user.email || 'Usuario',
        impedimento: impedimento || null,
        dailyPresente: dailyPresente || null,
        dailyFuturo: dailyFuturo || null,
        fecha: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // También actualizar los campos en la tarea para mostrar el último daily
    await prisma.task.update({
      where: { id: taskId },
      data: {
        impedimento: impedimento || task.impedimento,
        dailyPresente: dailyPresente || task.dailyPresente,
        dailyFuturo: dailyFuturo || task.dailyFuturo
      }
    });

    return NextResponse.json({
      message: 'Daily registrado exitosamente',
      entry: dailyEntry
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating daily entry:', error);
    return NextResponse.json(
      { error: 'Error al registrar el daily' },
      { status: 500 }
    );
  }
}
