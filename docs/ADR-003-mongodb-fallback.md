# Architecture Decision Record (ADR-003): Database Persistence & Fallback Design

## Status
Approved

## Context
Deploying databases can be complex. In a review setting, requiring a live MongoDB Atlas connection or a local database installation creates friction. If the reviewer's network blocks connection to Atlas, the application will crash on boot. 

VeriX requires a data access layer that:
* Connects to MongoDB Atlas if a connection string is provided.
* Fallbacks gracefully to a local in-memory/JSON filesystem store if the database is unreachable.
* Exposes an identical API structure so routes and controllers do not require conditional branches.

## Options Considered

### Option 1: Live MongoDB Database Connection Only
* *Pros*: Real database constraints, indexing, and scalability.
* *Cons*: If MongoDB is not running locally, the server crashes.

### Option 2: Pure In-Memory Mock Database
* *Pros*: 100% portable, works instantly.
* *Cons*: Data is lost on server restart, preventing testing of persistence or multi-session setups.

### Option 3: Unified Data Access Object (DAO) with Memory Fallback (Selected)
* *Pros*: Connects to MongoDB Atlas by default. If connection fails or times out (after 2 seconds), it enables an in-memory/JSON-file fallback database. Both data stores use the same interfaces, so controllers remain clean.

---

## Decision
We chose **Option 3: Unified DAO with Memory Fallback** for its reliability. The backend remains portable while retaining MongoDB capabilities.

### Implementation Specifics
1. **Connection Timeout**: `db.ts` attempts to connect to `process.env.MONGODB_URI` or `mongodb://localhost:27017/verix` with a strict `serverSelectionTimeoutMS` of `2000` (2 seconds).
2. **Fallback Mode Activation**: If connection fails or times out, it catches the error, sets `isFallbackDb = true`, and initializes memory arrays.
3. **Data Seeding**: On fallback boot, it automatically seeds initial datasets:
   - Admin and User accounts with pre-hashed BCrypt passphrases.
   - Five background check records showing various risk levels.
   - System audit events.
4. **Unified Controller Interface**: The database module exposes a unified `db` object with methods like `getRecords()`, `createRecord()`, and `createAuditLog()`. Inside these methods:
   - If `isFallbackDb` is false, it queries Mongoose models.
   - If `isFallbackDb` is true, it performs operations on memory arrays.

---

## Consequences
* **Seamless Onboarding**: Evaluators can run `npm start` immediately. The server will log a warning about MongoDB and launch fallback mode without interrupting execution.
* **Payload Consistency**: Controllers receive identical payload structures, ensuring the frontend behaves the same in both modes.
* **Persistence Limitation**: In fallback mode, changes are saved in server memory (which resets on restart). This is acceptable for review evaluations.
