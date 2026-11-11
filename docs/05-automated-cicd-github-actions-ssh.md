# Automated CI/CD Deployment via GitHub Actions & SSH

> **A step-by-step architectural guide and implementation plan to automatically deploy updates to your GCP Compute Engine VM whenever you run `git push origin main`.**

---

## 1. High-Level Concept & Workflow

Instead of opening the GCP Browser SSH terminal and running `git pull`, `npm run build`, and `pm2 restart` manually, **GitHub Actions automates the entire sequence in the cloud**:

```
 ┌────────────────┐
 │ Developer PC   │
 └───────┬────────┘
         │ git push origin main
         ▼
 ┌────────────────────────────────────────────────────────┐
 │ GitHub Repository                                      │
 │                                                        │
 │  Trigger: .github/workflows/deploy.yml                │
 │  Runner: Ubuntu GitHub Actions Runner (Free)           │
 │  • Authenticates via secure SSH Private Key secret     │
 │  • Connects over encrypted SSH to your VM (Port 22)    │
 └───────┬────────────────────────────────────────────────┘
         │ Encrypted SSH Session
         ▼
 ┌────────────────────────────────────────────────────────┐
 │ Google Cloud Platform (GCP)                            │
 │ Compute Engine VM: 34.57.62.124                        │
 │                                                        │
 │  Executes remote deployment script:                    │
 │  1. cd ~/TaskBoard-cloud                               │
 │  2. git pull origin main                               │
 │  3. npm install                                        │
 │  4. npm run build                                      │
 │  5. pm2 restart taskboard                              │
 │  6. curl -fail http://localhost:8080/health            │
 └────────────────────────────────────────────────────────┘
```

---

## 2. Security & Zero-Trust Key Management

To allow GitHub to log into your VM securely without human passwords:

1. **Use a Dedicated Deploy Key Pair**: Never use your personal daily SSH key. Generate a single-purpose key pair dedicated exclusively to GitHub Actions.
2. **Ed25519 Algorithm**: Faster, smaller, and significantly more cryptographically secure than legacy RSA keys.
3. **GitHub Encrypted Secrets**: The private key is never committed to git; it is stored inside GitHub's encrypted secrets vault.

---

## 3. Step-by-Step Implementation Guide

### Step 1: Generate the Deploy Key Pair
You can run this command on your local computer or inside the VM terminal:

```bash
# Generate a dedicated ed25519 key pair with no passphrase (for automation)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/deploy_key -N ""
```

This creates two files:
* `~/deploy_key` (The **Private Key** — belongs in GitHub Secrets)
* `~/deploy_key.pub` (The **Public Key** — belongs in your VM)

---

### Step 2: Install the Public Key on the GCP VM
Add the public key to your VM user's authorized keys list:

```bash
# 1. Ensure the .ssh folder and authorized_keys exist on the VM
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 2. Append the public key to authorized_keys
cat ~/deploy_key.pub >> ~/.ssh/authorized_keys

# 3. Secure file permissions (SSH will reject keys if permissions are too open)
chmod 600 ~/.ssh/authorized_keys

# 4. Remove the temporary public key file from the disk
rm ~/deploy_key.pub
```

---

### Step 3: Add Repository Secrets in GitHub

1. Open your repository on GitHub: `https://github.com/samueleisen/TaskBoard-cloud`
2. Navigate to: **Settings** ➔ **Secrets and variables** ➔ **Actions**.
3. Click **New repository secret** and add these three secrets:

| Secret Name | Value | Description |
| :--- | :--- | :--- |
| `VM_HOST` | `34.57.62.124` | Your GCP VM external public IP address |
| `VM_USER` | `sam` | Your Linux username on the VM (`whoami` in VM terminal) |
| `VM_SSH_KEY` | *(Contents of `~/deploy_key`)* | The complete private key including `BEGIN` and `END` lines |
| `VM_PORT` | `22` *(Optional, defaults to 22)* | Standard SSH port |

> **Security Note**: Once you have pasted the private key into GitHub Secrets, safely delete the local `~/deploy_key` file from your machine:
> ```bash
> rm ~/deploy_key
> ```

---

### Step 4: Ensure Port 22 (SSH) Is Allowed in GCP Firewall

By default, Google Cloud creates a default firewall rule named `default-allow-ssh` (TCP port 22 from `0.0.0.0/0`). 

To verify that SSH ingress is active, run this in Google Cloud Shell or local gcloud CLI:

```bash
gcloud compute firewall-rules list --filter="name=default-allow-ssh"
```

If it does not exist, create it:
```bash
gcloud compute firewall-rules create allow-ssh \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:22 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=http-server
```

---

## 4. The GitHub Actions Workflow File

Create the following file in your repository at `.github/workflows/deploy.yml`:

```yaml
name: Continuous Deployment (GCP VM)

# Trigger deployment only on pushes to the main branch
on:
  push:
    branches:
      - main

jobs:
  deploy:
    name: Deploy to GCP Compute Engine
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout Repository Code
        uses: actions/checkout@v4

      - name: Execute Remote SSH Deployment
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VM_HOST }}
          username: ${{ secrets.VM_USER }}
          key: ${{ secrets.VM_SSH_KEY }}
          port: ${{ secrets.VM_PORT || 22 }}
          script_stop: true # Stop execution immediately if any command fails
          script: |
            echo "🚀 [Deploy] Navigating to project directory..."
            cd ~/TaskBoard-cloud

            echo "📥 [Deploy] Pulling latest code from GitHub main..."
            git pull origin main

            echo "📦 [Deploy] Synchronizing npm dependencies..."
            npm install

            echo "🔨 [Deploy] Compiling client and server bundles..."
            npm run build

            echo "🔄 [Deploy] Reloading PM2 process..."
            pm2 restart taskboard

            echo "🏥 [Deploy] Verifying health check probe..."
            sleep 2
            curl -fail http://localhost:8080/health || { echo "❌ Health check failed!"; exit 1; }

            echo "✅ [Deploy] Deployment completed successfully!"
```

---

## 5. Built-In Reliability & SRE Guardrails

### 1. Fail-Safe Build Protection (`script_stop: true`)
If `npm run build` fails (for example, due to a TypeScript compilation error):
* The script aborts immediately **before** touching PM2.
* Your live website keeps running uninterrupted on the previous working build.
* GitHub Actions marks the run as **RED / FAILED** and emails you the error log.

### 2. Automated Post-Deployment Verification
The workflow concludes with `curl -fail http://localhost:8080/health`.
* If the Node.js server failed to bind the port or threw an unhandled exception on boot, the action flags an immediate error.

### 3. Zero Cloud Cost
* GitHub Actions provides **2,000 free runner minutes per month** for public and private repositories.
* A single deployment takes ~45 seconds. You can deploy **over 2,500 times per month** completely free.

---

## 6. Daily Developer Workflow (After Implementation)

Once this is configured, your entire development workflow becomes:

```bash
# 1. Edit code locally on your PC
git add .
git commit -m "feat: updated hero section"

# 2. Push to GitHub
git push origin main
```

**That is all.** You do not need to open SSH, run `git pull`, or touch PM2 again. Within ~45 seconds, GitHub automatically updates the live website at `http://34.57.62.124:8080`.
