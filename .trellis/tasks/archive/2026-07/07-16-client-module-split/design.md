# Design: Client Module Split

## Scope

Split the browser client from one large `game.js` file into plain JavaScript ESM modules under `client/`, without adding a bundler, TypeScript, or changing runtime behavior.

## Current Entry

- `index.html` loads `game.js` as `<script type="module" src="game.js"></script>`.
- `game.js` imports Three.js through the existing import map.
- Static assets are served from repo root, so browser module paths must keep runtime URLs such as `models/*.glb` unchanged.

## Target Entry

- `index.html` loads `client/main.js`.
- `client/main.js` wires modules together and starts the loop.
- `game.js` may be removed or left as a tiny transitional import wrapper only if needed, but it should no longer own all client responsibilities.

## Target Modules

```text
client/
├── main.js
├── scene.js
├── assets.js
├── maps.js
├── weapons.js
├── remotePlayers.js
├── minimap.js
├── hud.js
├── input.js
├── shooting.js
└── network.js
```

## Module Responsibilities

- `scene.js`: create scene, camera, renderer, lights, shared palette/material helpers, collision wall storage where map builders need it.
- `assets.js`: GLTF loader, model cache, object disposal/model normalization helpers.
- `maps.js`: map builders, map cleanup, prop helpers, map names/builders.
- `weapons.js`: first-person gun group, weapon model preloading/equip/reload-related helpers where safe.
- `remotePlayers.js`: remote player meshes, nickname tags, animation, smoothing, hit flash cleanup; preserve visual interpolation vs snapshot authority separation.
- `minimap.js`: spotted/fire reveal state and minimap drawing helpers.
- `hud.js`: DOM lookup/update helpers for menu, scoreboard, feed, notice, hitmarker and panels.
- `input.js`: keyboard/mouse/pointer-lock bindings and local movement helpers when safely separable.
- `shooting.js`: raycast shooting, shot/impact effects, target resolution, temporary snapshot-position hit detection.
- `network.js`: WebSocket creation, join send, receive dispatch.
- `main.js`: owns shared mutable runtime state and composes modules.

## Design Constraints

- Use browser ESM only; imports must include `.js` extensions.
- No new global build step.
- Avoid circular imports. Prefer passing shared state and callbacks from `main.js` into modules.
- Do not change WebSocket payload shapes.
- Do not change gameplay constants or tuning values.
- Do not change asset URLs.
- Keep comments in Chinese when adding comments, matching the current code style.

## Migration Strategy

To reduce risk, split by dependency direction:

1. Create `client/` and move the whole current `game.js` body to `client/main.js` first; update `index.html`. This establishes the new entry with minimal behavior change.
2. Extract low-dependency helpers/constants into modules.
3. Extract scene/assets/maps where data flow is mostly one-way.
4. Extract remote player smoothing and HUD/minimap helpers.
5. Extract network and shooting only after dependencies are explicit.

If a clean extraction becomes too risky, keep that code in `main.js` for this child task and document the remaining responsibility instead of forcing a brittle abstraction.

## Compatibility Contracts

- Browser entry must work from `http://127.0.0.1:3000/`.
- `models/*.glb` URLs remain relative to site root.
- Existing DOM IDs/classes in `index.html` remain unchanged.
- Remote player smoothing from commit `177cefc` remains intact.
- Shooting hit detection must still use latest snapshot position during raycast, then restore visual interpolation transform.

## Rollback

Rollback this child task by reverting its commit. It must not depend on server module split.
