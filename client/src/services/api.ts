export interface HealthStatus {
  status: string;
  service: string;
  mode: string;
  isPostgres: boolean;
  uptimeSeconds: number;
  timestamp: string;
  version: string;
}

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch('/health');
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },
};
