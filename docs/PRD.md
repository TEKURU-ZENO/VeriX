# Product Requirements Document (PRD) — VeriX

## 1. Vision & Strategy
VeriX (Verification Operations Console) is a high-observability background-verification platform. It streamlines credential checks, reference reviews, and background validation files for compliance officers and security analysts. 

In verification systems, network lag, API timeouts, and cloud disruptions can result in missing files or false clearance status. VeriX addresses this by designing for resilience under simulated connection outages, showing complete system state transitions at all times.

---

## 2. Business Context & Problem Statement
Organizations performing candidate credential audits are constrained by:
* **Brittle Third-Party Integrations**: Academic registry and criminal database APIs are notoriously slow, leading to high latency.
* **Invisible Failure States**: Standard user panels hide request drops behind spinning loaders, preventing analysts from knowing if a check is pending, retrying, or dropped.
* **Complex Data Compliance**: Auditing check files requires rigid event logs to guarantee verification compliance.

VeriX solves these issues by:
1. Providing a **Verification Workflow Engine** that tracks candidate records through a structured, multi-stage compliance pipeline.
2. Embodying operational resilience via a **Network Resilience Simulator** that exposes HTTP retry states, latency depths, and random drop recoveries.
3. Recording structured events into a terminal-based **Time Travel Audit** timeline.

---

## 3. Target Audience & Personas

### Persona A: Security Operations Lead (Admin)
* **Objective**: Manage internal system analysts, customize connection parameters to stress-test client stability, inspect compliance event histories, and override candidate file states.
* **Needs**: Access to user CRUD tables, audit logs, playback controls, and simulator settings.

### Persona B: Compliance Auditor (General User)
* **Objective**: Monitor active candidate file verification timelines, transition candidates from creation through document submission, and review risk assessments.
* **Needs**: Fast, clean grids with pagination, quick filters, clear risk gauges, and side-drawer workflow controls.

---

## 4. Feature Specifications

### F1: Alive Dashboard (Operational Control Room)
* **Goal**: Provide instantaneous visibility into critical statistics and database status.
* **Key KPIs**:
  * **Active Audits**: Running candidate files in system.
  * **Verified Credentials**: Counts of checks completed.
  * **In Queue**: Files pending investigation stages.
  * **Risk Alerts**: Checks exceeding the 70% threshold.
  * **Success Yield**: Dynamic ratio of verified checks.
* **System Telemetry**: Displays current database connection state (MongoDB Atlas vs Fallback In-Memory), average API response times, and active queue counts.

### F2: Verification Workflow Center
* **Goal**: Drive checks through a structured progression path.
* **Workflow Stages**:
  ```text
  Created ──> Documents Submitted ──> Background Check ──> Under Review ──> Verified
  ```
* **Engine Controls**: Analysts open a side-drawer showing:
  * ID parameters.
  * Initiation timestamps.
  * Identity Validation checks.
  * Criminal Registry checks (flags if risk score > 70%).
  * Academic Credentials checks.
  * Dynamic timeline node controllers to advance stages.

### F3: Security Control Center (Admin Panel)
* **Goal**: Manage internal access controls and audit trails.
* **Capabilities**:
  * Create new users with `admin` or `user` privileges.
  * Toggle suspension status (suspended credentials block session login).
  * **Time Travel Audit Player**: Auto-steps through historical actions chronologically at 1.5s intervals, outputting event data in a terminal simulator box.

### F4: Network Resilience Simulator (Hero Feature)
* **Goal**: Expose request-level error handling.
* **Simulator Sliders**:
  * **Latency**: 0ms - 8000ms delay.
  * **Drop Rate**: 0% - 90% artificial error rate.
  * **Outage Switch**: Forces all outgoing connections to return `503 Service Outage`.
  * **RxJS Auto-Retry**: Configure staggers (defaults to 3 retries spaced by 1.2s).
* **Live HTTP Request Monitor**: Visual card queue displaying relative endpoints, HTTP methods, active status (`pending`, `retrying`, `success`, `failed`), and elapsed timers.

---

## 5. Success Metrics & Performance Targets
* **Functional Integrity**: Role guards block non-admin accounts from accessing user lists or audit replay logs.
* **Zero Outage Failure**: Under a 20% artificial failure rate, client requests must recover automatically using staggers.
* **Telemetry Sync**: Average response time and active queue depth stats must sync with client-side state.
* **Accessibility**: App must boot and fall back to the local database file seamlessly if MongoDB Atlas is disconnected.
