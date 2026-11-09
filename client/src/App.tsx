import React, { useState, useEffect, useRef } from 'react';
import { HealthStatus, api } from './services/api';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* ------------------------------------------------------------------ */
/*  Live Metrics Hook                                                   */
/* ------------------------------------------------------------------ */
function useLiveHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [uptimeSeconds, setUptimeSeconds] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const baseUptimeRef = useRef<number | null>(null);
  const baseTimestampRef = useRef<number>(Date.now());

  const probe = async () => {
    setIsPinging(true);
    const t0 = performance.now();
    try {
      const h = await api.getHealth();
      const roundTrip = Math.round(performance.now() - t0);
      setLatency(roundTrip);

      // Support ?days= or ?hours= query param to preview higher uptime values locally
      const params = new URLSearchParams(window.location.search);
      const devOffset = (Number(params.get('days')) || 0) * 86400 + (Number(params.get('hours')) || 0) * 3600;
      const effectiveUptime = h.uptimeSeconds + devOffset;

      setHealth({ ...h, uptimeSeconds: effectiveUptime });
      baseUptimeRef.current = effectiveUptime;
      baseTimestampRef.current = Date.now();
      setUptimeSeconds(effectiveUptime);
      setError(false);
    } catch {
      setLatency(null);
      setError(true);
    } finally {
      setTimeout(() => setIsPinging(false), 300);
    }
  };

  // 1. Probe every 3 seconds for active latency & server sync
  useEffect(() => {
    probe();
    const probeInterval = setInterval(probe, 3000);
    return () => clearInterval(probeInterval);
  }, []);

  // 2. Second-by-second ticking counter for real-time uptime display
  useEffect(() => {
    const tickInterval = setInterval(() => {
      if (baseUptimeRef.current !== null) {
        const elapsedSec = Math.floor((Date.now() - baseTimestampRef.current) / 1000);
        setUptimeSeconds(baseUptimeRef.current + elapsedSec);
      }
    }, 1000);
    return () => clearInterval(tickInterval);
  }, []);

  return { health, latency, uptimeSeconds, error, isPinging };
}

/* ------------------------------------------------------------------ */
/*  Intersection Observer hook for scroll-reveal                       */
/* ------------------------------------------------------------------ */
function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ------------------------------------------------------------------ */
/*  Architecture steps                                                  */
/* ------------------------------------------------------------------ */
const STEPS = [
  {
    icon: '💻',
    label: 'Local Dev',
    detail: 'TypeScript · React · Express',
  },
  {
    icon: '🐙',
    label: 'GitHub',
    detail: 'samueleisen/TaskBoard-cloud',
    link: 'https://github.com/samueleisen/TaskBoard-cloud',
  },
  {
    icon: '☁️',
    label: 'GCP VM',
    detail: 'e2-micro · us-central1-a',
  },
  {
    icon: '⚙️',
    label: 'PM2',
    detail: 'Process manager · auto-restart',
  },
  {
    icon: '🔥',
    label: 'Port 8080',
    detail: 'Firewall rule · TCP ingress',
  },
  {
    icon: '🌐',
    label: 'Live',
    detail: '34.57.62.124:8080',
  },
];

const SPECS = [
  { label: 'Instance', value: 'e2-micro' },
  { label: 'vCPUs', value: '1 (shared)' },
  { label: 'RAM', value: '1 GB' },
  { label: 'OS', value: 'Ubuntu 24.04 LTS' },
  { label: 'Disk', value: '10 GB persistent' },
  { label: 'Region', value: 'us-central1' },
  { label: 'Runtime', value: 'Node.js 20 LTS' },
  { label: 'Monthly cost', value: '$0.00 ✓' },
];

/* ------------------------------------------------------------------ */
/*  Sections                                                            */
/* ------------------------------------------------------------------ */

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal-section ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

