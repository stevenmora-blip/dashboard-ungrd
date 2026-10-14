'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderKanban,
  CheckSquare,
  TrendingUp,
  Users,
  Layers,
  ArrowRight,
  Loader2,
  Activity,
  FileText,
  AlertTriangle,
  Calendar,
  Upload,
  Clock,
  X,
  ChevronRight,
  ArrowUpDown,
  Hash,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  completionRate: number;
  weightedProgress: number;
  tasksCompletedThisWeek: number;
  totalTeams: number;
  totalResponsables: number;
  tasksByStatus: {
    PENDIENTE: number;
    EN_PROGRESO: number;
    COMPLETADO: number;
  };
}

interface ProjectProgress {
  id: string;
  name: string;
  color: string;
  prioridad: string | null;
  subdireccion: string | null;
  liderSNI: string | null;
  liderUNGRD: string | null;
  teamName: string;
  teamColor: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  progress: number;
  weightedProgress: number;
}

interface TeamStats {
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

interface PersonProgress {
  id: string;
  name: string;
  team: string;
  totalTasks: number;
  completed: number;
  inProgress: number;
  avgProgress: number;
  delta7d: number;
  hasRecentActivity: boolean;
}

interface RecentActivity {
  summary: {
    dailyCountWeek: number;
    filesCountWeek: number;
    progressChangesWeek: number;
    impedimentsCount: number;
    inactiveCount: number;
  };
  allPersonsProgress: PersonProgress[];
  groupedProgress: {
    userName: string;
    totalDelta: number;
    taskCount: number;
    tasks: { taskId: string; taskName: string; projectName: string; projectColor: string; oldProgress: number; newProgress: number; date: string; }[];
  }[];
  recentProgressLogs: {
    id: string;
    taskName: string;
    projectName: string;
    projectColor: string;
    userName: string;
    oldProgress: number;
    newProgress: number;
    date: string;
  }[];
  recentDailies: {
    id: string;
    taskName: string;
    projectName: string;
    userName: string;
    dailyPresente: string | null;
    date: string;
  }[];
  recentFiles: {
    id: string;
    fileName: string;
    taskName: string;
    projectName: string;
    date: string;
  }[];
  impediments: {
    taskId: string;
    taskName: string;
    projectName: string;
    projectColor: string;
    impedimento: string;
    responsables: string[];
  }[];
  inactivePersons: { id: string; name: string; taskCount: number }[];
}

type MetricPanel = 'dailies' | 'progress' | 'files' | 'impediments' | 'inactive' | null;

const STATUS_COLORS = {
  PENDIENTE: '#9ca3af',
  EN_PROGRESO: '#F7B32B',
  COMPLETADO: '#10b981',
};

const STATUS_LABELS = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En Progreso',
  COMPLETADO: 'Completado',
};

