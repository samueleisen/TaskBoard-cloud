export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  user?: User;
}

export interface ListColumn {
  id: string;
  boardId: string;
  name: string;
  position: number;
  tasks?: Task[];
}

export interface Task {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | null;
  position: number;
  assigneeId?: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  assignee?: User;
}

export interface Board {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  isArchived: boolean;
  lists?: ListColumn[];
}

export interface HealthStatus {
  status: string;
  service: string;
  mode: string;
  isPostgres: boolean;
  uptimeSeconds: number;
  timestamp: string;
  version: string;
}
