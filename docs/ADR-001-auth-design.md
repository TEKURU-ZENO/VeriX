# Architecture Decision Record (ADR-001): Auth Design

## Status
Approved

## Context
VeriX requires a secure, production-grade access management system to enforce role divisions between `Admin` and `General User`. Simple, client-side fake auth is insufficient for showing engineering maturity.

## Decision
We implement a JWT-based authentication system backed by an HTTP Interceptor on the client and Express Guard middleware on the server.
* **Token Handlers**: On successful credentials validation, the server generates a token containing user profile information (email, role).
* **Storage**: Store the JWT token in standard `localStorage` on the browser.
* **Interceptor**: The `auth.interceptor.ts` intercepts all outgoing requests and injects the `Authorization: Bearer <token>` header.
* **Guards**: Backend routes enforce roles. Frontend router configuration blocks navigation if user permissions do not meet requirements.

## Consequences
* **Pros**: Decoupled client-server access validation, robust security, alignment with production design patterns.
* **Cons**: Client must handle token expiration gracefully (which is simulated by session expirations).
