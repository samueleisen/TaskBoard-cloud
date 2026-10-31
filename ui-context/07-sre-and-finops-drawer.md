# 07. SRE & FinOps Status Drawer Specification

> **Component architecture, live SLA probing, cost telemetry, budget alert gauges, and email cron simulator (`CloudStatusDrawer.tsx`).**

---

## 1. Visual Topology & Sliding Drawer Wireframe

The **SRE & FinOps Status Drawer** is the technical showcase of the application. It slides into view from the right viewport margin whenever a user clicks the **Cloud Status pill** in the navbar.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [SRE DRAWER: Width: 440px, Height: 100vh, Slide-in from right]        │
│                                                                        │
│  ☁️ Cloud & FinOps Inspector                                    [ × ]  │
│  Production SRE, SLA probes, and GCP cost telemetry                    │
│ ────────────────────────────────────────────────────────────────────── │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ COMPUTE & STORAGE ENGINE                         [ 🔄 Ping SLA ] │  │
│  │ 🗄️ Local Memory Mode (Waiting for GCP Cloud Connection)           │  │
│  │ Probe Latency: 2ms · Uptime: 45s · Status: Active                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ FINOPS BUDGET GOVERNANCE                       Target: $6.00/mo  │  │
│  │ $0.00 current run rate (Local / Free Tier)                       │  │
│  │ ═══════════════════════════════════════════════════════════════  │  │
│  │  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐    │  │
│  │  │   Alert 1    │      │   Alert 2    │      │   Ceiling    │    │  │
│  │  │    $5.00     │      │    $10.00    │      │    $20.00    │    │  │
│  │  └──────────────┘      └──────────────┘      └──────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ SRE RELIABILITY GUARDRAILS                                       │  │
│  │ 💻 Autoscaling Instances:                  0 min / 3 max         │  │
│  │ 🛡️ Log Retention:                          14 Days (Pruned)      │  │
│  │ 🗄️ DB Connection Limit:                    6 pool / 24 peak      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ CLOUD SCHEDULER / REMINDERS                                   🔔 │  │
│  │ Triggers background worker to scan tasks due within 24h.         │  │
│  │ ┌──────────────────────────────────────────────────────────────┐ │  │
│  │ │ [ ✓ Trigger Email Reminder Job ]                             │ │  │
│  │ └──────────────────────────────────────────────────────────────┘ │  │
│  │ Output: {"scanned": 1, "dispatched": 1, "status": "simulated"}  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Documented in docs/01-gathered-context.md:                            │
│  "The $40 Oversized Database Incident & FinOps Resolution"             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Telemetry Card Deep-Dives

### 2.1. Compute & Storage Engine Card
- **Storage Mode Detection**:
  - In local mode: Displays `"Local Memory Mode (Waiting for GCP Cloud Connection)"` with soft indigo styling.
  - In cloud/postgres mode: Displays `"Cloud / Local PostgreSQL Connected"` with emerald green styling.
- **Interactive "Ping SLA" Button**:
  - Triggers an instantaneous live call to `GET /health`.
  - Calculates round-trip network and execution latency using `performance.now()`.
  - Updates the badge: `Probe Latency: 2ms`.
  - Displays cumulative process uptime in seconds.

---

### 2.2. FinOps Budget Governance Card
- **Target Ceiling**: Displays `Target: $6.00 / mo` in sage emerald green (`#16a34a`).
- **Current Spend Meter**: Displays `$0.00` during local and free-tier operation.
- **Visual Progress Track**: Soft progress bar displaying consumption against monthly targets.
- **3-Tier Budget Alert Badges**:
  - **Alert 1 ($5.00)**: Warm amber alert card (`#fffbeb` background, `#b45309` text, `#fde68a` border), representing early 50% threshold.
  - **Alert 2 ($10.00)**: Soft sky blue alert card (`#eff6ff` background, `#1d4ed8` text, `#bfdbfe` border), representing 100% budget threshold.
  - **Ceiling ($20.00)**: Soft crimson alert card (`#fef2f2` background, `#b91c1c` text, `#fecaca` border), representing the emergency circuit-breaker ceiling.

---

### 2.3. SRE Reliability Guardrails Card
Explicitly outlines the infrastructure configurations that prevent cloud billing runaway and service crashes:
1. **Autoscaling Instances (`0 min / 3 max`)**: Guarantees scale-to-zero when idle ($0 compute) and caps horizontal sprawl at 3 containers during traffic surges.
2. **Log Retention (`14 Days (Pruned)`)**: Highlights that default 30-day log buckets were replaced with a 14-day sink and `/health` probe filtering to eliminate hidden storage fees.
3. **Database Connection Budget (`6 pool / 24 peak`)**: Verifies that Node.js pools are capped at 6 connections per container, ensuring peak connections (3 containers × 6 = 18) remain safely below the 30-connection limit of `db-f1-micro`.

---

### 2.4. Cloud Scheduler & Email Reminders Simulator
Allows instant simulation of the asynchronous background worker:
- **Action Button**: `[ ✓ Trigger Email Reminder Job ]`
- **Execution Mechanism**:
  1. Issues an asynchronous `POST /api/v1/jobs/send-reminders` call.
  2. The server queries all tasks with deadlines occurring in the next 24 hours that lack previous dispatch logs.
  3. Formats and sends/simulates the reminder notification.
  4. Records the event in `notification_logs` to guarantee idempotency.
- **Real-Time JSON Output Display**: Renders a clean warm stone monospace terminal box (`#f5f3ef` surface with soft border `#eae7e1`) displaying the full response payload:
  ```json
  {
    "success": true,
    "summary": "Processed 1 upcoming tasks; dispatched 1 reminders.",
    "scanned": 1,
    "dispatched": 1,
    "notifications": [
      {
        "taskId": "task-1",
        "taskTitle": "Configure 3-Tier Budget Alerts ($5, $10, $20)",
        "dueDate": "2026-10-30T14:12:35.008Z",
        "recipientEmail": "sam@taskboard.cloud",
        "recipientName": "Samuele Eisen",
        "status": "simulated"
      }
    ]
  }
  ```
- **Deduplication Demonstration**: Clicking the button a second time immediately returns `"scanned": 0, "dispatched": 0`, proving that duplicate emails are never sent for the same task.

---

### 2.5. Incident Post-Mortem Reference Footer
Anchors the interface directly to the engineering case study documented in [`docs/01-gathered-context.md`](file:///home/sam/Code/TaskBoard-cloud/docs/01-gathered-context.md):
*"The $40 Oversized Database Incident & FinOps Resolution"*.
