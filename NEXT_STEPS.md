# 📌 TaskBoard Cloud — Next Steps & Action Checklist

> **A simple, step-by-step guide for what you can do later when you are ready to test, connect a database, or deploy to Google Cloud.**

---

## 🎯 Current Status

- [x] **Full-Stack Application Built**: React 18 + Vite frontend and Express + TypeScript backend are complete.
- [x] **Zero-Setup Local Mode Active**: Pre-seeded with sample teams, tasks, and an interactive Kanban board. No Docker or GCP required.
- [x] **Cloud Architecture Ready**: Terraform configurations, multi-stage Dockerfile, and GitHub Actions CI/CD workflows are in place.

---

## 🟢 Part 1: How to Test the App Locally (Whenever You Want)

You don't need to configure anything. Just run:

```bash
# In /home/sam/Code/TaskBoard-cloud:
npm run dev
```

1. Open your browser at **`http://localhost:5173`**.
2. **Try out the features**:
   - Move task cards between columns (*To Do*, *In Progress*, *Review*, *Done*).
   - Click **+ Add Task** to create your own tasks with priorities and deadlines.
   - Switch teams or create a new team workspace.
   - Click the **Cloud Status pill** in the navbar to open the **SRE Inspector** and click **Trigger Email Reminder Job** to see the cron simulation.

---

## 🟡 Part 2: When You Want a Real Local Database (Optional)

Right now, the app runs using an in-memory store. When you restart the server, data resets to the default sample tasks. If you later want your changes saved locally into PostgreSQL:

### Option A: Using Docker (Recommended for local testing)
```bash
# 1. Start the local PostgreSQL container:
docker compose up postgres -d

# 2. Add the database URL to your .env file:
echo "DATABASE_URL=postgresql://taskboard:taskboard_secret@localhost:5432/taskboard_dev" > .env

# 3. Restart the dev server:
npm run dev
```
*The app will automatically detect PostgreSQL and log: `[Storage] ✓ Connected to PostgreSQL database`.*

---

## 🔵 Part 3: When You Are Ready to Connect Google Cloud (GCP)

Whenever you decide to deploy the live app to GCP within the **~$6/month budget**, follow these 5 simple steps:

### Step 1: Install Google Cloud CLI
On your Linux machine:
```bash
sudo snap install google-cloud-cli --classic
gcloud init
gcloud auth application-default login
```

### Step 2: Create a GCP Project & Enable Billing
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project named `taskboard-cloud-<yourname>`.
3. Link your billing account to the project (ensure your free credits or billing account is active).

### Step 3: Fill Out Your Terraform Variables
1. Make a copy of the template in `terraform/`:
   ```bash
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   ```
2. Open `terraform/terraform.tfvars` and fill in:
   - `project_id`: your GCP project ID
   - `billing_account_id`: your GCP billing account ID (from the Billing page)
   - `alert_email`: your email (for the $5, $10, and $20 budget alerts)
   - `db_password`: a secure password for PostgreSQL
   - `jwt_secret`: any random 32-character string

### Step 4: Deploy the Cloud Infrastructure
```bash
cd terraform
terraform init
terraform apply
```
*This will automatically provision the Cloud SQL `db-f1-micro` instance, Secret Manager, Cloud Run service, and $5/$10/$20 budget alert policies.*

### Step 5: Build & Push the Production Container
```bash
# From the project root:
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and push the image to Artifact Registry:
docker build -t us-central1-docker.pkg.dev/<YOUR_PROJECT_ID>/taskboard/app:latest .
docker push us-central1-docker.pkg.dev/<YOUR_PROJECT_ID>/taskboard/app:latest

# Deploy image to Cloud Run:
gcloud run deploy taskboard-prod-app \
  --image us-central1-docker.pkg.dev/<YOUR_PROJECT_ID>/taskboard/app:latest \
  --region us-central1
```

---

## 🟣 Part 4: Automated CI/CD (GitHub Actions)

When you are ready to push this repository to GitHub:
1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "feat: complete TaskBoard Cloud full-stack app and cloud architecture"
   ```
2. Push to your GitHub repository.
3. Configure **Workload Identity Federation** as documented in [`docs/07-cicd-and-deployment-strategy.md`](file:///home/sam/Code/TaskBoard-cloud/docs/07-cicd-and-deployment-strategy.md) so GitHub Actions can deploy automatically on every push without storing secret JSON keys.

---

## 📋 Summary Checklist For Later

| Step | Action | Status |
| :--- | :--- | :---: |
| **1** | Run `npm run dev` and explore the app at `http://localhost:5173` | ⏳ Ready |
| **2** | *(Optional)* Start local Postgres via `docker compose up postgres -d` | ⏳ Ready |
| **3** | Install `gcloud` CLI & create GCP Project | ⏳ Ready |
| **4** | Configure `terraform/terraform.tfvars` & run `terraform apply` | ⏳ Ready |
| **5** | Push container to Artifact Registry & deploy Cloud Run | ⏳ Ready |
| **6** | Verify $5, $10, $20 budget alerts in GCP Billing Console | ⏳ Ready |
