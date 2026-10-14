'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Search,
  Target,
  ChevronDown,
  ChevronUp,
  UserCircle,
  Layers,
  Loader2,
  Activity,
  FileText,
  Calendar,
  Download,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface Responsable {
  id: string;
  name: string;
  teamId?: string;
  team?: { id: string; name: string; color: string };
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  avgProgress: number;
  completionRate: number;
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
  rate: number;
}

interface Team {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionRate: number;
  weightedProgress: number;
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

export default function EquipoPage() {
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'avgProgress' | 'total' | 'completed'>('avgProgress');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState('personas');
  const [selectedPerson, setSelectedPerson] = useState<PersonReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, teamRes] = await Promise.all([
        fetch('/api/dashboard/productivity'),
        fetch('/api/dashboard/team-stats'),
      ]);
      if (prodRes.ok) setResponsables(await prodRes.json());
      if (teamRes.ok) setTeams(await teamRes.json());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPersonReport = useCallback(async (personId: string) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/dashboard/person-report/${personId}`);
      if (res.ok) {
        setSelectedPerson(await res.json());
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoadingReport(false);
    }
  }, []);

  const downloadPersonExcel = useCallback(async (personId: string, personName: string) => {
    setDownloadingExcel(true);
    try {
      const res = await fetch(`/api/export/person-report/${personId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_${personName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    } finally {
      setDownloadingExcel(false);
    }
  }, []);

  const filteredResponsables = useMemo(() => {
    let filtered = [...responsables];
    if (search) {
      filtered = filtered.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (selectedTeam !== 'all') {
      filtered = filtered.filter((r) => r.teamId === selectedTeam);
    }
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortBy] ?? 0;
      const bVal = (b as any)[sortBy] ?? 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return filtered;
  }, [responsables, search, selectedTeam, sortBy, sortDir]);

  const totals = useMemo(() => {
    const personas = responsables.length;
    const tareas = responsables.reduce((sum, r) => sum + r.total, 0);
    const completadas = responsables.reduce((sum, r) => sum + r.completed, 0);
    const enProgreso = responsables.reduce((sum, r) => sum + r.inProgress, 0);
    const avgGlobal = personas > 0
      ? Math.round(responsables.reduce((sum, r) => sum + r.avgProgress, 0) / personas)
      : 0;
    const activos = responsables.filter((r) => r.isActive).length;
    return { personas, tareas, completadas, enProgreso, avgGlobal, activos };
  }, [responsables]);

  const chartData = useMemo(() => {
    return filteredResponsables.map((r) => ({
      name: r.name.length > 14 ? r.name.substring(0, 14) + '...' : r.name,
      fullName: r.name,
      avance: r.avgProgress,
      completadas: r.completed,
      enProgreso: r.inProgress,
      pendientes: r.pending,
      total: r.total,
    }));
  }, [filteredResponsables]);

