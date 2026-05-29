# Product Requirements Document (PRD) - VeriX

## 1. Executive Summary
VeriX is an enterprise-grade Verification Operations Console designed to manage backgrounds, credentials, and verification checks. It enables background checking operatives (Admins) and general users to execute, audit, and analyze verification steps securely and transparently.

## 2. Problem Statement
Background verification systems require high reliability, clear audit trails, role-based controls, and high resilience to API latency or network degradation. Standard dashboards lack transparency in error handling and async state visualization. VeriX addresses this by proving operational resilience under simulated network failures.

## 3. Scope & Personas
### User Personas
* **Admin**: Oversees users, updates operational settings, and monitors system audits.
* **General User**: Submits verification cases and checks the progress of candidate statuses.

### Core Visual Flow (4 Sections)
1. **Dashboard**: Unified workspace displaying active verification KPIs, system health indicators, and a recent activity log.
2. **Verification Center**: Contains the candidate data grid and the **Verification Workflow Engine** which progression paths: `Created` -> `Documents Submitted` -> `Background Check` -> `Under Review` -> `Verified`.
3. **Admin Center**: Operations for administrator CRUD, suspending users, and the **Time Travel Audit** event player.
4. **Async Lab**: Controls simulated latency and error rates, displaying an interactive API Monitor and HTTP queue visualizer.

## 4. Non-Functional Requirements
* **Security**: Enforce JSON Web Token (JWT) authorization on all critical routes.
* **Resilience**: Client application must handle service drops gracefully and support automatic retry backing.
* **Observability**: Live console log tracking and status telemetry.
* **Accessibility & Portability**: Automatically fall back to a local JSON memory database if a MongoDB Atlas cluster is not active, allowing seamless execution.
