# UI and Component Guidelines

## Current Model

This is not a React/Vue component application. UI structure is static semantic HTML in `index.html`; behavior updates existing DOM elements from `client/main.js`; appearance lives in `style.css`. There are no props, JSX templates, or component lifecycle APIs.

## DOM Conventions

- Give interactive or frequently updated elements stable IDs, as with `join-form`, `timer`, `leaderboard`, `tab-scoreboard`, and `pause-panel` in `index.html`.
- Use reusable CSS classes for visual/state behavior. The `hidden` class controls visibility across HUD and panels; mode/team/map choices use classes such as `active`, `red`, and `blue`.
- Use native controls where present: buttons, form, labels, input, range, and output. Preserve `type="button"` for chooser buttons so they do not submit `join-form`.
- Keep UI copy consistent with the existing Chinese game interface; short game labels may retain established English terms such as `ENEMY DOWN`.
- For WebGL content, create Three.js objects through focused helper functions and add them to `scene`; map-owned objects must be tracked for cleanup.

## Styling

- Runtime styles belong in root `style.css`; landing-page styles belong in `docs/styles.css`.
- Prefer class toggles over repeated inline style mutation for panels and control states.
- Preserve the existing IDs/classes when changing markup because `client/main.js` and CSS depend on them.

## Accessibility Baseline

The project currently has no formal accessibility test setup. New controls should remain keyboard-usable native elements, retain associated labels, and avoid replacing buttons with clickable generic elements.
