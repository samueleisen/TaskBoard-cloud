# TaskBoard Cloud — Architecture & Implementation Planning Suite

> **A production-grade, cost-governed small team task tracker deployed on Google Cloud Platform (GCP).**
> Engineered for real-world SRE, DevOps excellence, and a strict **~$6/month budget ceiling**.

---

## 📌 Executive Summary

**TaskBoard Cloud** is a multi-tenant task management web application designed for small teams (5–20 users), featuring real-time task tracking, role-based team management, and automated email reminders. While the application provides a sleek, modern user experience, its primary engineering purpose is to demonstrate **production-grade cloud engineering, site reliability engineering (SRE) principles, and disciplined FinOps**.

This planning suite outlines the complete context, architectural evaluations, database schemas, API contracts, infrastructure as code (Terraform), CI/CD workflows, cost modeling, and operational runbooks for two distinct deployment options.

```
                      TASKBOARD CLOUD HIGH-LEVEL ARCHITECTURE
                      
  [ User Browser ]
         │
         ▼ (HTTPS / Custom Domain)
┌────────────────────────────────────────────────────────────────────────┐
│ Google Cloud Platform                                                  │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ Google Cloud Run (Containerized Service)                     │     │
│   │  • Auto-scale: 0 to 3 instances (Scale-to-Zero on idle)       │     │
│   │  • Concurrency: 80 requests/container                        │     │
│   │  • CPU: 1 vCPU, RAM: 512MiB (Allocated on request)           │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │                                     │
│         ┌────────────────────────┼────────────────────────┐            │
│         ▼                        ▼                        ▼            │
│  ┌──────────────┐       ┌─────────────────┐      ┌─────────────────┐   │
│  │ Cloud SQL    │       │ Secret Manager  │      │ Cloud Logging   │   │
│  │ (PostgreSQL  │       │ (DB Passwords,  │      │ (14-day sink,   │   │
│  │  db-f1-micro)│       │  JWT Secrets,   │      │  cost-excluded  │   │
│  │  PITR Backups│       │  API Keys)      │      │  health logs)   │   │
│  └──────────────┘       └─────────────────┘      └─────────────────┘   │
│                                  ▲                                     │
│  ┌───────────────────────────────┴──────────────────────────────┐      │
│  │ Cloud Scheduler + Cloud Tasks (Cron & Email Reminders)       │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │ Cloud Billing Budgets ($5, $10, $20) + Cloud Monitoring      │      │
│  └──────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Documentation Suite Structure

| Document | Purpose | Key Audience |
| :--- | :--- | :--- |
| **[01. Gathered Context & Problem Statement](file:///home/sam/Code/TaskBoard-cloud/docs/01-gathered-context.md)** | Analysis of dump notes, business/technical requirements, non-functional constraints, and the "$40 database mistake" post-mortem. | All Stakeholders, SRE, Tech Leads |
| **[02. Architecture Options Overview](file:///home/sam/Code/TaskBoard-cloud/docs/02-architecture-options-overview.md)** | Side-by-side comparison between Option 1 (Decoupled Multi-Service) and Option 2 (Lean Unified Container). | Architects, Engineers |
| **[03. Full Plan Option 1: Classic Decoupled](file:///home/sam/Code/TaskBoard-cloud/docs/03-plan-option-1-classic-decoupled.md)** | Deep blueprint: React SPA on Cloud CDN/Storage + Node.js API on Cloud Run + Cloud SQL + Cloud Tasks + Terraform. | Cloud/Backend/Frontend Engineers |
| **[04. Full Plan Option 2: Ultra-Lean Unified Monolith](file:///home/sam/Code/TaskBoard-cloud/docs/04-plan-option-2-lean-unified-monolith.md)** | Deep blueprint: Single container Fastify/React on Cloud Run + Zero-ALB Ingress + Micro/Serverless Postgres + Cloud Scheduler. | Full-stack Engineers, Solo Devs |
| **[05. Data Model & API Specification](file:///home/sam/Code/TaskBoard-cloud/docs/05-data-model-and-api-spec.md)** | PostgreSQL DDL schema with indexes, RBAC, task state machine, and OpenAPI REST API contracts. | Backend & Database Developers |
| **[06. Infrastructure, FinOps & Cost Model](file:///home/sam/Code/TaskBoard-cloud/docs/06-infrastructure-and-cost-model.md)** | Line-item pricing breakdown to achieve the **$6/mo target**, Terraform HCL modules, 14-day log sinks, and $5/$10/$20 budget alert rules. | DevOps, FinOps, SRE |
| **[07. CI/CD & Deployment Strategy](file:///home/sam/Code/TaskBoard-cloud/docs/07-cicd-and-deployment-strategy.md)** | GitHub Actions with Workload Identity Federation, staging auto-deploy, prod approval gate, and 1-command rollback runbook. | DevOps & Release Engineers |
| **[08. Decision Matrix & Recommendation](file:///home/sam/Code/TaskBoard-cloud/docs/08-decision-matrix-and-recommendation.md)** | Multi-criteria evaluation matrix, trade-off analysis, phased implementation roadmap, and portfolio storytelling guide. | Tech Leads, Hiring Managers |

---

## 🎯 Core Engineering Tenets

1. **Disciplined FinOps ($6/Month Budget Target)**:
   - A common pitfall in GCP is accidental overspending (e.g. unmanaged Load Balancer forwarding rules at ~$18/mo, or standard multi-core Cloud SQL at ~$50+/mo).
   - TaskBoard enforces architectural decisions specifically designed to keep monthly run rates under **$6.00**, guarded by automated budget alerts at **$5, $10, and $20**.
2. **Production-Ready SRE Standards**:
   - Zero-secret-in-git policy with GCP Secret Manager.
   - Autoscaling hard-capped at **3 instances** with scale-to-zero capability.
   - Log retention capped at **14 days** with health-probe exclusions to prevent silent log storage fees.
   - Daily automated database backups with verified restore procedures.
3. **One-Command Fast Rollbacks**:
   - Fully automated staging deployments on every push.
   - Manual gatekeeper approval for production.
   - Production revision traffic shifting allows rolling back a failed release in **under 5 seconds** with a single command.
4. **Keyless Cloud Authentication**:
   - Zero long-lived service account JSON keys stored in GitHub Secrets.
   - All deployments utilize Google Cloud **Workload Identity Federation (OIDC)**.

---

## 🚀 Quick Navigation

To review the detailed plans, proceed in the recommended sequence:
1. Review the baseline constraints and incident lessons in **[01-gathered-context.md](file:///home/sam/Code/TaskBoard-cloud/docs/01-gathered-context.md)**.
2. Compare the two competing architectures in **[02-architecture-options-overview.md](file:///home/sam/Code/TaskBoard-cloud/docs/02-architecture-options-overview.md)**.
3. Explore the detailed technical blueprints in **[03-plan-option-1-classic-decoupled.md](file:///home/sam/Code/TaskBoard-cloud/docs/03-plan-option-1-classic-decoupled.md)** and **[04-plan-option-2-lean-unified-monolith.md](file:///home/sam/Code/TaskBoard-cloud/docs/04-plan-option-2-lean-unified-monolith.md)**.
4. Check data schemas and infrastructure configs in **[05-data-model-and-api-spec.md](file:///home/sam/Code/TaskBoard-cloud/docs/05-data-model-and-api-spec.md)** and **[06-infrastructure-and-cost-model.md](file:///home/sam/Code/TaskBoard-cloud/docs/06-infrastructure-and-cost-model.md)**.
5. See CI/CD deployment mechanics in **[07-cicd-and-deployment-strategy.md](file:///home/sam/Code/TaskBoard-cloud/docs/07-cicd-and-deployment-strategy.md)** and final verdict in **[08-decision-matrix-and-recommendation.md](file:///home/sam/Code/TaskBoard-cloud/docs/08-decision-matrix-and-recommendation.md)**.
