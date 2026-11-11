# CloudZero — Architecture & Operations Playbook

> **A production-grade, 24/7 web application running on Google Cloud Platform — optimized to zero waste.**  
> Engineered to demonstrate resilient cloud hosting, SRE telemetry, and FinOps discipline on a single Compute Engine instance live at [https://cloud.syamilhi.dev](https://cloud.syamilhi.dev).

---

## 📚 Documentation Index

This playbook is organized into five modular, practical guides:

1. [**01. Journey & Architecture Decisions**](01-journey-and-architecture-decisions.md)
   * The transformation from a legacy multi-container setup to CloudZero.
   * Why we chose an `e2-micro` VM over managed serverless + managed database traps.
   * Decoupling real-time UX ticking (1s) from network telemetry (3s).
   * Removing "Free Tier" language in favor of deliberate FinOps framing.
   * Designing the 60 FPS "Signal Lens" GPU compositor hero animation.

2. [**02. VM Operations & Commands Runbook**](02-vm-operations-and-commands.md)
   * Initial GCP VM provisioning and firewall rule configuration.
   * System prep: Node.js 20 LTS, global PM2, and git setup.
   * Allocating a 1 GB swapfile to guard against Linux Out-Of-Memory (OOM) crashes.
   * The automated deployment loop via GitHub Actions and manual fallback (`pm2 restart cloudzero`).
   * Diagnostic cheat sheet: PM2 logs, port checks, memory status.

3. [**03. FinOps & Hidden Cost Post-Mortem**](03-finops-and-hidden-cost-postmortem.md)
   * The story of the ~Rp 300 / day billing leak on an idle project.
   * Root-cause breakdown: GCP's default multi-regional persistent disk snapshot trap.
   * Step-by-step billing report forensic workflow (grouping by SKU).
   * Reusable 5-point GCP cost governance checklist for future projects.

4. [**04. Codebase Cleanup & Dependency Prune Audit**](04-codebase-cleanup-and-dependency-prune.md)
   * Why PM2 showed 74.2% RAM utilization and how dead code was causing it.
   * Complete inventory of the 3,185 deleted lines across 28 legacy files.
   * Pruning 38 unused packages (`pg`, `bcryptjs`, `jsonwebtoken`, `zod`, `lucide-react`).
   * Before vs. after benchmark: 5x faster builds and 60% memory reduction on the VM.

5. [**05. Automated CI/CD via GitHub Actions & SSH**](05-automated-cicd-github-actions-ssh.md)
   * Complete step-by-step setup to automate deployments on `git push origin main`.
   * Generating and securing ed25519 deploy keys in GitHub Secrets.
   * The `.github/workflows/deploy.yml` specification with SRE build-failure guardrails.
   * Automated post-deployment health check verification.

---

## 🏛️ System Architecture Topology

```
                      END-TO-END DEPLOYMENT & RUNTIME FLOW

   [ Local Dev ] ─── git push ───▶ [ GitHub ]
                                        │
                                GitHub Actions (SSH)
                                        ▼
   ┌────────────────────────────────────────────────────────┐
   │ Google Cloud Platform (GCP)                            │
   │ Compute Engine VM: e2-micro (us-central1-a)            │
   │                                                        │
   │  ┌──────────────────────────────────────────────────┐  │
   │  │ Caddy Web Server (Reverse Proxy & Auto HTTPS)    │  │
   │  │  • Automatic Let's Encrypt TLS certificates      │  │
   │  │  • Ingress: Ports 80 & 443                       │  │
   │  │  • Proxies traffic to internal :8080             │  │
   │  └────────────────────────┬─────────────────────────┘  │
   │                           ▼                            │
   │  ┌──────────────────────────────────────────────────┐  │
   │  │ PM2 Process Manager (`cloudzero` service)        │  │
   │  │  • Express Web Server (localhost:8080)           │  │
   │  │  • Serves pre-compiled React 18 SPA              │  │
   │  │  • Real-time /health probe endpoint              │  │
   │  │  • Systemd automatic crash/reboot recovery       │  │
   │  └──────────────────────────────────────────────────┘  │
   │                                                        │
   │  1 GB Swap Space (swappiness=10)                       │
   └────────────────────────▲───────────────────────────────┘
                            │ HTTPS (Port 443)
                            │
             [ Visitor: https://cloud.syamilhi.dev ]
```

---

## 💻 Infrastructure & Hardware Specifications

| Component | Specification | Cost & Efficiency |
| :--- | :--- | :--- |
| **Cloud Provider** | Google Cloud Platform (GCP) | $0.00/mo optimized footprint |
| **Compute Instance** | `e2-micro` (1 shared vCPU, 1 GB RAM) | 1 instance running 24/7 in US regions |
| **Region / Zone** | `us-central1-a` (Iowa) | US Central zone |
| **Domain & TLS** | `cloud.syamilhi.dev` | Caddy reverse proxy with automatic Let's Encrypt TLS |
| **Operating System** | Ubuntu 24.04 LTS (x86_64) | Standard free open-source OS |
| **Persistent Disk** | 10 GB Standard Persistent Disk | Compact storage footprint |
| **Swap Space** | 1 GB swapfile (`/swapfile`, `swappiness=10`) | Prevents OOM crashes during builds |
| **Process Manager** | PM2 (`cloudzero`) | Systemd daemonized auto-recovery |
| **CI/CD** | GitHub Actions (SSH deployment pipeline) | Zero-downtime automated deployment |
| **Monthly Cost** | **$0.00 / month** | $0.00 total monthly bill |

---

## ⚡ Quick VM Operations Cheat Sheet

```bash
# 1. Connect to VM via SSH, then navigate to repo
cd ~/CloudZero

# 2. Deploy latest code from GitHub (if not using CI/CD)
git pull origin main
npm install
npm run build
pm2 restart cloudzero

# 3. Verify health probe
curl -s http://localhost:8080/health

# 4. Check PM2 status & memory
pm2 status

# 5. View streaming logs
pm2 logs cloudzero --lines 50
```
