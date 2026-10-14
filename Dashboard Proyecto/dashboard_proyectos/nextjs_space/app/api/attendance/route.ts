export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET: Fetch attendance for a week (or month)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate y endDate requeridos' }, { status: 400 });
    }

    const entries = await prisma.attendanceEntry.findMany({
      where: {
        fecha: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, responsable: { select: { name: true } } },
        },
      },
      orderBy: [{ fecha: 'asc' }, { user: { name: 'asc' } }],
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Create or update attendance entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { fecha, manana, tarde, nota } = body;

    if (!fecha) {
      return NextResponse.json({ error: 'fecha requerida' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const dateObj = new Date(fecha + 'T00:00:00.000Z');

    const entry = await prisma.attendanceEntry.upsert({
      where: {
        userId_fecha: { userId, fecha: dateObj },
      },
      update: {
        manana: manana ?? false,
        tarde: tarde ?? false,
        nota: nota || null,
      },
      create: {
        userId,
        fecha: dateObj,
        manana: manana ?? false,
        tarde: tarde ?? false,
        nota: nota || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, responsable: { select: { name: true } } },
        },
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error saving attendance:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
