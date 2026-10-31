import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, Layout } from 'lucide-react';
import { Board, HealthStatus, Task, Team, TeamMember, User } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskModal } from './components/TaskModal';
import { TeamModal } from './components/TeamModal';
import { CloudStatusDrawer } from './components/CloudStatusDrawer';

export const App: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Modals & Drawers
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultListId, setDefaultListId] = useState<string | undefined>(undefined);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isCloudDrawerOpen, setIsCloudDrawerOpen] = useState(false);

  // 1. Initial Load: Fetch Health, Users, and Teams
  const loadInitialData = async () => {
    try {
      // Health probe
      const healthData = await api.getHealth().catch(() => null);
      setHealth(healthData);

      // Users
      const usersData = await api.getUsers().catch(() => []);
      setUsers(usersData);
      if (usersData.length > 0) setCurrentUser(usersData[0]);

      // Teams
      const teamsData = await api.getTeams().catch(() => []);
      setTeams(teamsData);
      if (teamsData.length > 0) {
        setActiveTeam(teamsData[0]);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Load Board and Members whenever activeTeam changes
  useEffect(() => {
    if (!activeTeam) return;

    const loadTeamData = async () => {
      try {
        const [boardsData, membersData] = await Promise.all([
          api.getTeamBoards(activeTeam.id).catch(() => []),
          api.getTeamMembers(activeTeam.id).catch(() => []),
        ]);

        setTeamMembers(membersData);

        if (boardsData.length > 0) {
          const fullBoard = await api.getBoard(boardsData[0].id).catch(() => null);
          setBoard(fullBoard);
        } else {
          // Auto create a board for the team if none exist
          const newBoard = await api.createBoard(activeTeam.id, `${activeTeam.name} Board`);
          const fullBoard = await api.getBoard(newBoard.id);
          setBoard(fullBoard);
        }
      } catch (err) {
        console.error('Failed to load team data:', err);
      }
    };

    loadTeamData();
  }, [activeTeam]);

  // 3. Refresh Active Board Helper
  const refreshBoard = async () => {
    if (!board) return;
    try {
      const refreshed = await api.getBoard(board.id);
      setBoard(refreshed);
    } catch (err) {
      console.error('Failed to refresh board:', err);
    }
  };

  // 4. Task Actions
  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (taskData.id) {
        await api.updateTask(taskData.id, taskData);
      } else {
        await api.createTask({
          ...taskData,
          boardId: board?.id,
          creatorId: currentUser?.id,
        });
      }
      await refreshBoard();
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      await refreshBoard();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleMoveTask = async (taskId: string, targetListId: string, newStatus: Task['status']) => {
    try {
      await api.moveTask(taskId, targetListId, 1000, newStatus);
      await refreshBoard();
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  };

  // 5. Team Actions
  const handleInviteMember = async (email: string, role: string) => {
    if (!activeTeam) return;
    try {
      await api.inviteTeamMember(activeTeam.id, email, role);
      const members = await api.getTeamMembers(activeTeam.id);
      setTeamMembers(members);
      const allUsers = await api.getUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error('Failed to invite member:', err);
    }
  };

  const handleCreateTeam = async (name: string) => {
    try {
      const newTeam = await api.createTeam(name);
      setTeams(prev => [...prev, newTeam]);
      setActiveTeam(newTeam);
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  // 6. Filtered Board Presentation
  const filteredBoard = useMemo(() => {
    if (!board || !board.lists) return board;

    const filteredLists = board.lists.map((list) => {
      const tasks = (list.tasks || []).filter((task) => {
        // Search text filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchDesc = task.description?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }
        // Priority filter
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
          return false;
        }
        // Assignee filter
        if (assigneeFilter !== 'all' && task.assigneeId !== assigneeFilter) {
          return false;
        }
        return true;
      });

      return {
        ...list,
        tasks,
      };
    });

    return {
      ...board,
      lists: filteredLists,
    };
  }, [board, searchQuery, priorityFilter, assigneeFilter]);

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar
        teams={teams}
        activeTeam={activeTeam}
        onSelectTeam={setActiveTeam}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        onOpenTaskModal={() => {
          setEditingTask(null);
          setDefaultListId(board?.lists?.[0]?.id);
          setIsTaskModalOpen(true);
        }}
        onToggleCloudDrawer={() => setIsCloudDrawerOpen(prev => !prev)}
        health={health}
        currentUser={currentUser}
      />

      {/* Board Controls & Filter Bar */}
      <div className="board-header">
        <div className="board-title-group">
          <h1>{board?.name || 'Task Board'}</h1>
          <div className="board-description">
            {board?.description || 'Small team task management with GCP cloud architecture & FinOps guardrails'}
          </div>
        </div>

        <div className="board-actions">
          {/* Search Box */}
          <div className="search-box">
            <Search size={15} style={{ color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Priority Filter */}
          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Assignee Filter */}
          <select
            className="filter-select"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="all">All Members</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>

          <button
            className="btn-primary"
            onClick={() => {
              setEditingTask(null);
              setDefaultListId(board?.lists?.[0]?.id);
              setIsTaskModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Main Kanban Board */}
      <main style={{ flex: 1 }}>
        <KanbanBoard
          board={filteredBoard}
          onEditTask={(task) => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDeleteTask={handleDeleteTask}
          onMoveTask={handleMoveTask}
          onAddTaskInColumn={(listId) => {
            setEditingTask(null);
            setDefaultListId(listId);
            setIsTaskModalOpen(true);
          }}
        />
      </main>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        defaultListId={defaultListId}
        board={board}
        users={users}
      />

      {/* Team Management Modal */}
      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        team={activeTeam}
        members={teamMembers}
        onInviteMember={handleInviteMember}
        onCreateTeam={handleCreateTeam}
      />

      {/* SRE & Cloud Inspector Drawer */}
      <CloudStatusDrawer
        isOpen={isCloudDrawerOpen}
        onClose={() => setIsCloudDrawerOpen(false)}
        health={health}
        onRefreshHealth={async () => {
          const h = await api.getHealth().catch(() => null);
          setHealth(h);
        }}
      />
    </div>
  );
};
export default App;
