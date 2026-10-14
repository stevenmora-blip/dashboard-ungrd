import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import XLSX from 'xlsx-js-style';

export const dynamic = 'force-dynamic';

const BLUE = '1A365D';
const YELLOW = 'F7B32B';
const WHITE = 'FFFFFF';
const LIGHT_BLUE = 'EBF4FF';
const LIGHT_GRAY = 'F8FAFC';
const GREEN = '10B981';
const AMBER = 'F59E0B';

const hdr = {
  font: { bold: true, color: { rgb: WHITE }, sz: 11 },
  fill: { fgColor: { rgb: BLUE } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
  border: { bottom: { style: 'thin' as const, color: { rgb: BLUE } } },
};
const ttl = {
  font: { bold: true, color: { rgb: WHITE }, sz: 15 },
  fill: { fgColor: { rgb: BLUE } },
  alignment: { horizontal: 'left' as const, vertical: 'center' as const },
};
const sub = {
  font: { color: { rgb: 'BEE3F8' }, sz: 10 },
  fill: { fgColor: { rgb: BLUE } },
  alignment: { horizontal: 'left' as const },
};
const sec = {
  font: { bold: true, color: { rgb: BLUE }, sz: 12 },
  fill: { fgColor: { rgb: LIGHT_BLUE } },
  border: { bottom: { style: 'medium' as const, color: { rgb: YELLOW } } },
};
const lbl = {
  font: { bold: true, color: { rgb: '334155' }, sz: 10 },
  fill: { fgColor: { rgb: LIGHT_GRAY } },
};
const val = { font: { bold: true, color: { rgb: BLUE }, sz: 12 }, alignment: { horizontal: 'center' as const } };
const desc = { font: { color: { rgb: '64748B' }, sz: 9, italic: true } };
const cell = {
  font: { sz: 10 },
  alignment: { vertical: 'center' as const, wrapText: true },
  border: { bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } } },
};
const cellC = { ...cell, alignment: { horizontal: 'center' as const, vertical: 'center' as const } };
const altRow = { ...cell, fill: { fgColor: { rgb: LIGHT_GRAY } } };
const pct = (v: number) => ({
  font: { bold: true, sz: 10, color: { rgb: v >= 75 ? GREEN : v >= 40 ? AMBER : 'EF4444' } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  border: { bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } } },
});
const sts = (s: string) => {
  const c: Record<string, { bg: string; fg: string }> = {
    COMPLETADO: { bg: 'D1FAE5', fg: '065F46' },
    EN_PROGRESO: { bg: 'FEF3C7', fg: '92400E' },
    PENDIENTE: { bg: 'F1F5F9', fg: '475569' },
  };
  const x = c[s] || c.PENDIENTE;
  return {
    font: { bold: true, sz: 9, color: { rgb: x.fg } },
    fill: { fgColor: { rgb: x.bg } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border: { bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } } },
  };
};

const applyS = (ws: any, ref: string, s: any) => { if (ws[ref]) ws[ref].s = s; };

