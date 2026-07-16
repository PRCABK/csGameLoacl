# Implementation Plan: Phase 1 Modularize JS Codebase

## Completed Workstream

1. 客户端模块拆分
   - 提取 `client/constants.js`、`client/assets.js`、`client/scene.js`。
   - 保持 `client/main.js` 为玩法编排入口，根 `game.js` 为兼容入口。
   - 已完成、验证并归档。

2. 服务端模块拆分
   - 提取地图、房间、快照、静态文件、战斗和运行时组装模块。
   - 保持根 `server.js` 和 `npm start` 兼容。
   - 已完成、验证并归档。

3. 集成验证
   - 全量语法、依赖、启动、HTTP 和程序化 WebSocket 检查通过。
   - 用户确认真实浏览器和双设备局域网人工清单全部通过。
   - README 结构与模块边界同步；验证任务已归档。

## Final Quality Gate

```powershell
node --check game.js
node --check server.js
fd --type f --extension js . client server -x node --check
npm ls --depth=0
```

- 核对三个子任务均为 completed。
- 核对父 PRD 验收项全部有自动、人工或拆分审查证据。
- 核对没有临时测试脚本、产品代码或依赖残留改动。

## Finish

父任务验收记录提交后归档父任务，并在会话日志中引用该验收提交。
