# VeriX — Verification Operations Console

> An enterprise-grade, high-observability background-verification command center engineered for modern compliance operations.

VeriX is a cinematic, robust background verification platform built with **Angular 17, RxJS, SCSS, Node.js, Express, TypeScript, and MongoDB** (with a seamless file/memory-based fallback). It is designed to model security, access control, audit transparency, and resilient asynchronous processing.

---

## Key Highlights & Wow Features

1. **Network Resilience Simulator (Hero Feature)**: Rather than masking slow APIs with client-side delays, VeriX includes a dedicated lab that intercepts headers to inject actual backend latency, service outages, and random drops. Evaluators can watch client-side RxJS streams execute, timeout, and perform staggers/auto-retries visually.
2. **Verification Workflow Engine**: Follows a strict compliance progression pathway: `Created` → `Documents Submitted` → `Background Check` → `Under Review` → `Verified`. Status changes automatically fire logging audits, metrics aggregates, and client alerts.
3. **Time Travel Audit logs player**: Records critical security events in the DB. Admins can replay historical events chronologically using interactive playback buttons (Play, Pause, Step Forward, Step Backward) with highlights.
4. **Zero-Setup Portability**: Includes an automated fallback database. If a live MongoDB instance is unreachable, it logs a warning and provisions an in-memory/JSON filesystem store seeded with accounts, eliminating installation friction.

---

## Tech Stack & Design Patterns

* **Client SPA**: Angular 17 (Standalone Components), RxJS for reactive streams, and custom CSS/SCSS (Matte Black / Dark Purple theme with Electric Cyan and Soft Violet accents).
* **Backend Gateway**: Express + TypeScript server structured in Controllers, Services, and Repository interfaces.
* **Observability & Logging**: Centralized Winston logger tracking connection status, session auth, and route requests.
* **Security & Sessioning**: Bearer JSON Web Tokens (JWT), client interceptors, and backend Guard middlewares.

---

## Project Structure

```text
VeriX/
├── frontend/                     # Angular SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/             # Services, Interceptors, and Route Guards
│   │   │   ├── features/         # Dashboard, Records, Admin, and Simulator
│   │   │   └── shared/           # Ctrl+K Command Palette Component
│   │   └── styles.scss           # Custom glassmorphic styling sheet
│   ├── package.json
│   └── angular.json
├── server/                       # Node.js + TypeScript Backend
│   ├── src/
│   │   ├── config/               # DB connection with Mock fallback
│   │   ├── controllers/          # Auth, Record, User, Audit, and Analytics
│   │   ├── middleware/           # Auth validation and Latency injection
│   │   └── utils/                # Winston Logger configuration
│   ├── package.json
│   └── tsconfig.json
├── docs/                         # Specifications & ADRs
│   ├── PRD.md & SRS.md           # Product and System Specifications
│   ├── ARCHITECTURE.md           # Technical blueprint and flow chart
│   └── ADR-001/002/003.md        # Architectural Decision Records
├── docker-compose.yml            # Multi-container orchestration
└── README.md                     # Root Developer Guide
```

---

## Database ERD & Data Models

VeriX maintains three primary collections: `User`, `Record` (Candidates), and `AuditLog`.

```text
+------------------------------------+       +------------------------------------+
|               USER                 |       |               RECORD               |
+------------------------------------+       +------------------------------------+
| _id          : ObjectId            |       | _id          : ObjectId            |
| email        : String  (Unique)    |       | name         : String              |
| passwordHash : String              |       | email        : String              |
| role         : Enum    [admin,user]|       | status       : Enum [Created,...]  |
| status       : Enum    [active,...]|       | riskScore    : Number (0-100)      |
| createdAt    : Date                |       | updatedAt    : Date                |
+------------------------------------+       +------------------------------------+
                                                        |
                                                        v
                                             +------------------------------------+
                                             |             AUDITLOG               |
                                             +------------------------------------+
                                             | _id          : ObjectId            |
                                             | timestamp    : Date                |
                                             | user         : String (Email)      |
                                             | action       : String              |
                                             | details      : String              |
                                             +------------------------------------+
```

---

## API Specifications & Endpoints

### 1. Authentication
* `POST /api/auth/login`: Signs session token. Returns JWT and user role.
* `GET /api/auth/session`: Validates JWT token lifespan.

### 2. Candidate Background Checks (Protected)
* `GET /api/records`: Fetch grid list.
* `POST /api/records`: Initialize verification check.
* `PUT /api/records/:id`: Edit candidate info.
* `PUT /api/records/:id/status`: Progress candidate state (Workflow Engine).
* `DELETE /api/records/:id`: Purge candidate file (Admin only).

### 3. Users Management (Admin Only)
* `GET /api/users`: List system accounts.
* `POST /api/users`: Register new account profile.
* `PUT /api/users/:id`: Edit privileges or suspend user status.
* `DELETE /api/users/:id`: Purge user profile.

### 4. System Audits (Admin Only)
* `GET /api/audit`: Returns database event ledger (Time Travel Audit source).

### 5. Analytics (Protected)
* `GET /api/analytics`: Calculates KPI counts, status distributions, and DB status.

---

## Local Setup & Quickstart

Ensure you have [Node.js v20+](https://nodejs.org/) installed.

### Option A: Standard Manual Boot

1. **Launch Express Server**:
   ```bash
   cd server
   npm install
   npm run dev
   ```
   *The server defaults to port `3000`. It will attempt connecting to local MongoDB, and automatically enable the file-based/in-memory fallback on failure.*

2. **Launch Angular SPA**:
   ```bash
   cd ../frontend
   npm install
   npm start
   ```
   *The client builds and hosts at `http://localhost:4200`.*

3. **Quick Credentials Pre-fills**:
   * Click **Admin Terminal** bypass key: `admin@verix.com` / `admin123`
   * Click **User Panel** bypass key: `user@verix.com` / `user123`

### Option B: Docker Containerized Launch

If you have Docker and Docker Compose installed:
```bash
docker-compose up --build
```
*Port mappings: Client runs at `http://localhost:80`, Backend runs at `http://localhost:3000`, MongoDB runs at `http://localhost:27017`.*
