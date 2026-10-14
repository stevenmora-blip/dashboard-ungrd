import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import XLSX from 'xlsx-js-style';

export const dynamic = 'force-dynamic';

// Style constants
const BLUE = '1A365D';
const YELLOW = 'F7B32B';
const GREEN = '10B981';
const AMBER = 'F59E0B';
const LIGHT_BLUE = 'EBF4FF';
const LIGHT_GRAY = 'F8FAFC';
const WHITE = 'FFFFFF';

const headerStyle = {
  font: { bold: true, color: { rgb: WHITE }, sz: 11 },
  fill: { fgColor: { rgb: BLUE } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
  border: {
    top: { style: 'thin' as const, color: { rgb: BLUE } },
    bottom: { style: 'thin' as const, color: { rgb: BLUE } },
  },
};

const titleStyle = {
  font: { bold: true, color: { rgb: WHITE }, sz: 16 },
  fill: { fgColor: { rgb: BLUE } },
  alignment: { horizontal: 'left' as const, vertical: 'center' as const },
};

const subtitleStyle = {
  font: { bold: false, color: { rgb: 'BEE3F8' }, sz: 11 },
  fill: { fgColor: { rgb: BLUE } },
  alignment: { horizontal: 'left' as const },
};

const sectionStyle = {
  font: { bold: true, color: { rgb: BLUE }, sz: 12 },
  fill: { fgColor: { rgb: LIGHT_BLUE } },
  alignment: { horizontal: 'left' as const },
  border: { bottom: { style: 'medium' as const, color: { rgb: YELLOW } } },
};

const labelStyle = {
  font: { bold: true, color: { rgb: '334155' }, sz: 10 },
  fill: { fgColor: { rgb: LIGHT_GRAY } },
  alignment: { horizontal: 'left' as const },
};

const valueStyle = {
  font: { bold: true, color: { rgb: BLUE }, sz: 12 },
  alignment: { horizontal: 'center' as const },
};

const descStyle = {
  font: { color: { rgb: '64748B' }, sz: 9, italic: true },
  alignment: { horizontal: 'left' as const },
};

const cellStyle = {
  font: { sz: 10 },
  alignment: { vertical: 'center' as const, wrapText: true },
  border: {
    bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } },
  },
};

const cellCenterStyle = {
  ...cellStyle,
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
};

const percentStyle = (val: number) => ({
  font: { bold: true, sz: 10, color: { rgb: val >= 75 ? GREEN : val >= 40 ? AMBER : 'EF4444' } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: { bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } } },
});

const statusStyle = (status: string) => {
  const colors: Record<string, { bg: string; fg: string }> = {
    COMPLETADO: { bg: 'D1FAE5', fg: '065F46' },
    EN_PROGRESO: { bg: 'FEF3C7', fg: '92400E' },
    PENDIENTE: { bg: 'F1F5F9', fg: '475569' },
  };
  const c = colors[status] || colors.PENDIENTE;
  return {
    font: { bold: true, sz: 9, color: { rgb: c.fg } },
    fill: { fgColor: { rgb: c.bg } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border: { bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } } },
  };
};

