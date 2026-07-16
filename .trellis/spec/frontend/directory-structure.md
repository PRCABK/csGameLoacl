# Frontend Directory Structure

## Overview

The runtime frontend is plain HTML/CSS and browser-native ES modules using Three.js. It has no framework, bundler, `src/` tree, or component directory.

## Layout

```text
index.html            # Game DOM shell, import map, and browser entry
style.css             # All game HUD/menu/panel styling
game.js               # Legacy compatibility entry importing client/main.js
client/main.js         # Gameplay, maps, networking, input, HUD, render loop
client/constants.js    # Shared palette, tuning values, weapons, team helpers
client/scene.js        # Three.js renderer, camera, lighting, materials, collision walls
client/assets.js       # GLTF loading/cache, normalization, and disposal
models/*.glb           # Runtime 3D assets
docs/index.html        # Independent GitHub Pages promotional page
docs/styles.css        # Promotional page styles
```

## Module Boundaries

- Put reusable constants and pure team helpers in `client/constants.js`.
- Put renderer/scene bootstrap and generic scene primitives in `client/scene.js`.
- Put GLTF loading, caching, model normalization, and GPU resource disposal in `client/assets.js`.
- Keep integrated game orchestration in `client/main.js` unless a task explicitly plans another extraction.
- Treat `docs/` as a separate static site; do not couple promotional-page scripts/styles to the game runtime.
- `index.html` directly loads `client/main.js`; preserve `game.js` as a compatibility entry unless removal is explicitly required.

## Naming

Files use lowercase names. JavaScript uses camelCase for functions/state and UPPER_SNAKE_CASE for exported tuning constants. Map builders use the existing `buildMap_<mapId>` convention, such as `buildMap_neon_dock` in `client/main.js`.
