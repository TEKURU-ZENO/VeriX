# System Requirements Specification (SRS) - VeriX

## 1. System Overview
The VeriX application comprises an Angular SPA client connected to a Node/Express TypeScript server communicating with a MongoDB database (or falling back to a local JSON memory database).

```
[ Angular 17 SPA ] <--- HTTP + Simulator Headers ---> [ Express TS Server ] <---> [ MongoDB / JSON Mock DB ]
```

## 2. Interface Specifications
### Endpoints
* **Auth**:
  - `POST /api/auth/login`: Signs token and role for authentication.
  - `POST /api/auth/refresh`: Re-auth validation logic.
* **Records (Candidates)**:
  - `GET /api/records`: List background records.
  - `POST /api/records`: Add candidate verification.
  - `PUT /api/records/:id/status`: Advances verification engine status.
* **Users**:
  - `GET /api/users`: Retrieve system accounts.
  - `POST /api/users`: Create account.
  - `PUT /api/users/:id`: Edit role or suspend status.
  - `DELETE /api/users/:id`: Delete user.
* **Audit & Analytics**:
  - `GET /api/audit`: Query historical event logs.
  - `GET /api/analytics`: Aggregate statistics on statuses and response times.

## 3. Database Schema Mapping
### Candidate Record
- `id`: Unique identifier.
- `name`: Candidate name.
- `email`: Email address.
- `status`: Enum (`Created`, `Documents Submitted`, `Background Check`, `Under Review`, `Verified`).
- `riskScore`: Computed indicator (0-100%).
- `updatedAt`: ISO Date.

### Audit Log
- `id`: Unique identifier.
- `timestamp`: Event creation date.
- `user`: Account email triggering action.
- `action`: Brief descriptor (e.g. `LOGIN_SUCCESS`, `RECORD_STATUS_UPDATE`).
- `details`: Metadata payload.
