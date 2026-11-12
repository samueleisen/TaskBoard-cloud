# CloudZero — Live on GCP

[![GCP](https://img.shields.io/badge/Google%20Cloud-e2--micro-4285F4.svg?logo=google-cloud&logoColor=white)](https://cloud.google.com/free)
[![Domain](https://img.shields.io/badge/Domain-cloud.syamilhi.dev-10b981.svg)](https://cloud.syamilhi.dev)
[![Cost](https://img.shields.io/badge/Running%20Cost-%240.00%2Fmonth-brightgreen.svg)](#-cost-optimization--resource-governance)
[![Runtime](https://img.shields.io/badge/Node.js-20%20LTS-green.svg?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg?logo=react)](https://react.dev/)

> **A real, production-grade web application running 24/7 on Google Cloud Platform — optimized to zero waste.**  
> Deployed live at [https://cloud.syamilhi.dev](https://cloud.syamilhi.dev) with automatic HTTPS (Caddy reverse proxy), PM2 process supervision, and automated GitHub Actions CI/CD.

---

## 🌐 Live Demo & Endpoints

* **Live Website**: [https://cloud.syamilhi.dev](https://cloud.syamilhi.dev)
* **Live SRE Health Probe**: [https://cloud.syamilhi.dev/health](https://cloud.syamilhi.dev/health)
* **GitHub Repository**: [https://github.com/syamilhi/CloudZero](https://github.com/syamilhi/CloudZero)

---

## 🏛️ Architecture & Deployment Flow

```
   [ Local Dev ] ─── git push ───▶ [ GitHub ]
                                        │
                                GitHub Actions (SSH)
                                        ▼
   ┌────────────────────────────────────────────────────────┐
   │ Google Cloud Platform (GCP)                            │
   │ Compute Engine VM: e2-micro (us-central1-a)            │
   │                                                        │
   │  ┌──────────────────────────────────────────────────┐  │
   │  │ Caddy Web Server (Reverse Proxy)                 │  │
   │  │  • Automatic Let's Encrypt TLS (HTTPS)           │  │
   │  │  • Ingress: Ports 80 & 443                       │  │
   │  │  • Proxies traffic to internal :8080             │  │
   │  └────────────────────────┬─────────────────────────┘  │
   │                           ▼                            │
   │  ┌──────────────────────────────────────────────────┐  │
   │  │ PM2 Process Manager (`cloudzero` process)         │  │
   │  │  • Express Web Server (localhost:8080)           │  │
   │  │  • Serves pre-compiled React 18 SPA              │  │
   │  │  • Real-time /health probe endpoint              │  │
   │  │  • Automatic restart on crash or VM reboot       │  │
   │  └──────────────────────────────────────────────────┘  │
   │                                                        │
   │  1 GB Swap Space (swappiness=10)                       │
   └────────────────────────▲───────────────────────────────┘
                            │ HTTPS (Port 443)
                            │
             [ Visitor: https://cloud.syamilhi.dev ]
```

---

## 💻 Infrastructure Specifications

| Component | Detail |
|---|---|
| **Cloud Provider** | Google Cloud Platform (GCP) |
| **Instance Type** | `e2-micro` (1 shared vCPU, 1 GB RAM) |
| **Region / Zone** | `us-central1-a` (Iowa) |
| **Operating System** | Ubuntu 24.04 LTS (x86_64) |
| **Domain** | `cloud.syamilhi.dev` |
| **Web Server / TLS** | Caddy (Automatic HTTPS reverse proxy) |
| **Persistent Disk** | 10 GB Standard Persistent Disk |
| **Process Manager** | PM2 (`cloudzero` service with systemd auto-recovery) |
| **Swap Space** | 1 GB swapfile (`swappiness=10`) for memory stability |
| **CI/CD** | GitHub Actions (SSH deployment pipeline) |
| **Monthly Bill** | **$0.00 / month** |

---

## 💸 Cost Optimization & Resource Governance

This setup is architected for **$0.00 / month total running cost**:
* **Optimized `e2-micro` VM instance** running 24/7 in `us-central1`.
* **10 GB** standard persistent disk footprint.
* **Lean bandwidth tuning** to keep egress under control.
* **$0.00 total monthly bill** with continuous 24/7 uptime.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, TypeScript, Vite. Styled with vanilla CSS design tokens (warm alabaster palette `#fbfaf8`, graphite accents `#18181b`, typography in *Plus Jakarta Sans* and *Inter*). No bloated utility CSS or heavy 3D canvas libraries.
* **Backend**: Node.js 20 LTS, Express 4, TypeScript. Lightweight single-process unified architecture that serves static SPA assets and telemetry.
* **Reverse Proxy**: Caddy server handling automatic TLS certificate management and proxying to port 8080.
* **Telemetry**: Real-time `/health` probe measuring roundtrip latency, process uptime, and system mode.

---

## 🚀 Local Development

```bash
# 1. Clone repository
git clone https://github.com/syamilhi/CloudZero.git
cd CloudZero

# 2. Install dependencies across client and server
npm install

# 3. Start development servers (Vite client :5173 + Express :8080)
npm run dev
```

* Open [http://localhost:5173](http://localhost:5173) in your browser for the hot-reloading development preview.
* Open [http://localhost:8080](http://localhost:8080) for the production server preview.

### Production Build

```bash
npm run build
npm start
```

---

## 📬 Contact & Author

* **Author**: Syamil Hadyan
* **Portfolio**: [https://syamilhi.dev](https://syamilhi.dev)
* **Email**: [syamilhedison@gmail.com](mailto:syamilhedison@gmail.com)
* **GitHub**: [@syamilhi](https://github.com/syamilhi)
