import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const area = searchParams.get('area');

    const where: any = {};
    if (estado) where.estado = estado;
    if (area) where.area = area;

    const actas = await prisma.acta.findMany({
      where,
      include: {
        compromisos: true,
        attachments: {
          select: {
            id: true,
            fileName: true,
            cloudStoragePath: true,
          }
        }
      },
      orderBy: { fecha: 'desc' },
    });

    // Calcular métricas
    const total = actas.length;
    const cerradas = actas.filter(a => a.estado === 'CERRADA').length;
    const activas = actas.filter(a => a.estado === 'ACTIVA').length;
    const totalCompromisos = actas.reduce((sum, a) => sum + a.compromisos.length, 0);
    const compromisosCumplidos = actas.reduce(
      (sum, a) => sum + a.compromisos.filter(c => c.cumplido).length, 
      0
    );
    const avanceGlobal = totalCompromisos > 0 
      ? Math.round((compromisosCumplidos / totalCompromisos) * 100) 
      : 0;

    // Agrupar por área
    const porArea: Record<string, number> = {};
    actas.forEach(a => {
      porArea[a.area] = (porArea[a.area] || 0) + 1;
    });

    // Agrupar por proyecto
    const porProyecto: Record<string, number> = {};
    actas.forEach(a => {
      porProyecto[a.proyecto] = (porProyecto[a.proyecto] || 0) + 1;
    });

    return NextResponse.json({
      actas,
      metrics: {
        total,
        cerradas,
        activas,
        totalCompromisos,
        compromisosCumplidos,
        avanceGlobal,
        porArea,
        porProyecto,
      },
    });
  } catch (error) {
    console.error('Error fetching actas:', error);
    return NextResponse.json(
      { error: 'Error al obtener actas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
      compromisos,
    } = body;

    if (!numero || !area || !fecha || !proyecto || !responsables) {
      return NextResponse.json(
        { error: 'Campos requeridos: numero, area, fecha, proyecto, responsables' },
        { status: 400 }
      );
    }

    const acta = await prisma.acta.create({
      data: {
        numero,
        area,
        fecha: new Date(fecha),
        proyecto,
        descripcion,
        responsables,
        estado: estado || 'ACTIVA',
        createdById: (session.user as any).id,
        compromisos: compromisos && compromisos.length > 0 ? {
          create: compromisos.map((c: any) => ({
            descripcion: c.descripcion,
            responsable: c.responsable,
            fechaLimite: c.fechaLimite ? new Date(c.fechaLimite) : null,
          })),
        } : undefined,
      },
      include: {
        compromisos: true,
      },
    });

    return NextResponse.json(acta, { status: 201 });
  } catch (error: any) {
    console.error('Error creating acta:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un acta con ese número' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear acta' },
      { status: 500 }
    );
  }
}
