import React, { useState } from 'react';
import { X, UserPlus, Shield, Plus } from 'lucide-react';
import { Team, TeamMember } from '../types';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  members: TeamMember[];
  onInviteMember: (email: string, role: string) => void;
  onCreateTeam: (name: string) => void;
}

export const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  team,
  members,
  onInviteMember,
  onCreateTeam,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [newTeamName, setNewTeamName] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);

  if (!isOpen) return null;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    onInviteMember(inviteEmail.trim(), inviteRole);
    setInviteEmail('');
  };

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    onCreateTeam(newTeamName.trim());
    setNewTeamName('');
    setShowCreateTeam(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{team?.name}</h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Manage team members, roles, and workspaces
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Members List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Team Members ({members.length})
          </label>
          <div style={{ maxHeight: '190px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {members.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-surface-subtle)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div className="avatar">
                    {m.user?.avatarUrl ? (
                      <img src={m.user.avatarUrl} alt={m.user.fullName} />
                    ) : (
                      <span>{m.user?.fullName?.substring(0, 2).toUpperCase() || 'TM'}</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {m.user?.fullName || m.userId}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.user?.email}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                  <Shield size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {m.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Member Form */}
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: '0.25rem' }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label>Invite by Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Role</label>
            <select
              className="form-select"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '0.58rem 0.95rem' }}>
            <UserPlus size={15} />
            <span>Invite</span>
          </button>
        </form>

        <hr style={{ borderColor: 'var(--border-subtle)', margin: '0.25rem 0' }} />

        {/* Create Workspace Accordion */}
        {!showCreateTeam ? (
          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setShowCreateTeam(true)}
          >
            <Plus size={15} />
            <span>Create New Team Workspace</span>
          </button>
        ) : (
          <form onSubmit={handleCreateTeamSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1 }}
              placeholder="e.g. Mobile App Squad"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary">
              Create
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowCreateTeam(false)}>
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
