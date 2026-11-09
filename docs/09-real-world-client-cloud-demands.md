# 09. Real-World Client Demands & Cloud Consulting Playbook

> **A comprehensive industry guide decoding what freelance clients, startups, and SMBs actually ask for when hiring cloud, DevOps, and backend engineers.**

---

## 🧭 Executive Summary: The "Client Vocabulary Gap"

Clients rarely speak in engineering specifications. They do not say:
> *"Please configure an e2-micro instance on a GCP VPC subnet with ingress TCP rule 8080, an express-rate-limit middleware, and a 1GB swapfile."*

Instead, they speak in **business pain, fear, money, or deadlines**:
> *"Our launch is in 4 days, the site is only on my laptop, and our freelance developer disappeared."*
> *"Why did our cloud bill jump from $40 to $850 this month?"*
> *"Every time an influencer posts about us, the database crashes with a 504 error."*

Your job as a cloud engineer is **translation**: taking their emotional or business-level problem, diagnosing the technical root cause, and delivering a clean, permanent solution.

---

## 🗂️ The 8 Archetypal "Shapes" of Client Cloud Requests

### Archetype 1: "It Works on My Laptop, Put It on the Web" (Greenfield MVP Deployment)
* **Who the Client Is**: Solo non-technical founder, product designer with a junior frontend dev, agency with a client prototype.
* **The "Shape" of What They Ask**:
  * *"We finished our React + Node app on GitHub. We bought a domain on GoDaddy. How do we make `app.ourcompany.com` live so investors can test it?"*
  * *"I built this full-stack tool with an AI tool, but it only runs when I type `npm run dev` on my computer. Can you put it in the cloud?"*
