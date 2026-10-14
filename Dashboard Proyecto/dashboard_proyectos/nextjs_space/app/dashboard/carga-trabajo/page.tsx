'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Briefcase,
  Search,
  Users,
  Layers,
  Loader2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  BarChart3,
  UserCircle,
  FolderKanban,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ProjectInWorkload {
  id: string;
  name: string;
  prioridad: string | null;
  color: string | null;
  taskCount: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  avgProgress: number;
}

interface WorkloadPerson {
  id: string;
  name: string;
  email: string | null;
  team: { id: string; name: string; color: string } | null;
  totalProjects: number;
  totalTasks: number;
  totalCompleted: number;
  totalInProgress: number;
  totalPending: number;
  avgProgress: number;
  projects: ProjectInWorkload[];
}

interface ProjectSummary {
  id: string;
  name: string;
  prioridad: string | null;
  color: string | null;
  totalPeople: number;
  peopleNames: string[];
}

interface WorkloadData {
  workload: WorkloadPerson[];
  projectSummary: ProjectSummary[];
  totalPeople: number;
  avgProjectsPerPerson: number;
  maxProjects: number;
}

function getLoadLevel(totalProjects: number): { label: string; color: string; bg: string } {
  if (totalProjects >= 5) return { label: 'Muy Alta', color: 'text-red-700', bg: 'bg-red-100' };
  if (totalProjects >= 4) return { label: 'Alta', color: 'text-orange-700', bg: 'bg-orange-100' };
  if (totalProjects >= 3) return { label: 'Media', color: 'text-yellow-700', bg: 'bg-yellow-100' };
  if (totalProjects >= 2) return { label: 'Moderada', color: 'text-blue-700', bg: 'bg-blue-100' };
  return { label: 'Baja', color: 'text-green-700', bg: 'bg-green-100' };
}

function getBarColor(totalProjects: number): string {
  if (totalProjects >= 5) return '#DC2626';
  if (totalProjects >= 4) return '#EA580C';
  if (totalProjects >= 3) return '#CA8A04';
  if (totalProjects >= 2) return '#2563EB';
  return '#16A34A';
}

