# Architecture Decision Record (ADR-001): Authentication & Session Design

## Status
Approved

## Context
VeriX requires a session authentication scheme that supports:
* Enforcing access divisions between `Admin` and `General User` roles.
* Decentralized session validation across client and API gateway.
* Easy deployment on serverless environments (Vercel and Render) without session affinity constraints.

## Options Considered

### Option 1: Express Session Cookies (Stateful)
* *Pros*: Session store managed server-side.
* *Cons*: Requires sticky sessions, cookie sharing configuration across different domains (Vercel client and Render backend), and state storage (Redis/MongoDB sessions).

### Option 2: Stateless JSON Web Tokens (JWT) inside LocalStorage
* *Pros*: Easy domain sharing, works out-of-the-box on serverless, client can decode the payload directly to configure views.
* *Cons*: Risk of Cross-Site Scripting (XSS) if dependencies are compromised. Mitigation: short token lifespans and token-based guards.

---

## Decision
We chose **Option 2: Stateless JWT inside LocalStorage** for its high portability, compatibility with multi-cloud deployments, and developer testing ergonomics.

### Implementation Specifics
1. **Login Validation**: Express validates credentials and issues a signed HS256 token containing `{ email, role }` expiring in 2 hours.
2. **Access Middleware**: Client-side `api.interceptor.ts` injects the token into the `Authorization: Bearer <token>` header on backend requests.
3. **Server Verification**: `auth.middleware.ts` extracts the Bearer token and parses user metadata, appending it to the express request object for subsequent controller validation.
4. **Route Guards**: Client and server guards verify the token's presence and check credentials before allowing routing transitions.

---

## Consequences
* **Decoupled Architecture**: The backend remains stateless and can be scaled horizontally without session stores.
* **Direct Client Control**: The Angular app decodes token payloads locally to determine sidebar routes (e.g. hiding the Admin Center link if role is not `admin`) and configures user avatar initial displays.
* **Security Implications**: Tokens are stored in standard localStorage. To maintain security, session lifetimes are restricted, and the backend verifies the signature on every request, blocking actions immediately if the token expires.