* **The Underlying Technical Reality**:
  * They have no Dockerfile, no production environment separation, no SSL certificate, and plaintext secrets scattered in `.env`.
  * Compute selection (Cloud Run, VPS, or lightweight VM like `e2-micro`).
  * Nginx / Caddy reverse proxy for SSL termination (Let's Encrypt HTTPS).
  * DNS management (setting up `A` and `CNAME` records).
  * Persistent database initialization (Postgres / Supabase).
* **Scope & Deliverables**:
  1. Production multi-stage `Dockerfile`.
  2. Cloud hosting instance or serverless container setup.
  3. Custom domain linked with automated HTTPS.
  4. Managed or containerized PostgreSQL database with backups.
  5. Simple README / Runbook on how to update it.
* **Market Pricing**: **$300 – $800** (Fixed price, 1–3 days work).

---

### Archetype 2: "Our Cloud Bill Is Bleeding Us Dry" (FinOps & Cost Optimization)
* **Who the Client Is**: Bootstrapped startup founder, small agency owner, developer who inherited an AWS/GCP account.
* **The "Shape" of What They Ask**:
  * *"We only have 400 active users, but AWS/GCP charged us $1,600 last month. Can you find out why and fix it?"*
  * *"Someone set up our database and left it running. We think it's way bigger than we need."*
  * *"We're getting killed by NAT Gateway and CloudWatch / Stackdriver log storage costs."*
* **The Underlying Technical Reality**:
  * Exact scenario from TaskBoard's incident post-mortem: an oversized database tier (e.g. `db-custom-4-16` costing $150/mo when a $10 `db-f1-micro` suffices).
  * Unattached persistent disks, orphan EBS volumes, or abandoned staging clusters running 24/7.
  * Ingestion of verbose `debug` logs with infinite 30-day or 90-day retention policies instead of 14-day pruned buckets.
  * Lack of Scale-to-Zero on staging environments.
* **Scope & Deliverables**:
  1. Infrastructure Cost Audit report highlighting the top 3 billing culprits.
  2. Database right-sizing and disk snapshotting.
  3. Log exclusion filters (dropping `/health` checks) and 14-day retention limit.
  4. 3-Tier Budget Alerts ($50, $100, $250) sent via Slack or Email.
* **Market Pricing**: **$500 – $1,500** (or 20–30% of the first 3 months' cloud savings).

---

### Archetype 3: "The Site Crashes During Traffic Spikes" (High Availability & Scaling)
* **Who the Client Is**: E-commerce merchant, marketing lead running a promo campaign, creator launching a product.
* **The "Shape" of What They Ask**:
  * *"We are running a flash sale this Friday. Last time we did this, the site went down for 4 hours and we lost thousands in sales."*
  * *"Our server CPU spikes to 100% and we have to manually reboot the VM in the console."*
  * *"Users complain that clicking 'Submit' hangs indefinitely during peak hours."*
* **The Underlying Technical Reality**:
  * Monolithic backend with unpooled database connections (PostgreSQL runs out of connections at ~50–100 users).
  * Static frontend assets (images, JS bundles) being served directly by Node.js instead of an edge CDN.
  * Heavy synchronous blocking operations (e.g. sending emails or generating PDFs inside the HTTP request loop instead of using background workers).
* **Scope & Deliverables**:
  1. Edge CDN caching (Cloudflare or Google Cloud CDN) for all static bundles and images.
  2. Database connection pooling (PgBouncer or pool budgeting).
  3. Horizontal autoscaling configuration (e.g. Cloud Run min 0 / max 5, or VM Instance Group).
  4. Offloading slow jobs to asynchronous background queues (Cloud Scheduler, Cloud Tasks, or Redis/BullMQ).
* **Market Pricing**: **$800 – $2,500** (Critical urgency project).

---

### Archetype 4: "My Developer Left / Ghosted Us" (Triage, Rescue & Runbook)
* **Who the Client Is**: Non-technical founder or small business owner whose previous contractor disappeared.
* **The "Shape" of What They Ask**:
  * *"Our freelance developer stopped answering Slack. The site is still up, but we don't know how to deploy updates or where the passwords are."*
  * *"We have root access to an AWS/GCP account, but we're terrified of touching anything in case it breaks."*
  * *"We need someone to document what we actually have and make sure it's secure."*
* **The Underlying Technical Reality**:
  * Architecture is a mystery black box: undocumented cron jobs, hardcoded API keys, single points of failure.
  * Danger of former contractor retaining root keys or SSH backdoor access.
* **Scope & Deliverables**:
  1. Infrastructure Discovery Audit: map every running VM, bucket, database, and domain.
  2. Security Lockdown: rotate root passwords, SSH keys, IAM API tokens, and enforce MFA.
  3. Code Repository Sync: ensure GitHub repo matches what is actually running on the live server.
  4. 2-Page "Emergency Operations Runbook": how to reboot, how to deploy, who to contact.
* **Market Pricing**: **$600 – $1,800** (High trust, frequently leads to ongoing monthly retainer).

---

### Archetype 5: "We Need Staging and Auto-Deploy" (CI/CD Pipeline Engineering)
* **Who the Client Is**: Engineering team of 2–6 devs where releases are manual, stressful, and error-prone.
* **The "Shape" of What They Ask**:
  * *"Right now, Bob has to manually SSH into the server and run `git pull` and `docker compose restart`. Last week he made a typo and brought down production."*
  * *"We want a staging URL (`staging.myapp.com`) where our product manager can test features before they go to real users."*
  * *"Can you set it up so merging a PR to `main` automatically runs tests and deploys?"*
* **The Underlying Technical Reality**:
  * No CI/CD automation; manual file copying or raw SSH commands.
  * Configuration drift: staging and production configs are out of sync.
  * No automated rollback if a broken build gets deployed.
* **Scope & Deliverables**:
  1. GitHub Actions workflow for automated test execution and container building.
  2. Multi-environment infrastructure (Separate Staging and Production instances/services).
  3. Automated secret injection via Secret Manager.
  4. 1-Command Rollback script (e.g. `gcloud run services update-traffic` or git-tagged deployment rollback).
* **Market Pricing**: **$700 – $2,000**.

---

### Archetype 6: "We Need to Host Multiple Apps on One Server" (Multi-Tenant VPS Consolidation)
* **Who the Client Is**: Digital agency, serial indie hacker, startup with multiple microservices or client landing pages.
* **The "Shape" of What They Ask**:
  * *"We have 5 small internal tools and client demo sites. Paying $15/month each on separate cloud services is adding up to $75+/mo. Can we put them all on one $6 server?"*
  * *"How do I make `app1.com` go to port 8080 and `app2.com` go to port 3000 on the same machine?"*
* **The Underlying Technical Reality**:
  * Exactly what you planned and built with port 8080!
  * Setting up a central reverse proxy (Nginx, Caddy, or Traefik).
  * Multi-domain virtual host configuration (`server_name app1.com; proxy_pass http://localhost:8080`).
  * Automated wildcard or multi-domain SSL certificates via Certbot / Let's Encrypt.
  * Process management via PM2 or Docker Compose.
* **Scope & Deliverables**:
  1. Nginx or Caddy virtual host reverse proxy.
  2. Automatic SSL certificate auto-renewal.
  3. Resource isolation (swapfile, memory limits per process).
  4. Single dashboard or PM2 configuration managing all 5 apps.
* **Market Pricing**: **$400 – $900**.

---

### Archetype 7: "Someone Is Spamming / Attacking Our Website" (SRE Hardening & Abuse Defense)
* **Who the Client Is**: App creator who woke up to 50,000 spam submissions, scrapers, or bot abuse.
* **The "Shape" of What They Ask**:
  * *"Someone wrote a bot that is spamming our contact form / creating thousands of junk accounts every hour."*
  * *"Our database is filling up with junk data and our SendGrid email quota was burned through in 20 minutes."*
  * *"How do we stop malicious scripts without making real users solve annoying captchas?"*
* **The Underlying Technical Reality**:
  * Unauthenticated, unthrottled API endpoints (just like what we solved today!).
  * Lack of IP rate limiting and missing database capacity / payload validation ceilings.
* **Scope & Deliverables**:
  1. Ingress rate limiting middleware (`express-rate-limit` window and max request thresholds).
  2. Board / account entity ceilings (hard capacity caps).
  3. Cloudflare Turnstile or edge WAF bot challenges.
  4. Input sanitization and payload size limits (`express.json({ limit: '50kb' })`).
* **Market Pricing**: **$500 – $1,200**.

---

### Archetype 8: "We Need Backups and Disaster Recovery" (Data Integrity & Business Continuity)
* **Who the Client Is**: Growing B2B SaaS pitching enterprise clients, healthcare or fintech app.
* **The "Shape" of What They Ask**:
  * *"An enterprise lead asked us: 'What is your RPO and RTO if your primary database is deleted or corrupted?' We don't have an answer."*
  * *"We don't know if our database backups actually work. We've never tested restoring one."*
  * *"If our cloud region goes dark, how fast can we get back online?"*
* **The Underlying Technical Reality**:
  * Untested backup scripts, lack of offsite / cross-region storage.
  * Single point of failure (everything in one region/zone).
* **Scope & Deliverables**:
  1. Automated daily database dumps to encrypted cloud object storage (GCS / S3) with 30-day lifecycle retention.
  2. Tested 1-command restore drill runbook (proving data can be restored in < 15 minutes).
  3. Disaster Recovery (DR) compliance document detailing RPO (< 24 hours) and RTO (< 1 hour).
* **Market Pricing**: **$800 – $2,000**.

---

## 🛡️ "Red Flag" vs. "Green Flag" Client Requests

When taking on freelance or contract cloud work, how the client asks reveals whether the project will be smooth or a nightmare:

| Metric | 🚩 Red Flag Shape (Avoid or Charge 2x) | 🟢 Green Flag Shape (Great Projects) |
| :--- | :--- | :--- |
| **Scope** | *"Should be super quick, probably just 1 hour of work."* (It is never 1 hour). | *"Here is our current repo, here is our target cloud, and here is our definition of success."* |
| **Credentials** | Client doesn't have root access or says *"I think our ex-partner owns the AWS account"*. | Client provides a dedicated IAM user with scoped administrator permissions. |
| **Architecture** | Spaghetti legacy codebase with 200 hardcoded IP addresses and zero documentation. | Clean Dockerized repository that already runs locally via `docker compose` or `npm run dev`. |
| **Budget** | Wants enterprise high-availability and multi-region Kubernetes on a $50 budget. | Wants a lean, realistic MVP deployment with budget caps and cost monitoring. |

---

## 💼 How to Turn Your Current Experience into 3 Sellable Service Packages

Based directly on what you built, debugged, and deployed with TaskBoard Cloud, you have 3 clear service offerings you can pitch immediately:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 YOUR 3 SELLABLE SERVICE PACKAGES                       │
├────────────────────────────────┬───────────────────────────────┬───────────────────────┤
│ 📦 1. "Zero-to-Cloud Launch"   │ 💰 2. "Cloud FinOps Audit"    │ 🛡️ 3. "SRE Shield"    │
│ Target: Founders with local MVP│ Target: Startups bleeding cash│ Target: Apps hit by   │
│                                │                               │         bots/downtime │
│ • Multi-stage Docker packaging │ • Audit unattached disks & VMs│ • Ingress Rate Limits │
│ • e2-micro or Cloud Run deploy │ • Downsize oversized DB tiers │ • Hard capacity caps  │
│ • Custom domain + Auto HTTPS   │ • 14-day log pruning policies │ • 1GB Swapfile setup  │
│ • PM2 24/7 background daemon   │ • 3-Tier Budget Alerts        │ • PM2 auto-restart    │
│                                │                               │                       │
│ Price: $400 - $800             │ Price: $500 - $1,200          │ Price: $400 - $900    │
└────────────────────────────────┴───────────────────────────────┴───────────────────────┘
```
