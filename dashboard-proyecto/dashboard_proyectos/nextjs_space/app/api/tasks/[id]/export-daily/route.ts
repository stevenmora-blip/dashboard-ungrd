import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';

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

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        project: { include: { team: true } },
        assignments: { include: { responsable: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // Crear datos del daily
    const dailyData = [
      {
        'Fecha': dateStr,
        'Proyecto': task.project.name,
        'Equipo': task.project.team?.name || 'Sin equipo',
        'Entregable': task.entregable || 'N/A',
        'Actividad': task.name,
        'Responsable(s)': task.assignments.map(a => a.responsable.name).join(', ') || 'Sin asignar',
        'Estado': task.status,
        'Progreso (%)': task.progress,
        'Lo que se hizo (Ayer/Presente)': task.dailyPresente || '',
        'Lo que se hará (Mañana/Futuro)': task.dailyFuturo || '',
        'Impedimentos': task.impedimento || 'Sin impedimentos',
        'Comentarios': task.comments || '',
      },
    ];

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dailyData);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 12 },  // Fecha
      { wch: 15 },  // Proyecto
      { wch: 18 },  // Equipo
      { wch: 30 },  // Entregable
      { wch: 50 },  // Actividad
      { wch: 25 },  // Responsable
      { wch: 12 },  // Estado
      { wch: 10 },  // Progreso
      { wch: 40 },  // Presente
      { wch: 40 },  // Futuro
      { wch: 30 },  // Impedimentos
      { wch: 30 },  // Comentarios
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Daily');

    // Generar archivo
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `Daily_${task.project.name}_${dateStr.replace(/\//g, '-')}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting daily:', error);
    return NextResponse.json(
      { error: 'Error al exportar daily' },
      { status: 500 }
    );
  }
}
