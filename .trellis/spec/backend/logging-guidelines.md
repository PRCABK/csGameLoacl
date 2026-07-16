# Logging Guidelines

## Current Practice

There is no logging dependency or structured logging format. `server.js` emits one startup message with `console.log` after the server begins listening:

```js
server.listen(process.env.PORT || 3000, () => console.log('NEON STRIKE running at http://localhost:3000'));
```

Normal joins, leaves, kills, and round completion are sent to clients as WebSocket events; they are not server logs.

## Current Boundaries

The backend has no demonstrated warning/error level convention. If a task adds operational logs, choose and document levels within that task rather than assuming an existing project standard.

The source does establish one practical boundary: the 50 ms snapshot loop and movement/broadcast paths currently emit no logs. Avoid adding per-tick or per-movement output accidentally because those paths are high frequency. Introducing a logging framework or structured operational policy is an architectural change, not an incidental edit.

## Current Limitations

The process has no request IDs, timestamps, log levels, persistence, or telemetry. Observability upgrades are a separate architectural task; if introduced, update this guide and document production configuration.
