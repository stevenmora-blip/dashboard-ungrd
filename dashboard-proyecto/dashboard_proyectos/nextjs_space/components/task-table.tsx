'use client';

import { useState } from 'react';
import {
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  AlertCircle,
  Save,
  X,
} from 'lucide-react';
import { Task } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TaskTableProps {
  tasks: Task[];
  isAdmin: boolean;
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-gray-100 text-gray-700' },
  { value: 'EN_PROGRESO', label: 'En Progreso', color: 'bg-blue-100 text-blue-700' },
  { value: 'COMPLETADO', label: 'Completado', color: 'bg-green-100 text-green-700' },
  { value: 'BLOQUEADO', label: 'Bloqueado', color: 'bg-red-100 text-red-700' },
];

const PRIORITY_OPTIONS = [
  { value: 'ALTA', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  { value: 'MEDIA', label: 'Media', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'BAJA', label: 'Baja', color: 'bg-gray-100 text-gray-600' },
];

export function TaskTable({ tasks, isAdmin, onUpdate, onDelete }: TaskTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Task>>({});
  const [sortField, setSortField] = useState<string>('plannedEndDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedTasks = [...(tasks ?? [])].sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (sortField) {
      case 'name':
        aVal = a?.name ?? '';
        bVal = b?.name ?? '';
        break;
      case 'status':
        aVal = a?.status ?? '';
        bVal = b?.status ?? '';
        break;
      case 'priority':
        const priorityOrder = { ALTA: 0, MEDIA: 1, BAJA: 2 };
        aVal = priorityOrder[a?.priority as keyof typeof priorityOrder] ?? 1;
        bVal = priorityOrder[b?.priority as keyof typeof priorityOrder] ?? 1;
        break;
      case 'progress':
        aVal = a?.progress ?? 0;
        bVal = b?.progress ?? 0;
        break;
      case 'plannedEndDate':
        aVal = a?.plannedEndDate ? new Date(a.plannedEndDate).getTime() : Infinity;
        bVal = b?.plannedEndDate ? new Date(b.plannedEndDate).getTime() : Infinity;
        break;
      default:
        aVal = a?.name ?? '';
        bVal = b?.name ?? '';
    }

    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const startEdit = (task: Task) => {
    setEditingId(task?.id ?? null);
    setEditData({
      status: task?.status,
      priority: task?.priority,
      progress: task?.progress ?? 0,
      actualHours: task?.actualHours,
      comments: task?.comments,
      blockers: task?.blockers,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (taskId: string) => {
    await onUpdate(taskId, editData);
    setEditingId(null);
    setEditData({});
  };

  const isOverdue = (task: Task) => {
    return (
      task?.plannedEndDate &&
      new Date(task.plannedEndDate) < today &&
      task?.status !== 'COMPLETADO'
    );
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if ((tasks?.length ?? 0) === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No se encontraron tareas con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th
              className="text-left py-3 px-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-1">
                Tarea <SortIcon field="name" />
              </div>
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Proyecto</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Responsables</th>
            <th
              className="text-center py-3 px-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center justify-center gap-1">
                Estado <SortIcon field="status" />
              </div>
            </th>
            <th
              className="text-center py-3 px-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('priority')}
            >
              <div className="flex items-center justify-center gap-1">
                Prioridad <SortIcon field="priority" />
              </div>
            </th>
            <th
              className="text-center py-3 px-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('plannedEndDate')}
            >
              <div className="flex items-center justify-center gap-1">
                Fecha Fin <SortIcon field="plannedEndDate" />
              </div>
            </th>
            <th
              className="text-center py-3 px-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('progress')}
            >
              <div className="flex items-center justify-center gap-1">
                Avance <SortIcon field="progress" />
              </div>
            </th>
            <th className="text-center py-3 px-4 font-medium text-gray-600">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => {
            const isEditing = editingId === task?.id;
            const overdue = isOverdue(task);

            return (
              <tr
                key={task?.id}
                className={cn(
                  'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                  overdue && 'bg-red-50 border-l-4 border-l-red-500',
                  task?.priority === 'ALTA' && !overdue && 'bg-orange-50/50'
                )}
              >
                <td className="py-3 px-4">
                  <div className="max-w-xs">
                    <p className="font-medium text-gray-800 truncate">
                      {task?.name ?? 'Sin nombre'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {task?.deliverable?.phase?.name ?? ''} / {task?.deliverable?.name ?? ''}
                    </p>
                    {task?.blockers && (
                      <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                        <AlertCircle className="w-3 h-3" />
                        <span className="truncate">{task.blockers}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className="inline-block px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: `${task?.deliverable?.phase?.project?.color ?? '#3b82f6'}20`, color: task?.deliverable?.phase?.project?.color ?? '#3b82f6' }}
                  >
                    {task?.deliverable?.phase?.project?.name?.substring(0, 30) ?? 'Sin proyecto'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {(task?.assignments ?? []).slice(0, 2).map((a) => (
                      <span
                        key={a?.id}
                        className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs"
                      >
                        {a?.responsable?.name?.split(' ')[0] ?? 'N/A'}
                      </span>
                    ))}
                    {(task?.assignments?.length ?? 0) > 2 && (
                      <span className="text-xs text-gray-500">
                        +{(task?.assignments?.length ?? 0) - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  {isEditing ? (
                    <select
                      value={editData?.status ?? task?.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                      className="text-xs px-2 py-1 border rounded"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={cn(
                        'inline-block px-2 py-1 rounded text-xs font-medium',
                        STATUS_OPTIONS.find((o) => o.value === task?.status)?.color ?? 'bg-gray-100'
                      )}
                    >
                      {STATUS_OPTIONS.find((o) => o.value === task?.status)?.label ?? task?.status}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {isEditing && isAdmin ? (
                    <select
                      value={editData?.priority ?? task?.priority}
                      onChange={(e) => setEditData({ ...editData, priority: e.target.value as any })}
                      className="text-xs px-2 py-1 border rounded"
                    >
                      {PRIORITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={cn(
                        'inline-block px-2 py-1 rounded text-xs font-medium',
                        PRIORITY_OPTIONS.find((o) => o.value === task?.priority)?.color ?? 'bg-gray-100'
                      )}
                    >
                      {PRIORITY_OPTIONS.find((o) => o.value === task?.priority)?.label ?? task?.priority}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center text-sm">
                  <span className={overdue ? 'text-red-600 font-medium' : ''}>
                    {formatDate(task?.plannedEndDate)}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editData?.progress ?? task?.progress ?? 0}
                      onChange={(e) => setEditData({ ...editData, progress: parseInt(e.target.value) || 0 })}
                      className="w-16 text-xs px-2 py-1 border rounded text-center"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${task?.progress ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-8">{task?.progress ?? 0}%</span>
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {isEditing ? (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => saveEdit(task?.id ?? '')}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => startEdit(task)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {task?.comments && (
                        <button
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                          title={task.comments}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      {isAdmin && onDelete && (
                        <button
                          onClick={() => onDelete(task?.id ?? '')}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
