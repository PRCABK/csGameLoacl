# Server Module Split

## Goal

将当前 320 行的根目录 `server.js` 拆分为可维护的 CommonJS 服务端模块，同时保留根目录 `server.js` 作为兼容入口，确保 `npm start`、HTTP 静态资源和 WebSocket 对局行为不变。

## Parent Task

- `.trellis/tasks/07-16-phase-1-modularize-js-codebase`

## Requirements

- 不引入新后端框架或新运行时依赖。
- 根目录 `server.js` 必须保留，并继续作为 `npm start` 的入口。
- 可以新增 `server/` 目录和 CommonJS 模块。
- 保持 HTTP 静态文件路径、Content-Type 映射和 404 行为兼容。
- 保持 WebSocket 消息字段和含义不变。
- 保持地图 ID、出生点、房间 key、回合时长、伤害、复活时间不变。
- 保持无人房间清理、断线清理复活定时器、击杀/复活/结算广播行为不变。
- 优先拆：`maps.js`、`rooms.js`、`snapshots.js`、`staticFiles.js`、`combat.js`、`index.js`。

## Acceptance Criteria

- [x] `npm start` 仍能从仓库根目录启动服务。
- [x] 根目录 `server.js` 保留为兼容入口。
- [x] 服务端逻辑被拆入 `server/` 下多个职责清晰的模块。
- [x] HTTP 首页探测返回 200。
- [x] 浏览器可以建立 WebSocket 连接并收到 `welcome` 和周期性 `state`。
- [x] 加入、移动、射击、命中、击杀、复活、离开、无人房间清理和回合结束行为保持兼容。
- [x] `node --check` 覆盖所有新增或修改的服务端 `.js` 文件。

## Out Of Scope

- 不重写客户端。
- 不更改同步频率、协议结构、静态资源缓存策略或服务端权威判定。
- 不引入 Express、Fastify、TypeScript、Rust 或数据库。