export async function GET(
  req: NextRequest,
  { params: pendingParams }: { params: Promise<{ id: string }> }
) {
  const params = await pendingParams;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const responsable = await prisma.responsable.findUnique({
      where: { id: params.id },
      include: {
        team: true,
        taskAssignments: {
          include: {
            task: {
              include: {
                project: { select: { name: true, color: true } },
                dailyEntries: { orderBy: { fecha: 'desc' } },
                attachments: { select: { id: true, fileName: true, createdAt: true, fileSize: true } },
                subTasks: { select: { id: true, name: true, isCompleted: true } },
                progressLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
              },
            },
          },
        },
      },
    });

    if (!responsable) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const tasks = responsable.taskAssignments.map((a) => a.task);
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'COMPLETADO').length;
    const inProgress = tasks.filter((t) => t.status === 'EN_PROGRESO').length;
    const pending = tasks.filter((t) => t.status === 'PENDIENTE').length;
    const avgProgress = total > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / total) : 0;
    const totalDailies = tasks.reduce((sum, t) => sum + t.dailyEntries.length, 0);
    const totalAttachments = tasks.reduce((sum, t) => sum + t.attachments.length, 0);
    const projectNames = [...new Set(tasks.map(t => t.project.name))];
    const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const sl: Record<string, string> = { PENDIENTE: 'Pendiente', EN_PROGRESO: 'En Progreso', COMPLETADO: 'Completado' };
    const focusAreas = tasks.filter(t => t.status !== 'COMPLETADO' && t.progress < 50).sort((a, b) => a.progress - b.progress);

    const wb = XLSX.utils.book_new();

    // ===== HOJA 1: RESUMEN EJECUTIVO =====
    const d1: any[][] = [
      [`REPORTE INDIVIDUAL \u2014 ${responsable.name.toUpperCase()}`, '', ''],
      [`${responsable.team?.name || 'Sin equipo'} \u2022 Plan de Trabajo SNI-UNGRD`, '', ''],
      [`Generado: ${today}`, '', ''],
      ['', '', ''],
      ['DATOS DEL RESPONSABLE', '', ''],
      ['Campo', 'Valor', ''],
      ['Nombre Completo', responsable.name, ''],
      ['Equipo de Trabajo', responsable.team?.name || 'Sin equipo', ''],
      ['Proyectos Asignados', projectNames.join(', '), ''],
      ['', '', ''],
      ['INDICADORES DE DESEMPE\u00d1O', '', ''],
      ['M\u00e9trica', 'Valor', 'Observaci\u00f3n'],
      ['Avance Promedio', `${avgProgress}%`, avgProgress >= 50 ? 'Buen ritmo de avance' : 'Requiere atenci\u00f3n'],
      ['Tasa de Completitud', `${total > 0 ? Math.round((completed / total) * 100) : 0}%`, `${completed} de ${total} finalizadas`],
      ['', '', ''],
      ['DISTRIBUCI\u00d3N DE ACTIVIDADES', '', ''],
      ['Estado', 'Cantidad', 'Porcentaje'],
      ['Total Asignadas', total, '100%'],
      ['Completadas', completed, `${total > 0 ? Math.round((completed / total) * 100) : 0}%`],
      ['En Progreso', inProgress, `${total > 0 ? Math.round((inProgress / total) * 100) : 0}%`],
      ['Pendientes', pending, `${total > 0 ? Math.round((pending / total) * 100) : 0}%`],
      ['', '', ''],
      ['TRAZABILIDAD', '', ''],
      ['M\u00e9trica', 'Valor', 'Detalle'],
      ['Registros Daily', totalDailies, 'Seguimiento diario registrado'],
      ['Evidencias Cargadas', totalAttachments, 'Documentos de soporte'],
      ['', '', ''],
      ['\u00c1REAS DE ENFOQUE (< 50% avance)', '', ''],
      ['Actividad', 'Proyecto', 'Avance'],
      ...focusAreas.map(f => [f.name, f.project.name, `${f.progress}%`]),
      ...(focusAreas.length === 0 ? [['Todas las actividades superan el 50%', '', '']] : []),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(d1);
    ws1['!cols'] = [{ wch: 40 }, { wch: 28 }, { wch: 45 }];
    ws1['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 18 }];
    ws1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } },
      { s: { r: 10, c: 0 }, e: { r: 10, c: 2 } },
      { s: { r: 15, c: 0 }, e: { r: 15, c: 2 } },
      { s: { r: 22, c: 0 }, e: { r: 22, c: 2 } },
      { s: { r: 27, c: 0 }, e: { r: 27, c: 2 } },
    ];
    // Styles
    for (let c = 0; c < 3; c++) {
      applyS(ws1, XLSX.utils.encode_cell({ r: 0, c }), ttl);
      applyS(ws1, XLSX.utils.encode_cell({ r: 1, c }), sub);
      applyS(ws1, XLSX.utils.encode_cell({ r: 2, c }), { ...sub, font: { ...sub.font, sz: 9 } });
    }
    [4, 10, 15, 22, 27].forEach(r => {
      for (let c = 0; c < 3; c++) applyS(ws1, XLSX.utils.encode_cell({ r, c }), sec);
    });
    [5, 11, 16, 23, 28].forEach(r => {
      for (let c = 0; c < 3; c++) applyS(ws1, XLSX.utils.encode_cell({ r, c }), hdr);
    });
    [6, 7, 8, 12, 13, 17, 18, 19, 20, 24, 25].forEach(r => {
      applyS(ws1, XLSX.utils.encode_cell({ r, c: 0 }), lbl);
      applyS(ws1, XLSX.utils.encode_cell({ r, c: 1 }), val);
      applyS(ws1, XLSX.utils.encode_cell({ r, c: 2 }), desc);
    });
    // Focus area rows
    for (let ri = 29; ri < 29 + focusAreas.length; ri++) {
      applyS(ws1, XLSX.utils.encode_cell({ r: ri, c: 0 }), cell);
      applyS(ws1, XLSX.utils.encode_cell({ r: ri, c: 1 }), cell);
      applyS(ws1, XLSX.utils.encode_cell({ r: ri, c: 2 }), pct(focusAreas[ri - 29]?.progress ?? 0));
    }
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Ejecutivo');

    // ===== HOJA 2: AVANCE POR PROYECTO =====
    const pGroups: Record<string, typeof tasks> = {};
    tasks.forEach(t => { const n = t.project.name; if (!pGroups[n]) pGroups[n] = []; pGroups[n].push(t); });
    const pHeaders = ['Proyecto', 'Actividades', 'Completadas', 'En Progreso', 'Pendientes', 'Avance (%)', 'Dailies', 'Evidencias'];
    const pData = Object.entries(pGroups).map(([n, ts]) => {
      const tot = ts.length; const co = ts.filter(t => t.status === 'COMPLETADO').length;
      const ip = ts.filter(t => t.status === 'EN_PROGRESO').length; const pe = ts.filter(t => t.status === 'PENDIENTE').length;
      const av = tot > 0 ? Math.round(ts.reduce((s, t) => s + t.progress, 0) / tot) : 0;
      return [n, tot, co, ip, pe, av, ts.reduce((s, t) => s + t.dailyEntries.length, 0), ts.reduce((s, t) => s + t.attachments.length, 0)];
    }).sort((a, b) => (b[5] as number) - (a[5] as number));
    const ws2 = XLSX.utils.aoa_to_sheet([pHeaders, ...pData]);
    ws2['!cols'] = [{ wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
    pHeaders.forEach((_, ci) => applyS(ws2, XLSX.utils.encode_cell({ r: 0, c: ci }), hdr));
    pData.forEach((row, ri) => {
      row.forEach((v, ci) => {
        const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (!ws2[ref]) return;
        if (ci === 5) ws2[ref].s = pct(v as number);
        else if (ci === 0) ws2[ref].s = { ...cell, font: { ...cell.font, bold: true, color: { rgb: BLUE } } };
        else if (ci >= 1) ws2[ref].s = cellC;
        else ws2[ref].s = ri % 2 === 0 ? cell : altRow;
      });
    });
    XLSX.utils.book_append_sheet(wb, ws2, 'Avance por Proyecto');

    // ===== HOJA 3: DETALLE DE ACTIVIDADES =====
    const tHeaders = ['#', 'Proyecto', 'Actividad', 'Entregable', 'Estado', 'Avance (%)', 'Dailies', 'Evidencias', 'Impedimentos'];
    const tData = tasks.map((t, i) => [
      i + 1, t.project.name, t.name, t.entregable || 'Pendiente de definir',
      sl[t.status] || t.status, t.progress, t.dailyEntries.length, t.attachments.length, t.impedimento || '',
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([tHeaders, ...tData]);
    ws3['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 45 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 35 }];
    tHeaders.forEach((_, ci) => applyS(ws3, XLSX.utils.encode_cell({ r: 0, c: ci }), hdr));
    tData.forEach((row, ri) => {
      row.forEach((v, ci) => {
        const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (!ws3[ref]) return;
        if (ci === 4) ws3[ref].s = sts(tasks[ri]?.status || 'PENDIENTE');
        else if (ci === 5) ws3[ref].s = pct(v as number);
        else if (ci === 0 || ci === 6 || ci === 7) ws3[ref].s = cellC;
        else ws3[ref].s = ri % 2 === 0 ? cell : altRow;
      });
    });
    XLSX.utils.book_append_sheet(wb, ws3, 'Detalle Actividades');

    // ===== HOJA 4: EVIDENCIAS =====
    const evData = tasks.flatMap(t => t.attachments.map(a => [
      t.project.name, t.name, a.fileName,
      a.fileSize ? `${Math.round(a.fileSize / 1024)} KB` : 'N/A',
      new Date(a.createdAt).toLocaleDateString('es-CO'),
    ]));
    if (evData.length > 0) {
      const evH = ['Proyecto', 'Actividad', 'Archivo', 'Tama\u00f1o', 'Fecha de Carga'];
      const ws4 = XLSX.utils.aoa_to_sheet([evH, ...evData]);
      ws4['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 40 }, { wch: 12 }, { wch: 16 }];
      evH.forEach((_, ci) => applyS(ws4, XLSX.utils.encode_cell({ r: 0, c: ci }), hdr));
      evData.forEach((_, ri) => {
        for (let ci = 0; ci < 5; ci++) {
          const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
          if (ws4[ref]) ws4[ref].s = ri % 2 === 0 ? cell : altRow;
        }
      });
      XLSX.utils.book_append_sheet(wb, ws4, 'Evidencias');
    }

    // ===== HOJA 5: HISTORIAL DAILY =====
    const dlData = tasks.flatMap(t => t.dailyEntries.map(d => [
      new Date(d.fecha).toLocaleDateString('es-CO'), t.project.name, t.name,
      d.dailyPresente || '', d.dailyFuturo || '', d.impedimento || '',
    ]));
    if (dlData.length > 0) {
      const dlH = ['Fecha', 'Proyecto', 'Actividad', 'Lo que se hizo', 'Lo que se har\u00e1', 'Impedimentos'];
      const ws5 = XLSX.utils.aoa_to_sheet([dlH, ...dlData]);
      ws5['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 40 }, { wch: 45 }, { wch: 45 }, { wch: 35 }];
      dlH.forEach((_, ci) => applyS(ws5, XLSX.utils.encode_cell({ r: 0, c: ci }), hdr));
      dlData.forEach((_, ri) => {
        for (let ci = 0; ci < 6; ci++) {
          const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
          if (ws5[ref]) ws5[ref].s = ri % 2 === 0 ? cell : altRow;
        }
      });
      XLSX.utils.book_append_sheet(wb, ws5, 'Historial Daily');
    }

    // ===== HOJA 6: HISTORIAL DE PROGRESO =====
    const prData = tasks.flatMap(t => t.progressLogs.map(l => [
      new Date(l.createdAt).toLocaleDateString('es-CO'), t.name, t.project.name,
      l.oldProgress, l.newProgress, l.newProgress - l.oldProgress,
    ])).sort((a, b) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());
    if (prData.length > 0) {
      const prH = ['Fecha', 'Actividad', 'Proyecto', 'Antes (%)', 'Despu\u00e9s (%)', 'Cambio (pp)'];
      const ws6 = XLSX.utils.aoa_to_sheet([prH, ...prData]);
      ws6['!cols'] = [{ wch: 14 }, { wch: 42 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
      prH.forEach((_, ci) => applyS(ws6, XLSX.utils.encode_cell({ r: 0, c: ci }), hdr));
      prData.forEach((row, ri) => {
        row.forEach((v, ci) => {
          const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
          if (!ws6[ref]) return;
          if (ci === 5) {
            const delta = v as number;
            ws6[ref].s = { font: { bold: true, sz: 10, color: { rgb: delta > 0 ? GREEN : 'EF4444' } }, alignment: { horizontal: 'center' as const }, border: { bottom: { style: 'thin' as const, color: { rgb: 'E2E8F0' } } } };
          } else if (ci >= 3) ws6[ref].s = cellC;
          else ws6[ref].s = ri % 2 === 0 ? cell : altRow;
        });
      });
      XLSX.utils.book_append_sheet(wb, ws6, 'Historial Progreso');
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeName = responsable.name.replace(/[^a-zA-Z0-9\u00e1\u00e9\u00ed\u00f3\u00fa\u00c1\u00c9\u00cd\u00d3\u00da\u00f1\u00d1 ]/g, '').replace(/\s+/g, '_');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Reporte_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating person report:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}
