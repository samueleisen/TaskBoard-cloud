# FinOps & Hidden Cost Post-Mortem

> **An incident analysis of a real cloud billing leak on Google Cloud Platform, the forensic SKU audit workflow used to isolate it, and reusable cost-governance guardrails for future deployments.**

---

## 1. Executive Summary

A common misconception when presenting cloud projects is simply claiming **"$0.00 / month"**. Without technical context, that often looks like a hobbyist who followed a basic hello-world tutorial with zero production scrutiny.

In reality, achieving a stable, true zero-dollar cloud deployment requires **identifying daily billing creep, performing SKU-level forensic audits, and eliminating default cloud provider traps.**

This case study documents an actual incident where an idle test project accumulated **~Rp 300 / day** (~Rp 9,000 / month) in background charges, how the leak was isolated, and the permanent remediation steps implemented.

---

## 2. Incident Metrics & Data Points

| Metric | Before Optimization | After Optimization | Delta |
| :--- | :--- | :--- | :--- |
| **Daily Charge** | ~Rp 300 / day | **Rp 0 / day** | **-100%** |
| **Monthly Run Rate** | ~Rp 9,000 / month | **Rp 0 / month** | **-100%** |
| **Root Cause** | Multi-Regional PD Snapshot | Single-region retention | Eliminated |
| **Billing Status** | Unmonitored silent creep | Deterministic True Zero | Stable Rp 0.00 |

---

## 3. Root Cause Analysis: The GCP Snapshot Trap

The billing leak was **not** caused by active compute traffic, memory usage, or network egress. It was caused by Google Cloud Platform's default snapshot policy on Compute Engine Persistent Disks (PD):

```
┌────────────────────────────────────────────────────────┐
│ GCP Compute Engine Persistent Disk Snapshot (Default)  │
│                                                        │
│  Default Storage Class: Multi-Regional Storage         │
│  • Storage rate is significantly higher per GB         │
│  • Cross-region data replication incurs egress fees    │
│  • Snapshots accumulate silently without TTL rules     │
│  • Daily Cost: ~Rp 300 / day (~$0.02 USD / day)        │
└────────────────────────────────────────────────────────┘
```

### Why This Matters in Enterprise Environments
While on a small 10–20 GB personal disk this manifested as ~Rp 300/day, **this exact default setting generates thousands of dollars in surprise cloud bills across enterprise organizations** running hundreds of gigabytes across multiple production clusters.

Treating a ~Rp 300/day micro-leak with zero tolerance proves the same operational discipline required to save thousands of dollars on enterprise cloud budgets.

---

## 4. Forensic Investigation Workflow

High-level billing summaries (e.g., "Compute Engine: Rp 9,000") are too vague to pinpoint the leak. The forensic audit followed this workflow:

1. **Navigate to Detailed Billing**: GCP Console ➔ **Billing** ➔ **Reports**.
2. **Filter by Project**: Isolate the exact project identifier.
3. **Group by SKU (Crucial Step)**:
   * Instead of grouping by "Service", change grouping to **SKU**.
   * High-level grouping hid the charge under generic "Compute Engine".
   * SKU-level grouping immediately revealed the culprit: **`Storage PD Snapshot`** (Multi-regional Persistent Disk Snapshot).
4. **Locate Orphan Snapshots**:
   * Run via Cloud Shell or console:
     ```bash
     gcloud compute snapshots list
     ```
   * Discovered unattached, legacy snapshots created during early VM provisioning drills.
5. **Remediation Actions**:
   * Deleted all unneeded orphan snapshots:
     ```bash
     gcloud compute snapshots delete <snapshot-name> --quiet
     ```
   * Disabled unmanaged snapshot schedules that lacked automatic expiration windows.
   * Confirmed zero active snapshots remained for non-critical stateless workloads.

---

## 5. Reusable GCP Cost Governance Checklist (Day 1 Guardrails)

Whenever launching a new project on Google Cloud, execute this checklist to prevent billing surprises:

### 1. Persistent Disk Snapshots
- [ ] If snapshots are required, select **Regional** storage location (never Multi-Regional).
- [ ] Ensure every snapshot schedule has an automatic deletion rule (e.g., delete after 7 days).

### 2. Orphaned Resources
- [ ] **Unattached Disks**: When deleting a VM, verify that its boot disk is also deleted (or delete it manually in Disks console).
- [ ] **Static External IPs**: GCP charges for reserved external IP addresses that are **not attached** to a running instance. Release unused IPs immediately:
  ```bash
  gcloud compute addresses list
  gcloud compute addresses delete <address-name> --region=<region>
  ```

### 3. Idle Network Services
- [ ] **Cloud NAT**: Avoid creating Cloud NAT gateways unless private subnets strictly require internet access (NAT gateways charge hourly base fees even with zero traffic).
- [ ] **Forwarding Rules**: External HTTP(S) Load Balancer forwarding rules incur ~$18/month minimum costs. Prefer direct VM port mapping for single-node setups.

### 4. Billing Budget Alerts
- [ ] Set up a GCP Budget alert starting at **$1.00 / Rp 15,000** with email notifications at 50%, 90%, and 100% of budget.
- [ ] Catches any unintended billing creep within hours rather than at the end of the month.

