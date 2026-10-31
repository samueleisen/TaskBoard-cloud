import React from 'react';
import { Calendar, ChevronRight, ChevronLeft, Trash2, Edit2 } from 'lucide-react';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMoveStep?: (task: Task, direction: 'prev' | 'next') => void;
  canMovePrev: boolean;
  canMoveNext: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onMoveStep,
  canMovePrev,
  canMoveNext,
}) => {
  // Determine due date status
  let dueInfo: { text: string; isUrgent: boolean } | null = null;
  if (task.dueDate) {
    const dueTime = new Date(task.dueDate).getTime();
    const now = Date.now();
    const diffHours = Math.round((dueTime - now) / (1000 * 60 * 60));

    if (diffHours < 0 && task.status !== 'done') {
      dueInfo = { text: 'Overdue', isUrgent: true };
    } else if (diffHours <= 24 && task.status !== 'done') {
      dueInfo = { text: `Due in ${Math.max(1, diffHours)}h`, isUrgent: true };
    } else {
      dueInfo = {
        text: new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        isUrgent: false,
      };
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
  };

  return (
    <div
      className="task-card"
      draggable
      onDragStart={handleDragStart}
      onClick={() => onEdit(task)}
    >
      <div className="task-top-meta">
        <span className={`priority-pill ${task.priority}`}>
          {task.priority}
        </span>

        {/* Quick Move & Action Controls */}
        <div className="quick-move-wrap" onClick={(e) => e.stopPropagation()}>
          {canMovePrev && onMoveStep && (
            <button
              className="btn-move-step"
              onClick={() => onMoveStep(task, 'prev')}
              title="Move to previous column"
            >
              <ChevronLeft size={13} />
            </button>
          )}
          {canMoveNext && onMoveStep && (
            <button
              className="btn-move-step"
              onClick={() => onMoveStep(task, 'next')}
              title="Move to next column"
            >
              <ChevronRight size={13} />
            </button>
          )}
          <button
            className="btn-move-step"
            style={{ marginLeft: '4px' }}
            onClick={() => onDelete(task.id)}
            title="Delete task"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="task-title">{task.title}</div>

      {task.description && (
        <div className="task-description">{task.description}</div>
      )}

      <div className="task-bottom-meta">
        {dueInfo ? (
          <div className={`due-badge ${dueInfo.isUrgent ? 'urgent-due' : ''}`}>
            <Calendar size={12} />
            <span>{dueInfo.text}</span>
          </div>
        ) : (
          <div />
        )}

        {task.assignee ? (
          <div className="avatar" title={`Assigned to ${task.assignee.fullName}`}>
            {task.assignee.avatarUrl ? (
              <img src={task.assignee.avatarUrl} alt={task.assignee.fullName} />
            ) : (
              <span>{task.assignee.fullName.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
        ) : (
          <div className="avatar" style={{ opacity: 0.4 }} title="Unassigned">
            <span>--</span>
          </div>
        )}
      </div>
    </div>
  );
};
