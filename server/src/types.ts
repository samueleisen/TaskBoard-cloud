export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type NotificationType = 'due_soon_24h' | 'overdue' | 'assigned';

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  fullName: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  user?: Pick<User, 'id' | 'email' | 'fullName' | 'avatarUrl'>;
}

export interface Board {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  lists?: ListColumn[];
}

export interface ListColumn {
  id: string;
  boardId: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
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
  assignee?: Pick<User, 'id' | 'email' | 'fullName' | 'avatarUrl'>;
}

export interface TaskActivityLog {
  id: string;
  taskId: string;
  userId: string;
  actionType: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  taskId: string;
  userId: string;
  notificationType: NotificationType;
  sentAt: string;
}
