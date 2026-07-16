# Type Safety and Runtime Validation

## Current Approach

The frontend is plain JavaScript ES modules with no TypeScript, JSDoc type layer, schema library, or type-check command. Contracts are implicit in object shapes and WebSocket `type` values.

## Runtime Guards

- Check optional Three.js resources before use (`if (!gltf) return`, `if (!obj.isMesh || !obj.material) return`).
- Handle material fields that may be either one material or an array, as shown throughout `client/assets.js` and `client/main.js`.
- Use optional chaining for optional browser/Three.js APIs during cleanup (`obj.parent?.remove`, `dispose?.()`).
- Provide defensive numeric fallbacks where geometry could be degenerate, such as `Math.max(size.y, 1e-6)` in `normalizeProp`.
- Branch on WebSocket message `type` and verify referenced local/remote entities before mutation.

## Data Contracts

Keep server and client payload field names synchronized. Protocol messages include `join`, `move`, `shoot`, `welcome`, `state`, `hit`, `kill`, `respawn`, `feed`, and `roundEnd`. Changing fields is a cross-layer compatibility change and must update both `server.js` and `client/main.js`.

## Scope Control

Do not add TypeScript or a runtime schema dependency as part of an unrelated feature. A type-system migration requires an explicit task covering browser loading/build behavior and validation commands.
