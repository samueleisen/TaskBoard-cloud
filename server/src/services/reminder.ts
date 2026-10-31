import { StorageAdapter } from '../db/store.js';
import { config } from '../config.js';

export interface ReminderResult {
  timestamp: string;
  scanned: number;
  dispatched: number;
  notifications: Array<{
    taskId: string;
    taskTitle: string;
    dueDate: string | null | undefined;
    recipientEmail: string;
    recipientName: string;
    status: 'sent' | 'simulated';
  }>;
}

export async function processDueSoonReminders(store: StorageAdapter): Promise<ReminderResult> {
  const pendingTasks = await store.getPendingReminderTasks();
  const results: ReminderResult['notifications'] = [];

  for (const task of pendingTasks) {
    if (!task.assignee || !task.assigneeId) continue;

    const emailSubject = `⏰ Task Due Soon: "${task.title}"`;
    const emailBody = `
Hello ${task.assignee.fullName},

This is an automated reminder from TaskBoard Cloud.
Your assigned task "${task.title}" is due soon (${task.dueDate ? new Date(task.dueDate).toLocaleString() : 'today'}).

Priority: ${task.priority.toUpperCase()}
View your board at: ${config.appUrl}

— TaskBoard Cloud Reminder Bot
    `.trim();

    let status: 'sent' | 'simulated' = 'simulated';

    if (config.resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.resendApiKey}`,
          },
          body: JSON.stringify({
            from: config.emailFrom,
            to: task.assignee.email,
            subject: emailSubject,
            text: emailBody,
          }),
        });

        if (response.ok) {
          status = 'sent';
        } else {
          console.warn(`[Reminder Service] Resend API responded with status ${response.status}`);
        }
      } catch (err) {
        console.error(`[Reminder Service] Failed to send email via Resend:`, err);
      }
    } else {
      // In local mode or without API key: simulate and log cleanly
      console.log(`[Email Reminder Simulated]`);
      console.log(`  To: ${task.assignee.fullName} <${task.assignee.email}>`);
      console.log(`  Subject: ${emailSubject}`);
      console.log(`  Due Date: ${task.dueDate}`);
    }

    // Record notification in store to prevent duplicate dispatches
    await store.recordNotification(task.id, task.assigneeId, 'due_soon_24h');

    results.push({
      taskId: task.id,
      taskTitle: task.title,
      dueDate: task.dueDate,
      recipientEmail: task.assignee.email,
      recipientName: task.assignee.fullName,
      status,
    });
  }

  return {
    timestamp: new Date().toISOString(),
    scanned: pendingTasks.length,
    dispatched: results.length,
    notifications: results,
  };
}
