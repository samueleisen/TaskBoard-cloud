import { Router, Request, Response } from 'express';
import { StorageAdapter } from '../db/store.js';
import { processDueSoonReminders } from '../services/reminder.js';

export function createJobsRouter(store: StorageAdapter): Router {
  const router = Router();

  // POST /api/v1/jobs/send-reminders
  // Invoked by Cloud Scheduler (or frontend Cloud Inspector button)
  router.post('/send-reminders', async (_req: Request, res: Response) => {
    try {
      console.log('[Job Triggered] Running due date email reminder scan...');
      const result = await processDueSoonReminders(store);
      console.log(`[Job Completed] Dispatched ${result.dispatched} reminders.`);
      return res.json({
        success: true,
        summary: `Processed ${result.scanned} upcoming tasks; dispatched ${result.dispatched} reminders.`,
        ...result,
      });
    } catch (err) {
      console.error('[Job Failed] Error processing reminders:', err);
      return res.status(500).json({ error: 'Failed to process reminders' });
    }
  });

  return router;
}
