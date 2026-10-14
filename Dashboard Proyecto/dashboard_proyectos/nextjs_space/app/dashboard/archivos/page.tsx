'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Download,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Search,
  FolderOpen,
  Calendar,
  User,
  Filter,
  HardDrive,
  Trash2,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  downloadUrl: string;
  isPreview?: boolean;
  task: {
    id: string;
    name: string;
    entregable: string | null;
    project: {
      id: string;
      name: string;
      color: string;
    };
    responsables: string[];
  };
}

interface Project {
  id: string;
  name: string;
}

export default function ArchivosPage() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  // Delete state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchAttachments = async () => {
    try {
      const params = new URLSearchParams();
      if (projectId && projectId !== 'all') params.append('projectId', projectId);

      const res = await fetch(`/api/attachments?${params.toString()}`);
      const data = await res.json();
      setAttachments(data.attachments || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchAttachments();
  }, [projectId]);

  const handleDownload = async (attachment: Attachment) => {
    setDownloading(attachment.id);
    try {
      if (attachment.isPreview) {
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
      setTimeout(() => setDownloading(null), 1000);
    }
  };

  const openDeleteModal = (att: Attachment) => {
    setDeleteTarget(att);
    setDeleteConfirmWord('');
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmWord.trim().toLowerCase() !== 'el limonar') {
      setDeleteError('Palabra incorrecta. Escribe exactamente "el limonar"');
      return;
    }

    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/attachments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachmentId: deleteTarget.id,
          confirmWord: deleteConfirmWord.trim(),
        }),
      });

      if (res.ok) {
        setDeleteModalOpen(false);
        setDeleteTarget(null);
        fetchAttachments(); // Refresh list
      } else {
        const err = await res.json();
        setDeleteError(err.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      setDeleteError('Error de conexión al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-5 w-5 text-gray-500" />;
    if (mimeType.includes('image')) return <FileImage className="h-5 w-5 text-purple-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) 
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('pdf'))
      return <FileText className="h-5 w-5 text-blue-600" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredAttachments = attachments.filter((att) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      att.fileName.toLowerCase().includes(searchLower) ||
      att.task.name.toLowerCase().includes(searchLower) ||
      att.task.project.name.toLowerCase().includes(searchLower) ||
      att.task.responsables.some((r) => r.toLowerCase().includes(searchLower))
    );
  });

  const totalSize = attachments.reduce((acc, att) => acc + (att.fileSize || 0), 0);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Acceso Restringido</h2>
            <p className="text-gray-500">Solo los administradores pueden ver todos los archivos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-ungrd-blue">Gestor de Archivos</h1>
          <p className="text-gray-600">Todos los archivos subidos al sistema</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-ungrd-blue/10 rounded-lg">
                <FolderOpen className="h-6 w-6 text-ungrd-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ungrd-blue">{attachments.length}</p>
                <p className="text-sm text-gray-500">Archivos totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-ungrd-yellow/10 rounded-lg">
                <HardDrive className="h-6 w-6 text-ungrd-yellow" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ungrd-yellow-dark">{formatFileSize(totalSize)}</p>
                <p className="text-sm text-gray-500">Almacenamiento usado</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {new Set(attachments.map((a) => a.task.id)).size}
                </p>
                <p className="text-sm text-gray-500">Tareas con archivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, tarea, proyecto o responsable..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por proyecto" />
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
          </div>
        </CardContent>
      </Card>

      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Archivos ({filteredAttachments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAttachments.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No hay archivos disponibles</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Archivo</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Tarea</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttachments.map((att) => (
                    <TableRow key={att.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(att.mimeType)}
                          <span className="font-medium truncate max-w-[200px]" title={att.fileName}>
                            {att.fileName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: att.task.project.color }}
                          className="text-white"
                        >
                          {att.task.project.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700 line-clamp-2" title={att.task.name}>
                          {att.task.name.substring(0, 50)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {att.task.responsables.join(', ') || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {formatFileSize(att.fileSize)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {formatDate(att.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleDownload(att)}
                            disabled={downloading === att.id}
                            className="bg-ungrd-blue hover:bg-ungrd-blue-dark"
                          >
                            {downloading === att.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            <span className="ml-1 hidden sm:inline">{att.isPreview ? 'Ver' : 'Descargar'}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDeleteModal(att)}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                            title="Eliminar archivo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Confirmar Eliminación de Archivo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* File info */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                {deleteTarget && getFileIcon(deleteTarget.mimeType)}
                <span className="font-semibold text-sm text-gray-900 truncate">
                  {deleteTarget?.fileName}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Proyecto: {deleteTarget?.task.project.name} • Tarea: {deleteTarget?.task.name.substring(0, 60)}...
              </p>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Acción con trazabilidad</p>
                <p className="text-xs mt-1">
                  El archivo dejará de ser visible pero quedará registrado en la base de datos.
                  Se guardará quién lo eliminó, cuándo y qué archivo era.
                </p>
              </div>
            </div>

            {/* Confirmation input */}
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Escribe <span className="font-bold text-red-600">&quot;el limonar&quot;</span> para confirmar la eliminación:
              </Label>
              <Input
                value={deleteConfirmWord}
                onChange={(e) => {
                  setDeleteConfirmWord(e.target.value);
                  setDeleteError('');
                }}
                placeholder="Escribe aquí la palabra de confirmación..."
                className="mt-2"
                autoFocus
              />
            </div>

            {/* Error message */}
            {deleteError && (
              <div className="bg-red-50 border border-red-300 rounded p-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmWord.trim().toLowerCase() !== 'el limonar'}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Eliminar Archivo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
