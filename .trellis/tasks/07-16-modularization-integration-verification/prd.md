# Modularization Integration Verification

## Goal

在客户端和服务端模块化拆分完成后，对完整应用执行一次可重复的集成验证，确认根目录启动入口、浏览器模块加载、静态资源、WebSocket 对局和多人生命周期仍然兼容，并留下人工局域网验证清单。

## Parent Task

- `.trellis/tasks/07-16-phase-1-modularize-js-codebase`

## Background

- 客户端拆分已完成：`index.html` 加载 `client/main.js`，根目录 `game.js` 是兼容包装入口。
- 服务端拆分已完成：`npm start` 仍执行根目录 `server.js`，实际实现位于 `server/`。
- 项目没有测试框架、构建器、linter 或类型检查器；集成验证由语法检查、依赖检查、真实 HTTP/WebSocket 冒烟测试和人工浏览器清单组成。
- README 的启动和局域网说明仍然兼容，但“项目结构”仍把 `game.js` 和 `server.js` 描述成完整实现，需要按当前模块边界更新。

## Requirements

- 只做验证、验证记录和必要的 README 结构更新，不扩大重构范围。
- 对根兼容入口及 `client/`、`server/` 下全部 JavaScript 文件运行语法检查。
- 运行 `npm ls --depth=0`，确认无缺失或新增的非预期运行时依赖。
- 从仓库根目录通过 `npm start` 启动服务，并验证首页、拆分后的客户端模块和缺失文件响应。
- 使用真实 WebSocket 客户端验证加入、周期状态、移动、命中、击杀、复活、离开和空房清理后的重新加入。
- 对浏览器专属行为提供人工 smoke checklist：菜单、地图/模型、Pointer Lock、移动、射击反馈、HUD、小地图、计分板、暂停和返回大厅。
- 当前没有第二台同一局域网设备：本轮不执行双设备实测，必须在验证记录中标记为环境受限，并提供用户之后可直接执行的完整步骤，不将设备缺失误报为产品失败。
- 更新 README 的项目结构，使兼容入口与实际模块目录一致；不改启动或局域网使用说明。
- 逐项对照父任务验收标准，并记录证据。

## Acceptance Criteria

- [x] `node --check` 覆盖 `game.js`、`server.js`、`client/*.js` 和 `server/*.js`。
- [x] `npm ls --depth=0` 通过。
- [x] `npm start` 能从仓库根目录启动服务。
- [x] HTTP `/`、客户端拆分模块和服务端静态资源返回预期 200；缺失文件返回 404 与 `Not found`。
- [x] WebSocket 自动冒烟验证覆盖 `welcome`、周期 `state`、移动、`hit`、`kill`、约 3 秒 `respawn`、离开通知和空房清理。
- [x] 浏览器单人 smoke checklist 已执行，或明确标记需要用户在真实浏览器完成的项目。
- [x] 局域网多人 smoke checklist 已执行；若设备不可用，则记录未执行原因和完整步骤。
- [x] README 项目结构与当前客户端/服务端模块边界一致。
- [x] 父任务所有验收标准均有通过证据或明确的待人工验证状态。
- [x] 验证结果写入任务目录的 `verification.md`。

## Out Of Scope

- 不做新的客户端或服务端重构。
- 不新增测试框架、浏览器自动化依赖、构建器或 CI。
- 不更改玩法、WebSocket 消息、同步频率、资源加载策略或用户启动方式。
- 不修改防火墙或网络配置。
