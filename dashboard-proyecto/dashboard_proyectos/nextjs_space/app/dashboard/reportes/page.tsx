'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  Search,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Upload,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

interface PersonSummary {
  id: string;
  name: string;
  teamId?: string;
  team?: { id: string; name: string; color: string };
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  avgProgress: number;
  compositeScore: number;
  hasDailyActivity: boolean;
  dailyCount7d: number;
  uniqueDailyDays: number;
  totalDailies: number;
  isActive: boolean;
  totalAttachments: number;
  recentAttachments: number;
  trend: 'up' | 'down' | 'stable';
  progressDelta7d: number;
}

interface PersonReport {
  id: string;
  name: string;
  team: { id: string; name: string; color: string } | null;
  summary: {
    avgProgress: number;
    completionRate: number;
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    isActive: boolean;
    trend: 'up' | 'down' | 'stable';
    progressDelta7d: number;
  };
  dailyActivity: {
    totalDailies: number;
    uniqueDays: number;
    dailyCount7d: number;
    uniqueDailyDays7d: number;
    lastDaily: string | null;
  };
  evidence: {
    totalAttachments: number;
    recentAttachments: number;
  };
  weeklyEvolution: { week: string; avgProgress: number }[];
  tasks: {
    id: string;
    name: string;
    project: string;
    projectColor: string;
    status: string;
    progress: number;
    entregable: string | null;
    dailyPresente: string | null;
    dailyFuturo: string | null;
    impedimento: string | null;
    dailyCount: number;
    attachmentCount: number;
    attachments: { id: string; fileName: string; date: string; fileSize: number | null }[];
    subTasksTotal: number;
    subTasksCompleted: number;
    lastUpdate: string;
  }[];
}

interface TeamInfo {
  id: string;
  name: string;
  color: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En Progreso',
  COMPLETADO: 'Completado',
};
const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-gray-100 text-gray-700',
  EN_PROGRESO: 'bg-amber-100 text-amber-700',
  COMPLETADO: 'bg-emerald-100 text-emerald-700',
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
};

const TrendText = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <span className="text-xs text-emerald-600 font-medium">↑ Mejorando</span>;
  if (trend === 'down') return <span className="text-xs text-red-500 font-medium">↓ Desacelerando</span>;
  return <span className="text-xs text-gray-400">→ Estable</span>;
};

