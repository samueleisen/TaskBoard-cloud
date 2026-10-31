import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { StorageAdapter } from '../db/store.js';

// SRE Guardrail 1: Rate Limiter (Max 10 requests per 30 seconds per IP)
const taskMutationLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'SRE Rate Limit: Maximum 10 requests per 30 seconds. Please slow down.'
  }
});

// SRE Guardrail 2: Board Capacity Ceiling
const MAX_TASKS_PER_BOARD = 5;

export function createTasksRouter(store: StorageAdapter): Router {
  const router = Router();

  // GET /api/v1/tasks/board/:boardId
  router.get('/board/:boardId', async (req: Request, res: Response) => {
    try {
      const tasks = await store.getBoardTasks(req.params.boardId);
      return res.json(tasks);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // POST /api/v1/tasks (Guarded by Rate Limiter & Capacity Cap)
  router.post('/', taskMutationLimiter, async (req: Request, res: Response) => {
    try {
      const {
        boardId,
        listId,
        title,
        description,
        priority = 'medium',
        status = 'todo',
        dueDate,
        position = 1000,
        assigneeId,
        creatorId,
      } = req.body;

      if (!boardId || !listId || !title) {
        return res.status(400).json({ error: 'boardId, listId, and title are required' });
      }

      // Enforce Board Capacity Cap (Max 5 tasks)
      const currentTasks = await store.getBoardTasks(boardId);
      if (currentTasks.length >= MAX_TASKS_PER_BOARD) {
        return res.status(400).json({
          error: `Board capacity reached: Maximum ${MAX_TASKS_PER_BOARD} tasks allowed per board. Please delete or archive a task first.`
        });
      }

      const defaultCreatorId = creatorId || (await store.getAllUsers())[0]?.id;

      const task = await store.createTask({
        boardId,
        listId,
        title,
        description,
        priority,
        status,
        dueDate: dueDate || null,
        position,
        assigneeId: assigneeId || null,
        creatorId: defaultCreatorId,
      });

      return res.status(201).json(task);
    } catch (err) {
      console.error('Error creating task:', err);
      return res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // PATCH /api/v1/tasks/:id
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const updated = await store.updateTask(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Task not found' });
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // PATCH /api/v1/tasks/:id/move
  router.patch('/:id/move', taskMutationLimiter, async (req: Request, res: Response) => {
    try {
      const { targetListId, newPosition, newStatus } = req.body;
      if (!targetListId || newPosition === undefined) {
        return res.status(400).json({ error: 'targetListId and newPosition are required' });
      }

      const moved = await store.moveTask(req.params.id, targetListId, newPosition, newStatus || 'todo');
      if (!moved) return res.status(404).json({ error: 'Task not found' });
      return res.json(moved);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to move task' });
    }
  });

  // DELETE /api/v1/tasks/:id
  router.delete('/:id', taskMutationLimiter, async (req: Request, res: Response) => {
    try {
      const success = await store.deleteTask(req.params.id);
      if (!success) return res.status(404).json({ error: 'Task not found' });
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  return router;
}
