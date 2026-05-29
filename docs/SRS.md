# System Requirements Specification (SRS) — VeriX

## 1. System Specifications & Interfaces

VeriX maps frontend components to Express controllers using JSON payloads. The system enforces dynamic request delays and failures using headers injected by the client interceptor.

```text
[ Client Interceptor ] ──( Injects x-simulate headers )──> [ Express Delay Middleware ]
```

---

## 2. API Contract Specifications

### 2.1 Session Authentication
* **User Login**:
  - **Endpoint**: `POST /api/auth/login`
  - **Input Payload**:
    ```json
    {
      "email": "admin@verix.com",
      "password": "passphrase_here"
    }
    ```
  - **Response Payload (Success - 200 OK)**:
    ```json
    {
      "success": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "email": "admin@verix.com",
        "role": "admin",
        "status": "active"
      }
    }
    ```
  - **Response Codes**:
    - `200 OK`: Successful validation.
    - `400 Bad Request`: Email/password parameters missing.
    - `401 Unauthorized`: Invalid credentials.
    - `403 Forbidden`: Account status is `suspended`.
* **Session Validity Verification**:
  - **Endpoint**: `GET /api/auth/session`
  - **Headers**: `Authorization: Bearer <token>`
  - **Response Payload (Success - 200 OK)**:
    ```json
    {
      "success": true,
      "user": {
        "email": "admin@verix.com",
        "role": "admin",
        "status": "active"
      }
    }
    ```

### 2.2 Candidate Records (Verification Center)
* **List Records**:
  - **Endpoint**: `GET /api/records`
  - **Headers**: `Authorization: Bearer <token>`
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "records": [
        {
          "_id": "r_3h8f1e9",
          "name": "Alice Vance",
          "email": "alice.vance@example.com",
          "status": "Created",
          "riskScore": 12,
          "updatedAt": "2026-05-29T13:08:33.000Z"
        }
      ]
    }
    ```
* **Initialize Verification File**:
  - **Endpoint**: `POST /api/records`
  - **Input Payload**:
    ```json
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "riskScore": 45
    }
    ```
  - **Response (201 Created)**: Returns the newly generated candidate record database object.
* **Advance Workflow Stage**:
  - **Endpoint**: `PUT /api/records/:id/status`
  - **Input Payload**:
    ```json
    {
      "status": "Documents Submitted"
    }
    ```
  - **Response (200 OK)**: Returns the updated record containing the new status value.
  - **Validation Constraints**: Status must fall within: `Created`, `Documents Submitted`, `Background Check`, `Under Review`, `Verified`.

### 2.3 User Accounts Administration (Admin Only)
* **List Accounts**: `GET /api/users` (Returns all profiles, excluding password hashes).
* **Create Account**: `POST /api/users` (Takes `email`, `password`, `role`. Returns created user payload).
* **Modify Credentials / Suspend User**: `PUT /api/users/:id` (Accepts `role`, `status: suspended|active`, `password`).
* **Delete Account**: `DELETE /api/users/:id` (Prevents self-deletion).

---

## 3. Database Schema Models

If connected to MongoDB Atlas, Mongoose manages the schemas. Otherwise, the local fallback initializes the identical memory arrays.

### 3.1 User Collection
```typescript
interface UserSchema {
  email: string;        // Indexed, Unique
  passwordHash: string; // BCrypt (10 rounds)
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  createdAt: Date;      // Defaults to Date.now
}
```

### 3.2 Candidate Record Collection
```typescript
interface RecordSchema {
  name: string;
  email: string;
  status: 'Created' | 'Documents Submitted' | 'Background Check' | 'Under Review' | 'Verified';
  riskScore: number;    // Range: 0 - 100
  updatedAt: Date;
}
```

### 3.3 Audit Log Collection
```typescript
interface AuditLogSchema {
  timestamp: Date;
  user: string;         // Initiator email
  action: string;       // Action tag (e.g. LOGIN_SUCCESS, USER_CREATED)
  details: string;      // Metadata payload
}
```

---

## 4. Frontend State & RxJS Lifecycle
The client manages data bindings using reactive streams rather than mutable variables:
* **Auth State**: `AuthService.currentUser$` BehaviorSubject emits session profiles on restore/login/logout.
* **Outage Simulator State**: `SimulatorService.queue$` BehaviorSubject tracks active and historical HTTP requests, updating averages and queue counters.
* **Notification State**: `NotificationService.toasts$` maps toast arrays, auto-triggering dismiss timeouts.

---

## 5. Security & Access Enforcements
1. **Bearer Token Authentication**: Frontend interceptor inserts the header `Authorization: Bearer <JWT>`. Backend `authGuard` verifies signature.
2. **Access Control Enforcement**: Admin-only routes (users, audit logs) run the backend `adminOnly` guard. Client router checks the decrypted token role, redirecting users if unauthorized.
3. **Outage Shielding**: All input strings are validated; credentials passwords are hashed using salt factor 10.
