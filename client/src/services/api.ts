import { Board, HealthStatus, Task, Team, TeamMember, User } from '../types';

const API_BASE = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      if (data && data.error) {
        message = data.error;
      }
    } catch {
      const errorText = await res.text();
      if (errorText) message = errorText;
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Health
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch('/health');
    return handleResponse<HealthStatus>(res);
  },

  // Teams
  async getTeams(): Promise<Team[]> {
    const res = await fetch(`${API_BASE}/teams`);
    return handleResponse<Team[]>(res);
  },

  async createTeam(name: string): Promise<Team> {
    const res = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleResponse<Team>(res);
  },

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const res = await fetch(`${API_BASE}/teams/${teamId}/members`);
    return handleResponse<TeamMember[]>(res);
  },

  async inviteTeamMember(teamId: string, email: string, role: string): Promise<TeamMember> {
    const res = await fetch(`${API_BASE}/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    return handleResponse<TeamMember>(res);
  },

  // Boards
  async getTeamBoards(teamId: string): Promise<Board[]> {
    const res = await fetch(`${API_BASE}/boards/team/${teamId}`);
    return handleResponse<Board[]>(res);
  },

  async createBoard(teamId: string, name: string, description?: string): Promise<Board> {
    const res = await fetch(`${API_BASE}/boards/team/${teamId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    return handleResponse<Board>(res);
  },

  async getBoard(boardId: string): Promise<Board> {
    const res = await fetch(`${API_BASE}/boards/${boardId}`);
    return handleResponse<Board>(res);
  },

  // Tasks
  async createTask(task: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return handleResponse<Task>(res);
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<Task>(res);
  },

  async moveTask(id: string, targetListId: string, newPosition: number, newStatus: Task['status']): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetListId, newPosition, newStatus }),
    });
    return handleResponse<Task>(res);
  },

  async deleteTask(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete task');
  },

  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/users`);
    return handleResponse<User[]>(res);
  },

  // Jobs
  async triggerReminderJob(): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/jobs/send-reminders`, {
      method: 'POST',
    });
    return handleResponse<Record<string, unknown>>(res);
  },
};