export default function ReportesPage() {
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedPerson, setSelectedPerson] = useState<PersonReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingGlobal, setDownloadingGlobal] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, teamRes] = await Promise.all([
          fetch('/api/dashboard/productivity'),
          fetch('/api/dashboard/team-stats'),
        ]);
        if (prodRes.ok) setPersons(await prodRes.json());
        if (teamRes.ok) {
          const t = await teamRes.json();
          setTeams(t.map((x: any) => ({ id: x.id, name: x.name, color: x.color })));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let f = [...persons];
    if (search) f = f.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (selectedTeam !== 'all') f = f.filter((p) => p.teamId === selectedTeam);
    return f;
  }, [persons, search, selectedTeam]);

  const openReport = useCallback(async (id: string) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/dashboard/person-report/${id}`);
      if (res.ok) setSelectedPerson(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingReport(false); }
  }, []);

  const downloadExcel = useCallback(async (id: string, name: string) => {
    setDownloadingId(id);
    try {
      const res = await fetch(`/api/export/person-report/${id}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_${name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) { console.error(e); }
    finally { setDownloadingId(null); }
  }, []);

  const downloadGlobalExcel = useCallback(async () => {
    setDownloadingGlobal('excel');
    try {
      const res = await fetch('/api/export/excel');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Plan_Trabajo_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) { console.error(e); }
    finally { setDownloadingGlobal(null); }
  }, []);

  const downloadGlobalPDF = useCallback(async () => {
    setDownloadingGlobal('pdf');
    try {
      const res = await fetch('/api/export/pdf');
      if (res.ok) {
        const html = await res.text();
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
      }
    } catch (e) { console.error(e); }
    finally { setDownloadingGlobal(null); }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 animate-spin text-[#1A365D]" />
      </div>
    );
  }

  // ===== PERSON DETAIL REPORT =====
  if (selectedPerson) {
    const p = selectedPerson;
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedPerson(null)} className="text-[#1A365D]">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver a Reportes
        </Button>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1A365D] to-[#2C5282] rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-blue-300 text-xs font-medium uppercase tracking-wide">Reporte Individual de Avance</p>
              <h1 className="text-2xl font-bold text-white mt-1">{p.name}</h1>
              {p.team && <Badge className="mt-2 bg-white/20 text-white border-white/30">{p.team.name}</Badge>}
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-white">{p.summary.avgProgress}%</div>
              <p className="text-blue-200 text-sm">Avance Global Promedio</p>
              <div className="flex items-center gap-1 justify-end mt-1">
                <TrendIcon trend={p.summary.trend} />
                <TrendText trend={p.summary.trend} />
              </div>
            </div>
          </div>
          <div className="h-2 bg-white/20 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-[#F7B32B] rounded-full transition-all" style={{ width: `${p.summary.avgProgress}%` }} />
          </div>
          <div className="flex justify-end mt-3">
            <Button
              size="sm"
              className="bg-[#F7B32B] text-[#1A365D] hover:bg-[#D69E2E] font-semibold"
              onClick={() => downloadExcel(p.id, p.name)}
              disabled={downloadingId === p.id}
            >
              {downloadingId === p.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
              Exportar Reporte Excel
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Tareas Asignadas', value: p.summary.total, color: 'border-t-[#1A365D]', textColor: 'text-[#1A365D]' },
            { label: 'Completadas', value: p.summary.completed, color: 'border-t-emerald-500', textColor: 'text-emerald-600' },
            { label: 'En Progreso', value: p.summary.inProgress, color: 'border-t-amber-400', textColor: 'text-amber-600' },
            { label: 'Pendientes', value: p.summary.pending, color: 'border-t-gray-400', textColor: 'text-gray-600' },
            { label: 'Registros Daily', value: p.dailyActivity.totalDailies, color: 'border-t-blue-400', textColor: 'text-blue-600', icon: <Activity className="w-3 h-3" /> },
            { label: 'Evidencias', value: p.evidence.totalAttachments, color: 'border-t-violet-400', textColor: 'text-violet-600', icon: <FileText className="w-3 h-3" /> },
          ].map((stat, i) => (
            <Card key={i} className={`shadow-sm border-t-2 ${stat.color}`}>
              <CardContent className="p-3 text-center">
                <div className={`flex items-center justify-center gap-1 ${stat.textColor}`}>
                  {(stat as any).icon}
                  <span className="text-xl font-bold">{stat.value}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activity + Evolution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-md border-t-2 border-t-blue-400">
            <CardHeader>
              <CardTitle className="text-[#1A365D] flex items-center gap-2 text-base">
                <Activity className="w-5 h-5" /> Actividad y Consistencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${p.summary.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`} />
                  <span className="font-medium text-sm">{p.summary.isActive ? 'Activo' : 'Sin actividad reciente'}</span>
                </div>
                <span className="text-sm text-gray-500">{p.dailyActivity.dailyCount7d} dailies en 7d</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-lg bg-blue-50 text-center">
                  <p className="text-lg font-bold text-blue-700">{p.dailyActivity.uniqueDailyDays7d}</p>
                  <p className="text-[10px] text-blue-600">Días con Daily (7d)</p>
                </div>
                <div className="p-3 rounded-lg bg-violet-50 text-center">
                  <p className="text-lg font-bold text-violet-700">{p.evidence.recentAttachments}</p>
                  <p className="text-[10px] text-violet-600">Archivos (7d)</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 text-center">
                  <p className="text-lg font-bold text-emerald-700">+{p.summary.progressDelta7d}pts</p>
                  <p className="text-[10px] text-emerald-600">Progreso (7d)</p>
                </div>
              </div>
              {p.dailyActivity.lastDaily && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Último daily: {new Date(p.dailyActivity.lastDaily).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              )}
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1 font-medium">Historial acumulado</p>
                <div className="flex items-center gap-4 text-sm">
                  <span><strong>{p.dailyActivity.totalDailies}</strong> dailies totales</span>
                  <span><strong>{p.dailyActivity.uniqueDays}</strong> días registrados</span>
                  <span><strong>{p.evidence.totalAttachments}</strong> archivos</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-t-2 border-t-[#1A365D]">
            <CardHeader>
              <CardTitle className="text-[#1A365D] flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5" /> Evolución del Progreso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={p.weeklyEvolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Avance']} />
                    <Line type="monotone" dataKey="avgProgress" stroke="#1A365D" strokeWidth={2} dot={{ fill: '#F7B32B', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Details */}
        <Card className="shadow-md border-t-2 border-t-[#F7B32B]">
          <CardHeader>
            <CardTitle className="text-[#1A365D] text-base">Detalle de Actividades del Plan de Trabajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {p.tasks.map((task) => (
                <div key={task.id} className="p-4 rounded-lg border border-gray-200 hover:border-[#1A365D]/30 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium text-sm">{task.name}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[task.status] || ''}`}>
                          {STATUS_LABELS[task.status] || task.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">{task.project}</p>
                      {task.entregable && <p className="text-xs text-gray-400 mt-0.5">Entregable: {task.entregable}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xl font-bold" style={{ color: task.projectColor }}>{task.progress}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{ width: `${task.progress}%`, backgroundColor: task.projectColor }} />
                  </div>
                  {/* Daily info */}
                  {(task.dailyPresente || task.dailyFuturo) && (
                    <div className="bg-blue-50/50 rounded p-2 mb-2 space-y-1">
                      {task.dailyPresente && (
                        <p className="text-xs text-gray-700"><span className="font-medium text-blue-700">Lo que se hizo:</span> {task.dailyPresente}</p>
                      )}
                      {task.dailyFuturo && (
                        <p className="text-xs text-gray-700"><span className="font-medium text-blue-700">Lo que se hará:</span> {task.dailyFuturo}</p>
                      )}
                    </div>
                  )}
                  {task.impedimento && (
                    <div className="bg-amber-50 rounded p-2 mb-2">
                      <p className="text-xs text-amber-800"><AlertTriangle className="w-3 h-3 inline mr-1" /><span className="font-medium">Impedimento:</span> {task.impedimento}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {task.dailyCount} dailies</span>
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {task.attachmentCount} archivos</span>
                    {task.subTasksTotal > 0 && (
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {task.subTasksCompleted}/{task.subTasksTotal} subtareas</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(task.lastUpdate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                  </div>
                  {/* Attached files */}
                  {task.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                      <p className="text-[10px] text-gray-400 font-medium mb-1">Documentos subidos:</p>
                      <div className="flex flex-wrap gap-1">
                        {task.attachments.map((att) => (
                          <span key={att.id} className="inline-flex items-center gap-1 text-[10px] bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">
                            <FileText className="w-2.5 h-2.5" /> {att.fileName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== MAIN REPORTES VIEW =====
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A365D] to-[#2C5282] rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-white">Centro de Reportes</h1>
        <p className="text-blue-200 mt-1">Reportes individuales por responsable con trazabilidad completa de avances, dailies y evidencias</p>
        <div className="flex items-center gap-2 mt-3">
          <div className="h-1 w-16 bg-[#F7B32B] rounded-full" />
          <div className="h-1 w-8 bg-[#F7B32B]/50 rounded-full" />
        </div>
      </div>

      {/* Global Export Buttons */}
      <section className="rounded-xl border-l-4 border-ungrd-yellow bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ungrd-blue">Reporte institucional</h2>
        <p className="mt-1 text-sm text-slate-600">Solicitudes, decisiones, cambios de alcance, esfuerzo y beneficio declarado, con evidencias y reconocimiento del equipo productor.</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <a className="font-medium text-ungrd-blue underline underline-offset-4" href="/dashboard/aporte">Consultar aporte institucional</a>
          <a className="font-medium text-ungrd-blue underline underline-offset-4" href="/api/gestion/reporte?format=html" target="_blank" rel="noopener noreferrer">Abrir reporte ejecutivo imprimible</a>
        </div>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-md border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Plan de Trabajo Global (Excel)</h3>
              <p className="text-xs text-gray-500">Todas las actividades, proyectos y responsables</p>
            </div>
            <Button onClick={downloadGlobalExcel} disabled={downloadingGlobal === 'excel'} className="bg-emerald-600 hover:bg-emerald-700">
              {downloadingGlobal === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-md border-l-4 border-l-red-400 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <FileText className="w-8 h-8 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Reporte General (PDF)</h3>
              <p className="text-xs text-gray-500">Estadísticas y progreso por equipo para imprimir</p>
            </div>
            <Button onClick={downloadGlobalPDF} disabled={downloadingGlobal === 'pdf'} className="bg-red-500 hover:bg-red-600">
              {downloadingGlobal === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar responsable..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por equipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los equipos</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Person Report Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[#1A365D]">
          Reportes Individuales <span className="text-sm font-normal text-gray-500">({filtered.length} responsables)</span>
        </h2>

        {filtered.map((person) => (
          <Card key={person.id} className="shadow-md hover:shadow-lg transition-shadow border-l-4" style={{ borderLeftColor: person.team?.color || '#1A365D' }}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ backgroundColor: person.team?.color || '#1A365D' }}>
                  {person.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[#1A365D]">{person.name}</h3>
                    <div className={`w-2.5 h-2.5 rounded-full ${person.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`} />
                    <TrendIcon trend={person.trend} />
                    <TrendText trend={person.trend} />
                    {person.team && (
                      <Badge variant="outline" className="text-xs" style={{ borderColor: person.team.color, color: person.team.color }}>
                        {person.team.name}
                      </Badge>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${person.avgProgress}%`, backgroundColor: person.avgProgress >= 50 ? '#10b981' : person.avgProgress >= 25 ? '#F7B32B' : '#1A365D' }} />
                    </div>
                    <span className="text-lg font-bold min-w-[45px] text-right" style={{ color: person.avgProgress >= 50 ? '#10b981' : person.avgProgress >= 25 ? '#D69E2E' : '#1A365D' }}>
                      {person.avgProgress}%
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs"><strong className="text-emerald-600">{person.completed}</strong><span className="text-gray-400">/{person.total}</span> completadas</span>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span className="text-xs"><strong className="text-amber-600">{person.inProgress}</strong> en progreso</span>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1">
                      <Activity className="w-3 h-3 text-blue-500" />
                      <span className="text-xs"><strong className="text-blue-600">{person.totalDailies}</strong> dailies</span>
                      {person.hasDailyActivity && <span className="text-[10px] text-emerald-500">({person.dailyCount7d} esta semana)</span>}
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1">
                      <Upload className="w-3 h-3 text-violet-500" />
                      <span className="text-xs"><strong className="text-violet-600">{person.totalAttachments}</strong> evidencias</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button size="sm" className="bg-[#1A365D] hover:bg-[#0F2440] text-xs" onClick={() => openReport(person.id)}>
                    Ver Reporte
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs border-[#1A365D] text-[#1A365D]" onClick={() => downloadExcel(person.id, person.name)} disabled={downloadingId === person.id}>
                    {downloadingId === person.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                    Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No se encontraron responsables</p>
          </div>
        )}
      </div>

      {/* Loading */}
      {loadingReport && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#1A365D]" />
            <span className="text-[#1A365D] font-medium">Generando reporte...</span>
          </div>
        </div>
      )}
    </div>
  );
}
