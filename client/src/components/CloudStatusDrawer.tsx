import React, { useState } from 'react';
import { X, Cloud, Bell, RefreshCw, CheckCircle, Database, ShieldAlert, Cpu } from 'lucide-react';
import { HealthStatus } from '../types';
import { api } from '../services/api';

interface CloudStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthStatus | null;
  onRefreshHealth: () => void;
}

export const CloudStatusDrawer: React.FC<CloudStatusDrawerProps> = ({
  isOpen,
  onClose,
  health,
  onRefreshHealth,
}) => {
  const [isTriggering, setIsTriggering] = useState(false);
  const [jobResult, setJobResult] = useState<Record<string, unknown> | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleTestHealth = async () => {
    const start = performance.now();
    await onRefreshHealth();
    setLatencyMs(Math.round(performance.now() - start));
  };

  const handleTriggerCron = async () => {
    setIsTriggering(true);
    setJobResult(null);
    try {
      const res = await api.triggerReminderJob();
      setJobResult(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setJobResult({ error: message });
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <aside className="cloud-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Cloud size={18} style={{ color: 'var(--text-main)' }} />
            <div>
              <h2>Cloud & FinOps Inspector</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                SRE reliability, SLA probes, and GCP cost telemetry
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* 1. Live Cloud / DB Connection Status */}
        <div className="sre-metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Compute & Storage Engine</div>
            <button
              onClick={handleTestHealth}
              className="btn-secondary"
              style={{ padding: '2px 8px', fontSize: '0.75rem', gap: '4px' }}
              title="Ping /health probe"
            >
              <RefreshCw size={11} />
              <span>Ping SLA</span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginTop: '0.2rem' }}>
            <Database size={15} style={{ color: health?.isPostgres ? 'var(--accent-emerald)' : 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {health?.mode || 'Local Memory Mode (Cloud Ready)'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
            {latencyMs !== null && <span>Probe Latency: <strong style={{ color: 'var(--text-main)' }}>{latencyMs}ms</strong> · </span>}
            <span>Uptime: <strong style={{ color: 'var(--text-main)' }}>{health?.uptimeSeconds || 0}s</strong> · Status: <strong style={{ color: 'var(--text-main)' }}>{health?.status || 'Active'}</strong></span>
          </div>
        </div>

        {/* 2. FinOps Budget & Cost Governance */}
        <div className="sre-metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">FinOps Budget Governance</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
              Target: $6.00 / mo
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.3rem' }}>
            <div className="metric-val">$0.00</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>current run rate (Local / Free Tier)</span>
          </div>

          <div className="budget-bar-track">
            <div className="budget-bar-fill" style={{ width: '4%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
            <div style={{ background: 'var(--pill-high-bg)', border: '1px solid var(--pill-high-border)', padding: '6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--pill-high-text)' }}>Alert 1</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--pill-high-text)', fontFamily: 'var(--font-mono)' }}>$5.00</div>
            </div>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#c2410c' }}>Alert 2</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c2410c', fontFamily: 'var(--font-mono)' }}>$10.00</div>
            </div>
            <div style={{ background: 'var(--pill-urgent-bg)', border: '1px solid var(--pill-urgent-border)', padding: '6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--pill-urgent-text)' }}>Ceiling</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--pill-urgent-text)', fontFamily: 'var(--font-mono)' }}>$20.00</div>
            </div>
          </div>
        </div>

        {/* 3. Autoscaling & Log Retention SRE Guardrails */}
        <div className="sre-metric-card">
          <div className="metric-label">SRE Reliability Guardrails</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.4rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Cpu size={13} /> Autoscaling Instances:
              </span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>0 min / 3 max</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldAlert size={13} /> Log Retention:
              </span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>14 Days (Pruned)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Database size={13} /> DB Connection Limit:
              </span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>6 pool / 24 peak</strong>
            </div>
          </div>
        </div>

        {/* 4. Asynchronous Cron & Email Reminder Trigger */}
        <div className="sre-metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Cloud Scheduler / Reminders</div>
            <Bell size={13} style={{ color: 'var(--text-dim)' }} />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.45 }}>
            Scans tasks due within 24h and simulates or dispatches automated notification emails.
          </p>

          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.65rem', padding: '0.55rem' }}
            onClick={handleTriggerCron}
            disabled={isTriggering}
          >
            {isTriggering ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
            <span>{isTriggering ? 'Running Reminder Job...' : 'Trigger Email Reminder Job'}</span>
          </button>

          {jobResult && (
            <div className="reminder-result-box" style={{ marginTop: '0.75rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)', fontSize: '0.72rem' }}>Execution Result:</div>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: 'var(--text-muted)' }}>
                {JSON.stringify(jobResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* 5. Incident Post-Mortem & Architecture Reference */}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: 'auto', lineHeight: 1.5 }}>
          Case study documented in <strong>docs/01-gathered-context.md</strong>:
          <br />
          <em>"The $40 Oversized Database Incident & FinOps Resolution"</em>
        </div>
      </aside>
    </div>
  );
};
