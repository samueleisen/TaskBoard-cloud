# Cloud Hosted Website — Live on GCP

[![GCP](https://img.shields.io/badge/Google%20Cloud-e2--micro%20(Always%20Free)-4285F4.svg?logo=google-cloud&logoColor=white)](https://cloud.google.com/free)
[![Cost](https://img.shields.io/badge/Running%20Cost-%240.00%2Fmonth-brightgreen.svg)](#-cost-breakdown--free-tier)
[![Runtime](https://img.shields.io/badge/Node.js-20%20LTS-green.svg?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg?logo=react)](https://react.dev/)

> **A real, production-grade web application running 24/7 on Google Cloud Platform at $0.00 / month.**  
> Built to demonstrate how to deploy, manage, and monitor a live cloud web service with zero infrastructure cost and zero compromise on reliability.

---

## 🌐 Live Demo & Endpoints

* **Live Website**: [http://34.57.62.124:8080](http://34.57.62.124:8080)
* **Live SRE Health Probe**: [http://34.57.62.124:8080/health](http://34.57.62.124:8080/health)
* **GitHub Repository**: [https://github.com/samueleisen/TaskBoard-cloud](https://github.com/samueleisen/TaskBoard-cloud)

---

## 🏛️ Architecture & Deployment Flow

```
   [ Local Dev ] ─── git push ───▶ [ GitHub ]
                                        │
                                    git pull
                                        ▼
   ┌────────────────────────────────────────────────────────┐
   │ Google Cloud Platform (GCP)                            │
   │ Compute Engine VM: e2-micro (us-central1-a)            │
   │                                                        │
   │  ┌──────────────────────────────────────────────────┐  │
   │  │ PM2 Process Manager                              │  │
   │  │  • Express Web Server (:8080)                    │  │
   │  │  • Serves pre-compiled React 18 SPA              │  │
   │  │  • Real-time /health probe endpoint              │  │
   │  │  • Automatic restart on crash or VM reboot       │  │
   │  └──────────────────────────────────────────────────┘  │
   │                                                        │
   │  GCP Firewall: allow-port-8080 (TCP Ingress)           │
   └────────────────────────┬───────────────────────────────┘
                            │
                            ▼
             [ Visitor Browser: 34.57.62.124:8080 ]
```

---

## 💻 Infrastructure Specifications

| Component | Detail |
|---|---|
| **Cloud Provider** | Google Cloud Platform (GCP) |
| **Instance Type** | `e2-micro` (1 shared vCPU, 1 GB RAM) |
| **Region / Zone** | `us-central1-a` (Always Free Tier eligible region) |
| **Operating System** | Ubuntu 24.04 LTS (x86_64) |
| **Persistent Disk** | 10 GB Standard Persistent Disk (within 30 GB free limit) |
| **Process Manager** | PM2 (`taskboard` service with systemd auto-recovery) |
| **Swap Space** | 1 GB swapfile (`swappiness=10`) for memory stability |
| **Monthly Bill** | **$0.00 / month** |

---

## 💸 Cost Breakdown & Free Tier Governance

This setup operates entirely within the **GCP Always Free Tier**:
* **1 non-preemptible `e2-micro` VM instance** per month in US regions (`us-central1`, `us-west1`, or `us-east1`).
* **30 GB-months** standard persistent disk.
* **1 GB network egress** per month to worldwide destinations.
* **$0.00 total monthly cost** with continuous 24/7 uptime.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, TypeScript, Vite. Styled with vanilla CSS design tokens (warm alabaster palette `#fbfaf8`, graphite accents `#18181b`, typography in *Plus Jakarta Sans* and *Inter*). No bloated utility CSS or 3D canvas libraries.
* **Backend**: Node.js 20 LTS, Express 4, TypeScript. Lightweight single-process unified architecture that serves static SPA assets and telemetry.
* **Telemetry**: Real-time `/health` probe measuring roundtrip latency, process uptime, and system mode.

---

## 🚀 Local Development

```bash
# 1. Clone repository
git clone https://github.com/samueleisen/TaskBoard-cloud.git
cd TaskBoard-cloud

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

* **Author**: Syamil Hedison
* **Email**: [syamilhedison@gmail.com](mailto:syamilhedison@gmail.com)
* **GitHub**: [@samueleisen](https://github.com/samueleisen)
