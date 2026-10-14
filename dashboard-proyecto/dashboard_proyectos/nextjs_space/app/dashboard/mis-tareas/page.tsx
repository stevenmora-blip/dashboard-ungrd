'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Search,
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
  Download,
  Plus,
  History,
  Save,
  ChevronDown,
  ChevronUp,
  User,
  Pencil,
  Trash2,
  FolderOpen,
  Shield,
  Info,
  LogIn,
  LogOut,
  Globe,
  UserPlus,
  UserMinus,
  Filter,
  LayoutGrid,
  List,
  Check,
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
  DialogFooter,
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
  attachments?: Array<{ id: string; fileName: string }>;
}

interface ProjectOption {
  id: string;
  name: string;
  color: string;
}

interface ResponsableOption {
  id: string;
  name: string;
}

interface AllProject {
  id: string;
  name: string;
  color: string;
  _count?: { tasks: number };
}

interface ProjectTask {
  id: string;
  name: string;
  entregable?: string;
  status: string;
  progress: number;
  assignments: Array<{ responsable: { id: string; name: string } }>;
  project: { id: string; name: string; color: string };
}

interface AttachmentWithUrl {
  id: string;
  fileName: string;
  fileSize: number | null;
  downloadUrl: string;
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

const STATUS_OPTIONS = [
  { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-gray-100 text-gray-700 border-gray-300', dot: 'bg-gray-400' },
  { value: 'EN_PROGRESO', label: 'En Progreso', color: 'bg-amber-50 text-amber-700 border-amber-300', dot: 'bg-amber-400' },
  { value: 'COMPLETADO', label: 'Completado', color: 'bg-green-50 text-green-700 border-green-400', dot: 'bg-green-500' },
];

export default function MisTareasPage() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const sessionResponsableId = (session?.user as any)?.responsableId;
  const [resolvedResponsableId, setResolvedResponsableId] = useState<string | null>(null);
  const userResponsableId = sessionResponsableId || resolvedResponsableId;

  // If session doesn't have responsableId, fetch from DB
  useEffect(() => {
    if (session && !sessionResponsableId) {
      const userId = (session.user as any)?.id;
      if (userId) {
        fetch(`/api/users/${userId}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.responsableId) setResolvedResponsableId(data.responsableId);
          })
          .catch(() => {});
      }
    }
  }, [session, sessionResponsableId]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterResponsable, setFilterResponsable] = useState('');

  // Projects & Responsables for filters
  const [userProjects, setUserProjects] = useState<ProjectOption[]>([]);
  const [responsables, setResponsables] = useState<ResponsableOption[]>([]);

  // View mode
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');

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

  // Create/Edit Activity modal
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityMode, setActivityMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [activityName, setActivityName] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityEntregable, setActivityEntregable] = useState('');
  const [activityProjectId, setActivityProjectId] = useState('');
  const [savingActivity, setSavingActivity] = useState(false);

  // Inline name edit
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [savingInline, setSavingInline] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Edit inline mode in modal
  const [editingInline, setEditingInline] = useState(false);
  const [inlineName, setInlineName] = useState('');
  const [inlineDescription, setInlineDescription] = useState('');
  const [inlineEntregable, setInlineEntregable] = useState('');

  // Browse Projects (join/leave)
  const [browseModalOpen, setBrowseModalOpen] = useState(false);
  const [allProjects, setAllProjects] = useState<AllProject[]>([]);
  const [selectedBrowseProject, setSelectedBrowseProject] = useState<string>('');
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [loadingProjectTasks, setLoadingProjectTasks] = useState(false);
  const [joiningTask, setJoiningTask] = useState<string | null>(null);
  const [leavingTask, setLeavingTask] = useState<string | null>(null);

  // All projects for create modal
  const [allProjectsForCreate, setAllProjectsForCreate] = useState<ProjectOption[]>([]);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      if (filterProject && filterProject !== 'all') params.append('projectId', filterProject);
      if (filterResponsable && filterResponsable !== 'all') params.append('responsableId', filterResponsable);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      const taskList = data.tasks || [];
      setTasks(taskList);

      // Extract unique projects
      const projectMap = new Map<string, ProjectOption>();
      taskList.forEach((t: Task) => {
        if (!projectMap.has(t.project.id)) {
          projectMap.set(t.project.id, { id: t.project.id, name: t.project.name, color: t.project.color });
        }
      });
      setUserProjects(Array.from(projectMap.values()));
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [status, search, filterProject, filterResponsable]);

  // Fetch responsables
  const fetchResponsables = useCallback(async () => {
    try {
      const res = await fetch('/api/responsables');
      const data = await res.json();
      setResponsables((data || []).map((r: any) => ({ id: r.id, name: r.name })));
    } catch (error) {
      console.error('Error fetching responsables:', error);
    }
  }, []);

  // Fetch all projects for create modal and browse
  const fetchAllProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      const projects = (data || []).map((p: any) => ({ id: p.id, name: p.name, color: p.color || '#1A365D', _count: p._count }));
      setAllProjects(projects);
      setAllProjectsForCreate(projects);
    } catch (error) {
      console.error('Error fetching all projects:', error);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchAllProjects();
    fetchResponsables();
  }, [fetchTasks, fetchAllProjects, fetchResponsables]);

  // Browse project tasks
  const fetchProjectTasks = async (projectId: string) => {
    setLoadingProjectTasks(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      const data = await res.json();
      setProjectTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      setProjectTasks([]);
    } finally {
      setLoadingProjectTasks(false);
    }
  };

  const openBrowseModal = () => {
    setSelectedBrowseProject('');
    setProjectTasks([]);
    setBrowseModalOpen(true);
  };

  const handleSelectBrowseProject = (projectId: string) => {
    setSelectedBrowseProject(projectId);
    if (projectId) {
      fetchProjectTasks(projectId);
    } else {
      setProjectTasks([]);
    }
  };

  const handleJoinTask = async (taskId: string) => {
    setJoiningTask(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignment`, { method: 'POST' });
      if (res.ok) {
        // If we didn't have a responsableId, refresh it from DB (auto-created by API)
        if (!userResponsableId) {
          const userId = (session?.user as any)?.id;
          if (userId) {
            try {
              const uRes = await fetch(`/api/users/${userId}`);
              if (uRes.ok) {
                const uData = await uRes.json();
                if (uData?.responsableId) setResolvedResponsableId(uData.responsableId);
              }
            } catch {}
          }
        }
        if (selectedBrowseProject) fetchProjectTasks(selectedBrowseProject);
        fetchTasks();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al unirse');
      }
    } catch (error) {
      console.error('Error joining task:', error);
      alert('Error al unirse a la actividad');
    } finally {
      setJoiningTask(null);
    }
  };

  const handleLeaveTask = async (taskId: string, fromBrowse = false) => {
    setLeavingTask(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignment`, { method: 'DELETE' });
      if (res.ok) {
        if (fromBrowse && selectedBrowseProject) fetchProjectTasks(selectedBrowseProject);
        fetchTasks();
        if (selectedTask?.id === taskId) {
          closeModal();
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Error al retirarse');
      }
    } catch (error) {
      console.error('Error leaving task:', error);
      alert('Error al retirarse de la actividad');
    } finally {
      setLeavingTask(null);
    }
  };

  const isSoleOwner = (task: Task) => {
    return task.assignments.length === 1 && task.assignments[0]?.responsable?.id === userResponsableId;
  };

  const isSharedTask = (task: Task) => {
    return task.assignments.length > 1;
  };

  // --- CRUD Handlers ---

  const openCreateActivity = () => {
    setActivityMode('create');
    setEditingTaskId(null);
    setActivityName('');
    setActivityDescription('');
    setActivityEntregable('');
    setActivityProjectId(allProjectsForCreate[0]?.id || '');
    setActivityModalOpen(true);
  };

  const openEditActivity = (task: Task) => {
    setActivityMode('edit');
    setEditingTaskId(task.id);
    setActivityName(task.name);
    setActivityDescription(task.description || '');
    setActivityEntregable(task.entregable || '');
    setActivityProjectId(task.project.id);
    setActivityModalOpen(true);
  };

  const handleSaveActivity = async () => {
    if (!activityName.trim()) {
      alert('El nombre de la actividad es requerido');
      return;
    }
    if (!activityProjectId) {
      alert('Debes seleccionar un proyecto');
      return;
    }

    setSavingActivity(true);
    try {
      if (activityMode === 'create') {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: activityName.trim(),
            description: activityDescription.trim() || null,
            entregable: activityEntregable.trim() || null,
            projectId: activityProjectId,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Error al crear actividad');
          return;
        }
      } else if (activityMode === 'edit' && editingTaskId) {
        const res = await fetch(`/api/tasks/${editingTaskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: activityName.trim(),
            description: activityDescription.trim() || null,
            entregable: activityEntregable.trim() || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Error al editar actividad');
          return;
        }
      }
      setActivityModalOpen(false);
      fetchTasks();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Error al guardar la actividad');
    } finally {
      setSavingActivity(false);
    }
  };

  // Inline name edit on list
  const startInlineEdit = (task: Task) => {
    setInlineEditId(task.id);
    setInlineEditValue(task.name);
  };

  const cancelInlineEdit = () => {
    setInlineEditId(null);
    setInlineEditValue('');
  };

  const saveInlineEdit = async (taskId: string) => {
    if (!inlineEditValue.trim()) return;
    setSavingInline(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inlineEditValue.trim() }),
      });
      if (res.ok) {
        setInlineEditId(null);
        fetchTasks();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al renombrar');
      }
    } catch (error) {
      console.error('Error saving inline edit:', error);
    } finally {
      setSavingInline(false);
    }
  };

  const openDeleteConfirmation = (task: Task) => {
    setTaskToDelete(task);
    setDeleteConfirmText('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${taskToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al eliminar la actividad');
        return;
      }
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
      if (selectedTask?.id === taskToDelete.id) {
        closeModal();
      }
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error al eliminar la actividad');
    } finally {
      setDeleting(false);
    }
  };

  // --- Existing handlers ---

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
        setNewDailyPresente('');
        setNewDailyFuturo('');
        setNewImpedimento('');
        setShowDailyForm(false);
        await fetchDailyEntries(selectedTask.id);
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
    setShowDailyForm(false);
    setNewDailyPresente('');
    setNewDailyFuturo('');
    setNewImpedimento('');
    setEditingInline(false);
    setInlineName(task.name);
    setInlineDescription(task.description || '');
    setInlineEntregable(task.entregable || '');
    fetchTaskAttachments(task.id);
    fetchDailyEntries(task.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedTask(null);
    setModalOpen(false);
    setTaskAttachments([]);
    setDailyEntries([]);
    setShowDailyForm(false);
    setEditingInline(false);
  };

  const handleDownloadFile = async (attachment: AttachmentWithUrl) => {
    setDownloadingFile(attachment.id);
    try {
      const a = document.createElement('a');
      a.href = attachment.downloadUrl;
      a.download = attachment.fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
      const payload: any = {
        progress: editProgress,
        status: editStatus,
        comments: editComments,
        impedimento: editImpedimento,
        dailyPresente: editDailyPresente,
        dailyFuturo: editDailyFuturo,
      };
      if (editingInline && isSoleOwner(selectedTask)) {
        payload.name = inlineName;
        payload.description = inlineDescription;
        payload.entregable = inlineEntregable;
      }
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingInline(false);
        fetchTasks();
        closeModal();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar');
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
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      const { uploadUrl, cloudStoragePath } = await presignedRes.json();
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      await fetch(`/api/tasks/${selectedTask.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, cloudStoragePath, fileSize: file.size, mimeType: file.type }),
      });
      fetchTasks();
      fetchTaskAttachments(selectedTask.id);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const getStatusDot = (taskStatus: string) => {
    const s = STATUS_OPTIONS.find((o) => o.value === taskStatus);
    return <span className={`inline-block w-2.5 h-2.5 rounded-full ${s?.dot || 'bg-gray-400'}`} />;
  };

  const getStatusLabel = (taskStatus: string) => {
    return STATUS_OPTIONS.find((o) => o.value === taskStatus)?.label || taskStatus;
  };

  const getStatusBadge = (taskStatus: string) => {
    const statusOpt = STATUS_OPTIONS.find((s) => s.value === taskStatus);
    return (
      <Badge className={`${statusOpt?.color || ''} border text-xs`}>
        {statusOpt?.label || taskStatus}
      </Badge>
    );
  };

  // Group tasks by project
  const groupedByProject = tasks.reduce<Record<string, { project: ProjectOption & { color: string }; tasks: Task[] }>>((acc, task) => {
    const pid = task.project.id;
    if (!acc[pid]) {
      acc[pid] = { project: { id: pid, name: task.project.name, color: task.project.color }, tasks: [] };
    }
    acc[pid].tasks.push(task);
    return acc;
  }, {});

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETADO').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'EN_PROGRESO').length;
  const pendingTasks = tasks.filter((t) => t.status === 'PENDIENTE').length;
  const avgProgress = totalTasks > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / totalTasks) : 0;

  // Clear all filters
  const clearFilters = () => {
    setStatus('');
    setSearch('');
    setFilterProject('');
    setFilterResponsable('');
  };

  const hasActiveFilters = status || search || filterProject || filterResponsable;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-ungrd-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A365D] to-[#2A4A7F] rounded-xl p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Mis Tareas</h1>
            <p className="text-white/70 text-sm mt-0.5">Gestiona y haz seguimiento a tus actividades</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={openBrowseModal}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Unirse / Retirarse de Actividades
            </Button>
            <Button
              onClick={openCreateActivity}
              size="sm"
              className="bg-ungrd-yellow hover:bg-ungrd-yellow-dark text-black font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva Actividad
            </Button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
            <p className="text-xl font-bold">{totalTasks}</p>
            <p className="text-[11px] text-white/70">Total</p>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
            <p className="text-xl font-bold">{inProgressTasks}</p>
            <p className="text-[11px] text-white/70">En Progreso</p>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
            <p className="text-xl font-bold">{completedTasks}</p>
            <p className="text-[11px] text-white/70">Completadas</p>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
            <p className="text-xl font-bold">{avgProgress}%</p>
            <p className="text-[11px] text-white/70">Avance</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="shadow-sm">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros</span>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-ungrd-blue hover:underline ml-2">
                Limpiar filtros
              </button>
            )}
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => setViewMode('grouped')}
                className={`p-1.5 rounded ${viewMode === 'grouped' ? 'bg-ungrd-blue/10 text-ungrd-blue' : 'text-gray-400 hover:text-gray-600'}`}
                title="Vista agrupada por proyecto"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-ungrd-blue/10 text-ungrd-blue' : 'text-gray-400 hover:text-gray-600'}`}
                title="Vista lista"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Buscar actividad..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>

            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {userProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterResponsable} onValueChange={setFilterResponsable}>
              <SelectTrigger className="h-9 text-sm">
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
              <SelectTrigger className="h-9 text-sm">
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
        </CardContent>
      </Card>

      {/* Tasks Content */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No se encontraron actividades</p>
            <p className="text-sm text-gray-400 mt-1">
              {hasActiveFilters
                ? 'Prueba ajustando los filtros de búsqueda'
                : 'Crea tu primera actividad con el botón "Nueva Actividad"'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grouped' ? (
        /* ====== GROUPED VIEW ====== */
        <div className="space-y-4">
          {Object.values(groupedByProject).map(({ project, tasks: projTasks }) => (
            <Card key={project.id} className="overflow-hidden shadow-sm">
              {/* Project Header */}
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ backgroundColor: project.color + '12', borderBottom: `2px solid ${project.color}30` }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className="font-semibold text-sm text-gray-900">{project.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {projTasks.length} {projTasks.length === 1 ? 'tarea' : 'tareas'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{projTasks.filter(t => t.status === 'COMPLETADO').length}/{projTasks.length} completadas</span>
                  <span className="font-medium">
                    {projTasks.length > 0 ? Math.round(projTasks.reduce((s, t) => s + t.progress, 0) / projTasks.length) : 0}% avance
                  </span>
                </div>
              </div>

              {/* Task Table */}
              <div className="divide-y divide-gray-100">
                {projTasks.map((task) => (
                  <div
                    key={task.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors group flex items-center gap-3"
                  >
                    {/* Status dot */}
                    <div className="flex-shrink-0">{getStatusDot(task.status)}</div>

                    {/* Name - editable inline */}
                    <div className="flex-1 min-w-0">
                      {inlineEditId === task.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(task.id);
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveInlineEdit(task.id)} disabled={savingInline}>
                            {savingInline ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelInlineEdit}>
                            <X className="h-3.5 w-3.5 text-gray-400" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            className="text-sm font-medium text-gray-900 hover:text-ungrd-blue text-left truncate transition-colors"
                            onClick={() => openTaskModal(task)}
                            title={task.name}
                          >
                            {task.name}
                          </button>
                          {(isSoleOwner(task) || isAdmin) && (
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200"
                              onClick={(e) => { e.stopPropagation(); startInlineEdit(task); }}
                              title="Editar nombre"
                            >
                              <Pencil className="h-3 w-3 text-gray-400" />
                            </button>
                          )}
                        </div>
                      )}
                      {task.entregable && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate" title={task.entregable}>
                          <Target className="h-3 w-3 inline mr-1 text-amber-500" />
                          {task.entregable}
                        </p>
                      )}
                    </div>

                    {/* Responsables */}
                    <div className="hidden md:flex items-center gap-1 flex-shrink-0 max-w-[180px]">
                      {task.assignments.slice(0, 2).map((a) => (
                        <span
                          key={a.responsable.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 truncate max-w-[85px]"
                          title={a.responsable.name}
                        >
                          {a.responsable.name.split(' ').slice(0, 2).join(' ')}
                        </span>
                      ))}
                      {task.assignments.length > 2 && (
                        <span className="text-[10px] text-gray-400">+{task.assignments.length - 2}</span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2 w-28 flex-shrink-0">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${task.progress}%`,
                            backgroundColor: task.progress === 100 ? '#22c55e' : task.progress >= 50 ? '#f59e0b' : '#1A365D',
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right font-medium">{task.progress}%</span>
                    </div>

                    {/* Status badge */}
                    <div className="hidden sm:block flex-shrink-0 w-24">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        task.status === 'COMPLETADO' ? 'bg-green-50 text-green-700 border-green-300'
                          : task.status === 'EN_PROGRESO' ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-gray-50 text-gray-600 border-gray-300'
                      }`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openTaskModal(task)} title="Ver detalle">
                        <Eye className="h-3.5 w-3.5 text-gray-500" />
                      </Button>
                      {(isSoleOwner(task) || isAdmin) && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDeleteConfirmation(task)} title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      )}
                      {isSharedTask(task) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                          onClick={() => handleLeaveTask(task.id)}
                          disabled={leavingTask === task.id}
                          title="Retirarse de esta actividad"
                        >
                          {leavingTask === task.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserMinus className="h-3 w-3 mr-1" />}
                          Salir
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* ====== LIST VIEW (flat) ====== */
        <Card className="overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 flex items-center gap-3">
            <div className="w-3" /> {/* dot */}
            <div className="flex-1">Actividad</div>
            <div className="hidden md:block w-32">Proyecto</div>
            <div className="hidden md:block w-[180px]">Responsable</div>
            <div className="w-28">Avance</div>
            <div className="hidden sm:block w-24">Estado</div>
            <div className="w-24" /> {/* actions */}
          </div>
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="px-4 py-3 hover:bg-gray-50 transition-colors group flex items-center gap-3"
              >
                <div className="flex-shrink-0">{getStatusDot(task.status)}</div>

                <div className="flex-1 min-w-0">
                  {inlineEditId === task.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveInlineEdit(task.id);
                          if (e.key === 'Escape') cancelInlineEdit();
                        }}
                      />
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveInlineEdit(task.id)} disabled={savingInline}>
                        {savingInline ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelInlineEdit}>
                        <X className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        className="text-sm font-medium text-gray-900 hover:text-ungrd-blue text-left truncate transition-colors"
                        onClick={() => openTaskModal(task)}
                        title={task.name}
                      >
                        {task.name}
                      </button>
                      {(isSoleOwner(task) || isAdmin) && (
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200"
                          onClick={(e) => { e.stopPropagation(); startInlineEdit(task); }}
                          title="Editar nombre"
                        >
                          <Pencil className="h-3 w-3 text-gray-400" />
                        </button>
                      )}
                    </div>
                  )}
                  {task.entregable && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate md:hidden" title={task.entregable}>
                      {task.entregable}
                    </p>
                  )}
                </div>

                {/* Project badge */}
                <div className="hidden md:block w-32 flex-shrink-0">
                  <span
                    className="inline-block text-[11px] px-2 py-0.5 rounded-full text-white truncate max-w-full"
                    style={{ backgroundColor: task.project.color }}
                    title={task.project.name}
                  >
                    {task.project.name}
                  </span>
                </div>

                {/* Responsables */}
                <div className="hidden md:flex items-center gap-1 flex-shrink-0 w-[180px]">
                  {task.assignments.slice(0, 2).map((a) => (
                    <span
                      key={a.responsable.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 truncate max-w-[85px]"
                      title={a.responsable.name}
                    >
                      {a.responsable.name.split(' ').slice(0, 2).join(' ')}
                    </span>
                  ))}
                  {task.assignments.length > 2 && (
                    <span className="text-[10px] text-gray-400">+{task.assignments.length - 2}</span>
                  )}
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 w-28 flex-shrink-0">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${task.progress}%`,
                        backgroundColor: task.progress === 100 ? '#22c55e' : task.progress >= 50 ? '#f59e0b' : '#1A365D',
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right font-medium">{task.progress}%</span>
                </div>

                {/* Status */}
                <div className="hidden sm:block flex-shrink-0 w-24">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                    task.status === 'COMPLETADO' ? 'bg-green-50 text-green-700 border-green-300'
                      : task.status === 'EN_PROGRESO' ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-gray-50 text-gray-600 border-gray-300'
                  }`}>
                    {getStatusLabel(task.status)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 w-auto justify-end">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openTaskModal(task)} title="Ver detalle">
                    <Eye className="h-3.5 w-3.5 text-gray-500" />
                  </Button>
                  {(isSoleOwner(task) || isAdmin) && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDeleteConfirmation(task)} title="Eliminar">
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  )}
                  {isSharedTask(task) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                      onClick={() => handleLeaveTask(task.id)}
                      disabled={leavingTask === task.id}
                      title="Retirarse de esta actividad"
                    >
                      {leavingTask === task.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserMinus className="h-3 w-3 mr-1" />}
                      Salir
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ==================== CREATE / EDIT ACTIVITY MODAL ==================== */}
      <Dialog open={activityModalOpen} onOpenChange={setActivityModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activityMode === 'create' ? (
                <><Plus className="h-5 w-5 text-ungrd-blue" /> Nueva Actividad</>
              ) : (
                <><Pencil className="h-5 w-5 text-ungrd-blue" /> Editar Actividad</>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {activityMode === 'create' && (
              <div>
                <Label className="text-sm font-medium">Proyecto *</Label>
                <Select value={activityProjectId} onValueChange={setActivityProjectId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProjectsForCreate.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Nombre de la Actividad *</Label>
              <Textarea
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="Describe la actividad a realizar..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Entregable</Label>
              <Input
                value={activityEntregable}
                onChange={(e) => setActivityEntregable(e.target.value)}
                placeholder="¿Cuál es el entregable esperado?"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Descripción adicional</Label>
              <Textarea
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder="Detalles adicionales (opcional)..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                {activityMode === 'create'
                  ? 'La actividad se creará asignada a ti. Solo tú podrás verla y gestionarla.'
                  : 'Solo puedes editar actividades que te pertenecen exclusivamente.'}
              </span>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setActivityModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveActivity}
              disabled={savingActivity}
              className="bg-ungrd-blue hover:bg-ungrd-blue-dark"
            >
              {savingActivity ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {activityMode === 'create' ? 'Crear Actividad' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Eliminar Actividad
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            {taskToDelete && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800 line-clamp-3">{taskToDelete.name}</p>
                <p className="text-xs text-red-600 mt-1">Proyecto: {taskToDelete.project.name}</p>
              </div>
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-semibold mb-1">⚠️ Esta acción es irreversible</p>
              <p>Se eliminará permanentemente la actividad, incluyendo todos sus dailies, archivos adjuntos, subtareas y avance registrado.</p>
              <p className="mt-1">Quedará un registro de auditoría de quién realizó esta eliminación.</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Escribe <span className="font-bold text-red-600">CONFIRMO</span> para eliminar:
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Escribe CONFIRMO aquí..."
                className="mt-1.5 border-red-200 focus:ring-red-500"
                autoComplete="off"
              />
              {deleteConfirmText.length > 0 && deleteConfirmText !== 'CONFIRMO' && (
                <p className="text-xs text-red-500 mt-1">Debes escribir exactamente &quot;CONFIRMO&quot; en mayúsculas</p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText(''); }}>Cancelar</Button>
            <Button
              onClick={handleDeleteTask}
              disabled={deleting || deleteConfirmText !== 'CONFIRMO'}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== BROWSE PROJECTS MODAL ==================== */}
      <Dialog open={browseModalOpen} onOpenChange={setBrowseModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-ungrd-blue" /> Unirse / Retirarse de Actividades
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Selecciona un proyecto para ver sus actividades. Puedes unirte o retirarte sin afectar a los demás.</span>
            </div>

            <div>
              <Label className="text-sm font-medium">Seleccionar Proyecto</Label>
              <Select value={selectedBrowseProject} onValueChange={handleSelectBrowseProject}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Elige un proyecto para explorar..." />
                </SelectTrigger>
                <SelectContent>
                  {allProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBrowseProject && (
              <div className="space-y-2">
                {loadingProjectTasks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-ungrd-blue" />
                  </div>
                ) : projectTasks.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-500 font-medium">{projectTasks.length} actividades en este proyecto</p>
                    {projectTasks.map((pt) => {
                      const isAssigned = pt.assignments.some((a) => a.responsable.id === userResponsableId);
                      const isSole = pt.assignments.length === 1 && isAssigned;
                      return (
                        <div key={pt.id} className={`p-3 rounded-lg border ${isAssigned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">{pt.name}</h4>
                              {pt.entregable && (
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <Target className="h-3 w-3" /> {pt.entregable}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                {getStatusBadge(pt.status)}
                                <span className="text-xs text-gray-500">{pt.progress}%</span>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Users className="h-3 w-3" /> {pt.assignments.length}
                                </span>
                                {isAssigned && (
                                  <Badge variant="outline" className="text-xs border-green-300 text-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Ya participas
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 text-xs text-gray-400">
                                {pt.assignments.map((a) => a.responsable.name).join(', ')}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {isAssigned ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                  onClick={() => handleLeaveTask(pt.id, true)}
                                  disabled={leavingTask === pt.id || isSole}
                                  title={isSole ? 'No puedes retirarte si eres el único responsable' : 'Retirarse'}
                                >
                                  {leavingTask === pt.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserMinus className="h-4 w-4 mr-1" />}
                                  Retirarse
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="bg-ungrd-blue hover:bg-ungrd-blue-dark"
                                  onClick={() => handleJoinTask(pt.id)}
                                  disabled={joiningTask === pt.id}
                                >
                                  {joiningTask === pt.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
                                  Unirse
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <FolderOpen className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">Este proyecto no tiene actividades</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== TASK DETAIL MODAL ==================== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge style={{ backgroundColor: selectedTask.project.color }} className="text-white">
                      {selectedTask.project.name}
                    </Badge>
                    {getStatusBadge(selectedTask.status)}
                    {isSharedTask(selectedTask) && (
                      <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
                        <Users className="h-3 w-3 mr-1" /> Compartida
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {(isSoleOwner(selectedTask) || isAdmin) && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEditActivity(selectedTask)}>
                          <Pencil className="h-4 w-4 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => openDeleteConfirmation(selectedTask)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                        </Button>
                      </>
                    )}
                    {isSharedTask(selectedTask) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        onClick={() => handleLeaveTask(selectedTask.id)}
                        disabled={leavingTask === selectedTask.id}
                      >
                        {leavingTask === selectedTask.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserMinus className="h-4 w-4 mr-1" />}
                        Retirarse
                      </Button>
                    )}
                  </div>
                </div>
                <DialogTitle className="text-xl">{selectedTask.name}</DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="info" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Información</TabsTrigger>
                  <TabsTrigger value="daily">Daily / Progreso</TabsTrigger>
                  <TabsTrigger value="files">Archivos</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
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

                  {selectedTask.description && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Descripción</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm">{selectedTask.description}</p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-ungrd-blue" />
                          <span className="text-sm font-medium">Responsable(s)</span>
                        </div>
                        <p className="text-gray-700 text-sm">
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
                        <p className="text-gray-700 text-sm">{selectedTask.plannedWeeks || 'No especificado'}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Progress & Status Section */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Avance y Estado</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm">Progreso: {editProgress}%</Label>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={editProgress}
                          onChange={(e) => setEditProgress(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-ungrd-blue"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Estado</Label>
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleSave} disabled={saving} className="w-full bg-ungrd-blue hover:bg-ungrd-blue-dark">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar Avance
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="daily" className="space-y-4 mt-4">
                  <Card className="bg-ungrd-blue/5 border-ungrd-blue/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Clock className="h-4 w-4 text-ungrd-blue" />
                          Registrar Daily
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleExportDailyHistory} disabled={exportingDaily} className="bg-white">
                            {exportingDaily ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                            Exportar
                          </Button>
                          <Button size="sm" onClick={() => setShowDailyForm(!showDailyForm)} className="bg-ungrd-yellow hover:bg-ungrd-yellow-dark text-black">
                            <Plus className="h-4 w-4 mr-1" /> Agregar Daily
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {showDailyForm && (
                      <CardContent className="space-y-4 border-t border-ungrd-blue/20 pt-4">
                        <div className="bg-white p-4 rounded-lg border border-ungrd-blue/20 space-y-4">
                          <div>
                            <Label className="text-sm font-medium">¿Qué se hizo? (Presente)</Label>
                            <Textarea value={newDailyPresente} onChange={(e) => setNewDailyPresente(e.target.value)} placeholder="Describe lo que se realizó..." className="mt-1" rows={3} />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">¿Qué se hará? (Futuro)</Label>
                            <Textarea value={newDailyFuturo} onChange={(e) => setNewDailyFuturo(e.target.value)} placeholder="Describe las próximas actividades..." className="mt-1" rows={3} />
                          </div>
                          <div>
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" /> Impedimentos
                            </Label>
                            <Textarea value={newImpedimento} onChange={(e) => setNewImpedimento(e.target.value)} placeholder="Describe cualquier impedimento..." className="mt-1" rows={2} />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveNewDaily} disabled={savingDaily} className="flex-1 bg-ungrd-blue hover:bg-ungrd-blue-dark">
                              {savingDaily ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                              Guardar Daily
                            </Button>
                            <Button variant="outline" onClick={() => { setShowDailyForm(false); setNewDailyPresente(''); setNewDailyFuturo(''); setNewImpedimento(''); }}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Daily History */}
                  <Card className="border-gray-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowDailyHistory(!showDailyHistory)}>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <History className="h-4 w-4 text-gray-600" />
                          Historial de Dailies ({dailyEntries.length})
                        </CardTitle>
                        {showDailyHistory ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
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
                              <div key={entry.id} className={`p-4 rounded-lg border ${index === 0 ? 'bg-ungrd-yellow/10 border-ungrd-yellow/30' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-ungrd-blue" />
                                    <span className="text-sm font-medium text-gray-900">{formatDailyDate(entry.fecha)}</span>
                                    {index === 0 && <Badge className="bg-ungrd-yellow text-black text-xs">Último</Badge>}
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
                                      <AlertTriangle className="h-3 w-3" /> Impedimento:
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
                      <Textarea value={editComments} onChange={(e) => setEditComments(e.target.value)} placeholder="Comentarios adicionales..." rows={3} />
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
                        <Paperclip className="h-4 w-4" /> Archivos Adjuntos ({taskAttachments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <div className="text-center">
                            {uploading ? (
                              <Loader2 className="h-5 w-5 animate-spin mx-auto text-ungrd-blue" />
                            ) : (
                              <>
                                <Upload className="h-5 w-5 mx-auto text-gray-400" />
                                <span className="text-xs text-gray-500 mt-1">Clic para subir archivo</span>
                              </>
                            )}
                          </div>
                          <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                        </label>
                      </div>

                      {loadingAttachments ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-ungrd-blue" />
                        </div>
                      ) : taskAttachments.length > 0 ? (
                        <div className="space-y-2">
                          {taskAttachments.map((att) => (
                            <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Paperclip className="h-4 w-4 text-ungrd-blue flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate" title={att.fileName}>{att.fileName}</p>
                                  <p className="text-xs text-gray-500">{att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ''}</p>
                                </div>
                              </div>
                              <Button size="sm" onClick={() => handleDownloadFile(att)} disabled={downloadingFile === att.id} className="bg-ungrd-blue hover:bg-ungrd-blue-dark ml-3">
                                {downloadingFile === att.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                <span className="ml-1">Descargar</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Paperclip className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm text-gray-500">No hay archivos adjuntos</p>
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
