'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Search,
  Filter,
  Download,
  Loader2,
  Upload,
  Paperclip,
  X,
  Eye,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Target,
  Plus,
  History,
  Save,
  ChevronDown,
  ChevronUp,
  User,
  Trash2,
  Square,
  CheckSquare,
  ListChecks,
} from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Task {
  id: string;
  name: string;
  description?: string;
  entregable?: string;
  descripcionEntregable?: string;
  status: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO';
  progress: number;
  plannedWeeks?: string;
  comments?: string;
  impedimento?: string;
  dailyPresente?: string;
  dailyFuturo?: string;
  orden: number;
  project: {
    id: string;
    name: string;
    color: string;
    team?: { name: string; color: string };
  };
  assignments: Array<{
    responsable: { id: string; name: string };
  }>;
  _count?: { attachments: number };
  attachments?: Array<{ id: string; fileName: string; downloadUrl?: string }>;
}

interface AttachmentWithUrl {
  id: string;
  fileName: string;
  fileSize: number | null;
  downloadUrl: string;
  isPreview?: boolean;
  mimeType?: string;
}

interface DailyEntry {
  id: string;
  taskId: string;
  userId: string;
  userName: string | null;
  impedimento: string | null;
  dailyPresente: string | null;
  dailyFuturo: string | null;
  fecha: string;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Project {
  id: string;
  name: string;
  team?: { id: string; name: string };
}

interface Team {
  id: string;
  name: string;
  color: string;
}

interface Responsable {
  id: string;
  name: string;
  team?: { id: string; name: string };
}

const STATUS_OPTIONS = [
  { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'EN_PROGRESO', label: 'En Progreso', color: 'bg-ungrd-yellow/20 text-ungrd-yellow-dark border-ungrd-yellow' },
  { value: 'COMPLETADO', label: 'Completado', color: 'bg-green-100 text-green-700 border-green-500' },
];

export default function TareasPage() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [projectId, setProjectId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [status, setStatus] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [search, setSearch] = useState('');

  // Task detail modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState('');
  const [editComments, setEditComments] = useState('');
  const [editImpedimento, setEditImpedimento] = useState('');
  const [editDailyPresente, setEditDailyPresente] = useState('');
  const [editDailyFuturo, setEditDailyFuturo] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exportingDaily, setExportingDaily] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState<AttachmentWithUrl[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  
  // Daily History States
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [loadingDailyEntries, setLoadingDailyEntries] = useState(false);
  const [savingDaily, setSavingDaily] = useState(false);
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [showDailyHistory, setShowDailyHistory] = useState(true);
  const [newDailyPresente, setNewDailyPresente] = useState('');
  const [newDailyFuturo, setNewDailyFuturo] = useState('');
  const [newImpedimento, setNewImpedimento] = useState('');

  // SubTasks States (Sistema de Progreso Automático)
  interface SubTask {
    id: string;
    name: string;
    description: string | null;
    isCompleted: boolean;
    completedAt: string | null;
    orden: number;
  }
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [loadingSubTasks, setLoadingSubTasks] = useState(false);
  const [subTaskProgress, setSubTaskProgress] = useState(0);
  const [newSubTaskName, setNewSubTaskName] = useState('');
  const [addingSubTask, setAddingSubTask] = useState(false);
  const [showAddSubTask, setShowAddSubTask] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      if (teamId) params.append('teamId', teamId);
      if (status) params.append('status', status);
      if (responsableId) params.append('responsableId', responsableId);
      if (search) params.append('search', search);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, teamId, status, responsableId, search]);

  const fetchFilters = async () => {
    try {
      const [projRes, teamRes, respRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/dashboard/team-stats'),
        fetch('/api/responsables'),
      ]);
      const projData = await projRes.json();
      const teamData = await teamRes.json();
      const respData = await respRes.json();
      setProjects(projData || []);
      setTeams(teamData || []);
      setResponsables(respData || []);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const fetchTaskAttachments = async (taskId: string) => {
    setLoadingAttachments(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`);
      const data = await res.json();
      setTaskAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      setTaskAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Fetch daily entries for a task
  const fetchDailyEntries = async (taskId: string) => {
    setLoadingDailyEntries(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/daily-entries`);
      const data = await res.json();
      setDailyEntries(data.entries || []);
    } catch (error) {
      console.error('Error fetching daily entries:', error);
      setDailyEntries([]);
    } finally {
      setLoadingDailyEntries(false);
    }
  };

  // Fetch subtasks for a task
  const fetchSubTasks = async (taskId: string) => {
    setLoadingSubTasks(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`);
      const data = await res.json();
      setSubTasks(data.subtasks || []);
      setSubTaskProgress(data.progress || 0);
    } catch (error) {
      console.error('Error fetching subtasks:', error);
      setSubTasks([]);
    } finally {
      setLoadingSubTasks(false);
    }
  };

  // Add new subtask
  const handleAddSubTask = async () => {
    if (!selectedTask || !newSubTaskName.trim()) return;
    setAddingSubTask(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubTaskName.trim() }),
      });
      if (res.ok) {
        setNewSubTaskName('');
        setShowAddSubTask(false);
        await fetchSubTasks(selectedTask.id);
        fetchTasks();
      }
    } catch (error) {
      console.error('Error adding subtask:', error);
    } finally {
      setAddingSubTask(false);
    }
  };

  // Toggle subtask completion
  const handleToggleSubTask = async (subtaskId: string, currentState: boolean) => {
    if (!selectedTask) return;
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/subtasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId, isCompleted: !currentState }),
      });
      if (res.ok) {
        await fetchSubTasks(selectedTask.id);
        fetchTasks();
      }
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  // Delete subtask
  const handleDeleteSubTask = async (subtaskId: string) => {
    if (!selectedTask) return;
    if (!confirm('¿Eliminar esta actividad?')) return;
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/subtasks?subtaskId=${subtaskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchSubTasks(selectedTask.id);
        fetchTasks();
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  // Save new daily entry (permanent storage)
  const handleSaveNewDaily = async () => {
    if (!selectedTask) return;
    if (!newDailyPresente && !newDailyFuturo && !newImpedimento) {
      alert('Debe completar al menos un campo del daily');
      return;
    }
    
    setSavingDaily(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/daily-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyPresente: newDailyPresente,
          dailyFuturo: newDailyFuturo,
          impedimento: newImpedimento,
        }),
      });
      
      if (res.ok) {
        // Clear form
        setNewDailyPresente('');
        setNewDailyFuturo('');
        setNewImpedimento('');
        setShowDailyForm(false);
        // Refresh daily entries
        await fetchDailyEntries(selectedTask.id);
        // Also refresh tasks to show updated last daily
        fetchTasks();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al guardar el daily');
      }
    } catch (error) {
      console.error('Error saving daily:', error);
      alert('Error al guardar el daily');
    } finally {
      setSavingDaily(false);
    }
  };

  // Export daily history for a task
  const handleExportDailyHistory = async () => {
    if (!selectedTask) return;
    setExportingDaily(true);
    try {
      const res = await fetch(`/api/export/daily-history?taskId=${selectedTask.id}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Historial_Daily_${selectedTask.project.name}_${new Date().toLocaleDateString('es-CO').replace(/\//g, '-')}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting daily history:', error);
    } finally {
      setExportingDaily(false);
    }
  };

  // Format date for display
  const formatDailyDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openTaskModal = (task: Task) => {
    setSelectedTask(task);
    setEditProgress(task.progress);
    setEditStatus(task.status);
    setEditComments(task.comments || '');
    setEditImpedimento(task.impedimento || '');
    setEditDailyPresente(task.dailyPresente || '');
    setEditDailyFuturo(task.dailyFuturo || '');
    setTaskAttachments([]);
    setDailyEntries([]);
    setSubTasks([]);
    setShowDailyForm(false);
    setShowAddSubTask(false);
    setNewDailyPresente('');
    setNewDailyFuturo('');
    setNewImpedimento('');
    setNewSubTaskName('');
    fetchTaskAttachments(task.id);
    fetchDailyEntries(task.id);
    fetchSubTasks(task.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedTask(null);
    setModalOpen(false);
    setTaskAttachments([]);
    setDailyEntries([]);
    setSubTasks([]);
    setShowDailyForm(false);
    setShowAddSubTask(false);
  };

  const handleDownloadFile = async (attachment: AttachmentWithUrl) => {
    setDownloadingFile(attachment.id);
    try {
      if (attachment.isPreview) {
        // Open preview HTML in new tab
        window.open(attachment.downloadUrl, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = attachment.downloadUrl;
        a.download = attachment.fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading:', error);
    } finally {
      setTimeout(() => setDownloadingFile(null), 1000);
    }
  };

  const handleSave = async () => {
    if (!selectedTask) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: editProgress,
          status: editStatus,
          comments: editComments,
          impedimento: editImpedimento,
          dailyPresente: editDailyPresente,
          dailyFuturo: editDailyFuturo,
        }),
      });
      if (res.ok) {
        fetchTasks();
        closeModal();
      }
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTask || !e.target.files?.length) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      // Get presigned URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      });
      const { uploadUrl, cloudStoragePath } = await presignedRes.json();

      // Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      // Register attachment
      await fetch(`/api/tasks/${selectedTask.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          cloudStoragePath,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      fetchTasks();
      fetchTaskAttachments(selectedTask.id);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (taskStatus: string) => {
    const statusOpt = STATUS_OPTIONS.find((s) => s.value === taskStatus);
    return (
      <Badge className={`${statusOpt?.color || ''} border`}>
        {statusOpt?.label || taskStatus}
      </Badge>
    );
  };

  const clearFilters = () => {
    setProjectId('');
    setTeamId('');
    setStatus('');
    setResponsableId('');
    setSearch('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-ungrd-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ungrd-blue">Plan de Trabajo</h1>
          <p className="text-gray-600">Gestión de actividades del proyecto</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {tasks.length} actividades
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar actividad o entregable..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Equipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los equipos</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={responsableId} onValueChange={setResponsableId}>
              <SelectTrigger>
                <SelectValue placeholder="Persona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las personas</SelectItem>
                {responsables.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(projectId || teamId || status || responsableId || search) && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-500">Filtros activos:</span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <Card
            key={task.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => openTaskModal(task)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Order number */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-ungrd-blue/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-ungrd-blue">{task.orden || index + 1}</span>
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          style={{ backgroundColor: task.project.color }}
                          className="text-white text-xs"
                        >
                          {task.project.name}
                        </Badge>
                        {task.project.team && (
                          <Badge variant="outline" className="text-xs">
                            {task.project.team.name}
                          </Badge>
                        )}
                        {getStatusBadge(task.status)}
                      </div>
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{task.name}</h3>
                    </div>
                    <Button variant="ghost" size="sm" className="flex-shrink-0">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver detalle
                    </Button>
                  </div>

                  {task.entregable && (
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-ungrd-yellow" />
                      <span className="text-sm text-gray-700 font-medium">{task.entregable}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{task.assignments.map((a) => a.responsable.name).join(', ') || 'Sin asignar'}</span>
                    </div>
                    {task.plannedWeeks && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{task.plannedWeeks}</span>
                      </div>
                    )}
                    {(task._count?.attachments || 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <Paperclip className="h-4 w-4" />
                        <span>{task._count?.attachments} archivos</span>
                      </div>
                    )}
                    {task.impedimento && (
                      <div className="flex items-center gap-1 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Con impedimento</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={task.progress} className="flex-1 h-2" />
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">
                      {task.progress}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {tasks.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No se encontraron actividades con los filtros seleccionados</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge style={{ backgroundColor: selectedTask.project.color }} className="text-white">
                    {selectedTask.project.name}
                  </Badge>
                  {selectedTask.project.team && (
                    <Badge variant="outline">{selectedTask.project.team.name}</Badge>
                  )}
                  {getStatusBadge(selectedTask.status)}
                </div>
                <DialogTitle className="text-xl">{selectedTask.name}</DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="info" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info">Información</TabsTrigger>
                  <TabsTrigger value="progress">Progreso</TabsTrigger>
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="files">Archivos</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  {/* Entregable Section */}
                  <Card className="bg-ungrd-yellow/5 border-ungrd-yellow/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4 text-ungrd-yellow" />
                        Entregable
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`font-semibold ${selectedTask.entregable ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                        {selectedTask.entregable || 'Pendiente de definir'}
                      </p>
                      {selectedTask.descripcionEntregable && (
                        <p className="mt-2 text-sm text-gray-600">{selectedTask.descripcionEntregable}</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Activity Details */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Descripción de la Actividad</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {selectedTask.description || selectedTask.name}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-ungrd-blue" />
                          <span className="text-sm font-medium">Responsable(s)</span>
                        </div>
                        <p className="text-gray-700">
                          {selectedTask.assignments.map((a) => a.responsable.name).join(', ') || 'Sin asignar'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-ungrd-blue" />
                          <span className="text-sm font-medium">Semanas Planificadas</span>
                        </div>
                        <p className="text-gray-700">{selectedTask.plannedWeeks || 'No especificado'}</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* NUEVA PESTAÑA: Progreso con Subtareas */}
                <TabsContent value="progress" className="space-y-4 mt-4">
                  {/* Barra de Progreso Automático */}
                  <Card className="bg-gradient-to-r from-ungrd-blue/5 to-ungrd-yellow/5 border-ungrd-blue/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ListChecks className="h-4 w-4 text-ungrd-blue" />
                          Progreso Automático
                        </CardTitle>
                        <span className="text-2xl font-bold text-ungrd-blue">{subTaskProgress}%</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-ungrd-blue to-ungrd-yellow rounded-full transition-all duration-500"
                          style={{ width: `${subTaskProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {subTasks.filter(s => s.isCompleted).length} de {subTasks.length} actividades completadas
                      </p>
                    </CardContent>
                  </Card>

                  {/* Lista de Actividades/Subtareas */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Actividades del Plan de Trabajo</CardTitle>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddSubTask(!showAddSubTask)}
                          className="text-ungrd-blue border-ungrd-blue hover:bg-ungrd-blue/10"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Formulario para agregar nueva actividad */}
                      {showAddSubTask && (
                        <div className="flex gap-2 p-3 bg-gray-50 rounded-lg">
                          <Input
                            placeholder="Nombre de la actividad..."
                            value={newSubTaskName}
                            onChange={(e) => setNewSubTaskName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddSubTask()}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={handleAddSubTask}
                            disabled={addingSubTask || !newSubTaskName.trim()}
                            className="bg-ungrd-blue hover:bg-ungrd-blue-dark"
                          >
                            {addingSubTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setShowAddSubTask(false); setNewSubTaskName(''); }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Lista de subtareas */}
                      {loadingSubTasks ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-ungrd-blue" />
                        </div>
                      ) : subTasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <ListChecks className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No hay actividades definidas</p>
                          <p className="text-sm">Agrega actividades para calcular el progreso automáticamente</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {subTasks.map((subtask) => (
                            <div
                              key={subtask.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                subtask.isCompleted
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-white border-gray-200 hover:border-ungrd-blue/50'
                              }`}
                            >
                              <button
                                onClick={() => handleToggleSubTask(subtask.id, subtask.isCompleted)}
                                className="flex-shrink-0"
                              >
                                {subtask.isCompleted ? (
                                  <CheckSquare className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Square className="h-5 w-5 text-gray-400 hover:text-ungrd-blue" />
                                )}
                              </button>
                              <span
                                className={`flex-1 ${
                                  subtask.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                                }`}
                              >
                                {subtask.name}
                              </span>
                              <button
                                onClick={() => handleDeleteSubTask(subtask.id)}
                                className="text-gray-400 hover:text-red-500 flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Nota informativa */}
                  <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p>
                      El progreso se calcula automáticamente según las actividades completadas. 
                      Al chequear actividades, la barra de progreso y el estado de la tarea se actualizan automáticamente.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="daily" className="space-y-4 mt-4">
                  {/* Daily Section - NEW ENTRY */}
                  <Card className="bg-ungrd-blue/5 border-ungrd-blue/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Clock className="h-4 w-4 text-ungrd-blue" />
                          Registrar Daily
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExportDailyHistory}
                            disabled={exportingDaily}
                            className="bg-white"
                          >
                            {exportingDaily ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Download className="h-4 w-4 mr-1" />
                            )}
                            Exportar Historial
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setShowDailyForm(!showDailyForm)}
                            className="bg-ungrd-yellow hover:bg-ungrd-yellow-dark text-black"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar Daily
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {showDailyForm && (
                      <CardContent className="space-y-4 border-t border-ungrd-blue/20 pt-4">
                        <div className="bg-white p-4 rounded-lg border border-ungrd-blue/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-4 w-4 text-ungrd-blue" />
                            <span className="text-sm font-medium text-gray-700">
                              Nuevo registro - {new Date().toLocaleDateString('es-CO', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium">¿Qué se hizo? (Presente/Ayer)</Label>
                              <Textarea
                                value={newDailyPresente}
                                onChange={(e) => setNewDailyPresente(e.target.value)}
                                placeholder="Describe lo que se realizó..."
                                className="mt-1"
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">¿Qué se hará? (Futuro/Mañana)</Label>
                              <Textarea
                                value={newDailyFuturo}
                                onChange={(e) => setNewDailyFuturo(e.target.value)}
                                placeholder="Describe las próximas actividades..."
                                className="mt-1"
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                Impedimentos / Bloqueos
                              </Label>
                              <Textarea
                                value={newImpedimento}
                                onChange={(e) => setNewImpedimento(e.target.value)}
                                placeholder="Describe cualquier impedimento o bloqueo..."
                                className="mt-1"
                                rows={2}
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                onClick={handleSaveNewDaily} 
                                disabled={savingDaily}
                                className="flex-1 bg-ungrd-blue hover:bg-ungrd-blue-dark"
                              >
                                {savingDaily ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Save className="h-4 w-4 mr-2" />
                                )}
                                Guardar Daily (Permanente)
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => {
                                  setShowDailyForm(false);
                                  setNewDailyPresente('');
                                  setNewDailyFuturo('');
                                  setNewImpedimento('');
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 text-center">
                          ⚠️ Los dailies se guardan permanentemente y no se pueden eliminar
                        </p>
                      </CardContent>
                    )}
                  </Card>

                  {/* Daily History Section */}
                  <Card className="border-gray-200">
                    <CardHeader className="pb-2">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setShowDailyHistory(!showDailyHistory)}
                      >
                        <CardTitle className="text-sm flex items-center gap-2">
                          <History className="h-4 w-4 text-gray-600" />
                          Historial de Dailies ({dailyEntries.length})
                        </CardTitle>
                        {showDailyHistory ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                    </CardHeader>
                    
                    {showDailyHistory && (
                      <CardContent className="pt-0">
                        {loadingDailyEntries ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-ungrd-blue" />
                          </div>
                        ) : dailyEntries.length > 0 ? (
                          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {dailyEntries.map((entry, index) => (
                              <div
                                key={entry.id}
                                className={`p-4 rounded-lg border ${
                                  index === 0 ? 'bg-ungrd-yellow/10 border-ungrd-yellow/30' : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-ungrd-blue" />
                                    <span className="text-sm font-medium text-gray-900">
                                      {formatDailyDate(entry.fecha)}
                                    </span>
                                    {index === 0 && (
                                      <Badge className="bg-ungrd-yellow text-black text-xs">Último</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <User className="h-3 w-3" />
                                    {entry.userName || entry.user?.name || entry.user?.email || 'Usuario'}
                                  </div>
                                </div>
                                
                                {entry.dailyPresente && (
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-gray-600 uppercase">Lo que se hizo:</span>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{entry.dailyPresente}</p>
                                  </div>
                                )}
                                
                                {entry.dailyFuturo && (
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-gray-600 uppercase">Lo que se hará:</span>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{entry.dailyFuturo}</p>
                                  </div>
                                )}
                                
                                {entry.impedimento && (
                                  <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                                    <span className="text-xs font-semibold text-orange-700 uppercase flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Impedimento:
                                    </span>
                                    <p className="text-sm text-orange-800 whitespace-pre-wrap mt-1">{entry.impedimento}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <History className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">No hay registros de daily</p>
                            <p className="text-xs text-gray-400 mt-1">Haz clic en &quot;Agregar Daily&quot; para crear el primer registro</p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>

                  {/* Comments */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Comentarios Adicionales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={editComments}
                        onChange={(e) => setEditComments(e.target.value)}
                        placeholder="Comentarios adicionales..."
                        rows={3}
                      />
                      <Button onClick={handleSave} disabled={saving} className="w-full mt-3 bg-ungrd-blue hover:bg-ungrd-blue-dark">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar Comentarios
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="files" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Archivos Adjuntos ({taskAttachments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <div className="text-center">
                            {uploading ? (
                              <Loader2 className="h-6 w-6 animate-spin mx-auto text-ungrd-blue" />
                            ) : (
                              <>
                                <Upload className="h-6 w-6 mx-auto text-gray-400" />
                                <span className="text-sm text-gray-500 mt-1">Clic para subir archivo</span>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                        </label>
                      </div>

                      {loadingAttachments ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-ungrd-blue" />
                        </div>
                      ) : taskAttachments.length > 0 ? (
                        <div className="space-y-2">
                          {taskAttachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="p-2 bg-ungrd-blue/10 rounded-lg">
                                  <Paperclip className="h-5 w-5 text-ungrd-blue" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate" title={att.fileName}>
                                    {att.fileName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'Tamaño desconocido'}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleDownloadFile(att)}
                                disabled={downloadingFile === att.id}
                                className="bg-ungrd-blue hover:bg-ungrd-blue-dark ml-3"
                              >
                                {downloadingFile === att.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                                <span className="ml-1">{att.isPreview ? 'Ver' : 'Descargar'}</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Paperclip className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm text-gray-500">No hay archivos adjuntos</p>
                          <p className="text-xs text-gray-400 mt-1">Sube archivos usando el botón de arriba</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
