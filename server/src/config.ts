import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'taskboard-development-jwt-secret-key-change-in-prod-32chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cronSecret: process.env.CRON_SECRET || 'local-cron-secret-key',
  appUrl: process.env.APP_URL || 'http://localhost:8080',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'alerts@taskboard.app',
};
