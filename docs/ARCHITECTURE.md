# System Architecture - VeriX

This document outlines the software design, patterns, components, and data lifecycles of the VeriX platform.

---

## 1. System Component Flowchart

The system separates client state tracking, network manipulation, and data persistence layers.

```mermaid
flowchart TD
    subgraph Frontend [Angular 17 Client SPA]
        A[Views & Feature Components] <-->|Observe State| B[RxJS Services & BehaviorSubjects]
        B -->|HTTP Client Calls| C[API Interceptor]
    end

    subgraph Middleware [Express API Gateway]
        C -->|Inject Simulator Headers| D[CORS & Logger Middleware]
        D --> E[Delay & Outage Simulator Middleware]
    end

    subgraph Backend [Node.js + Express TS Server]
        E -->|Authorized JWT| F[Express Routes & Guards]
        F --> G[Controllers: Auth, Record, User, Audit]
    end

    subgraph Data [Data Persistence Layer]
        G --> H{Mongoose Connect?}
        H -->|Success| I[MongoDB Atlas Collections]
        H -->|Failure| J[In-Memory JSON Fallback Database]
    end

    style Frontend fill:#1a1432,stroke:#bd93f9,stroke-width:2px,color:#f8f8f2
    style Middleware fill:#0d0a1a,stroke:#00e5ff,stroke-width:2px,color:#f8f8f2
    style Backend fill:#1a1432,stroke:#bd93f9,stroke-width:2px,color:#f8f8f2
    style Data fill:#0c0919,stroke:#00e676,stroke-width:2px,color:#f8f8f2
```

---

## 2. Verification Workflow State Machine

The **Verification Workflow Engine** drives background file reviews chronologically. Any state advance triggers audit logs, analytics modifications, and user alert cascades.

```mermaid
stateDiagram-v2
    [*] --> Created : File Initiated (Admin/User)
    Created --> Documents_Submitted : Candidate uploads metadata
    Documents_Submitted --> Background_Check : Identity & registry check
    Background_Check --> Under_Review : Risk algorithms run
    Under_Review --> Verified : Compliance verified
    Under_Review --> Created : Reset file on discrepancy

    state Created {
        [*] --> InitializeCheck
    }
    state Background_Check {
        [*] --> IdentityCheck
        --> CriminalAudit
        --> AcademicValidation
    }
```

---

## 3. Network Resilience Simulator Loop (RxJS Staggers)

Details how outgoing requests are processed under simulated instability (latency delays, outages, error drops) and how the client interceptor manages auto-retries.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Angular View
    participant Interceptor as API Interceptor
    participant Gateway as Delay Middleware
    participant Server as Express Controller

    Client->>Interceptor: Trigger Database Query
    Note over Interceptor: Inject Simulator Headers:<br/>x-simulate-latency<br/>x-simulate-failure<br/>x-simulate-offline
    Interceptor->>Gateway: HTTP Request
    
    alt Offline Mode is Enabled
        Gateway-->>Interceptor: Reject: 503 Outage Simulation
    else Random Failure Rate Triggered (e.g. 20%)
        Gateway-->>Interceptor: Reject: 504 Gateway Timeout
    else Latency Delay Triggered (e.g. 2000ms)
        Note over Gateway: Wait 2.0 seconds...
        Gateway->>Server: Forward Request
        Server-->>Gateway: 200 OK Response
        Gateway-->>Interceptor: 200 OK Response
    end

    alt Interceptor Catches 503/504 Error
        Note over Interceptor: RxJS catchError + retry()<br/>Attempt: 1/3
        Note over Interceptor: Stagger delay 1.2s...
        Interceptor->>Gateway: Retry HTTP Request
        Gateway->>Server: Forward Request
        Server-->>Gateway: 200 OK Response
        Gateway-->>Interceptor: 200 OK Response
        Interceptor-->>Client: Render Data
    else Request Resolves on First Attempt
        Interceptor-->>Client: Render Data
    end
```

---

## 4. Database Fallback Pattern

Ensures zero installation friction for the evaluator by abstracting the storage connection layer.

```mermaid
flowchart LR
    A[Controllers] --> B[Unified DB DAO Interface]
    B --> C{MongoDB Connected?}
    C -->|Yes| D[Mongoose Schema Models]
    C -->|No| E[JSON Memory/FS Fallback Store]
    D --> F[(Mongoose Database)]
    E --> G[(Local DB Files)]
```
