import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';
import { DailyEntry, Task, Project, Team, User, TaskAssignment, Responsable } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const projectId = searchParams.get('projectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Construir filtros
    const whereClause: any = {};
    
    if (taskId) {
      whereClause.taskId = taskId;
    }

    if (projectId) {
      whereClause.task = { projectId };
    }

    // Filtro de fechas
    if (startDate || endDate) {
      whereClause.fecha = {};
      if (startDate) {
        whereClause.fecha.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.fecha.lte = end;
      }
    }

    // Obtener todas las entradas de daily
    const dailyEntries = await prisma.dailyEntry.findMany({
      where: whereClause,
      include: {
        task: {
          include: {
            project: {
              include: {
                team: true
              }
            },
            assignments: {
              include: {
                responsable: true
              }
            }
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { fecha: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Formatear datos para Excel
    type DailyEntryWithRelations = DailyEntry & {
      task: Task & {
        project: Project & { team: Team | null };
        assignments: (TaskAssignment & { responsable: Responsable })[];
      };
      user: Pick<User, 'name' | 'email'> | null;
    };

    const excelData = (dailyEntries as DailyEntryWithRelations[]).map((entry: DailyEntryWithRelations, index: number) => {
      const responsables = entry.task.assignments
        .map((a: TaskAssignment & { responsable: Responsable }) => a.responsable.name)
        .join(', ');

      return {
        'No.': index + 1,
        'Fecha': new Date(entry.fecha).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        'Registrado Por': entry.userName || entry.user?.name || entry.user?.email || 'N/A',
        'Proyecto': entry.task.project.name,
        'Equipo': entry.task.project.team?.name || 'Sin equipo',
        'Entregable': entry.task.entregable || 'N/A',
        'Actividad': entry.task.name,
        'Responsable(s)': responsables || 'Sin asignar',
        'Estado': entry.task.status === 'COMPLETADO' ? 'Completado' :
                  entry.task.status === 'EN_PROGRESO' ? 'En Progreso' : 'Pendiente',
        'Progreso (%)': entry.task.progress,
        'Lo que se hizo (Presente)': entry.dailyPresente || '',
        'Lo que se hará (Futuro)': entry.dailyFuturo || '',
        'Impedimentos': entry.impedimento || '',
      };
    });

    // Si no hay datos, agregar fila informativa
    if (excelData.length === 0) {
      excelData.push({
        'No.': 1,
        'Fecha': 'Sin registros',
        'Registrado Por': '',
        'Proyecto': '',
        'Equipo': '',
        'Entregable': '',
        'Actividad': 'No hay entradas de daily registradas',
        'Responsable(s)': '',
        'Estado': '',
        'Progreso (%)': 0,
        'Lo que se hizo (Presente)': '',
        'Lo que se hará (Futuro)': '',
        'Impedimentos': '',
      });
    }

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 5 },   // No.
      { wch: 20 },  // Fecha
      { wch: 20 },  // Registrado Por
      { wch: 25 },  // Proyecto
      { wch: 15 },  // Equipo
      { wch: 25 },  // Entregable
      { wch: 40 },  // Actividad
      { wch: 25 },  // Responsables
      { wch: 12 },  // Estado
      { wch: 12 },  // Progreso
      { wch: 50 },  // Lo que se hizo
      { wch: 50 },  // Lo que se hará
      { wch: 50 },  // Impedimentos
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Historial Daily');

    // Crear hoja de resumen
    const summaryData = [
      { 'Campo': 'Total de Registros', 'Valor': dailyEntries.length },
      { 'Campo': 'Fecha de Exportación', 'Valor': new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })},
      { 'Campo': 'Rango de Fechas', 'Valor': dailyEntries.length > 0 
        ? `${new Date(dailyEntries[dailyEntries.length - 1].fecha).toLocaleDateString('es-CO')} - ${new Date(dailyEntries[0].fecha).toLocaleDateString('es-CO')}`
        : 'N/A'
      },
      { 'Campo': 'Exportado Por', 'Valor': session.user.name || session.user.email || 'Usuario' },
    ];

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    // Generar archivo
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const today = new Date().toISOString().split('T')[0];
    const filename = taskId 
      ? `daily-tarea-${taskId.substring(0, 8)}-${today}.xlsx`
      : `historial-daily-completo-${today}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
  } catch (error) {
    console.error('Error exporting daily history:', error);
    return NextResponse.json(
      { error: 'Error al exportar historial de daily' },
      { status: 500 }
    );
  }
}
