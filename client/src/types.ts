export interface HealthStatus {
  status: string;
  service: string;
  mode: string;
  isPostgres: boolean;
  uptimeSeconds: number;
  timestamp: string;
  version: string;
}
