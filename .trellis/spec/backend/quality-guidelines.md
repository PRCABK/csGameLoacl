# Backend Quality Guidelines

## Baseline

The backend is plain CommonJS JavaScript on Node.js 18+ with no linter, type checker, or committed automated test suite. Match the compact helper-and-guard style in `server/` and avoid dependencies or layers that the task does not require.

## Required Patterns

- Keep game-authoritative decisions on the server: combat transitions live in `server/combat.js`, while scoring and round end remain server-owned.
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
- Do not put application logic back into the root `server.js` compatibility entry.
- Do not create a second process-wide rooms collection or import `server/index.js` from leaf modules.

## Validation

For backend changes, at minimum run:

```bash
node --check server.js
fd --type f --extension js . server -x node --check
npm ls --depth=0
```

Then run `npm start` and exercise affected flows with multiple WebSocket clients or browser windows. For networking/gameplay changes, assert the exact `welcome`, `state`, `hit`, `kill`, `respawn`, and `roundEnd` fields as applicable; also verify DM/TDM room isolation, friendly fire, disconnect timer cleanup, empty-room deletion, death/respawn, and round scoring. HTTP checks must cover `/` returning 200 and a missing file returning 404 with `Not found`. There is currently no repository test command.
