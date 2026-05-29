# Architecture Decision Record (ADR-003): MongoDB Fallback Design

## Status
Approved

## Context
Deploying databases can be complex. In a review setting, requiring MongoDB local installation or configuring a cloud cluster creates friction. We need a system that works instantly while maintaining real database behaviors.

## Decision
We implement a unified database repository interface that checks for MongoDB Atlas availability and automatically falls back to an **In-Memory/JSON-based filesystem data store** if a connection is not available.
* On startup, the backend attempts to connect to `process.env.MONGODB_URI` with a 3-second timeout.
* If it fails, a fallback database object is initialized.
* This fallback reads and writes to temporary JSON files (`db_fallback_users.json`, etc.) or in-memory arrays.
* It uses identical interfaces so controllers don't require conditional query branches.

## Consequences
* **Pros**: Eliminates installation friction, provides a functional UI instantly, and isolates database connectivity concerns.
* **Cons**: Local file system updates are slow, which is acceptable since data sizes in the operations dashboard are lightweight.
