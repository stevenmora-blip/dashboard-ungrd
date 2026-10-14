'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  X,
  Users, 
  CheckCircle2, 
  Clock, 
  FileText,
  Loader2,
  Target,
  Cpu,
  User,
  ExternalLink,
  BarChart3,
  Truck,
  Package,
  Building,
  Droplet,
  AlertTriangle,
  MapPin,
  FileSpreadsheet,
  MonitorDot
} from 'lucide-react';

interface ProjectMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  weightedProgress: number;
  totalFiles: number;
  responsables: { id: string; name: string }[];
}

interface Task {
  id: string;
  name: string;
  entregable: string;
  status: string;
  progress: number;
  assignments: { responsable: { id: string; name: string } }[];
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  prioridad: string | null;
  subdireccion: string | null;
  liderSNI: string | null;
  liderUNGRD: string | null;
  tecnologias: string[];
  expectativas: string | null;
  team: { id: string; name: string } | null;
  tasks: Task[];
  metrics?: ProjectMetrics;
  _count?: { tasks: number };
  isSubproject?: boolean;
  parentProjectName?: string | null;
}

// Iconos de proyectos por prioridad
const projectIcons: Record<string, React.ReactNode> = {
  '1': <FileSpreadsheet className="h-16 w-16 text-ungrd-blue" />,
  '2': <Users className="h-16 w-16 text-ungrd-blue" />,
  '3': <Building className="h-16 w-16 text-ungrd-blue" />,
  '3.1': <Truck className="h-10 w-10 text-ungrd-blue" />,
  '3.2': <Package className="h-10 w-10 text-ungrd-blue" />,
  '3.3': <Building className="h-10 w-10 text-ungrd-blue" />,
  '3.4': <Droplet className="h-10 w-10 text-ungrd-blue" />,
  '4': <BarChart3 className="h-16 w-16 text-ungrd-blue" />,
  '5': <AlertTriangle className="h-16 w-16 text-ungrd-blue" />,
  '6': <Target className="h-16 w-16 text-ungrd-blue" />,
  '9': <MapPin className="h-16 w-16 text-ungrd-blue" />,
  '10': <FileSpreadsheet className="h-16 w-16 text-ungrd-blue" />,
};