function LiveStrip({
  health,
  latency,
  uptimeSeconds,
  error,
  isPinging,
}: {
  health: HealthStatus | null;
  latency: number | null;
  uptimeSeconds: number | null;
  error: boolean;
  isPinging: boolean;
}) {
  const online = !error && health?.status === 'ok';
  return (
    <div className="live-strip">
      <div className="live-status">
        <span className={`live-dot ${online ? 'online' : 'offline'} ${isPinging ? 'live-pinging' : ''}`} />
        <span className="live-label">{online ? 'Online' : 'Offline'}</span>
      </div>
      <div className="live-divider" />
      <div className="live-metric">
        <span className="live-metric-key">Latency</span>
        <span className="live-metric-val">
          {latency != null ? `${latency} ms` : '—'}
          <span className={`ping-indicator ${isPinging ? 'active' : ''}`} title="Real-time ping sync" />
        </span>
      </div>
      <div className="live-divider" />
      <div className="live-metric">
        <span className="live-metric-key">Uptime</span>
        <span className="live-metric-val live-metric-uptime">{uptimeSeconds != null ? formatUptime(uptimeSeconds) : '—'}</span>
      </div>
      <div className="live-divider" />
      <div className="live-metric">
        <span className="live-metric-key">Instance</span>
        <span className="live-metric-val">GCP e2-micro · us-central1</span>
      </div>
      <div className="live-divider" />
      <div className="live-metric">
        <span className="live-metric-key">Cost</span>
        <span className="live-metric-val live-free">$0.00 / mo</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main App                                                            */
/* ------------------------------------------------------------------ */
export const App: React.FC = () => {
  const { health, latency, uptimeSeconds, error, isPinging } = useLiveHealth();

  return (
    <div className="app-container">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-brand">
          <span className="topbar-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#18181b" />
              <path d="M8 12 Q12 7 16 12 Q12 17 8 12Z" fill="white" opacity="0.9" />
            </svg>
          </span>
          <span>Cloud Hosted Website</span>
        </div>
        <a
          className="topbar-gh"
          href="https://github.com/samueleisen"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.111-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.295 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          <span>GitHub</span>
        </a>
      </header>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg-blobs" aria-hidden="true">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="hero-dot" />
            Running live on Google Cloud Platform
          </div>
          <h1 className="hero-title">
            Cloud Hosted<br />
            <span className="hero-title-accent">Website</span>
          </h1>
          <p className="hero-sub">
            A real, production-grade web app deployed on GCP's Free Tier —<br />
            24 / 7 uptime, zero dollars, zero compromise.
          </p>
          <div className="hero-cta-row">
            <a className="btn-primary" href="mailto:syamilhedison@gmail.com">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              Get in touch
            </a>
            <a
              className="btn-secondary"
              href="https://github.com/samueleisen/TaskBoard-cloud"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.111-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.295 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              View source
            </a>
          </div>
        </div>
        <div className="hero-scroll-hint" aria-hidden="true">
          <div className="scroll-line" />
        </div>
      </section>

      {/* ── Live Strip ── */}
      <LiveStrip
        health={health}
        latency={latency}
        uptimeSeconds={uptimeSeconds}
        error={error}
        isPinging={isPinging}
      />

      {/* ── Architecture ── */}
      <Section>
        <div className="section-inner">
          <div className="section-label">How it works</div>
          <h2 className="section-title">From commit to cloud</h2>
          <p className="section-sub">The entire deployment pipeline runs on free, openly available infrastructure.</p>

          <div className="arch-flow">
            {STEPS.map((step, i) => (
              <React.Fragment key={step.label}>
                <div className="arch-node" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="arch-icon">{step.icon}</div>
                  <div className="arch-label">{step.label}</div>
                  {step.link ? (
                    <a href={step.link} target="_blank" rel="noopener noreferrer" className="arch-detail arch-detail-link">
                      {step.detail}
                    </a>
                  ) : (
                    <div className="arch-detail">{step.detail}</div>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="arch-arrow" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6"/>
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Specs ── */}
      <Section>
        <div className="section-inner">
          <div className="section-label">Infrastructure</div>
          <h2 className="section-title">VM specifications</h2>
          <p className="section-sub">Running entirely within GCP's Always Free Tier — no billing surprises.</p>

          <div className="specs-grid">
            {SPECS.map((spec) => (
              <div className="spec-card" key={spec.label}>
                <div className="spec-label">{spec.label}</div>
                <div className={`spec-value ${spec.label === 'Monthly cost' ? 'spec-free' : ''}`}>{spec.value}</div>
              </div>
            ))}
          </div>

          {/* Live health dump */}
          {health && (
            <div className="health-dump">
              <div className="health-dump-header">
                <span className="live-dot online" style={{ width: '6px', height: '6px' }} />
                <span>Live /health response</span>
                <span className="health-dump-latency">{latency != null ? `${latency}ms` : ''}</span>
              </div>
              <pre className="health-dump-json">{JSON.stringify(health, null, 2)}</pre>
            </div>
          )}
        </div>
      </Section>

      {/* ── Contact ── */}
      <Section>
        <div className="section-inner contact-section">
          <div className="section-label">Contact</div>
          <h2 className="section-title">Let's build something</h2>
          <p className="section-sub">
            Interested in a cloud-deployed web project, or just want to chat about GCP Free Tier setups?
          </p>
          <div className="contact-row">
            <a className="contact-card" href="mailto:syamilhedison@gmail.com">
              <div className="contact-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </div>
              <div>
                <div className="contact-card-label">Email</div>
                <div className="contact-card-val">syamilhedison@gmail.com</div>
              </div>
            </a>
            <a
              className="contact-card"
              href="https://github.com/samueleisen"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="contact-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.111-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.295 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
              </div>
              <div>
                <div className="contact-card-label">GitHub</div>
                <div className="contact-card-val">samueleisen</div>
              </div>
            </a>
          </div>
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer className="footer">
        <span>Running on Google Cloud Platform · e2-micro · us-central1 · Free Tier</span>
        <span className="footer-sep">·</span>
        <span>Built with TypeScript, React, Express</span>
      </footer>
    </div>
  );
};

export default App;