const altRowStyle = {
  ...cellStyle,
  fill: { fgColor: { rgb: 'F8FAFC' } },
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const teamId = searchParams.get('teamId');

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (teamId) where.project = { teamId };

    const [tasks, projects, teams, responsables] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: { include: { team: true } },
          assignments: { include: { responsable: { include: { team: true } } } },
          dailyEntries: { orderBy: { fecha: 'desc' } },
          attachments: { select: { id: true, fileName: true, createdAt: true } },
          subTasks: { select: { id: true, isCompleted: true } },
          progressLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: [{ project: { name: 'asc' } }, { orden: 'asc' }],
      }),
      prisma.project.findMany({
        where: { isActive: true },
        include: { team: true, tasks: { select: { id: true, status: true, progress: true } } },
      }),
      prisma.team.findMany({ where: { isActive: true } }),
      prisma.responsable.findMany({
        where: { isActive: true },
        include: {
          team: true,
          taskAssignments: {
            include: {
              task: {
                include: {
                  project: { select: { name: true } },
                  dailyEntries: { select: { id: true } },
                  attachments: { select: { id: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const wb = XLSX.utils.book_new();
    const sl: Record<string, string> = { PENDIENTE: 'Pendiente', EN_PROGRESO: 'En Progreso', COMPLETADO: 'Completado' };
    const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETADO').length;
    const inProgressTasks = tasks.filter(t => t.status === 'EN_PROGRESO').length;
    const pendingTasks = tasks.filter(t => t.status === 'PENDIENTE').length;
    const avgProgress = totalTasks > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / totalTasks) : 0;
    const totalDailies = tasks.reduce((s, t) => s + t.dailyEntries.length, 0);
    const totalEvidence = tasks.reduce((s, t) => s + t.attachments.length, 0);

    // ========== HOJA 1: RESUMEN EJECUTIVO ==========
    const ws1: any[][] = [
      ['REPORTE GLOBAL — PLAN DE TRABAJO UNGRD', '', ''],
      ['Unidad Nacional para la Gestión del Riesgo de Desastres • SNI', '', ''],
      [`Generado: ${today}`, '', ''],
      ['', '', ''],
      ['INDICADORES PRINCIPALES', '', ''],
      ['Indicador', 'Valor', 'Observación'],
      ['Proyectos Activos', projects.length, 'Proyectos vigentes con tareas'],
      ['Equipos de Trabajo', teams.length, 'Equipos operativos'],
      ['Responsables Activos', responsables.length, 'Personas con asignaciones'],
      ['', '', ''],
      ['MÉTRICAS DE AVANCE', '', ''],
      ['Métrica', 'Cantidad', 'Porcentaje'],
      ['Total Actividades', totalTasks, '100%'],
      ['Completadas', completedTasks, `${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%`],
      ['En Progreso', inProgressTasks, `${totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0}%`],
      ['Pendientes', pendingTasks, `${totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0}%`],
      ['Avance Ponderado Global', `${avgProgress}%`, 'Promedio ponderado de todas las actividades'],
      ['', '', ''],
      ['TRAZABILIDAD', '', ''],
      ['Total Registros Daily', totalDailies, 'Registros de seguimiento diario'],
      ['Total Evidencias', totalEvidence, 'Archivos de soporte cargados'],
    ];
    const sheet1 = XLSX.utils.aoa_to_sheet(ws1);
    sheet1['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 48 }];
    sheet1['!rows'] = [{ hpt: 32 }, { hpt: 20 }, { hpt: 18 }, { hpt: 10 }, { hpt: 26 }, { hpt: 22 }];
    // Apply styles
    const applyCell = (ref: string, style: any) => { if (sheet1[ref]) sheet1[ref].s = style; };
    applyCell('A1', titleStyle); applyCell('B1', titleStyle); applyCell('C1', titleStyle);
    applyCell('A2', subtitleStyle); applyCell('B2', subtitleStyle); applyCell('C2', subtitleStyle);
    applyCell('A3', { ...subtitleStyle, font: { ...subtitleStyle.font, sz: 9 } });
    applyCell('B3', subtitleStyle); applyCell('C3', subtitleStyle);
    applyCell('A5', sectionStyle); applyCell('B5', sectionStyle); applyCell('C5', sectionStyle);
    applyCell('A6', headerStyle); applyCell('B6', headerStyle); applyCell('C6', headerStyle);
    [7, 8, 9].forEach(r => {
      applyCell(`A${r}`, labelStyle); applyCell(`B${r}`, valueStyle); applyCell(`C${r}`, descStyle);
    });
    applyCell('A11', sectionStyle); applyCell('B11', sectionStyle); applyCell('C11', sectionStyle);
    applyCell('A12', headerStyle); applyCell('B12', headerStyle); applyCell('C12', headerStyle);
    [13, 14, 15, 16, 17].forEach(r => {
      applyCell(`A${r}`, labelStyle); applyCell(`B${r}`, valueStyle); applyCell(`C${r}`, descStyle);
    });
    applyCell('A19', sectionStyle); applyCell('B19', sectionStyle); applyCell('C19', sectionStyle);
    [20, 21].forEach(r => {
      applyCell(`A${r}`, labelStyle); applyCell(`B${r}`, valueStyle); applyCell(`C${r}`, descStyle);
    });
    // Merge title
    sheet1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } },
      { s: { r: 10, c: 0 }, e: { r: 10, c: 2 } },
      { s: { r: 18, c: 0 }, e: { r: 18, c: 2 } },
    ];
    XLSX.utils.book_append_sheet(wb, sheet1, 'Resumen Ejecutivo');

    // ========== HOJA 2: AVANCE POR PROYECTO ==========
    const projHeaders = ['Proyecto', 'Equipo', 'Total Actividades', 'Completadas', 'En Progreso', 'Pendientes', 'Avance Promedio (%)', 'Tasa Completitud (%)'];
    const projData = projects.map(p => {
      const pT = p.tasks; const pTot = pT.length;
      const pC = pT.filter(t => t.status === 'COMPLETADO').length;
      const pI = pT.filter(t => t.status === 'EN_PROGRESO').length;
      const pP = pT.filter(t => t.status === 'PENDIENTE').length;
      const pA = pTot > 0 ? Math.round(pT.reduce((s, t) => s + t.progress, 0) / pTot) : 0;
      return [p.name, p.team?.name || 'Sin equipo', pTot, pC, pI, pP, pA, pTot > 0 ? Math.round((pC / pTot) * 100) : 0];
    }).sort((a, b) => (b[6] as number) - (a[6] as number));
    const ws2 = XLSX.utils.aoa_to_sheet([projHeaders, ...projData]);
    ws2['!cols'] = [{ wch: 42 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 20 }];
    // Style headers
    projHeaders.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (ws2[ref]) ws2[ref].s = headerStyle;
    });
    projData.forEach((row, ri) => {
      row.forEach((val, ci) => {
        const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (!ws2[ref]) return;
        if (ci === 6) ws2[ref].s = percentStyle(val as number);
        else if (ci === 0) ws2[ref].s = { ...cellStyle, font: { ...cellStyle.font, bold: true, color: { rgb: BLUE } } };
        else if (ci >= 2) ws2[ref].s = cellCenterStyle;
        else ws2[ref].s = ri % 2 === 0 ? cellStyle : altRowStyle;
      });
    });
    XLSX.utils.book_append_sheet(wb, ws2, 'Avance por Proyecto');

    // ========== HOJA 3: AVANCE POR PERSONA ==========
    const persHeaders = ['Responsable', 'Equipo', 'Proyectos Asignados', 'Total Actividades', 'Completadas', 'En Progreso', 'Pendientes', 'Avance (%)', 'Registros Daily', 'Evidencias', 'Áreas de Enfoque'];
    const persData = responsables.map(r => {
      const rT = r.taskAssignments.map(a => a.task);
      const rTot = rT.length;
      const rC = rT.filter(t => t.status === 'COMPLETADO').length;
      const rI = rT.filter(t => t.status === 'EN_PROGRESO').length;
      const rP = rT.filter(t => t.status === 'PENDIENTE').length;
      const rA = rTot > 0 ? Math.round(rT.reduce((s, t) => s + t.progress, 0) / rTot) : 0;
      const projNames = [...new Set(rT.map(t => t.project.name))].join(', ');
      const focus = rT.filter(t => t.status !== 'COMPLETADO' && t.progress < 50).map(t => t.name).slice(0, 2).join('; ') || 'Sin áreas críticas';
      return [r.name, r.team?.name || 'Sin equipo', projNames, rTot, rC, rI, rP, rA,
        rT.reduce((s, t) => s + t.dailyEntries.length, 0), rT.reduce((s, t) => s + t.attachments.length, 0), focus];
    }).sort((a, b) => (b[7] as number) - (a[7] as number));
    const ws3 = XLSX.utils.aoa_to_sheet([persHeaders, ...persData]);
    ws3['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 38 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 50 }];
    persHeaders.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (ws3[ref]) ws3[ref].s = headerStyle;
    });
    persData.forEach((row, ri) => {
      row.forEach((val, ci) => {
        const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (!ws3[ref]) return;
        if (ci === 7) ws3[ref].s = percentStyle(val as number);
        else if (ci === 0) ws3[ref].s = { ...cellStyle, font: { ...cellStyle.font, bold: true, color: { rgb: BLUE } } };
        else if (ci === 10) ws3[ref].s = { ...cellStyle, font: { sz: 9, italic: true, color: { rgb: '64748B' } } };
        else if (ci >= 3 && ci <= 9) ws3[ref].s = cellCenterStyle;
        else ws3[ref].s = ri % 2 === 0 ? cellStyle : altRowStyle;
      });
    });
    XLSX.utils.book_append_sheet(wb, ws3, 'Avance por Persona');

    // ========== HOJA 4: DETALLE DE ACTIVIDADES ==========
    const taskHeaders = ['#', 'Proyecto', 'Entregable', 'Actividad', 'Responsable(s)', 'Estado', 'Avance (%)', 'Registros Daily', 'Evidencias', 'Impedimentos', 'Último Reporte'];
    const taskData = tasks.map((t, i) => [
      i + 1,
      t.project.name,
      t.entregable || 'Pendiente de definir',
      t.name,
      t.assignments.map(a => a.responsable.name).join(', '),
      sl[t.status] || t.status,
      t.progress,
      t.dailyEntries.length,
      t.attachments.length,
      t.impedimento || '',
      t.dailyEntries[0]?.dailyPresente || '',
    ]);
    const ws4 = XLSX.utils.aoa_to_sheet([taskHeaders, ...taskData]);
    ws4['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 25 }, { wch: 45 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 35 }, { wch: 40 }];
    taskHeaders.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (ws4[ref]) ws4[ref].s = headerStyle;
    });
    taskData.forEach((row, ri) => {
      row.forEach((val, ci) => {
        const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (!ws4[ref]) return;
        if (ci === 5) ws4[ref].s = statusStyle(tasks[ri]?.status || 'PENDIENTE');
        else if (ci === 6) ws4[ref].s = percentStyle(val as number);
        else if (ci === 0 || ci === 7 || ci === 8) ws4[ref].s = cellCenterStyle;
        else ws4[ref].s = ri % 2 === 0 ? cellStyle : altRowStyle;
      });
    });
    XLSX.utils.book_append_sheet(wb, ws4, 'Detalle Actividades');

    // ========== HOJA 5: EVIDENCIAS ==========
    const evRows = tasks.flatMap(t =>
      t.attachments.map(a => [
        t.project.name,
        t.name,
        t.assignments.map(x => x.responsable.name).join(', '),
        a.fileName,
        new Date(a.createdAt).toLocaleDateString('es-CO'),
      ])
    );
    if (evRows.length > 0) {
      const evHeaders = ['Proyecto', 'Actividad', 'Responsable', 'Archivo', 'Fecha de Carga'];
      const ws5 = XLSX.utils.aoa_to_sheet([evHeaders, ...evRows]);
      ws5['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 28 }, { wch: 40 }, { wch: 16 }];
      evHeaders.forEach((_, ci) => {
        const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
        if (ws5[ref]) ws5[ref].s = headerStyle;
      });
      evRows.forEach((row, ri) => {
        row.forEach((_, ci) => {
          const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
          if (ws5[ref]) ws5[ref].s = ri % 2 === 0 ? cellStyle : altRowStyle;
        });
      });
      XLSX.utils.book_append_sheet(wb, ws5, 'Evidencias');
    }

    // ========== HOJA 6: HISTORIAL DAILY ==========
    const dRows = tasks.flatMap(t =>
      t.dailyEntries.map(d => [
        new Date(d.fecha).toLocaleDateString('es-CO'),
        t.project.name,
        t.name,
        t.assignments.map(x => x.responsable.name).join(', '),
        d.dailyPresente || '',
        d.dailyFuturo || '',
        d.impedimento || '',
      ])
    );
    if (dRows.length > 0) {
      const dHeaders = ['Fecha', 'Proyecto', 'Actividad', 'Responsable', 'Lo que se hizo', 'Lo que se hará', 'Impedimentos'];
      const ws6 = XLSX.utils.aoa_to_sheet([dHeaders, ...dRows]);
      ws6['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 40 }, { wch: 28 }, { wch: 45 }, { wch: 45 }, { wch: 35 }];
      dHeaders.forEach((_, ci) => {
        const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
        if (ws6[ref]) ws6[ref].s = headerStyle;
      });
      dRows.forEach((row, ri) => {
        row.forEach((_, ci) => {
          const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
          if (ws6[ref]) ws6[ref].s = ri % 2 === 0 ? cellStyle : altRowStyle;
        });
      });
      XLSX.utils.book_append_sheet(wb, ws6, 'Historial Daily');
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Reporte_Global_UNGRD_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return NextResponse.json({ error: 'Error al exportar a Excel' }, { status: 500 });
  }
}
