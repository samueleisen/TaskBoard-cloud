import React from 'react';
import { Cloud, Users, Plus, CheckSquare } from 'lucide-react';
import { HealthStatus, Team, User } from '../types';

interface NavbarProps {
  teams: Team[];
  activeTeam: Team | null;
  onSelectTeam: (team: Team) => void;
  onOpenTeamModal: () => void;
  onOpenTaskModal: () => void;
  onToggleCloudDrawer: () => void;
  health: HealthStatus | null;
  currentUser: User | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  teams,
  activeTeam,
  onSelectTeam,
  onOpenTeamModal,
  onOpenTaskModal,
  onToggleCloudDrawer,
  health,
  currentUser,
}) => {
  return (
    <header className="navbar">
      <div className="nav-left">
        <div className="brand">
          <div className="brand-icon">
            <CheckSquare size={16} strokeWidth={2.5} />
          </div>
          <span>TaskBoard<span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: '2px' }}>.cloud</span></span>
        </div>

        {/* Team Selector Dropdown */}
        <div className="team-selector-wrap" style={{ position: 'relative' }}>
          <select
            className="team-selector"
            value={activeTeam?.id || ''}
            onChange={(e) => {
              const selected = teams.find(t => t.id === e.target.value);
              if (selected) onSelectTeam(selected);
            }}
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button className="btn-secondary" style={{ padding: '0.36rem 0.7rem', fontSize: '0.8rem' }} onClick={onOpenTeamModal}>
          <Users size={14} style={{ color: 'var(--text-muted)' }} />
          <span>Members</span>
        </button>
      </div>

      <div className="nav-right">
        {/* SRE / Cloud Status Indicator */}
        <button
          className={`cloud-pill ${health?.isPostgres ? 'postgres' : 'local'}`}
          onClick={onToggleCloudDrawer}
          title="Click to view Cloud Architecture, FinOps budget, and live SRE metrics"
        >
          <span className="cloud-indicator-dot" />
          <Cloud size={13} />
          <span>{health?.isPostgres ? 'PostgreSQL Active' : 'Local (Cloud Ready)'}</span>
        </button>

        {/* Quick Add Task Button */}
        <button className="btn-primary" onClick={onOpenTaskModal}>
          <Plus size={15} strokeWidth={2.5} />
          <span>New Task</span>
        </button>

        {/* User Avatar */}
        <div className="avatar" title={currentUser?.fullName || 'User Profile'}>
          {currentUser?.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt={currentUser.fullName} />
          ) : (
            <span>{currentUser?.fullName?.substring(0, 2).toUpperCase() || 'SE'}</span>
          )}
        </div>
      </div>
    </header>
  );
};