function ProyectosPageContent() {
  const { data: session } = useSession() || {};
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams?.get('projectId');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedContratacion, setExpandedContratacion] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Auto-abrir el modal de un proyecto cuando se navega con ?projectId=...
  useEffect(() => {
    if (projectIdFromUrl && projects.length > 0 && !selectedProject) {
      const project = projects.find((p) => p.id === projectIdFromUrl);
      if (project) {
        openProjectModal(project);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdFromUrl, projects]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      // Ordenar por prioridad
      const sorted = data.sort((a: Project, b: Project) => {
        const pa = parseFloat(a.prioridad || '999');
        const pb = parseFloat(b.prioridad || '999');
        return pa - pb;
      });
      setProjects(sorted);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const openProjectModal = async (project: Project) => {
    setSelectedProject(project);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`);
      const data = await res.json();
      setSelectedProject({ ...project, ...data });
    } catch (error) {
      console.error('Error fetching project details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setSelectedProject(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETADO': return 'bg-green-100 text-green-800';
      case 'EN_PROGRESO': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETADO': return 'Completado';
      case 'EN_PROGRESO': return 'En Progreso';
      default: return 'Pendiente';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-ungrd-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ungrd-blue">Proyectos Prioritarios</h1>
          <p className="text-gray-600">Sistema Nacional de Información · SNI 2026</p>
        </div>
        <div className="bg-ungrd-yellow text-ungrd-blue px-4 py-2 rounded-lg font-semibold">
          {projects.filter((p) => !p.prioridad?.includes('.')).length} proyectos
        </div>
      </div>

      {/* Projects Grid - Solo proyectos principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects
          .filter((p) => !p.prioridad?.includes('.'))
          .map((project) => {
            const isContratacion = project.prioridad === '3';
            const subprojects = isContratacion 
              ? projects.filter((p) => p.prioridad?.startsWith('3.'))
              : [];
            
            return (
          <div key={project.id} className="flex flex-col">
          <div
            onClick={() => openProjectModal(project)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg hover:border-ungrd-yellow transition-all duration-300 group"
          >
            {/* Card Header */}
            <div 
              className="px-4 py-3 flex items-center gap-3"
              style={{ backgroundColor: project.color }}
            >
              <span className="text-white font-bold text-lg bg-white/20 px-3 py-1 rounded">
                {project.prioridad || '-'}
              </span>
              <div className="text-white/90 text-sm font-medium">
                PROYECTO {project.prioridad}
              </div>
            </div>

            {/* Card Content */}
            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* Project Icon */}
                <div className="p-3 bg-gray-100 rounded-xl flex-shrink-0 group-hover:bg-ungrd-yellow/10 transition-colors">
                  {projectIcons[project.prioridad || ''] || <MonitorDot className="h-16 w-16 text-ungrd-blue" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-ungrd-blue truncate">
                    {project.name}
                  </h2>
                  {project.subdireccion && (
                    <p className="text-sm text-gray-500 mt-1">{project.subdireccion}</p>
                  )}
                </div>
              </div>

              {/* Description preview */}
              {project.description && (
                <p className="text-sm text-gray-600 mt-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              {/* Quick Stats */}
              <div className="mt-4 flex items-center gap-4">
                {project.liderSNI && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span className="truncate max-w-[100px]">{project.liderSNI.split(' ')[0]}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{project._count?.tasks || project.tasks?.length || 0} tareas</span>
                </div>
              </div>

              {/* View Details */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-ungrd-blue font-medium group-hover:text-ungrd-yellow transition-colors">
                  Ver detalles del proyecto
                </span>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-ungrd-yellow transition-colors" />
              </div>
            </div>
          </div>
          
          {/* Subproyectos de Contratación */}
          {isContratacion && subprojects.length > 0 && (
            <div className="mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedContratacion(!expandedContratacion);
                }}
                className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <span className="text-sm font-medium text-gray-700">
                  {expandedContratacion ? '▼' : '▶'} {subprojects.length} Subproyectos
                </span>
              </button>
              {expandedContratacion && (
                <div className="mt-2 space-y-2 pl-2">
                  {subprojects.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openProjectModal(sub);
                      }}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-ungrd-yellow hover:shadow-sm transition-all"
                    >
                      <div className="p-2 bg-gray-50 rounded-lg">
                        {projectIcons[sub.prioridad || ''] || <Building className="h-8 w-8 text-ungrd-blue" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-ungrd-yellow text-ungrd-blue px-2 py-0.5 rounded">
                            {sub.prioridad}
                          </span>
                          <span className="text-sm font-medium text-gray-800 truncate">{sub.name}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <span className="text-ungrd-blue">↳</span> Vinculado a Contratación
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        );
        })}
      </div>

      {/* Project Modal */}
      {selectedProject && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="relative px-6 py-4"
              style={{ backgroundColor: selectedProject.color }}
            >
              <div className="flex items-center gap-4">
                <div className="bg-ungrd-yellow text-ungrd-blue font-bold text-xl px-4 py-2 rounded">
                  {selectedProject.prioridad}
                </div>
                <div>
                  <div className="text-white/80 text-sm font-medium uppercase tracking-wider">
                    PROYECTO {selectedProject.prioridad} · {selectedProject.subdireccion || 'SNI'}
                  </div>
                  <h2 className="text-white text-2xl font-bold mt-1">
                    {selectedProject.name}
                  </h2>
                </div>
              </div>
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <nav aria-label="Gestión del proyecto" className="mb-5 flex flex-wrap gap-3 rounded-lg border border-ungrd-yellow bg-ungrd-yellow/10 p-4 text-sm">
                <a className="font-medium text-ungrd-blue underline underline-offset-4" href={`/dashboard/requerimientos?projectId=${encodeURIComponent(selectedProject.id)}`}>Requerimientos</a>
                <a className="font-medium text-ungrd-blue underline underline-offset-4" href={`/dashboard/esfuerzo?projectId=${encodeURIComponent(selectedProject.id)}`}>Esfuerzo y recursos</a>
                <a className="font-medium text-ungrd-blue underline underline-offset-4" href={`/dashboard/aporte?projectId=${encodeURIComponent(selectedProject.id)}`}>Aporte institucional</a>
                <a className="font-medium text-ungrd-blue underline underline-offset-4" href={`/api/gestion/reporte?projectId=${encodeURIComponent(selectedProject.id)}&format=html`} target="_blank" rel="noopener noreferrer">Reporte ejecutivo imprimible</a>
              </nav>
              {/* Subproject Badge */}
              {selectedProject.isSubproject && selectedProject.parentProjectName && (
                <div className="mb-4 px-4 py-3 bg-ungrd-yellow/20 border border-ungrd-yellow rounded-lg flex items-center gap-2">
                  <span className="text-ungrd-blue">↳</span>
                  <span className="text-sm text-ungrd-blue">
                    <strong>Subproyecto vinculado:</strong> Las actividades son compartidas con &quot;{selectedProject.parentProjectName}&quot;
                  </span>
                </div>
              )}
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-ungrd-blue" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Info */}
                  <div className="space-y-6">
                    {/* Project Icon & Description */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <div className="flex justify-center mb-4">
                        <div className="p-4 bg-white rounded-xl shadow-sm">
                          {projectIcons[selectedProject.prioridad || ''] || <MonitorDot className="h-20 w-20 text-ungrd-blue" />}
                        </div>
                      </div>
                      {selectedProject.description && (
                        <p className="text-gray-700 text-center">
                          {selectedProject.description}
                        </p>
                      )}
                    </div>

                    {/* Leaders */}
                    <div className="space-y-3">
                      {selectedProject.liderSNI && (
                        <div className="bg-ungrd-blue/5 rounded-xl p-4 border-l-4 border-ungrd-blue">
                          <div className="text-xs uppercase tracking-wider text-ungrd-blue font-semibold mb-1">
                            Líder SNI
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-ungrd-blue" />
                            <span className="font-semibold text-gray-900">{selectedProject.liderSNI}</span>
                          </div>
                        </div>
                      )}
                      {selectedProject.liderUNGRD && (
                        <div className="bg-ungrd-yellow/10 rounded-xl p-4 border-l-4 border-ungrd-yellow">
                          <div className="text-xs uppercase tracking-wider text-yellow-700 font-semibold mb-1">
                            Líder UNGRD
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-yellow-700" />
                            <span className="font-semibold text-gray-900">{selectedProject.liderUNGRD}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SNI Badge */}
                    <div className="bg-ungrd-blue rounded-xl p-4 text-center">
                      <div className="text-ungrd-yellow text-2xl font-bold">SNI</div>
                      <div className="text-white/80 text-sm">Sistema Nacional de Información</div>
                    </div>
                  </div>

                  {/* Middle Column - Expectations */}
                  <div>
                    <div className="bg-ungrd-blue rounded-t-xl px-4 py-3">
                      <h3 className="text-white font-semibold text-center uppercase tracking-wider">
                        ¿Qué se espera ver?
                      </h3>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-b-xl p-4">
                      {selectedProject.expectativas ? (
                        <ul className="space-y-3">
                          {selectedProject.expectativas.split('\n').map((exp, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <CheckCircle2 
                                className="h-5 w-5 flex-shrink-0 mt-0.5" 
                                style={{ color: selectedProject.color }}
                              />
                              <span className="text-gray-700">{exp}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-center py-4">Sin expectativas definidas</p>
                      )}
                    </div>

                    {/* Metrics */}
                    {selectedProject.metrics && (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="bg-green-50 rounded-xl p-4 text-center">
                          <div className="text-3xl font-bold text-green-600">
                            {selectedProject.metrics.completedTasks}
                          </div>
                          <div className="text-sm text-green-700">Completadas</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                          <div className="text-3xl font-bold text-blue-600">
                            {selectedProject.metrics.inProgressTasks}
                          </div>
                          <div className="text-sm text-blue-700">En Progreso</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                          <div className="text-3xl font-bold text-gray-600">
                            {selectedProject.metrics.pendingTasks}
                          </div>
                          <div className="text-sm text-gray-700">Pendientes</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-4 text-center">
                          <div className="text-3xl font-bold text-purple-600">
                            {selectedProject.metrics.totalFiles}
                          </div>
                          <div className="text-sm text-purple-700">Archivos</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Technologies & Team */}
                  <div className="space-y-6">
                    {/* Technologies */}
                    <div>
                      <div className="bg-ungrd-yellow rounded-t-xl px-4 py-3">
                        <h3 className="text-ungrd-blue font-semibold text-center uppercase tracking-wider">
                          Tecnologías
                        </h3>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-b-xl p-4">
                        {selectedProject.tecnologias && selectedProject.tecnologias.length > 0 ? (
                          <ul className="space-y-3">
                            {selectedProject.tecnologias.map((tech, idx) => (
                              <li key={idx} className="flex items-center gap-3">
                                <Cpu className="h-5 w-5 text-ungrd-blue" />
                                <span className="text-gray-700 font-medium">{tech}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 text-center py-4">Sin tecnologías definidas</p>
                        )}
                      </div>
                    </div>

                    {/* Responsables */}
                    {selectedProject.metrics && selectedProject.metrics.responsables.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-5 w-5 text-gray-500" />
                          <span className="font-semibold text-gray-700">
                            Equipo ({selectedProject.metrics.responsables.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedProject.metrics.responsables.map((resp) => (
                            <span
                              key={resp.id}
                              className="px-3 py-1.5 text-sm bg-gray-100 rounded-full text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                              {resp.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ver Producto - solo para Geovisor */}
                    {selectedProject.prioridad === '9' && (
                      <a
                        href="/api/geovisor"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-green-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors mb-2"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <MapPin className="h-5 w-5" />
                          Ver Producto (Geoportal)
                        </span>
                      </a>
                    )}

                    {/* Link to Plan de Trabajo */}
                    <a
                      href={`/dashboard/tareas?project=${selectedProject.id}`}
                      className="block w-full bg-ungrd-blue text-white text-center py-3 rounded-xl font-semibold hover:bg-ungrd-blue-dark transition-colors"
                    >
                      Ver en Plan de Trabajo →
                    </a>
                  </div>
                </div>
              )}

              {/* Activities Table */}
              {selectedProject.tasks && selectedProject.tasks.length > 0 && !loadingDetails && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <span className="font-semibold text-gray-700">
                        Actividades del Proyecto ({selectedProject.tasks.length})
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-ungrd-blue text-white sticky top-0">
                          <tr>
                            <th className="text-left p-3 font-medium">Entregable</th>
                            <th className="text-left p-3 font-medium">Responsable</th>
                            <th className="text-center p-3 font-medium">Estado</th>
                            <th className="text-right p-3 font-medium">Progreso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {selectedProject.tasks.map((task) => (
                            <tr key={task.id} className="hover:bg-gray-50">
                              <td className="p-3 text-gray-900 font-medium">
                                {task.entregable || task.name}
                              </td>
                              <td className="p-3 text-gray-600">
                                {task.assignments.map(a => a.responsable.name).join(', ') || '-'}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                  {getStatusLabel(task.status)}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${task.progress}%`, backgroundColor: selectedProject.color }}
                                    />
                                  </div>
                                  <span className="font-medium w-10 text-right">{task.progress}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function ProyectosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-ungrd-blue" />
        </div>
      }
    >
      <ProyectosPageContent />
    </Suspense>
  );
}
