# Implementation Plan: Client Module Split

## Steps

1. Baseline inspection
   - Confirm current `game.js`, `index.html`, and recent smoothing code.
   - Identify import path and asset URL constraints.

2. Establish client entry
   - Create `client/`.
   - Move current client code to `client/main.js` or create an equivalent entry.
   - Update `index.html` to load `client/main.js`.
   - Adjust relative paths only where browser module location requires it.

3. Extract stable modules
   - Extract scene/material setup if dependencies are local enough.
   - Extract GLTF/model loading helpers.
   - Extract map data/builders if asset and scene dependencies can be injected cleanly.

4. Extract gameplay-facing modules carefully
   - Extract remote player creation/animation/smoothing with explicit state access.
   - Extract HUD/minimap helpers where DOM and state boundaries are clear.
   - Extract shooting/network only if doing so does not obscure snapshot-vs-visual authority.

5. Validate after each meaningful slice
   - `node --check` changed client files.
   - Start server and probe homepage.
   - Review browser-import-sensitive paths.

## Validation Commands

```bash
node --check client/main.js
find client -name "*.js" -print0 | xargs -0 -n1 node --check
node --check server.js
npm ls --depth=0
```

HTTP probe:

```bash
node server.js
curl -I --max-time 5 http://127.0.0.1:3000/
```

## Manual Smoke Checklist

- Page loads with no browser console module errors.
- Lobby menu renders.
- Player can select mode/team/map and join.
- Local movement, jump, crouch, mouse look, shooting and reload work.
- HUD, minimap, kill feed, scoreboard and pause menu work.
- With a second client, remote player appears, moves smoothly, can be hit, killed, respawns, and disappears on disconnect.

## Risk Areas

- Browser ESM relative import paths.
- Asset URLs after moving entry under `client/`.
- Shared mutable state if modules import each other circularly.
- Shooting raycast uses remote mesh transforms, so snapshot-position temporary restore behavior must survive.
- DOM queries may run before elements exist if initialization order changes.

## Stop Conditions

- If a module extraction requires widespread rewiring or changes behavior, leave that area in `client/main.js` and document it for a later child task.
- Do not change protocol or gameplay to make extraction easier.
