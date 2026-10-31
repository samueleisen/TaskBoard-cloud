import { Router, Request, Response } from 'express';
import { StorageAdapter } from '../db/store.js';

export function createBoardsRouter(store: StorageAdapter): Router {
  const router = Router();

  // GET /api/v1/teams/:teamId/boards
  router.get('/team/:teamId', async (req: Request, res: Response) => {
    try {
      const boards = await store.getTeamBoards(req.params.teamId);
      return res.json(boards);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch boards' });
    }
  });

  // POST /api/v1/teams/:teamId/boards
  router.post('/team/:teamId', async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'Board name is required' });

      const board = await store.createBoard(req.params.teamId, name, description);
      return res.status(201).json(board);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create board' });
    }
  });

  // GET /api/v1/boards/:id (Full board with columns and tasks)
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const board = await store.getBoardById(req.params.id);
      if (!board) return res.status(404).json({ error: 'Board not found' });
      return res.json(board);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch board' });
    }
  });

  // POST /api/v1/boards/:id/lists
  router.post('/:id/lists', async (req: Request, res: Response) => {
    try {
      const { name, position } = req.body;
      if (!name) return res.status(400).json({ error: 'List name is required' });

      const list = await store.createList(req.params.id, name, position || 5000);
      return res.status(201).json(list);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create column list' });
    }
  });

  return router;
}
