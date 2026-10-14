export type UserRole = 'ADMIN' | 'USER';
export type TaskStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'BLOQUEADO';
export type TaskPriority = 'ALTA' | 'MEDIA' | 'BAJA';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  responsableId?: string | null;
  responsable?: Responsable | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  isActive: boolean;
  phases?: Phase[];
}

export interface Phase {
  id: string;
  name: string;
  projectId: string;
  project?: Project;
  deliverables?: Deliverable[];
}

export interface Deliverable {
  id: string;
  name: string;
  phaseId: string;
  phase?: Phase;
  tasks?: Task[];
}

export interface Responsable {
  id: string;
  name: string;
  email?: string | null;
  isActive: boolean;
  taskAssignments?: TaskAssignment[];
  user?: User | null;
}

export interface Task {
  id: string;
  name: string;
  description?: string | null;
  deliverableId: string;
  deliverable?: Deliverable;
  status: TaskStatus;
  priority: TaskPriority;
  plannedStartDate?: Date | string | null;
  plannedEndDate?: Date | string | null;
  actualStartDate?: Date | string | null;
  actualEndDate?: Date | string | null;
  progress: number;
  estimatedHours?: number | null;
  actualHours?: number | null;
  comments?: string | null;
  blockers?: string | null;
  plannedWeeks?: string | null;
  assignments?: TaskAssignment[];
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  task?: Task;
  responsableId: string;
  responsable?: Responsable;
}

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  overdueTasks: number;
  completionRate: number;
  tasksCompletedThisWeek: number;
  tasksDueThisWeek: number;
}

export interface ProductivityData {
  responsableId: string;
  responsableName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  completionRate: number;
  estimatedHours: number;
  actualHours: number;
  overdueTasks: number;
  avgCompletionDays: number;
}

export interface ProjectProgress {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  color: string;
}

export interface WeeklyProgress {
  week: string;
  planned: number;
  completed: number;
}
