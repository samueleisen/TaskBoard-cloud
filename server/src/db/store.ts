import { User, Team, TeamMember, Board, ListColumn, Task, NotificationLog } from '../types.js';
import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export interface StorageAdapter {
  isPostgres: boolean;
  getModeName: () => string;
  // Users
  createUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => Promise<User>;
  findUserByEmail: (email: string) => Promise<User | null>;
  findUserById: (id: string) => Promise<User | null>;
  getAllUsers: () => Promise<User[]>;
  // Teams
  getUserTeams: (userId: string) => Promise<Team[]>;
  createTeam: (name: string, slug: string, ownerId: string) => Promise<Team>;
  getTeamById: (teamId: string) => Promise<Team | null>;
  getTeamMembers: (teamId: string) => Promise<TeamMember[]>;
  addTeamMember: (teamId: string, userId: string, role: TeamMember['role']) => Promise<TeamMember>;
  // Boards & Lists
  getTeamBoards: (teamId: string) => Promise<Board[]>;
  createBoard: (teamId: string, name: string, description?: string) => Promise<Board>;
  getBoardById: (boardId: string) => Promise<Board | null>;
  createList: (boardId: string, name: string, position: number) => Promise<ListColumn>;
  // Tasks
  getBoardTasks: (boardId: string) => Promise<Task[]>;
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>;
  moveTask: (id: string, targetListId: string, newPosition: number, newStatus: Task['status']) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  // Email Reminders
  getPendingReminderTasks: () => Promise<Task[]>;
  recordNotification: (taskId: string, userId: string, type: NotificationLog['notificationType']) => Promise<void>;
}

// -------------------------------------------------------------
// In-Memory Fallback Store (Pre-seeded with rich SRE/DevOps data)
// -------------------------------------------------------------
class InMemoryStore implements StorageAdapter {
  public isPostgres = false;
  private users: User[] = [];
  private teams: Team[] = [];
  private members: TeamMember[] = [];
  private boards: Board[] = [];
  private lists: ListColumn[] = [];
  private tasks: Task[] = [];
  private notifications: NotificationLog[] = [];

  constructor() {
    this.seedInitialData();
  }

  getModeName() {
    return 'Local Memory Mode (Waiting for GCP Cloud Connection)';
  }

