# Cloud Hosted Website — Architecture & Operations Playbook

> **A production-grade, 24/7 web application running on Google Cloud Platform at $0.00 / month.**  
> Engineered to demonstrate resilient cloud hosting, SRE telemetry, and FinOps discipline.

---

## 🧭 System Overview

**Cloud Hosted Website** is a single-page showcase application that couples a responsive React frontend with an Express backend running under PM2 on a Google Cloud Platform Compute Engine instance.

Instead of paying for managed databases, application load balancers, or over-provisioned container clusters, this project proves that a well-architected web service can run continuously with high availability, low latency, and zero monthly cloud expenditure.

---

## 🏛️ Architecture & Traffic Flow

```
                      END-TO-END DEPLOYMENT & RUNTIME FLOW

   [ Local Dev ] ─── git push ───▶ [ GitHub ]
                                        │
                                    git pull
                                        ▼
   ┌────────────────────────────────────────────────────────┐
   │ Google Cloud Platform (GCP)                            │
   │ Compute Engine VM: e2-micro (us-central1-a)            │
   │                                                        │
   │  ┌──────────────────────────────────────────────────┐  │
   │  │ PM2 Process Manager (`taskboard` service)        │  │
   │  │  • Express Web Server (:8080)                    │  │
   │  │  • Serves pre-compiled React 18 SPA              │  │
   │  │  • Real-time /health probe endpoint              │  │
   │  │  • Systemd automatic crash/reboot recovery       │  │
   │  └──────────────────────────────────────────────────┘  │
   │                                                        │
   │  GCP Firewall: allow-port-8080 (TCP Ingress)           │
   │  1 GB Swap Space (swappiness=10)                       │
   └────────────────────────┬───────────────────────────────┘
                            │
                            ▼
             [ Visitor Browser: 34.57.62.124:8080 ]
```

### Key Request Paths:
1. `GET /` — Serves the pre-compiled React single-page application (`client/dist/index.html`).
2. `GET /assets/*` — High-speed static bundle delivery directly by Express.
3. `GET /health` — Real-time telemetry probe returning JSON status, process uptime, and node metadata.
4. `GET *` (Fallback) — Client-side SPA routing fallback to `client/dist/index.html`.

---

## 💻 Infrastructure & Hardware Specifications

| Component | Specification | Cost & Efficiency |
| :--- | :--- | :--- |
| **Cloud Provider** | Google Cloud Platform (GCP) | $0.00/mo optimized footprint |
| **Compute Instance** | `e2-micro` (1 shared vCPU, 1 GB RAM) | Lean shared compute core |
| **Region / Zone** | `us-central1-a` (Iowa) | US Central zone |
| **Operating System** | Ubuntu 24.04 LTS (x86_64) | Standard free open-source OS |
| **Storage** | 10 GB Standard Persistent Disk | Compact storage footprint |
| **Swapfile** | 1 GB swapfile (`/swapfile`, `swappiness=10`) | Local disk allocated, guards against OOM |
| **Process Manager** | PM2 (`taskboard`) | Systemd daemonized auto-restart |
| **Ingress Firewall** | VPC firewall rule: `allow-port-8080` (TCP `0.0.0.0/0`) | Direct VPC ingress |
| **Monthly Cost** | **$0.00 / month** | $0.00 total monthly bill |

---

## 📊 SRE Telemetry & Health Probe Contract

The application implements a lightweight, zero-dependency health and monitoring endpoint at `/health`:

### HTTP GET `/health`
```json
{
  "status": "ok",
  "service": "cloud-hosted-website",
  "mode": "GCP Compute Engine (e2-micro · us-central1)",
  "isPostgres": false,
  "uptimeSeconds": 798740,
  "timestamp": "2026-11-09T09:00:30.576Z",
  "version": "1.0.0"
}
```

### Client-Side Probe Integration:
* **Active Latency Ping**: The client initiates an active round-trip ping every 3 seconds to measure real-time latency and sync uptime.
* **Ticking Counter**: A local interval ticks second-by-second to display live, uninterrupted uptime in the sticky metric strip.
* **Layout Shift Prevention**: Strict tabular numeric styling (`font-variant-numeric: tabular-nums`) prevents layout jitter during metric updates.

---

## 🛠️ Local Development & Build Workflow

The repository is structured as a clean npm workspace with decoupled client and server packages:

```
TaskBoard-cloud/
├── client/           # React 18 + Vite + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx          # Single-page showcase component
│   │   ├── index.css        # Vanilla design tokens & animations
│   │   ├── main.tsx         # Application entry point
│   │   └── services/api.ts  # Telemetry client & HealthStatus contract
│   └── vite.config.ts       # Dev server port 5173 + API proxy
├── server/           # Express 4 + TypeScript backend
│   ├── src/
│   │   ├── config.ts        # Environment configuration
│   │   └── index.ts         # Server, health probe, static asset delivery
│   └── tsconfig.json
├── docs/             # Architecture and operations documentation
│   └── README.md
├── .env.example      # Environment variable template
├── package.json      # Workspace root configuration
└── README.md         # Public project readme
```

### Development Commands

```bash
# 1. Install all dependencies across workspaces
npm install

# 2. Run local development servers (Vite :5173 + Express :8080)
npm run dev

# 3. Production build (compiles client assets and server TypeScript)
npm run build

# 4. Start production server
npm start
```

---

## 🚀 VM Setup & Operations Runbook

### 1. Provisioning Swap Space (OOM Prevention)
On a 1 GB RAM `e2-micro` instance, Node.js builds or memory spikes can trigger the Linux Out-Of-Memory (OOM) killer. Allocating a 1 GB swapfile ensures rock-solid stability:

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2. PM2 Management Commands
The server runs continuously under PM2 with systemd startup hooks:

```bash
# Check status and resource usage
pm2 status

# View live streaming application logs
pm2 logs taskboard

# Restart application
pm2 restart taskboard

# Reload application with zero downtime
pm2 reload taskboard

# Save current PM2 process list to systemd startup
pm2 save
```

### 3. Deploying Code Updates on the VM
```bash
cd ~/TaskBoard-cloud
git pull origin main
npm install
npm run build
pm2 restart taskboard
```
