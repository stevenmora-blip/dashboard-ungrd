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

    const [projects, tasks, teams, responsables] = await Promise.all([
      prisma.project.findMany({
        where: { isActive: true },
        include: { team: true, tasks: { select: { id: true, status: true, progress: true } } },
      }),
      prisma.task.findMany({
        include: {
          project: { include: { team: true } },
          assignments: { include: { responsable: { include: { team: true } } } },
          dailyEntries: { select: { id: true } },
          attachments: { select: { id: true } },
        },
        orderBy: [{ project: { name: 'asc' } }, { orden: 'asc' }],
      }),
      prisma.team.findMany({ where: { isActive: true } }),
      prisma.responsable.findMany({
        where: { isActive: true },
        include: {
          team: true,
          taskAssignments: {
            include: {
              task: {
                select: { id: true, name: true, status: true, progress: true,
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

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETADO').length;
    const inProgressTasks = tasks.filter(t => t.status === 'EN_PROGRESO').length;
    const pendingTasks = tasks.filter(t => t.status === 'PENDIENTE').length;
    const avgProgress = totalTasks > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / totalTasks) : 0;
    const totalDailies = tasks.reduce((s, t) => s + t.dailyEntries.length, 0);
    const totalEvidence = tasks.reduce((s, t) => s + t.attachments.length, 0);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    const personStats = responsables.map(r => {
      const rTasks = r.taskAssignments.map(a => a.task);
      const rTotal = rTasks.length;
      const rCompleted = rTasks.filter(t => t.status === 'COMPLETADO').length;
      const rInProgress = rTasks.filter(t => t.status === 'EN_PROGRESO').length;
      const rAvg = rTotal > 0 ? Math.round(rTasks.reduce((s, t) => s + t.progress, 0) / rTotal) : 0;
      const rDailies = rTasks.reduce((s, t) => s + t.dailyEntries.length, 0);
      const rFiles = rTasks.reduce((s, t) => s + t.attachments.length, 0);
      const focus = rTasks.filter(t => t.status !== 'COMPLETADO' && t.progress < 50).map(t => t.name).slice(0, 2);
      return { name: r.name, team: r.team?.name || 'Sin equipo', total: rTotal, completed: rCompleted, inProgress: rInProgress, avg: rAvg, dailies: rDailies, files: rFiles, focus };
    }).sort((a, b) => b.avg - a.avg);

    const projectStats = projects.map(p => {
      const pTasks = p.tasks;
      const pTotal = pTasks.length;
      const pCompleted = pTasks.filter(t => t.status === 'COMPLETADO').length;
      const pInProgress = pTasks.filter(t => t.status === 'EN_PROGRESO').length;
      const pPending = pTasks.filter(t => t.status === 'PENDIENTE').length;
      const pAvg = pTotal > 0 ? Math.round(pTasks.reduce((s, t) => s + t.progress, 0) / pTotal) : 0;
      return { name: p.name, team: p.team?.name || '', total: pTotal, completed: pCompleted, inProgress: pInProgress, pending: pPending, avg: pAvg, color: p.color };
    }).sort((a, b) => b.avg - a.avg);

    const progressColor = (v: number) => v >= 75 ? '#10b981' : v >= 40 ? '#f59e0b' : '#ef4444';
    const progressBg = (v: number) => v >= 75 ? '#d1fae5' : v >= 40 ? '#fef3c7' : '#fee2e2';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Global - Plan de Trabajo UNGRD</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #f8fafc; }
    .page { max-width: 1100px; margin: 0 auto; padding: 0; }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1a365d 100%);
      color: white; padding: 40px 48px; position: relative; overflow: hidden;
    }
    .header::before {
      content: ''; position: absolute; top: -50%; right: -10%; width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(247,179,43,0.15) 0%, transparent 70%);
      border-radius: 50%;
    }
    .header h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; position: relative; }
    .header .subtitle { font-size: 14px; opacity: 0.7; margin-top: 4px; font-weight: 300; position: relative; }
    .header .date { font-size: 11px; opacity: 0.5; margin-top: 10px; position: relative; }
    .yellow-accent { height: 4px; width: 80px; background: linear-gradient(90deg, #F7B32B, #f59e0b); border-radius: 2px; margin-top: 16px; position: relative; }
    .yellow-accent::after { content: ''; height: 4px; width: 30px; background: rgba(247,179,43,0.4); border-radius: 2px; display: inline-block; margin-left: 6px; }
    
    /* Main container */
    .content { padding: 32px 48px 48px; background: white; }
    
    /* KPI Grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 36px; }
    .kpi-card {
      background: #f8fafc; border-radius: 12px; padding: 20px 16px; text-align: center;
      border: 1px solid #e2e8f0; position: relative; overflow: hidden;
    }
    .kpi-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    }
    .kpi-card.blue::before { background: #1a365d; }
    .kpi-card.green::before { background: #10b981; }
    .kpi-card.amber::before { background: #f59e0b; }
    .kpi-card.gray::before { background: #94a3b8; }
    .kpi-card.yellow::before { background: #F7B32B; }
    .kpi-value { font-size: 32px; font-weight: 800; line-height: 1; }
    .kpi-card.blue .kpi-value { color: #1a365d; }
    .kpi-card.green .kpi-value { color: #10b981; }
    .kpi-card.amber .kpi-value { color: #f59e0b; }
    .kpi-card.gray .kpi-value { color: #64748b; }
    .kpi-card.yellow .kpi-value { color: #d97706; }
    .kpi-label { font-size: 10px; color: #64748b; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .kpi-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
    
    /* Secondary KPIs */
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 36px; }
    .kpi-mini {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;
    }
    .kpi-mini-icon {
      width: 40px; height: 40px; border-radius: 10px; display: flex;
      align-items: center; justify-content: center; font-size: 18px; font-weight: 700;
    }
    .kpi-mini-icon.blue { background: #ebf4ff; color: #1a365d; }
    .kpi-mini-icon.green { background: #d1fae5; color: #065f46; }
    .kpi-mini-icon.amber { background: #fef3c7; color: #92400e; }
    .kpi-mini-icon.purple { background: #ede9fe; color: #5b21b6; }
    .kpi-mini-text .kpi-mini-val { font-size: 20px; font-weight: 700; color: #1e293b; }
    .kpi-mini-text .kpi-mini-lbl { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    
    /* Sections */
    .section { margin-bottom: 36px; }
    .section-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 18px;
      padding-bottom: 10px; border-bottom: 2px solid #F7B32B;
    }
    .section-icon {
      width: 32px; height: 32px; border-radius: 8px; background: #1a365d;
      display: flex; align-items: center; justify-content: center; color: white;
      font-size: 14px; font-weight: 700;
    }
    .section-title { font-size: 16px; font-weight: 700; color: #1a365d; }
    .section-desc { font-size: 11px; color: #94a3b8; margin-left: auto; }
    
    /* Tables */
    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    thead th {
      background: linear-gradient(180deg, #1a365d, #1e3a5f); color: white;
      padding: 10px 12px; text-align: left; font-weight: 600; font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    thead th:first-child { border-top-left-radius: 8px; }
    thead th:last-child { border-top-right-radius: 8px; }
    tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #ebf4ff; }
    tbody tr:last-child td { border-bottom: none; }
    
    /* Progress bar */
    .progress-cell { display: flex; align-items: center; gap: 8px; }
    .progress-bar { height: 8px; background: #e2e8f0; border-radius: 4px; flex: 1; min-width: 70px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .progress-text { font-weight: 700; font-size: 12px; min-width: 38px; text-align: right; }
    
    /* Status */
    .status {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600;
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; }
    .status-COMPLETADO { background: #d1fae5; color: #065f46; }
    .status-COMPLETADO .status-dot { background: #10b981; }
    .status-EN_PROGRESO { background: #fef3c7; color: #92400e; }
    .status-EN_PROGRESO .status-dot { background: #f59e0b; }
    .status-PENDIENTE { background: #f1f5f9; color: #475569; }
    .status-PENDIENTE .status-dot { background: #94a3b8; }
    
    /* Focus text */
    .focus-tag {
      display: inline-block; padding: 2px 8px; border-radius: 4px;
      background: #fef3c7; color: #92400e; font-size: 9px; font-weight: 500;
      margin: 1px 2px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    
    /* Person avatar */
    .avatar {
      width: 28px; height: 28px; border-radius: 50%; background: #1a365d;
      display: inline-flex; align-items: center; justify-content: center;
      color: white; font-size: 10px; font-weight: 700; vertical-align: middle; margin-right: 6px;
    }
    
    /* Footer */
    .footer {
      background: #0f172a; color: white; padding: 24px 48px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .footer-left { font-size: 12px; font-weight: 600; }
    .footer-right { font-size: 10px; opacity: 0.6; }
    .footer-bar { height: 3px; background: linear-gradient(90deg, #F7B32B, transparent); }
    
    @media print {
      body { background: white; }
      .page { max-width: 100%; }
      .content { padding: 20px; }
      .kpi-grid { grid-template-columns: repeat(5, 1fr); }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <h1>Plan de Trabajo SNI — UNGRD</h1>
    <div class="subtitle">Reporte Global de Avance, Trazabilidad y Seguimiento</div>
    <div class="date">Generado el ${today}</div>
    <div class="yellow-accent"></div>
  </div>

  <div class="content">

  <!-- KPIs principales -->
  <div class="kpi-grid">
    <div class="kpi-card yellow">
      <div class="kpi-value">${avgProgress}%</div>
      <div class="kpi-label">Avance Global</div>
      <div class="kpi-sub">Promedio ponderado</div>
    </div>
    <div class="kpi-card blue">
      <div class="kpi-value">${totalTasks}</div>
      <div class="kpi-label">Actividades</div>
      <div class="kpi-sub">Total plan de trabajo</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-value">${completedTasks}</div>
      <div class="kpi-label">Completadas</div>
      <div class="kpi-sub">${completionRate}% del total</div>
    </div>
    <div class="kpi-card amber">
      <div class="kpi-value">${inProgressTasks}</div>
      <div class="kpi-label">En Progreso</div>
      <div class="kpi-sub">${totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0}% del total</div>
    </div>
    <div class="kpi-card gray">
      <div class="kpi-value">${pendingTasks}</div>
      <div class="kpi-label">Pendientes</div>
      <div class="kpi-sub">${totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0}% del total</div>
    </div>
  </div>

  <!-- KPIs secundarios -->
  <div class="kpi-row">
    <div class="kpi-mini">
      <div class="kpi-mini-icon blue">☰</div>
      <div class="kpi-mini-text">
        <div class="kpi-mini-val">${projects.length}</div>
        <div class="kpi-mini-lbl">Proyectos</div>
      </div>
    </div>
    <div class="kpi-mini">
      <div class="kpi-mini-icon green">★</div>
      <div class="kpi-mini-text">
        <div class="kpi-mini-val">${responsables.length}</div>
        <div class="kpi-mini-lbl">Responsables</div>
      </div>
    </div>
    <div class="kpi-mini">
      <div class="kpi-mini-icon amber">✎</div>
      <div class="kpi-mini-text">
        <div class="kpi-mini-val">${totalDailies}</div>
        <div class="kpi-mini-lbl">Registros Daily</div>
      </div>
    </div>
    <div class="kpi-mini">
      <div class="kpi-mini-icon purple">⬆</div>
      <div class="kpi-mini-text">
        <div class="kpi-mini-val">${totalEvidence}</div>
        <div class="kpi-mini-lbl">Evidencias</div>
      </div>
    </div>
  </div>

  <!-- Avance por Proyecto -->
  <div class="section">
    <div class="section-header">
      <div class="section-icon">☰</div>
      <span class="section-title">Avance por Proyecto</span>
      <span class="section-desc">${projects.length} proyectos activos</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:30%">Proyecto</th>
          <th>Equipo</th>
          <th style="text-align:center">Total</th>
          <th style="text-align:center">Completadas</th>
          <th style="text-align:center">En Progreso</th>
          <th style="text-align:center">Pendientes</th>
          <th style="width:200px">Avance</th>
        </tr>
      </thead>
      <tbody>
        ${projectStats.map(p => `
          <tr>
            <td><strong style="color:#1a365d">${p.name}</strong></td>
            <td style="color:#64748b">${p.team}</td>
            <td style="text-align:center; font-weight:600">${p.total}</td>
            <td style="text-align:center; color:#10b981; font-weight:600">${p.completed}</td>
            <td style="text-align:center; color:#f59e0b; font-weight:600">${p.inProgress}</td>
            <td style="text-align:center; color:#94a3b8">${p.pending}</td>
            <td>
              <div class="progress-cell">
                <div class="progress-bar"><div class="progress-fill" style="width:${p.avg}%; background:${progressColor(p.avg)}"></div></div>
                <span class="progress-text" style="color:${progressColor(p.avg)}">${p.avg}%</span>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- Avance por Persona -->
  <div class="section">
    <div class="section-header">
      <div class="section-icon">★</div>
      <span class="section-title">Avance por Persona</span>
      <span class="section-desc">${responsables.length} responsables activos</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:22%">Responsable</th>
          <th>Equipo</th>
          <th style="text-align:center">Tareas</th>
          <th style="text-align:center">Completadas</th>
          <th style="text-align:center">Dailies</th>
          <th style="text-align:center">Evidencias</th>
          <th style="width:170px">Avance</th>
          <th style="width:22%">Áreas de Enfoque</th>
        </tr>
      </thead>
      <tbody>
        ${personStats.map(p => `
          <tr>
            <td>
              <span class="avatar">${p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
              <strong style="color:#1a365d">${p.name}</strong>
            </td>
            <td style="color:#64748b; font-size:10px">${p.team}</td>
            <td style="text-align:center; font-weight:600">${p.total}</td>
            <td style="text-align:center; color:#10b981; font-weight:600">${p.completed}</td>
            <td style="text-align:center">${p.dailies}</td>
            <td style="text-align:center">${p.files}</td>
            <td>
              <div class="progress-cell">
                <div class="progress-bar"><div class="progress-fill" style="width:${p.avg}%; background:${progressColor(p.avg)}"></div></div>
                <span class="progress-text" style="color:${progressColor(p.avg)}">${p.avg}%</span>
              </div>
            </td>
            <td>${p.focus.length > 0 ? p.focus.map(f => `<span class="focus-tag">${f.length > 30 ? f.slice(0, 30) + '...' : f}</span>`).join('') : '<span style="color:#94a3b8; font-size:10px; font-style:italic">Sin \u00e1reas cr\u00edticas</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- Detalle de Actividades -->
  <div class="section">
    <div class="section-header">
      <div class="section-icon">☐</div>
      <span class="section-title">Detalle de Actividades</span>
      <span class="section-desc">${totalTasks} actividades registradas</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:4%">#</th>
          <th style="width:18%">Proyecto</th>
          <th style="width:28%">Actividad</th>
          <th style="width:15%">Responsable</th>
          <th>Estado</th>
          <th style="width:150px">Avance</th>
          <th style="text-align:center">Dailies</th>
          <th style="text-align:center">Evidencias</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.map((t, i) => `
          <tr>
            <td style="text-align:center; color:#94a3b8; font-size:10px">${i + 1}</td>
            <td style="font-size:10px; color:#1a365d">${t.project.name}</td>
            <td style="font-size:10px">${t.name}</td>
            <td style="font-size:10px; color:#64748b">${t.assignments.map(a => a.responsable.name).join(', ')}</td>
            <td>
              <span class="status status-${t.status}">
                <span class="status-dot"></span>
                ${t.status === 'EN_PROGRESO' ? 'En Progreso' : t.status === 'COMPLETADO' ? 'Completado' : 'Pendiente'}
              </span>
            </td>
            <td>
              <div class="progress-cell">
                <div class="progress-bar"><div class="progress-fill" style="width:${t.progress}%; background:${progressColor(t.progress)}"></div></div>
                <span class="progress-text" style="color:${progressColor(t.progress)}">${t.progress}%</span>
              </div>
            </td>
            <td style="text-align:center">${t.dailyEntries.length}</td>
            <td style="text-align:center">${t.attachments.length}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  </div><!-- end content -->

  <div class="footer-bar"></div>
  <div class="footer">
    <div class="footer-left">UNGRD — Unidad Nacional para la Gesti\u00f3n del Riesgo de Desastres</div>
    <div class="footer-right">Sistema de Seguimiento de Proyectos \u2022 ${today}</div>
  </div>

</div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte' },
      { status: 500 }
    );
  }
}
