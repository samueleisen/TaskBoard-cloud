import React from 'react';
import { Plus } from 'lucide-react';
import { Board, ListColumn, Task } from '../types';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  board: Board | null;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (taskId: string, targetListId: string, newStatus: Task['status']) => void;
  onAddTaskInColumn: (listId: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onAddTaskInColumn,
}) => {
  if (!board || !board.lists || board.lists.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        <p>No active columns or tasks found for this board.</p>
      </div>
    );
  }

  const lists = board.lists;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetList: ListColumn) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Map list name to task status
    const statusMap: Record<string, Task['status']> = {
      'to do': 'todo',
      'in progress': 'in_progress',
      'review': 'review',
      'done': 'done',
    };
    const resolvedStatus = statusMap[targetList.name.toLowerCase()] || 'todo';
    onMoveTask(taskId, targetList.id, resolvedStatus);
  };

  const handleMoveStep = (task: Task, currentListIndex: number, direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? currentListIndex - 1 : currentListIndex + 1;
    if (targetIndex < 0 || targetIndex >= lists.length) return;

    const targetList = lists[targetIndex];
    const statusMap: Record<string, Task['status']> = {
      'to do': 'todo',
      'in progress': 'in_progress',
      'review': 'review',
      'done': 'done',
    };
    const resolvedStatus = statusMap[targetList.name.toLowerCase()] || 'todo';
    onMoveTask(task.id, targetList.id, resolvedStatus);
  };

  const getColumnDotClass = (name: string) => {
    const clean = name.toLowerCase().replace(/[^a-z]/g, '_');
    if (clean.includes('todo') || clean.includes('to_do')) return 'todo';
    if (clean.includes('progress')) return 'in_progress';
    if (clean.includes('review')) return 'review';
    if (clean.includes('done')) return 'done';
    return 'todo';
  };

  return (
    <div className="kanban-board">
      {lists.map((list, index) => {
        const tasks = list.tasks || [];
        const dotClass = getColumnDotClass(list.name);

        return (
          <div
            key={list.id}
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, list)}
          >
            <div className="column-header">
              <div className="column-title-wrap">
                <span className={`column-dot ${dotClass}`} />
                <span className="column-name">{list.name}</span>
              </div>
              <span className="task-count">{tasks.length}</span>
            </div>

            <div className="column-tasks">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onMoveStep={(t, dir) => handleMoveStep(t, index, dir)}
                  canMovePrev={index > 0}
                  canMoveNext={index < lists.length - 1}
                />
              ))}

              <button
                className="btn-secondary"
                style={{
                  borderStyle: 'dashed',
                  justifyContent: 'center',
                  padding: '0.55rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  borderColor: 'var(--border-subtle)',
                  background: 'transparent',
                }}
                onClick={() => onAddTaskInColumn(list.id)}
              >
                <Plus size={14} />
                <span>Add Task</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
