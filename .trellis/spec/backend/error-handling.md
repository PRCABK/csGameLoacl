# Error Handling

## Overview

The backend has no custom error hierarchy or standard JSON error envelope. It handles expected invalid input at protocol boundaries with normalization and guard clauses, while the HTTP static server returns a plain 404.

## Existing Patterns

- Parse WebSocket messages defensively: `server.js` wraps `JSON.parse(raw)` and ignores malformed messages.
- Normalize untrusted choices to supported values. Join mode defaults to `dm`, team defaults to `red` in TDM, and `normalizeMapId` falls back to `DEFAULT_MAP`.
- Apply the existing partial bounds: player names are converted to strings and truncated to 14 characters; movement `x`, `y`, and `z` are range-clamped in the `move` handler.
- Current numeric validation is incomplete: `x`, `y`, `z`, `yaw`, and `pitch` are not checked with `Number.isFinite`, so the range clamp must not be described as full input validation.
- Reject invalid state transitions with early returns, as in shooting a missing/dead/self/friendly target or processing gameplay before join.
- Before delayed callbacks mutate state, verify the entity still belongs to the room and the callback is current (`deathId` in the respawn path).
- Static-file read failures return HTTP 404 with `Not found`.

## Client Responses

WebSocket messages are discriminated by a string `type`. Expected invalid gameplay messages are currently ignored rather than answered with an error event. Do not invent a new error payload for one handler; protocol-wide error responses require an explicit compatibility decision.

## Common Mistakes

- Preserve normalization for mode, map, team, and name. Treat stronger coordinate/angle validation as a deliberate hardening change because current code only range-clamps position and directly assigns angles.
- Do not throw from a WebSocket message handler for malformed client data; one bad packet must not terminate the process.
- Do not let old timers mutate disconnected players or a newer death/round lifecycle.
- Do not expose filesystem errors or absolute paths in HTTP responses.
