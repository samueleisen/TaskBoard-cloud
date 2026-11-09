import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const app = express();

  // Basic Middlewares
  app.use(cors());
  app.use(express.json());

  // 1. Health Probe for Uptime & SRE Monitoring
  app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({
      status: 'ok',
      service: 'cloud-hosted-website',
      mode: 'GCP Compute Engine (e2-micro · us-central1)',
      isPostgres: false,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // 2. Serve Frontend Static Assets if build exists
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    console.log(`[Frontend] Serving pre-compiled client assets from ${clientDistPath}`);
    app.use(express.static(clientDistPath));

    // SPA fallback
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Route not found' });
      }
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  } else {
    app.get('/', (_req: Request, res: Response) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Cloud Hosted Website — API</title></head>
          <body style="font-family: system-ui, -apple-system, sans-serif; background: #fbfaf8; color: #18181b; padding: 48px; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #18181b; font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">Cloud Hosted Website</h1>
            <p style="color: #646360; margin-bottom: 24px;">Deployed live on Google Cloud Platform (e2-micro · us-central1)</p>
            <div style="background: #ffffff; border: 1px solid #eae7e1; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
              <p style="margin: 0 0 10px 0;"><strong>Status:</strong> Active</p>
              <p style="margin: 0 0 16px 0;"><strong>Health Check:</strong> <a href="/health" style="color: #16a34a; font-family: monospace;">/health</a></p>
              <p style="font-size: 0.85rem; color: #787672; margin: 0;">To build client assets, run <code style="background: #f5f3ef; padding: 2px 6px; border-radius: 4px; font-family: monospace;">npm run build</code>.</p>
            </div>
          </body>
        </html>
      `);
    });
  }

  // 3. Start Server
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 Cloud Hosted Website server running on http://0.0.0.0:${config.port}`);
    console.log(`🏥 Health Probe: http://localhost:${config.port}/health`);
    console.log(`====================================================`);
  });

  // 4. Graceful Shutdown
  const shutdown = () => {
    console.log('Received termination signal. Closing HTTP server cleanly...');
    server.close(() => {
      console.log('Server terminated gracefully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
