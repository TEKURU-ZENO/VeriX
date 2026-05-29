# Architecture Decision Record (ADR-002): Network Simulator Design

## Status
Approved

## Context
The verification engine requires testing under unstable network operations (delays, dropped requests). A basic frontend `setTimeout` fails to simulate real backend delays, response queue behaviors, or socket blocks.

## Decision
We implement a **Network Resilience Simulator** that communicates metrics dynamically via custom request headers.
1. The client sends latency settings, error rates, and failure triggers via custom headers (`x-simulate-latency`, `x-simulate-failure`, `x-simulate-offline`).
2. Express backend middleware (`delay.middleware.ts`) intercepts requests:
   - Delays responses using asynchronous promise wrappers.
   - Throws error codes (e.g. `503 Service Unavailable`) for failures.
3. The client captures progress in a visual queue and leverages RxJS `retryWhen` and `timeout` operators to show retries and recoveries.

## Consequences
* **Pros**: Simulates real-world server responses, allows testing of retry mechanisms, and provides deep observability of HTTP lifecycles.
* **Cons**: Introduces extra headers into requests, which is acceptable in a showcase development environment.
