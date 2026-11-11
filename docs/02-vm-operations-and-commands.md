# VM Operations & Commands Runbook

> **A practical, ordered command reference for provisioning, configuring, deploying, and maintaining the web application on a Google Cloud Platform (GCP) Compute Engine instance.**

---

## 1. Initial GCP Cloud Provisioning

### VM Instance Parameters
Create the Compute Engine instance via the GCP Console or Cloud Shell with these exact specifications:

| Parameter | Recommended Value | Why |
| :--- | :--- | :--- |
| **Instance Name** | `taskboard-vm` (or `cloud-showcase-vm`) | Standard naming |
| **Region & Zone** | `us-central1-a` (Iowa) | Eligible for GCP Always Free Tier |
| **Machine Family** | General Purpose ➔ `E2` | Shared-core micro instance |
| **Machine Type** | `e2-micro` (2 vCPU, 1 GB memory) | 100% free (1 instance/month) |
| **Boot Disk OS** | Ubuntu 24.04 LTS (x86_64) | Stable modern LTS kernel |
| **Boot Disk Type** | Standard Persistent Disk (`pd-standard`) | Free up to 30 GB per month |
| **Boot Disk Size** | `10 GB` | Leaves 20 GB safety headroom |
| **Firewall** | Allow HTTP traffic, Allow HTTPS traffic | Basic network tags |

### Ingress Firewall Rule (Port 8080)
Because the Node.js application listens on port `8080`, create a custom VPC ingress rule:

```bash
# Run in Google Cloud Shell or local gcloud CLI:
gcloud compute firewall-rules create allow-port-8080 \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:8080 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=http-server \
    --description="Allow incoming TCP traffic on port 8080 for web showcase"
```

---

## 2. Server Initialization (Run Inside VM via SSH)

Connect to the instance via GCP Browser SSH (or `gcloud compute ssh <instance-name>`).

### Step A: Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw htop
```

### Step B: Configure Swap Space (Crucial for 1 GB RAM Stability)
On a 1 GB RAM `e2-micro` instance, running `npm run build` or TypeScript compilation will trigger the Linux Out-Of-Memory (OOM) killer and freeze the VM. Allocating a **1 GB swapfile** prevents build crashes:

```bash
# 1. Allocate a 1 GB swap file
sudo fallocate -l 1G /swapfile

# 2. Lock down permissions (root only)
sudo chmod 600 /swapfile

# 3. Format file as swap space
sudo mkswap /swapfile

# 4. Enable swap immediately
sudo swapon /swapfile

# 5. Persist swap across system reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 6. Lower swappiness to 10 (prefer physical RAM; only use disk swap when necessary)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 7. Verify swap is active (should show ~1024M under Swap)
free -m
```

### Step C: Install Node.js 20 LTS & PM2
```bash
# Install NodeSource Node.js 20 LTS repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify versions (Node 20+ and npm 10+)
node -v
npm -v

# Install PM2 globally for production process supervision
sudo npm install -g pm2
```

---

## 3. Repository Setup & First Launch

```bash
# 1. Clone your GitHub repository into the home directory
cd ~
git clone https://github.com/samueleisen/TaskBoard-cloud.git
cd TaskBoard-cloud

# 2. Copy environment template
cp .env.example .env

# 3. Install dependencies across workspaces
npm install

# 4. Build both frontend (Vite) and backend (TypeScript)
npm run build

# 5. Start the backend with PM2
pm2 start server/dist/index.js --name taskboard

# 6. Configure PM2 to auto-start on VM reboot / systemd
pm2 startup systemd
# Copy and execute the sudo command that PM2 prints on screen, e.g.:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u sam --hp /home/sam

# 7. Save current process list
pm2 save
```

---

## 4. The Standard Deployment / Update Loop

Whenever you push new code to the `main` branch on GitHub, run this single block of commands inside the VM:

```bash
cd ~/TaskBoard-cloud
git pull origin main
npm install
npm run build
pm2 restart taskboard
```

### One-Liner Quick Deploy:
```bash
cd ~/TaskBoard-cloud && git pull && npm install && npm run build && pm2 restart taskboard
```

---

## 5. Operations & Health Verification

### 1. Health Probe Verification
```bash
# Should return HTTP 200 with JSON telemetry:
curl -s http://localhost:8080/health
```

Expected output:
```json
{
  "status": "ok",
  "service": "cloud-hosted-website",
  "mode": "GCP Compute Engine (e2-micro · us-central1)",
  "isPostgres": false,
  "uptimeSeconds": 14205,
  "timestamp": "2026-11-11T04:15:30.000Z",
  "version": "1.0.0"
}
```

### 2. PM2 Process Monitoring
```bash
# Check runtime status, restarts, memory usage, and CPU
pm2 status

# Real-time streaming logs (Ctrl+C to exit)
pm2 logs taskboard

# Stream only the last 50 lines of logs
pm2 logs taskboard --lines 50

# Restart application
pm2 restart taskboard

# Zero-downtime reload
pm2 reload taskboard
```

---

## 6. SRE Diagnostics & Troubleshooting

| Problem | Diagnosis Command | Fix |
| :--- | :--- | :--- |
| **Site not responding on public IP** | `curl -I http://34.57.62.124:8080` | Check GCP firewall rule `allow-port-8080` on VPC network. |
| **Process crashed / restarting** | `pm2 logs taskboard --err` | Check application stack trace for missing files or runtime exceptions. |
| **RAM usage high (>80%)** | `free -h` and `pm2 status` | Verify swap is enabled (`swapon --show`). Restart PM2 with `pm2 restart taskboard`. |
| **Port 8080 already in use** | `sudo lsof -i :8080` | Kill orphan Node processes using `kill -9 <PID>`. |
| **Build fails with code 137 (OOM)** | `dmesg -T \| grep -i oom` | Indicates Linux killed Node during build. Re-check `/swapfile` configuration. |
| **Disk space running low** | `df -h` | Clean npm cache: `npm cache clean --force` or remove old logs in `~/.pm2/logs/`. |
