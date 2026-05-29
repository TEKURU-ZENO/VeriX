# System Architecture - VeriX

This document outlines the software design, patterns, and component structure of the VeriX platform.

## 1. Architectural Patterns
* **Frontend (Angular 17)**: Configured using Standalone Components. We use **RxJS BehaviorSubjects** in services (`AuthService`, `SimulatorService`, `RecordService`) to manage UI states reactively, decoupling logic from view rendering.
* **Backend (Node.js + TypeScript)**: Organized around standard Controller-Middleware-Repository design pattern. Express routes call controllers, which delegate data interactions to Mongoose models.

## 2. Request Lifecycle & Latency Sim Flow
When a user adjusts latency in the **Network Resilience Simulator**, the configuration is stored in client-side state. On every API request:
1. `auth.interceptor.ts` intercepts the request and injects Headers:
   - `x-simulate-latency`: value in ms.
   - `x-simulate-failure`: failure rate percent.
   - `x-simulate-offline`: boolean switch.
2. The request goes to the Express Server.
3. `delay.middleware.ts` parses headers:
   - If `offline` is true or if random selection falls under the failure rate, it rejects the request with a `503 Service Unavailable` or simulated timeout error.
   - If `latency` is set, it holds the response using a promise wrapper before executing the route handler.
4. The client's `api.service.ts` uses RxJS operators (`timeout`, `retryWhen`, `catchError`) to retry failed requests or display errors dynamically.

## 3. Database Fallback Design
To maintain portability:
* If the database cannot connect to a live MongoDB instance, it spins up an internal file-based fallback system (`db.ts`).
* All write and read controller queries use standardized helper interfaces that auto-route queries either to MongoDB or the memory store, guaranteeing identical response formats.
