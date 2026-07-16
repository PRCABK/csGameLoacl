# Backend Quality Guidelines

## Baseline

The backend is plain CommonJS JavaScript on Node.js 18+ with no linter, type checker, or automated test suite. Match the compact helper-and-guard style in `server.js` and avoid dependencies or layers that the task does not require.

## Required Patterns

- Keep game-authoritative decisions on the server: damage, friendly-fire rejection, kills, deaths, respawn, scoring, and round end are handled in `server.js`.
- Keep rooms isolated by `mode:mapId`; broadcasts must target `room.sockets`, not all connections.
- Validate protocol inputs and state before mutation.
- Clear owned timers and remove both player and socket records on disconnect.
- Preserve WebSocket message compatibility: payloads use a `type` discriminator and existing field names.
- Derive outgoing snapshots through `snapshot(room)` so all clients receive a consistent shape.

## Avoid

- Do not move authoritative combat outcomes to the browser.
- Do not broadcast one room's events to another room.
- Do not add global mutable state when it belongs to a room or player.
- Do not create duplicate kill/respawn timers; retain stale-callback protection.
- Do not perform unrelated refactoring of the single-file server unless module extraction is the task.

## Validation

For backend changes, at minimum run:

```bash
node --check server.js
```

Then run `npm start` and manually exercise affected flows with multiple browser windows. For networking/gameplay changes, verify DM and TDM room isolation, friendly fire, disconnect cleanup, death/respawn, and round scoring as applicable. There is currently no repository test command.
