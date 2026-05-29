# Architecture Decision Record (ADR-002): Network Resilience Simulator Design

## Status
Approved

## Context
Background check platforms depend heavily on third-party APIs (identity validation systems, academic registries), which are prone to network lag, transient timeouts, or complete outages. VeriX needs to demonstrate operational resilience under simulated network stress:
1. Simulating response delays to verify client-side loader animations and skeletons.
2. Simulating transient server errors (e.g. 503 Service Outages) to verify client-side auto-retry mechanisms.
3. Simulating complete outages to verify offline indicators.

## Options Considered

### Option 1: Client-Side RxJS Delay Operator Mocks
* *Pros*: Zero server code modifications; easy mock-up.
* *Cons*: Fails to test HTTP gateway performance, CORS behaviors, database timeouts, or actual backend response queues.

### Option 2: Server-Side Port/Port Blocking Simulations
* *Pros*: Realistic OS-level port blocking.
* *Cons*: Requires local root privileges, lacks granular request-level controls, and is impossible to deploy in serverless environments.

### Option 3: Client-Configured Header-Driven Middleware Delay (Selected)
* *Pros*: Client configuration is passed dynamically on a per-request basis using headers (`x-simulate-latency`, etc.). The server implements delay using asynchronous `setTimeout` promise wrappers in express middleware, allowing realistic, request-level latency mapping.

---

## Decision
We chose **Option 3: Client-Configured Header-Driven Middleware Delay**. This lets the evaluator modulate network parameters directly from the browser UI while routing actual requests through the network.

### Implementation Specifics
1. **Header Injection**: `api.interceptor.ts` intercepts all outgoing requests and injects the simulator parameters from the client state.
2. **Outage Middleware**: `delay.middleware.ts` intercepts the request:
   - If `x-simulate-offline` is `'true'`, it immediately returns a `503 Service Unavailable`.
   - If `x-simulate-failure` is active, it runs a random check. If it falls below the rate, it drops the request.
   - If `x-simulate-latency` is positive, it delays execution using a promise-wrapped `setTimeout` before calling `next()`.
3. **Client Stagger & Auto-Retry**: The interceptor catches errors. If `autoRetry` is enabled, it waits `1200ms` and retries the request using RxJS operators up to the limit.

---

## Consequences
* **Deep Observability**: Evaluators can watch requests appear in the visual queue, transition to `retrying` with attempts counter, and eventually resolve or fail.
* **Realistic Testing**: Demonstrates proper cleanup of open HTTP connections and request cancellation.
* **No Server Configuration Overhead**: The simulator is self-contained and functions in any deployment environment.
