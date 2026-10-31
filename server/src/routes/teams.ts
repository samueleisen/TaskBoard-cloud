import { Router, Request, Response } from 'express';
import { StorageAdapter } from '../db/store.js';

export function createTeamsRouter(store: StorageAdapter): Router {
  const router = Router();

  // GET /api/v1/teams
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = (req.query.userId as string) || (await store.getAllUsers())[0]?.id;
      if (!userId) return res.status(400).json({ error: 'User ID required' });

      const teams = await store.getUserTeams(userId);
      return res.json(teams);
    } catch (err) {
      console.error('Error fetching teams:', err);
      return res.status(500).json({ error: 'Failed to fetch teams' });
    }
  });

  // POST /api/v1/teams
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { name, slug, ownerId } = req.body;
      if (!name) return res.status(400).json({ error: 'Team name is required' });

      const resolvedOwnerId = ownerId || (await store.getAllUsers())[0]?.id;
      const teamSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');

      const team = await store.createTeam(name, teamSlug, resolvedOwnerId);
      return res.status(201).json(team);
    } catch (err) {
      console.error('Error creating team:', err);
      return res.status(500).json({ error: 'Failed to create team' });
    }
  });

  // GET /api/v1/teams/:id
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const team = await store.getTeamById(req.params.id);
      if (!team) return res.status(404).json({ error: 'Team not found' });
      return res.json(team);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch team' });
    }
  });

  // GET /api/v1/teams/:id/members
  router.get('/:id/members', async (req: Request, res: Response) => {
    try {
      const members = await store.getTeamMembers(req.params.id);
      return res.json(members);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch members' });
    }
  });

  // POST /api/v1/teams/:id/members
  router.post('/:id/members', async (req: Request, res: Response) => {
    try {
      const { email, role = 'member' } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      let user = await store.findUserByEmail(email);
      if (!user) {
        user = await store.createUser({
          email,
          fullName: email.split('@')[0],
          isActive: true,
        });
      }

      const member = await store.addTeamMember(req.params.id, user.id, role);
      return res.status(201).json(member);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to add member' });
    }
  });

  return router;
}