export default function CargaTrabajoPage() {
  const [data, setData] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'projects' | 'tasks' | 'name'>('projects');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard/workload');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Error fetching workload:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const teams = useMemo(() => {
    if (!data) return [];
    const teamSet = new Map<string, string>();
    data.workload.forEach((w) => {
      if (w.team) teamSet.set(w.team.id, w.team.name);
    });
    return Array.from(teamSet.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.workload;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((w) => w.name.toLowerCase().includes(s));
    }
    if (teamFilter !== 'all') {
      list = list.filter((w) => w.team?.id === teamFilter);
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'projects') cmp = a.totalProjects - b.totalProjects;
      else if (sortBy === 'tasks') cmp = a.totalTasks - b.totalTasks;
      else cmp = a.name.localeCompare(b.name);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [data, search, teamFilter, sortBy, sortDir]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.workload
      .filter((w) => w.totalProjects > 0)
      .sort((a, b) => b.totalProjects - a.totalProjects)
      .map((w) => ({
        name: w.name.split(' ').slice(0, 2).join(' '),
        fullName: w.name,
        proyectos: w.totalProjects,
        tareas: w.totalTasks,
      }));
  }, [data]);

  const toggleSort = (field: 'projects' | 'tasks' | 'name') => {
    if (sortBy === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-ungrd-blue" />
        <span className="ml-3 text-gray-500">Cargando carga de trabajo...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        Error al cargar los datos de carga de trabajo.
      </div>
    );
  }

  const highLoad = data.workload.filter((w) => w.totalProjects >= 4).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A365D] to-[#2B6CB0] rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Briefcase className="w-7 h-7" />
          <h1 className="text-2xl font-bold">Carga de Trabajo por Proyectos</h1>
        </div>
        <p className="text-white/70 text-sm">
          Distribución de personas por proyecto — Datos en tiempo real del sistema
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1A365D]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#1A365D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A365D]">{data.totalPeople}</p>
                <p className="text-xs text-gray-500">Personas Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1A365D]/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[#1A365D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A365D]">{data.avgProjectsPerPerson}</p>
                <p className="text-xs text-gray-500">Promedio Proyectos/Persona</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1A365D]/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#1A365D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A365D]">{data.maxProjects}</p>
                <p className="text-xs text-gray-500">Máx. Proyectos/Persona</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{highLoad}</p>
                <p className="text-xs text-gray-500">Carga Alta (≥4 proy.)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart: Projects per person */}
      {chartData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#1A365D]" />
              Proyectos por Persona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: Math.max(300, chartData.length * 38) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={140}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value,
                      name === 'proyectos' ? 'Proyectos' : 'Tareas',
                    ]}
                    labelFormatter={(label: string, payload: any[]) => {
                      if (payload && payload[0]) return payload[0].payload.fullName;
                      return label;
                    }}
                    contentStyle={{ borderRadius: 8, fontSize: 13 }}
                  />
                  <Bar dataKey="proyectos" radius={[0, 6, 6, 0]} barSize={22}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.proyectos)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar persona..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Equipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los equipos</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-700">
                    Persona
                    {sortBy === 'name' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Equipo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <button onClick={() => toggleSort('projects')} className="flex items-center gap-1 mx-auto hover:text-gray-700">
                    Proyectos
                    {sortBy === 'projects' && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <button onClick={() => toggleSort('tasks')} className="flex items-center gap-1 mx-auto hover:text-gray-700">
                    Tareas
                    {sortBy === 'tasks' && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Carga</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Avance</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((person) => {
                const load = getLoadLevel(person.totalProjects);
                const isExpanded = expandedPerson === person.id;
                return (
                  <>
                    <tr
                      key={person.id}
                      className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedPerson(isExpanded ? null : person.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1A365D] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {person.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{person.name}</p>
                            {person.email && <p className="text-xs text-gray-400 truncate">{person.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {person.team && (
                          <Badge variant="outline" className="text-xs">
                            {person.team.name}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-bold text-[#1A365D]">{person.totalProjects}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-gray-700">{person.totalTasks}</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${load.color} ${load.bg}`}>
                          {load.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20">
                            <Progress value={person.avgProgress} className="h-2" />
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-8">{person.avgProgress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${person.id}-detail`}>
                        <td colSpan={7} className="bg-gray-50/80 px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
                            {person.projects.map((proj) => (
                              <div key={proj.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                                <div className="flex items-start gap-2 mb-2">
                                  <div
                                    className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                                    style={{ backgroundColor: proj.color || '#1A365D' }}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 leading-tight">{proj.name}</p>
                                    {proj.prioridad && (
                                      <p className="text-xs text-gray-400">Prioridad {proj.prioridad}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                                  <span className="flex items-center gap-1">
                                    <Layers className="w-3 h-3" /> {proj.taskCount} tareas
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-green-500" /> {proj.completedTasks}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-blue-500" /> {proj.inProgressTasks}
                                  </span>
                                </div>
                                <Progress value={Math.round(proj.avgProgress)} className="h-1.5" />
                                <p className="text-xs text-gray-400 mt-1 text-right">{Math.round(proj.avgProgress)}%</p>
                              </div>
                            ))}
                          </div>
                          {person.projects.length === 0 && (
                            <p className="text-sm text-gray-400 italic">Sin proyectos asignados actualmente</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">
                    No se encontraron personas con los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Project Distribution */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#1A365D]" />
            Personas por Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.projectSummary.map((proj) => (
              <div key={proj.id} className="border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: proj.color || '#1A365D' }}
                  />
                  <p className="text-sm font-medium text-gray-900 truncate">{proj.name}</p>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {proj.totalPeople}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {proj.peopleNames.map((name, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {name.split(' ').slice(0, 2).join(' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
