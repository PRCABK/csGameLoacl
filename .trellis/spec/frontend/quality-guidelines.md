# Frontend Quality Guidelines

## Baseline

The frontend uses native ES modules, Three.js, DOM APIs, and CSS without linting, automated tests, or a build step. Preserve browser-direct loading through the import map in `index.html`.

## Required Patterns

- Keep reusable constants/helpers in `client/constants.js`, scene primitives in `client/scene.js`, and asset lifecycle code in `client/assets.js`.
- Cache GLTF loads and provide a fallback or null-safe path when an asset fails; `loadGltf` logs the failure and resolves `null`.
- Dispose removed geometry, material, and texture resources with `disposeObject`.
- Track map-owned objects and invalidate stale async callbacks during map replacement.
- Keep visual interpolation separate from authoritative gameplay data.
- Preserve stable DOM IDs/classes used by JavaScript and CSS.
- Use Chinese comments for non-obvious game logic, matching current source style.

## Avoid

- Do not add framework, bundler, state library, or type dependency for a local change.
- Do not leak Three.js resources when rebuilding maps or replacing models.
- Do not allow late async model loads to attach to the wrong map.
- Do not use smoothed mesh position as an accidental authority source for hit decisions.
- Do not mix `docs/` landing-page styles/behavior into the runtime UI.

## Validation

At minimum run:

```bash
node --check client/main.js
node --check client/assets.js
node --check client/constants.js
node --check client/scene.js
```

Then run `npm start` and manually test in a modern browser. For gameplay/network changes use at least two windows and exercise the affected map, mode, HUD, pointer lock, disconnect, and respawn flows. For visual changes inspect console errors and verify models cleanly rebuild when switching/re-entering maps. There is currently no test or lint script.