  private seedInitialData() {
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Initial Users
    const sam: User = {
      id: 'u-sam-101',
      email: 'sam@taskboard.cloud',
      fullName: 'Samuele Eisen',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    const alex: User = {
      id: 'u-alex-102',
      email: 'alex@taskboard.cloud',
      fullName: 'Alex Cloud',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    const elena: User = {
      id: 'u-elena-103',
      email: 'elena@taskboard.cloud',
      fullName: 'Elena SRE',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(sam, alex, elena);

    // 2. Initial Teams
    const coreTeam: Team = {
      id: 't-core-eng-1',
      name: 'Core Engineering',
      slug: 'core-engineering',
      ownerId: sam.id,
      createdAt: now,
      updatedAt: now,
    };
    const devopsTeam: Team = {
      id: 't-devops-infra-2',
      name: 'DevOps & FinOps',
      slug: 'devops-infra',
      ownerId: sam.id,
      createdAt: now,
      updatedAt: now,
    };
    this.teams.push(coreTeam, devopsTeam);

    // 3. Team Memberships
    this.members.push(
      { id: 'm-1', teamId: coreTeam.id, userId: sam.id, role: 'owner', joinedAt: now },
      { id: 'm-2', teamId: coreTeam.id, userId: alex.id, role: 'admin', joinedAt: now },
      { id: 'm-3', teamId: coreTeam.id, userId: elena.id, role: 'member', joinedAt: now },
      { id: 'm-4', teamId: devopsTeam.id, userId: sam.id, role: 'owner', joinedAt: now },
      { id: 'm-5', teamId: devopsTeam.id, userId: elena.id, role: 'admin', joinedAt: now }
    );

    // 4. Initial Boards
    const sprintBoard: Board = {
      id: 'b-sre-sprint-1',
      teamId: coreTeam.id,
      name: 'Cloud Run & SRE Migration',
      description: 'Production hardening, budget alerts, and log cost optimization',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    this.boards.push(sprintBoard);

    // 5. Lists / Columns
    const todoList: ListColumn = { id: 'l-todo', boardId: sprintBoard.id, name: 'To Do', position: 1000, createdAt: now, updatedAt: now };
    const inProgressList: ListColumn = { id: 'l-progress', boardId: sprintBoard.id, name: 'In Progress', position: 2000, createdAt: now, updatedAt: now };
    const reviewList: ListColumn = { id: 'l-review', boardId: sprintBoard.id, name: 'In Review', position: 3000, createdAt: now, updatedAt: now };
    const doneList: ListColumn = { id: 'l-done', boardId: sprintBoard.id, name: 'Done', position: 4000, createdAt: now, updatedAt: now };
    this.lists.push(todoList, inProgressList, reviewList, doneList);

    // 6. Pre-seeded Tasks
    this.tasks.push(
      {
        id: 'task-1',
        boardId: sprintBoard.id,
        listId: todoList.id,
        title: 'Configure 3-Tier Budget Alerts ($5, $10, $20)',
        description: 'Set up GCP billing budget API with email alert channel to prevent surprise bills.',
        priority: 'urgent',
        status: 'todo',
        dueDate: tomorrow, // Triggers due soon email!
        position: 1000,
        assigneeId: sam.id,
        creatorId: sam.id,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-2',
        boardId: sprintBoard.id,
        listId: inProgressList.id,
        title: 'Setup 14-Day Log Bucket & Exclude /health Probes',
        description: 'Prune log storage costs by reducing default retention from 30 to 14 days.',
        priority: 'high',
        status: 'in_progress',
        dueDate: nextWeek,
        position: 1000,
        assigneeId: elena.id,
        creatorId: sam.id,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-3',
        boardId: sprintBoard.id,
        listId: reviewList.id,
        title: 'Verify 1-Command Rollback on Cloud Run',
        description: 'Execute gcloud run services update-traffic test with simulated traffic rollback in <5s.',
        priority: 'medium',
        status: 'review',
        dueDate: null,
        position: 1000,
        assigneeId: alex.id,
        creatorId: sam.id,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-4',
        boardId: sprintBoard.id,
        listId: doneList.id,
        title: 'Downsize Cloud SQL from db-custom to db-f1-micro',
        description: 'Remediated the $40 oversized database incident and documented in post-mortem.',
        priority: 'urgent',
        status: 'done',
        dueDate: null,
        position: 1000,
        assigneeId: sam.id,
        creatorId: sam.id,
        createdAt: now,
        updatedAt: now,
      }
    );
  }

  async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      ...data,
      id: `u-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.push(user);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const teamIds = this.members.filter(m => m.userId === userId).map(m => m.teamId);
    return this.teams.filter(t => teamIds.includes(t.id));
  }

  async createTeam(name: string, slug: string, ownerId: string): Promise<Team> {
    const team: Team = {
      id: `t-${Date.now()}`,
      name,
      slug,
      ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.teams.push(team);
    this.members.push({
      id: `m-${Date.now()}`,
      teamId: team.id,
      userId: ownerId,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    });

    // Create a default board for the new team
    const board: Board = {
      id: `b-${Date.now()}`,
      teamId: team.id,
      name: 'Main TaskBoard',
      description: 'Default board for team tasks',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.boards.push(board);

    // Create standard 4 lists
    const now = new Date().toISOString();
    this.lists.push(
      { id: `l-${Date.now()}-1`, boardId: board.id, name: 'To Do', position: 1000, createdAt: now, updatedAt: now },
      { id: `l-${Date.now()}-2`, boardId: board.id, name: 'In Progress', position: 2000, createdAt: now, updatedAt: now },
      { id: `l-${Date.now()}-3`, boardId: board.id, name: 'Review', position: 3000, createdAt: now, updatedAt: now },
      { id: `l-${Date.now()}-4`, boardId: board.id, name: 'Done', position: 4000, createdAt: now, updatedAt: now }
    );

    return team;
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    return this.teams.find(t => t.id === teamId) || null;
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const teamMems = this.members.filter(m => m.teamId === teamId);
    return teamMems.map(m => ({
      ...m,
      user: this.users.find(u => u.id === m.userId),
    }));
  }

  async addTeamMember(teamId: string, userId: string, role: TeamMember['role']): Promise<TeamMember> {
    const member: TeamMember = {
      id: `m-${Date.now()}`,
      teamId,
      userId,
      role,
      joinedAt: new Date().toISOString(),
    };
    this.members.push(member);
    return {
      ...member,
      user: this.users.find(u => u.id === userId),
    };
  }

  async getTeamBoards(teamId: string): Promise<Board[]> {
    return this.boards.filter(b => b.teamId === teamId && !b.isArchived);
  }

  async createBoard(teamId: string, name: string, description?: string): Promise<Board> {
    const board: Board = {
      id: `b-${Date.now()}`,
      teamId,
      name,
      description,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.boards.push(board);

    // Auto create default 4 columns
    const now = new Date().toISOString();
    this.lists.push(
      { id: `l-${Date.now()}-1`, boardId: board.id, name: 'To Do', position: 1000, createdAt: now, updatedAt: now },
      { id: `l-${Date.now()}-2`, boardId: board.id, name: 'In Progress', position: 2000, createdAt: now, updatedAt: now },
      { id: `l-${Date.now()}-3`, boardId: board.id, name: 'Review', position: 3000, createdAt: now, updatedAt: now },
      { id: `l-${Date.now()}-4`, boardId: board.id, name: 'Done', position: 4000, createdAt: now, updatedAt: now }
    );

    return board;
  }

  async getBoardById(boardId: string): Promise<Board | null> {
    const board = this.boards.find(b => b.id === boardId);
    if (!board) return null;

    const boardLists = this.lists.filter(l => l.boardId === boardId).sort((a, b) => a.position - b.position);
    const boardTasks = this.tasks.filter(t => t.boardId === boardId).sort((a, b) => a.position - b.position);

    const enrichedLists = boardLists.map(list => ({
      ...list,
      tasks: boardTasks
        .filter(t => t.listId === list.id)
        .map(t => ({
          ...t,
          assignee: this.users.find(u => u.id === t.assigneeId),
        })),
    }));

    return {
      ...board,
      lists: enrichedLists,
    };
  }

  async createList(boardId: string, name: string, position: number): Promise<ListColumn> {
    const list: ListColumn = {
      id: `l-${Date.now()}`,
      boardId,
      name,
      position,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.lists.push(list);
    return list;
  }

  async getBoardTasks(boardId: string): Promise<Task[]> {
    return this.tasks.filter(t => t.boardId === boardId).map(t => ({
      ...t,
      assignee: this.users.find(u => u.id === t.assigneeId),
    }));
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const task: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.push(task);
    return {
      ...task,
      assignee: this.users.find(u => u.id === task.assigneeId),
    };
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    this.tasks[index] = {
      ...this.tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return {
      ...this.tasks[index],
      assignee: this.users.find(u => u.id === this.tasks[index].assigneeId),
    };
  }

  async moveTask(id: string, targetListId: string, newPosition: number, newStatus: Task['status']): Promise<Task | null> {
    return this.updateTask(id, {
      listId: targetListId,
      position: newPosition,
      status: newStatus,
    });
  }

  async deleteTask(id: string): Promise<boolean> {
    const initLen = this.tasks.length;
    this.tasks = this.tasks.filter(t => t.id !== id);
    return this.tasks.length < initLen;
  }

  async getPendingReminderTasks(): Promise<Task[]> {
    const now = Date.now();
    const twentyFourHours = now + 24 * 60 * 60 * 1000;

    return this.tasks.filter(t => {
      if (t.status === 'done' || !t.dueDate || !t.assigneeId) return false;
      const due = new Date(t.dueDate).getTime();
      const isDueSoon = due >= now && due <= twentyFourHours;
      const alreadySent = this.notifications.some(
        n => n.taskId === t.id && n.userId === t.assigneeId && n.notificationType === 'due_soon_24h'
      );
      return isDueSoon && !alreadySent;
    }).map(t => ({
      ...t,
      assignee: this.users.find(u => u.id === t.assigneeId),
    }));
  }

  async recordNotification(taskId: string, userId: string, type: NotificationLog['notificationType']): Promise<void> {
    this.notifications.push({
      id: `notif-${Date.now()}`,
      taskId,
      userId,
      notificationType: type,
      sentAt: new Date().toISOString(),
    });
  }
}

// -------------------------------------------------------------
// PostgreSQL Storage Adapter (Used when DATABASE_URL is active)
// -------------------------------------------------------------
class PostgresStore implements StorageAdapter {
  public isPostgres = true;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 6, // Strictly sized for db-f1-micro memory limits
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 3000,
    });
  }

  getModeName() {
    return 'Cloud / Local PostgreSQL Connected';
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  // PostgreSQL implementations map to the SQL schema
  async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const res = await this.pool.query(
      `INSERT INTO users (email, password_hash, full_name, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name as "fullName", avatar_url as "avatarUrl", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
      [data.email, data.passwordHash || '', data.fullName, data.avatarUrl || null]
    );
    return res.rows[0];
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const res = await this.pool.query(
      `SELECT id, email, password_hash as "passwordHash", full_name as "fullName", avatar_url as "avatarUrl", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    return res.rows[0] || null;
  }

  async findUserById(id: string): Promise<User | null> {
    const res = await this.pool.query(
      `SELECT id, email, full_name as "fullName", avatar_url as "avatarUrl", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async getAllUsers(): Promise<User[]> {
    const res = await this.pool.query(
      `SELECT id, email, full_name as "fullName", avatar_url as "avatarUrl", is_active as "isActive" FROM users WHERE is_active = true`
    );
    return res.rows;
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const res = await this.pool.query(
      `SELECT t.id, t.name, t.slug, t.owner_id as "ownerId", t.created_at as "createdAt", t.updated_at as "updatedAt"
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id
       WHERE tm.user_id = $1`,
      [userId]
    );
    return res.rows;
  }

  async createTeam(name: string, slug: string, ownerId: string): Promise<Team> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const teamRes = await client.query(
        `INSERT INTO teams (name, slug, owner_id) VALUES ($1, $2, $3) RETURNING id, name, slug, owner_id as "ownerId", created_at as "createdAt", updated_at as "updatedAt"`,
        [name, slug, ownerId]
      );
      const team = teamRes.rows[0];

      await client.query(
        `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [team.id, ownerId]
      );

      const boardRes = await client.query(
        `INSERT INTO boards (team_id, name, description) VALUES ($1, 'Main TaskBoard', 'Default board') RETURNING id`,
        [team.id]
      );
      const boardId = boardRes.rows[0].id;

      await client.query(`
        INSERT INTO lists (board_id, name, position) VALUES
        ($1, 'To Do', 1000),
        ($1, 'In Progress', 2000),
        ($1, 'Review', 3000),
        ($1, 'Done', 4000)
      `, [boardId]);

      await client.query('COMMIT');
      return team;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    const res = await this.pool.query(
      `SELECT id, name, slug, owner_id as "ownerId", created_at as "createdAt", updated_at as "updatedAt" FROM teams WHERE id = $1`,
      [teamId]
    );
    return res.rows[0] || null;
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const res = await this.pool.query(
      `SELECT tm.id, tm.team_id as "teamId", tm.user_id as "userId", tm.role, tm.joined_at as "joinedAt",
              json_build_object('id', u.id, 'email', u.email, 'fullName', u.full_name, 'avatarUrl', u.avatar_url) as user
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1`,
      [teamId]
    );
    return res.rows;
  }

  async addTeamMember(teamId: string, userId: string, role: TeamMember['role']): Promise<TeamMember> {
    const res = await this.pool.query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)
       RETURNING id, team_id as "teamId", user_id as "userId", role, joined_at as "joinedAt"`,
      [teamId, userId, role]
    );
    return res.rows[0];
  }

  async getTeamBoards(teamId: string): Promise<Board[]> {
    const res = await this.pool.query(
      `SELECT id, team_id as "teamId", name, description, is_archived as "isArchived", created_at as "createdAt", updated_at as "updatedAt"
       FROM boards WHERE team_id = $1 AND is_archived = false ORDER BY created_at ASC`,
      [teamId]
    );
    return res.rows;
  }

  async createBoard(teamId: string, name: string, description?: string): Promise<Board> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const bRes = await client.query(
        `INSERT INTO boards (team_id, name, description) VALUES ($1, $2, $3)
         RETURNING id, team_id as "teamId", name, description, is_archived as "isArchived", created_at as "createdAt", updated_at as "updatedAt"`,
        [teamId, name, description || null]
      );
      const board = bRes.rows[0];

      await client.query(`
        INSERT INTO lists (board_id, name, position) VALUES
        ($1, 'To Do', 1000),
        ($1, 'In Progress', 2000),
        ($1, 'Review', 3000),
        ($1, 'Done', 4000)
      `, [board.id]);

      await client.query('COMMIT');
      return board;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getBoardById(boardId: string): Promise<Board | null> {
    const bRes = await this.pool.query(
      `SELECT id, team_id as "teamId", name, description, is_archived as "isArchived", created_at as "createdAt", updated_at as "updatedAt"
       FROM boards WHERE id = $1`,
      [boardId]
    );
    if (bRes.rows.length === 0) return null;
    const board = bRes.rows[0];

    const listsRes = await this.pool.query(
      `SELECT id, board_id as "boardId", name, position, created_at as "createdAt", updated_at as "updatedAt"
       FROM lists WHERE board_id = $1 ORDER BY position ASC`,
      [boardId]
    );

    const tasksRes = await this.pool.query(
      `SELECT t.id, t.board_id as "boardId", t.list_id as "listId", t.title, t.description,
              t.priority, t.status, t.due_date as "dueDate", t.position, t.assignee_id as "assigneeId",
              t.creator_id as "creatorId", t.created_at as "createdAt", t.updated_at as "updatedAt",
              CASE WHEN u.id IS NOT NULL THEN json_build_object('id', u.id, 'email', u.email, 'fullName', u.full_name, 'avatarUrl', u.avatar_url) ELSE null END as assignee
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.board_id = $1 ORDER BY t.position ASC`,
      [boardId]
    );

    const lists = listsRes.rows.map(l => ({
      ...l,
      tasks: tasksRes.rows.filter(t => t.listId === l.id),
    }));

    return { ...board, lists };
  }

  async createList(boardId: string, name: string, position: number): Promise<ListColumn> {
    const res = await this.pool.query(
      `INSERT INTO lists (board_id, name, position) VALUES ($1, $2, $3)
       RETURNING id, board_id as "boardId", name, position, created_at as "createdAt", updated_at as "updatedAt"`,
      [boardId, name, position]
    );
    return res.rows[0];
  }

  async getBoardTasks(boardId: string): Promise<Task[]> {
    const res = await this.pool.query(
      `SELECT t.id, t.board_id as "boardId", t.list_id as "listId", t.title, t.description,
              t.priority, t.status, t.due_date as "dueDate", t.position, t.assignee_id as "assigneeId",
              t.creator_id as "creatorId", t.created_at as "createdAt", t.updated_at as "updatedAt",
              CASE WHEN u.id IS NOT NULL THEN json_build_object('id', u.id, 'email', u.email, 'fullName', u.full_name, 'avatarUrl', u.avatar_url) ELSE null END as assignee
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.board_id = $1 ORDER BY t.position ASC`,
      [boardId]
    );
    return res.rows;
  }

  async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const res = await this.pool.query(
      `INSERT INTO tasks (board_id, list_id, title, description, priority, status, due_date, position, assignee_id, creator_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, board_id as "boardId", list_id as "listId", title, description,
                 priority, status, due_date as "dueDate", position, assignee_id as "assigneeId",
                 creator_id as "creatorId", created_at as "createdAt", updated_at as "updatedAt"`,
      [data.boardId, data.listId, data.title, data.description || null, data.priority, data.status, data.dueDate || null, data.position, data.assigneeId || null, data.creatorId]
    );
    return res.rows[0];
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (updates.title !== undefined) { fields.push(`title = $${idx++}`); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push(`description = $${idx++}`); values.push(updates.description); }
    if (updates.priority !== undefined) { fields.push(`priority = $${idx++}`); values.push(updates.priority); }
    if (updates.status !== undefined) { fields.push(`status = $${idx++}`); values.push(updates.status); }
    if (updates.dueDate !== undefined) { fields.push(`due_date = $${idx++}`); values.push(updates.dueDate); }
    if (updates.listId !== undefined) { fields.push(`list_id = $${idx++}`); values.push(updates.listId); }
    if (updates.position !== undefined) { fields.push(`position = $${idx++}`); values.push(updates.position); }
    if (updates.assigneeId !== undefined) { fields.push(`assignee_id = $${idx++}`); values.push(updates.assigneeId); }

    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const res = await this.pool.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, board_id as "boardId", list_id as "listId", title, description,
                 priority, status, due_date as "dueDate", position, assignee_id as "assigneeId",
                 creator_id as "creatorId", created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );
    return res.rows[0] || null;
  }

  async moveTask(id: string, targetListId: string, newPosition: number, newStatus: Task['status']): Promise<Task | null> {
    return this.updateTask(id, {
      listId: targetListId,
      position: newPosition,
      status: newStatus,
    });
  }

  async deleteTask(id: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM tasks WHERE id = $1`, [id]);
    return (res.rowCount || 0) > 0;
  }

  async getPendingReminderTasks(): Promise<Task[]> {
    const res = await this.pool.query(`
      SELECT t.id, t.board_id as "boardId", t.list_id as "listId", t.title, t.description,
             t.priority, t.status, t.due_date as "dueDate", t.position, t.assignee_id as "assigneeId",
             t.creator_id as "creatorId", t.created_at as "createdAt", t.updated_at as "updatedAt",
             json_build_object('id', u.id, 'email', u.email, 'fullName', u.full_name, 'avatarUrl', u.avatar_url) as assignee
      FROM tasks t
      JOIN users u ON u.id = t.assignee_id
      LEFT JOIN notification_logs nl ON nl.task_id = t.id AND nl.user_id = u.id AND nl.notification_type = 'due_soon_24h'
      WHERE t.status != 'done'
        AND t.due_date IS NOT NULL
        AND t.due_date BETWEEN NOW() AND (NOW() + INTERVAL '24 hours')
        AND nl.id IS NULL
      LIMIT 50
    `);
    return res.rows;
  }

  async recordNotification(taskId: string, userId: string, type: NotificationLog['notificationType']): Promise<void> {
    await this.pool.query(
      `INSERT INTO notification_logs (task_id, user_id, notification_type) VALUES ($1, $2, $3)
       ON CONFLICT (task_id, user_id, notification_type) DO NOTHING`,
      [taskId, userId, type]
    );
  }
}

// -------------------------------------------------------------
// Storage Factory: Auto-selects Postgres if available, falls back to Memory
// -------------------------------------------------------------
export async function initializeStore(): Promise<StorageAdapter> {
  if (config.databaseUrl) {
    try {
      console.log(`[Storage] Testing connection to PostgreSQL at ${config.databaseUrl.replace(/:[^:]*@/, ':****@')}...`);
      const pgStore = new PostgresStore(config.databaseUrl);
      const ok = await pgStore.testConnection();
      if (ok) {
        console.log(`[Storage] ✓ Connected to PostgreSQL database.`);
        return pgStore;
      }
      console.warn(`[Storage] ⚠️ PostgreSQL connection test timed out or failed. Falling back to Local Memory Store.`);
    } catch (err) {
      console.warn(`[Storage] ⚠️ PostgreSQL initialization error:`, err);
    }
  }

  console.log(`[Storage] ⚡ Using Local In-Memory Store (Pre-seeded with sample teams & tasks). Ready for cloud connection!`);
  return new InMemoryStore();
}
