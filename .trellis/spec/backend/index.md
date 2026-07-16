# Backend Development Guidelines

The backend is a small Node.js/CommonJS HTTP and WebSocket service. The root `server.js` is the compatibility entry point, while implementation modules live under `server/`.

| Guide | Scope |
|---|---|
| [Directory Structure](./directory-structure.md) | Server module boundaries, dependency direction, and naming |
| [Database Guidelines](./database-guidelines.md) | In-memory state and lifecycle; no database today |
| [Error Handling](./error-handling.md) | Protocol validation, guard clauses, and stale callbacks |
| [Logging Guidelines](./logging-guidelines.md) | Minimal console diagnostics and high-frequency exclusions |
| [Quality Guidelines](./quality-guidelines.md) | Server authority, room isolation, cleanup, and validation |

These guides describe current repository behavior. Architectural additions such as persistence, frameworks, or structured logging require explicit task scope and corresponding spec updates.
