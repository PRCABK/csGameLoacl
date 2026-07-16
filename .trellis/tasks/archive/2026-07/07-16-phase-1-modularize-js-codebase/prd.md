# Phase 1 Modularize JS Codebase

## Goal

在不更换语言、不引入 TypeScript、不改变玩法和 WebSocket 协议的前提下，对现有 JavaScript 项目做第一阶段原地模块化重构，降低 `game.js` 和 `server.js` 的维护风险，为后续 TypeScript 化、同步协议优化和服务端权威判定打基础。

## Background

- 当前项目是浏览器 Three.js 客户端 + Node.js/WebSocket 服务端。
- `game.js` 聚合了场景、地图、模型、输入、网络、远端玩家、射击、HUD、小地图、特效等职责，修改局部功能容易牵连判定和显示逻辑。
- `server.js` 聚合了静态文件服务、房间、地图、玩家、战斗、复活、快照广播和回合结算。
- 刚完成的远端移动平滑修复说明：缺少模块边界时，显示层改动容易影响射击判定等 gameplay 逻辑。

## Requirements

- 第一阶段只做 JavaScript 原地模块化，不引入 TypeScript、构建器、框架或新运行时。
- 保持当前用户启动方式兼容：`npm install` 后 `npm start`，浏览器访问 `http://主机IPv4:3000`。
- 保持当前玩法、地图、武器、UI、WebSocket 消息格式和资源路径行为不变。
- 将客户端职责拆分成清晰模块，优先围绕远端玩家、网络、射击、HUD/小地图、地图/模型、输入和主循环建立边界。
- 将服务端职责拆分成清晰模块，优先围绕地图配置、房间状态、快照、战斗/复活和 HTTP/WebSocket 入口建立边界。
- 每个阶段性子任务必须可独立运行验证，避免一次性大爆炸重构。
- 不顺手做性能协议优化、服务端权威射线判定、CDN 本地化或玩法改动；这些作为后续任务。

## Acceptance Criteria

- [x] 形成可执行的第一阶段重构设计，明确模块边界和迁移顺序。
- [x] 客户端拆分后仍能正常加载 Three.js、地图、模型、HUD、小地图和 WebSocket 对局。
- [x] 服务端拆分后仍能正常提供静态资源、房间创建、加入、移动、射击、击杀、复活、结算和无人房间清理。
- [x] `npm start` 保持可用，不要求用户改变启动命令。
- [x] `node --check` 或等价语法检查覆盖拆分后的 JS 文件。
- [x] 至少完成一次本地 HTTP 首页探测和一次多人联机手动验证清单。
- [x] 重构过程中不改变已有 WebSocket 消息字段和含义。

## Suggested Child Tasks

- Client module split: extract client-side modules from `game.js` while preserving browser behavior.
- Server module split: extract server-side modules from `server.js` while preserving runtime behavior.
- Integration verification: run full local checks and document multiplayer manual test checklist.

## Out Of Scope

- 不引入 TypeScript、Vite、打包器或 Rust。
- 不重写同步协议，不做高低频消息拆分。
- 不做服务端权威移动/射击判定。
- 不改变游戏地图、武器、UI 样式或美术资源。