  const handleSort = (field: 'avgProgress' | 'total' | 'completed') => {
    if (sortBy === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortDir === 'desc' ? (
      <ChevronDown className="w-3.5 h-3.5" />
    ) : (
      <ChevronUp className="w-3.5 h-3.5" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 animate-spin text-[#1A365D]" />
      </div>
    );
  }

  // --- PERSON DETAIL VIEW ---
  if (selectedPerson) {
    const p = selectedPerson;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedPerson(null)} className="text-[#1A365D]">
            ← Volver al Equipo
          </Button>
        </div>

        <div className="bg-gradient-to-r from-[#1A365D] to-[#2C5282] rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{p.name}</h1>
              {p.team && (
                <Badge className="mt-2 bg-white/20 text-white border-white/30 hover:bg-white/30">
                  {p.team.name}
                </Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-white">{p.summary.avgProgress}%</div>
              <p className="text-blue-200 text-sm">Avance Global Promedio</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-[#F7B32B] rounded-full" style={{ width: `${p.summary.avgProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="shadow-sm border-t-2 border-t-[#1A365D]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[#1A365D]">{p.summary.total}</p>
              <p className="text-xs text-gray-500">Asignadas</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-t-2 border-t-emerald-500">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{p.summary.completed}</p>
              <p className="text-xs text-gray-500">Completadas</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-t-2 border-t-amber-400">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{p.summary.inProgress}</p>
              <p className="text-xs text-gray-500">En Progreso</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-t-2 border-t-[#F7B32B]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{p.dailyActivity.totalDailies}</p>
              <p className="text-xs text-gray-500">Registros Daily</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-t-2 border-t-blue-400">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{p.evidence.totalAttachments}</p>
              <p className="text-xs text-gray-500">Evidencias</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity & Evolution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-[#1A365D] flex items-center gap-2 text-base">
                <Activity className="w-5 h-5" />
                Actividad Reciente (7 días)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <span className="font-medium text-sm">{p.summary.isActive ? '✓ Activo' : '✗ Sin actividad reciente'}</span>
                <span className="text-sm text-gray-500">{p.dailyActivity.dailyCount7d} dailies</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-blue-50">
                  <p className="text-lg font-bold text-[#1A365D]">{p.dailyActivity.uniqueDailyDays7d}</p>
                  <p className="text-xs text-gray-600">Días con Daily</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <p className="text-lg font-bold text-[#1A365D]">{p.evidence.recentAttachments}</p>
                  <p className="text-xs text-gray-600">Archivos subidos</p>
                </div>
              </div>
              {p.dailyActivity.lastDaily && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  Último daily: {new Date(p.dailyActivity.lastDaily).toLocaleDateString('es-CO')}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-[#1A365D] flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5" />
                Evolución del Progreso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={p.weeklyEvolution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Avance Promedio']} />
                    <Line
                      type="monotone"
                      dataKey="avgProgress"
                      stroke="#1A365D"
                      strokeWidth={2}
                      dot={{ fill: '#F7B32B', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Details */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#1A365D]">Detalle de Tareas</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="text-[#1A365D] border-[#1A365D]"
              onClick={() => downloadPersonExcel(p.id, p.name)}
              disabled={downloadingExcel}
            >
              {downloadingExcel ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              Exportar Excel
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {p.tasks.map((task) => (
                <div key={task.id} className="p-4 rounded-lg border border-gray-200 hover:border-[#1A365D]/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{task.name}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[task.status] || ''}`}>
                          {STATUS_LABELS[task.status] || task.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">{task.project}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xl font-bold text-[#1A365D]">{task.progress}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-[#1A365D] transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" /> {task.dailyCount} dailies
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {task.attachmentCount} archivos
                    </span>
                    {task.subTasksTotal > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {task.subTasksCompleted}/{task.subTasksTotal} subtareas
                      </span>
                    )}
                    {task.impedimento && (
                      <span className="flex items-center gap-1 text-red-500">
                        <AlertCircle className="w-3 h-3" /> Impedimento
                      </span>
                    )}
                  </div>
                  {task.entregable && (
                    <p className="text-xs text-gray-400 mt-1">Entregable: {task.entregable}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- MAIN VIEW ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A365D] to-[#2C5282] rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-white">Equipo de Trabajo</h1>
        <p className="text-blue-200 mt-1">
          {totals.personas} personas • {teams.length} equipos • {totals.activos} activos esta semana
        </p>
        <div className="flex items-center gap-2 mt-3">
          <div className="h-1 w-16 bg-[#F7B32B] rounded-full" />
          <div className="h-1 w-8 bg-[#F7B32B]/50 rounded-full" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-[#1A365D] shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">Personas</p>
            <p className="text-2xl font-bold text-[#1A365D]">{totals.personas}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#F7B32B] shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">Avance Promedio</p>
            <p className="text-2xl font-bold text-[#1A365D]">{totals.avgGlobal}%</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">Completadas</p>
            <p className="text-2xl font-bold text-emerald-600">{totals.completadas}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">En Progreso</p>
            <p className="text-2xl font-bold text-amber-600">{totals.enProgreso}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-400 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">Activos 7d</p>
            <p className="text-2xl font-bold text-blue-600">{totals.activos}/{totals.personas}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personas" className="flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            Personas ({responsables.length})
          </TabsTrigger>
          <TabsTrigger value="equipos" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Equipos ({teams.length})
          </TabsTrigger>
        </TabsList>

        {/* Personas Tab */}
        <TabsContent value="personas" className="space-y-4">
          {/* Filters */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar persona..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los equipos</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Chart - Horizontal bar, single color */}
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#1A365D] text-base">Avance Promedio por Persona</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: Math.max(350, filteredResponsables.length * 38) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 40, left: 110, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={110}
                      tick={{ fontSize: 11, fill: '#1A365D' }}
                      interval={0}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
                              <p className="font-semibold text-[#1A365D]">{d.fullName}</p>
                              <p>Avance: <strong>{d.avance}%</strong></p>
                              <p className="text-xs text-gray-500 mt-1">
                                {d.completadas} completadas · {d.enProgreso} en progreso · {d.pendientes} pendientes
                              </p>
                              <p className="text-xs text-gray-400">Total: {d.total} tareas</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="avance" fill="#1A365D" radius={[0, 4, 4, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#1A365D] text-base">
                Detalle Individual
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredResponsables.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
                      <th className="text-left py-3 px-3 font-medium">Responsable</th>
                      <th className="text-left py-3 px-3 font-medium">Equipo</th>
                      <th
                        className="text-center py-3 px-3 cursor-pointer hover:bg-gray-100 font-medium"
                        onClick={() => handleSort('avgProgress')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Avance <SortIcon field="avgProgress" />
                        </div>
                      </th>
                      <th
                        className="text-center py-3 px-3 cursor-pointer hover:bg-gray-100 font-medium"
                        onClick={() => handleSort('completed')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Completadas <SortIcon field="completed" />
                        </div>
                      </th>
                      <th className="text-center py-3 px-2 font-medium">En Progreso</th>
                      <th className="text-center py-3 px-2 font-medium">Pendientes</th>
                      <th
                        className="text-center py-3 px-3 cursor-pointer hover:bg-gray-100 font-medium"
                        onClick={() => handleSort('total')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Total <SortIcon field="total" />
                        </div>
                      </th>
                      <th className="text-center py-3 px-2 font-medium">Dailies</th>
                      <th className="text-center py-3 px-2 font-medium">Evidencias</th>
                      <th className="text-center py-3 px-2 font-medium">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResponsables.map((person) => (
                      <tr key={person.id} className="border-b hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                              style={{ backgroundColor: '#1A365D' }}
                            >
                              {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="font-medium">{person.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {person.team ? (
                            <span className="text-xs text-gray-600">{person.team.name}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#1A365D] rounded-full" style={{ width: `${person.avgProgress}%` }} />
                            </div>
                            <span className="font-bold text-sm min-w-[36px] text-right text-[#1A365D]">
                              {person.avgProgress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-emerald-600">{person.completed}</td>
                        <td className="py-3 px-2 text-center font-medium text-amber-600">{person.inProgress}</td>
                        <td className="py-3 px-2 text-center text-gray-500">{person.pending}</td>
                        <td className="py-3 px-3 text-center font-medium">{person.total}</td>
                        <td className="py-3 px-2 text-center text-gray-600">{person.totalDailies || '—'}</td>
                        <td className="py-3 px-2 text-center text-gray-600">{person.totalAttachments || '—'}</td>
                        <td className="py-3 px-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#1A365D] hover:bg-[#1A365D]/10 h-7 px-2"
                            onClick={() => openPersonReport(person.id)}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipos Tab */}
        <TabsContent value="equipos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((team) => (
              <Card
                key={team.id}
                className="overflow-hidden shadow-md border-l-4"
                style={{ borderLeftColor: team.color }}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{team.name}</h3>
                      <p className="text-sm text-gray-500">{team.memberCount} miembros</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-[#1A365D]">
                        {team.weightedProgress}%
                      </div>
                      <p className="text-[10px] text-gray-400">avance ponderado</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-[#1A365D] rounded-full" style={{ width: `${team.weightedProgress}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xl font-bold">{team.totalTasks}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-emerald-600">{team.completedTasks}</p>
                      <p className="text-xs text-gray-500">Completas</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-amber-600">{team.inProgressTasks}</p>
                      <p className="text-xs text-gray-500">En Progreso</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Loading overlay */}
      {loadingReport && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#1A365D]" />
            <span className="text-[#1A365D] font-medium">Cargando reporte...</span>
          </div>
        </div>
      )}
    </div>
  );
}
