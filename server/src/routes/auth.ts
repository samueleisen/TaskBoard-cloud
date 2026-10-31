import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { StorageAdapter } from '../db/store.js';
import { config } from '../config.js';

export function createAuthRouter(store: StorageAdapter): Router {
  const router = Router();

  // Helper to generate JWT
  const generateToken = (userId: string, email: string) => {
    return jwt.sign({ userId, email }, config.jwtSecret, { expiresIn: '7d' });
  };

  // POST /api/v1/auth/register
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { email, fullName, password } = req.body;
      if (!email || !fullName) {
        return res.status(400).json({ error: 'Email and full name are required' });
      }

      const existing = await store.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const user = await store.createUser({
        email,
        fullName,
        passwordHash: password ? 'hashed_' + password : 'mock_hash',
        isActive: true,
      });

      // Auto create a personal team workspace for new users
      const teamSlug = fullName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-workspace';
      await store.createTeam(`${fullName}'s Workspace`, teamSlug, user.id);

      const token = generateToken(user.id, user.email);
      return res.status(201).json({ user, token });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/v1/auth/login
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      let user = await store.findUserByEmail(email);
      if (!user) {
        // In local mode, if the user doesn't exist, auto-create them for convenience
        user = await store.createUser({
          email,
          fullName: email.split('@')[0],
          isActive: true,
        });
        await store.createTeam(`${user.fullName}'s Workspace`, `${user.fullName}-ws`, user.id);
      }

      const token = generateToken(user.id, user.email);
      return res.json({ user, token });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/v1/auth/me
  router.get('/me', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Fallback to default user in local mode so UI works out of the box
        const defaultUser = (await store.getAllUsers())[0];
        if (!defaultUser) return res.status(401).json({ error: 'Unauthorized' });
        return res.json({ user: defaultUser });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      const user = await store.findUserById(decoded.userId);
      if (!user) return res.status(401).json({ error: 'User not found' });

      return res.json({ user });
    } catch {
      // Graceful fallback for local development
      const defaultUser = (await store.getAllUsers())[0];
      return res.json({ user: defaultUser });
    }
  });

  // GET /api/v1/auth/users
  router.get('/users', async (_req: Request, res: Response) => {
    const users = await store.getAllUsers();
    return res.json(users);
  });

  return router;
}
