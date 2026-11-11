# Infrastructure Post-Mortem & Improvement Notice: GCP Cloud Cost Optimization

## 1. Executive Summary & Context

A common mistake when presenting cloud applications is simply showing **"$0.00 / month"** or **"Runs on Free Tier"**. To an outside observer or hiring manager, that looks like a hobbyist project that follows a quick tutorial and has zero traffic.

However, behind that clean number is often a real engineering achievement: **identifying unexpected daily billing creep, performing SKU-level forensic audits, and eliminating default cloud traps.** 

This document records the incident, root cause, resolution, and future presentation strategy for CloudZero's infrastructure optimization.

---

## 2. Incident Metrics & Data Points

| Metric | Before Optimization | After Optimization | Delta |
| :--- | :--- | :--- | :--- |
| **Daily Charge** | ~Rp 300 / day | Rp 0 / day | -100% |
| **Monthly Projected** | ~Rp 9,000 / month | Rp 0 / month | -100% |
| **Target Architecture** | Unmanaged background leak | Deterministic True Zero-Dollar | Stable Rp 0 |

---

## 3. Root Cause Analysis: The GCP Snapshot Trap

The bill was not caused by active compute traffic or database queries; it was caused by Google Cloud Platform's (GCP) default snapshot configuration:

1. **Service & SKU Breakdown:**
   * **Service:** Google Compute Engine
   * **SKU:** `Storage PD Snapshot` (Persistent Disk Snapshot Storage)
   * **Storage Class:** Multi-Regional Snapshot Storage

2. **The Hidden Mechanism:**
   * When creating snapshots of Persistent Disks (PD), GCP defaults to **Multi-Regional** storage rather than keeping snapshots in a single local region (e.g., `asia-southeast2` Jakarta).
   * **Multi-regional storage incurs:**
     * Significantly higher storage rates per GB compared to standard regional storage.
     * Hidden cross-region network egress charges to replicate snapshot data blocks across data centers.
     * Silent accumulation of orphan snapshots over time if automated lifecycle/retention rules are absent.

3. **Enterprise Relevance:**
   * While on a 10–20 GB personal disk this manifested as ~Rp 300/day (~$0.02 USD), **this exact default setting is responsible for thousands of dollars in surprise cloud bills in enterprise environments** running hundreds of gigabytes across multiple VMs.
   * Treating a ~Rp 300/day micro-leak with zero tolerance demonstrates senior-level infrastructure hygiene and attention to detail.

---

## 4. The Investigation Process

To find the source of the leak, high-level dashboards were insufficient. The investigation followed this workflow:

1. **Billing Console Inspection:** Navigated to GCP Billing → Reports.
2. **SKU Grouping:** Filtered by project and grouped by SKU rather than high-level service category.
3. **Isolating Persistent Disk Storage:** Identified `Storage PD Snapshot` as the single non-zero cost line item generating daily charges despite idle compute instances.
4. **Remediation:**
   * Identified and deleted unneeded/orphan multi-regional snapshots.
   * Disabled unmanaged snapshot schedules that lacked automatic pruning.
   * Verified that the project returned to a true, deterministic **Rp 0.00** daily billing run-rate.

---

## 5. Presentation Strategy: How to Showcase This Skill

### A. Upfront Display (Main App / Landing Page)
Instead of a static `$0.00/mo` badge, display a **"Before ➔ After" Hook** or **"Zero-Tolerance Audit" Pill**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│  🛡️ Infrastructure: True Rp 0 / mo                                     │
│  Eliminated hidden GCP multi-regional snapshot leaks. [ Case Study ↗ ] │
└────────────────────────────────────────────────────────────────────────┘
```

* **Why this works:** It immediately stops visitors from thinking "this is just a tutorial project" and piques the curiosity of engineering leads.
* **Separation of Concerns:** The link opens the detailed breakdown in a **new tab** (`target="_blank"`), keeping the main application uncluttered for casual users while providing depth for evaluators.

### B. Detailed Tab / Route (Future Implementation)
When the user clicks `[ Case Study ↗ ]`, a clean standalone page or modal displays:
1. **The Ghost Charge:** The story of the persistent Rp 300/day charge.
2. **The Autopsy:** Breakdown of GCP's default multi-regional disk snapshot policies.
3. **The Fix:** How the resource was audited, isolated, and terminated.
4. **Replicable Checklist:** A 5-point checklist anyone can use to audit their own GCP bill.

---

## 6. Reusable GCP Cost Audit Checklist

For future deployments, check these common GCP hidden cost culprits on Day 1:
- [ ] **Persistent Disk Snapshots:** Verify storage location is set to `Regional` (not `Multi-Regional`) if snapshots are required.
- [ ] **Snapshot Retention Schedules:** Ensure automated lifecycle rules delete snapshots after a defined retention window (e.g., 7 days).
- [ ] **Unattached Disks & Static IPs:** Check for orphaned disks and reserved external IP addresses that are not attached to a running instance.
- [ ] **NAT Gateways & Load Balancer Minimums:** Verify no idle Cloud NAT or forwarding rules are billing hourly minimums.
- [ ] **Billing Budget Alerts:** Set up email notifications for any spend starting at `> Rp 1,000` to catch micro-leaks early.
