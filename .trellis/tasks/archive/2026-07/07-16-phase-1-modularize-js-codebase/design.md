# Design: Phase 1 Modularize JS Codebase

## Architecture

第一阶段采用兼容入口 + 职责模块的原地拆分：

- 浏览器入口保持 `index.html -> client/main.js`，根 `game.js` 保留兼容导入。
- 服务启动保持 `npm start -> server.js -> server/index.js`。
- `client/` 承载常量、场景、资源生命周期和玩法编排。
- `server/` 承载地图、房间、快照、静态文件、战斗和运行时组装。

## Delivery Boundaries

工作拆成三个可独立验证的子任务：客户端拆分、服务端拆分、集成验证。每个拆分子任务保持协议、玩法、资源路径和用户启动方式兼容，最后一个子任务覆盖静态、HTTP、WebSocket、真实浏览器和双设备局域网验收。

## Compatibility Contract

- 不引入 TypeScript、构建器、框架或新运行时依赖。
- 不改变 WebSocket 消息字段、同步频率或服务端权威边界。
- 不改变 `npm start`、默认端口或局域网访问方式。
- 根 `game.js` 和 `server.js` 作为兼容入口保留。

## Completion Evidence

- 客户端工作提交：`9d59fc6 refactor: split client entry modules`。
- 服务端工作提交：`0023ef2 refactor: split server entry modules`。
- 集成验证提交：`29732f5 docs: record modularization integration verification`。
- 自动验证与用户人工验证证据位于已归档集成验证任务的 `verification.md`。

## Rollback

客户端、服务端和验证文档分别提交，可按子任务独立回退。兼容入口使任一层回退不要求用户更改启动命令。