export default function DashboardPage() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projectsProgress, setProjectsProgress] = useState<ProjectProgress[]>([]);
  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<MetricPanel>(null);
  const [sortMode, setSortMode] = useState<'prioridad' | 'avance'>('prioridad');

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, progressRes, teamsRes, activityRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/projects-progress'),
          fetch('/api/dashboard/team-stats'),
          fetch('/api/dashboard/recent-activity'),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (progressRes.ok) setProjectsProgress(await progressRes.json());
        if (teamsRes.ok) setTeams(await teamsRes.json());
        if (activityRes.ok) setRecentActivity(await activityRes.json());
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-ungrd-blue" />
      </div>
    );
  }

  const pieData = stats?.tasksByStatus
    ? Object.entries(stats.tasksByStatus).map(([status, value]) => ({
        name: STATUS_LABELS[status as keyof typeof STATUS_LABELS],
        value,
        color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
      }))
    : [];

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }); }
    catch { return ''; }
  };

  const togglePanel = (panel: MetricPanel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1A365D] to-[#2C5282] rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-white">
          {isAdmin ? 'Dashboard General' : 'Mi Dashboard'}
        </h1>
        <p className="text-blue-200 mt-1">
          Bienvenido, {session?.user?.name || 'Usuario'}. Plan de Trabajo SNI-UNGRD
        </p>
        <div className="flex items-center gap-2 mt-3">
          <div className="h-1 w-16 bg-[#F7B32B] rounded-full" />
          <div className="h-1 w-8 bg-[#F7B32B]/50 rounded-full" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#1A365D] shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#1A365D]/10 rounded-lg">
                <FolderKanban className="w-6 h-6 text-[#1A365D]" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Proyectos</p>
                <p className="text-2xl font-bold text-[#1A365D]">
                  {stats?.totalProjects ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#F7B32B] shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#F7B32B]/10 rounded-lg">
                <CheckSquare className="w-6 h-6 text-[#D69E2E]" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Tareas</p>
                <p className="text-2xl font-bold text-[#0F2440]">{stats?.totalTasks ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Avance Global</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats?.weightedProgress ?? 0}%
                </p>
                <p className="text-xs text-gray-400">
                  {stats?.completionRate ?? 0}% tareas completas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#2C5282] shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#2C5282]/10 rounded-lg">
                <Users className="w-6 h-6 text-[#2C5282]" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Responsables</p>
                <p className="text-2xl font-bold text-[#1A365D]">
                  {stats?.totalResponsables ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Progress */}
        <Card className="lg:col-span-2 shadow-md border-t-2 border-t-[#1A365D]">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-[#1A365D]">
              <FolderKanban className="w-5 h-5" />
              Progreso por Proyecto
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                <span className="text-xs text-gray-500 px-2 hidden sm:flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" /> Ordenar:
                </span>
                <button
                  onClick={() => setSortMode('prioridad')}
                  title="Ordenar por número de proyecto"
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${
                    sortMode === 'prioridad'
                      ? 'bg-[#1A365D] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Hash className="w-3 h-3" />
                  Número
                </button>
                <button
                  onClick={() => setSortMode('avance')}
                  title="Ordenar por avance ponderado"
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${
                    sortMode === 'avance'
                      ? 'bg-[#1A365D] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Percent className="w-3 h-3" />
                  Avance
                </button>
              </div>
              <Link href="/dashboard/proyectos">
                <Button variant="ghost" size="sm" className="text-ungrd-blue">
                  Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...projectsProgress]
                .sort((a, b) => {
                  if (sortMode === 'prioridad') {
                    const pa = parseFloat(a.prioridad || '999');
                    const pb = parseFloat(b.prioridad || '999');
                    return pa - pb;
                  }
                  // avance: ordenar por weightedProgress descendente
                  return b.weightedProgress - a.weightedProgress;
                })
                .map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/proyectos?projectId=${project.id}`}
                  >
                    <div className="p-3 rounded-lg border border-gray-200 hover:border-ungrd-blue/50 hover:bg-gray-50 transition-all cursor-pointer space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          {project.prioridad && (
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: project.color }}
                            >
                              {project.prioridad}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-sm block">{project.name}</span>
                            {project.liderSNI && (
                              <span className="text-xs text-gray-500">SNI: {project.liderSNI}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-lg" style={{ color: project.color }}>
                            {project.weightedProgress}%
                          </span>
                          <div className="text-xs text-gray-500">
                            {project.completedTasks}/{project.totalTasks} tareas
                          </div>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${project.weightedProgress}%`,
                            backgroundColor: project.color,
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-md border-t-2 border-t-[#F7B32B]">
          <CardHeader>
            <CardTitle className="text-[#1A365D]">Por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin: Clickable Activity Metrics + Details */}
      {isAdmin && recentActivity && (
        <>
          {/* Clickable Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button
              onClick={() => togglePanel('dailies')}
              className={`rounded-lg p-3 text-center transition-all border-2 ${
                activePanel === 'dailies' ? 'border-[#1A365D] bg-[#1A365D]/5 shadow-md' : 'border-transparent bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <Calendar className="w-4 h-4 text-[#1A365D]" />
                <span className="text-xl font-bold text-[#1A365D]">{recentActivity.summary.dailyCountWeek}</span>
              </div>
              <p className="text-[10px] text-gray-600 font-medium">Dailies (7d)</p>
            </button>
            <button
              onClick={() => togglePanel('progress')}
              className={`rounded-lg p-3 text-center transition-all border-2 ${
                activePanel === 'progress' ? 'border-[#1A365D] bg-[#1A365D]/5 shadow-md' : 'border-transparent bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="w-4 h-4 text-[#1A365D]" />
                <span className="text-xl font-bold text-[#1A365D]">{recentActivity.summary.progressChangesWeek}</span>
              </div>
              <p className="text-[10px] text-gray-600 font-medium">Cambios Progreso</p>
            </button>
            <button
              onClick={() => togglePanel('files')}
              className={`rounded-lg p-3 text-center transition-all border-2 ${
                activePanel === 'files' ? 'border-[#1A365D] bg-[#1A365D]/5 shadow-md' : 'border-transparent bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <Upload className="w-4 h-4 text-[#1A365D]" />
                <span className="text-xl font-bold text-[#1A365D]">{recentActivity.summary.filesCountWeek}</span>
              </div>
              <p className="text-[10px] text-gray-600 font-medium">Archivos Subidos</p>
            </button>
            <button
              onClick={() => togglePanel('impediments')}
              className={`rounded-lg p-3 text-center transition-all border-2 ${
                activePanel === 'impediments' ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-transparent bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xl font-bold text-amber-700">{recentActivity.summary.impedimentsCount}</span>
              </div>
              <p className="text-[10px] text-gray-600 font-medium">Impedimentos</p>
            </button>
            <button
              onClick={() => togglePanel('inactive')}
              className={`rounded-lg p-3 text-center transition-all border-2 ${
                activePanel === 'inactive' ? 'border-red-400 bg-red-50 shadow-md' : 'border-transparent bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-red-500" />
                <span className="text-xl font-bold text-red-600">{recentActivity.summary.inactiveCount}</span>
              </div>
              <p className="text-[10px] text-gray-600 font-medium">Sin Actividad (7d)</p>
            </button>
          </div>

          {/* Expandable Detail Panel */}
          {activePanel && (
            <Card className="shadow-md border-l-4 border-l-[#1A365D] animate-in fade-in-0 slide-in-from-top-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[#1A365D] text-base">
                  {activePanel === 'dailies' && 'Registros Daily — Últimos 7 días'}
                  {activePanel === 'progress' && 'Cambios de Progreso — Últimos 7 días'}
                  {activePanel === 'files' && 'Archivos Subidos — Últimos 7 días'}
                  {activePanel === 'impediments' && 'Impedimentos Activos'}
                  {activePanel === 'inactive' && 'Personas Sin Actividad — Últimos 7 días'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActivePanel(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {activePanel === 'dailies' && recentActivity.recentDailies.map((d) => (
                    <div key={d.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <Calendar className="w-4 h-4 text-[#1A365D] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1A365D]">{d.userName}</p>
                        <p className="text-xs text-gray-600 truncate">{d.dailyPresente || d.taskName}</p>
                        <p className="text-[10px] text-gray-400">{d.projectName}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(d.date)}</span>
                    </div>
                  ))}

                  {activePanel === 'progress' && recentActivity.groupedProgress.map((person, idx) => (
                    <div key={`gp-${idx}`} className="rounded-lg border border-gray-100 bg-gray-50 overflow-hidden">
                      <div className="flex items-center gap-3 p-2.5 bg-white border-b border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-[#1A365D] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {initials(person.userName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1A365D]">{person.userName}</p>
                          <p className="text-[10px] text-gray-500">{person.taskCount} tarea{person.taskCount !== 1 ? 's' : ''} actualizada{person.taskCount !== 1 ? 's' : ''}</p>
                        </div>
                        <span className="text-sm font-bold text-emerald-600 flex-shrink-0">+{person.totalDelta}pp</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {person.tasks.map((t, ti) => (
                          <div key={`gpt-${ti}`} className="flex items-center gap-2 px-3 py-1.5">
                            <TrendingUp className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            <p className="text-xs text-gray-700 flex-1 truncate">{t.taskName}</p>
                            <span className="text-xs font-medium text-gray-600 flex-shrink-0">{t.oldProgress}% → {t.newProgress}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {activePanel === 'files' && recentActivity.recentFiles.map((f) => (
                    <div key={f.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <FileText className="w-4 h-4 text-[#1A365D] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1A365D] truncate">{f.fileName}</p>
                        <p className="text-xs text-gray-500 truncate">{f.taskName}</p>
                        <p className="text-[10px] text-gray-400">{f.projectName}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(f.date)}</span>
                    </div>
                  ))}

                  {activePanel === 'impediments' && recentActivity.impediments.map((imp, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/tareas?search=${encodeURIComponent(imp.taskName)}`)}
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-800">{imp.taskName}</p>
                        <p className="text-xs text-gray-700">{imp.impedimento}</p>
                        <p className="text-[10px] text-gray-500">{imp.responsables.join(', ')} • {imp.projectName}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    </div>
                  ))}

                  {activePanel === 'inactive' && recentActivity.inactivePersons.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/equipo`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#1A365D] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials(p.name)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#1A365D]">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.taskCount} tareas asignadas, sin actividad en 7 días</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-red-400 flex-shrink-0" />
                    </div>
                  ))}

                  {activePanel === 'dailies' && recentActivity.recentDailies.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">Sin registros daily en los últimos 7 días</p>
                  )}
                  {activePanel === 'progress' && recentActivity.groupedProgress.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">Sin cambios de progreso en los últimos 7 días</p>
                  )}
                  {activePanel === 'files' && recentActivity.recentFiles.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">Sin archivos subidos en los últimos 7 días</p>
                  )}
                  {activePanel === 'impediments' && recentActivity.impediments.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No hay impedimentos activos</p>
                  )}
                  {activePanel === 'inactive' && recentActivity.inactivePersons.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">Todos los responsables tienen actividad reciente</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Teams */}
            <Card className="shadow-md border-t-2 border-t-[#1A365D]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-[#1A365D]">
                  <Layers className="w-5 h-5" />
                  Equipos de Trabajo
                </CardTitle>
                <Link href="/dashboard/equipo">
                  <Button variant="ghost" size="sm" className="text-ungrd-blue">
                    Ver más <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teams.map((team) => (
                    <div key={team.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: team.color }}>
                          {team.memberCount}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{team.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{team.inProgressTasks} en progreso</span>
                            <span>·</span>
                            <span>{team.completedTasks} completadas</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold" style={{ color: team.color }}>{team.weightedProgress}%</p>
                          <p className="text-[10px] text-gray-400">avance ponderado</p>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${team.weightedProgress}%`, backgroundColor: team.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trazabilidad de TODOS los responsables */}
            <Card className="shadow-md border-t-2 border-t-[#F7B32B]">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-[#1A365D]">
                  <Activity className="w-5 h-5 text-[#F7B32B]" />
                  Trazabilidad del Equipo
                </CardTitle>
                <Link href="/dashboard/reportes">
                  <Button variant="ghost" size="sm" className="text-ungrd-blue">
                    Ver detalle <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Activity summary row */}
                <div className="grid grid-cols-3 gap-2 mb-1">
                  <div className="p-2 rounded bg-gray-50 text-center">
                    <p className="text-base font-bold text-[#1A365D]">{recentActivity.summary.dailyCountWeek}</p>
                    <p className="text-[9px] text-gray-500">Dailies (7d)</p>
                  </div>
                  <div className="p-2 rounded bg-gray-50 text-center">
                    <p className="text-base font-bold text-[#1A365D]">{recentActivity.summary.filesCountWeek}</p>
                    <p className="text-[9px] text-gray-500">Evidencias</p>
                  </div>
                  <div className="p-2 rounded bg-gray-50 text-center">
                    <p className="text-base font-bold text-[#1A365D]">{recentActivity.summary.progressChangesWeek}</p>
                    <p className="text-[9px] text-gray-500">Avances</p>
                  </div>
                </div>

                {/* ALL persons with progress - clickable to go to reportes */}
                {recentActivity.allPersonsProgress && recentActivity.allPersonsProgress.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Avance Individual — Todos los Responsables</p>
                    <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
                      {recentActivity.allPersonsProgress.map((p) => {
                        const progressColor = p.avgProgress >= 75 ? 'text-emerald-600' : p.avgProgress >= 40 ? 'text-amber-600' : 'text-red-500';
                        const barColor = p.avgProgress >= 75 ? '#10b981' : p.avgProgress >= 40 ? '#f59e0b' : '#ef4444';
                        return (
                          <div
                            key={p.id}
                            className="p-2 rounded-lg bg-gray-50 hover:bg-[#EBF4FF] transition-colors cursor-pointer group"
                            onClick={() => router.push('/dashboard/reportes')}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#1A365D] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                {initials(p.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium text-[#1A365D] truncate">{p.name}</p>
                                  {!p.hasRecentActivity && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" title="Sin actividad reciente" />
                                  )}
                                  {p.hasRecentActivity && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Activo" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                  <span>{p.completed}/{p.totalTasks} completadas</span>
                                  {p.inProgress > 0 && <><span>·</span><span>{p.inProgress} en progreso</span></>}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`text-sm font-bold ${progressColor}`}>{p.avgProgress}%</p>
                                {p.delta7d > 0 && (
                                  <p className="text-[10px] font-medium text-emerald-500">+{p.delta7d}pp</p>
                                )}
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#1A365D] flex-shrink-0 transition-colors" />
                            </div>
                            {/* Mini progress bar */}
                            <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${p.avgProgress}%`, backgroundColor: barColor }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Impediments compact */}
                {recentActivity.impediments.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-500" />
                      {recentActivity.impediments.length} Impedimento{recentActivity.impediments.length > 1 ? 's' : ''} activo{recentActivity.impediments.length > 1 ? 's' : ''}
                    </p>
                    <div className="space-y-1">
                      {recentActivity.impediments.slice(0, 2).map((imp, idx) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded bg-amber-50 border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
                          onClick={() => router.push(`/dashboard/tareas?search=${encodeURIComponent(imp.taskName)}`)}
                        >
                          <p className="text-[10px] font-medium text-amber-800 truncate">{imp.taskName}</p>
                          <p className="text-[9px] text-gray-500">{imp.responsables.join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
