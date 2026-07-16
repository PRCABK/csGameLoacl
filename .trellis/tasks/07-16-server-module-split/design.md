# Design: Server Module Split

## Scope

将根目录 `server.js` 原地拆分为 `server/` 下的 CommonJS 模块。保持 `npm start -> node server.js`、HTTP 静态资源行为、WebSocket 协议和游戏规则不变。

## Current Architecture

`server.js` 当前同时负责：

- 地图配置、默认地图与地图 ID 归一化。
- 房间创建、出生、回合重置及内存状态。
- 团队得分、计分板与周期快照构建。
- HTTP 静态文件路径解析、Content-Type 和 404。
- WebSocket 连接、加入、移动、射击、断开。
- 伤害、击杀、复活定时器及过期回调保护。
- 50ms 状态广播、10 分钟回合结束及服务启动。

## Target Boundaries

```text
server.js                 # 兼容入口，仅加载 ./server/index.js
server/
├── index.js              # HTTP/WS 组装、连接处理、更新循环、listen
├── maps.js               # MAPS、DEFAULT_MAP、normalizeMapId
├── rooms.js              # rooms、roomKey、create/get/start/spawn、清理辅助
├── snapshots.js          # teamScores、scoreboard、snapshot
├── staticFiles.js        # 静态文件请求处理与 Content-Type
└── combat.js             # DAMAGE、RESPAWN_MS、射击/击杀/复活副作用
```

模块只暴露调用方实际需要的函数和常量，不引入类、容器或框架。

## Dependency Direction

- `maps.js` 不依赖其他项目模块。
- `rooms.js` 依赖 `maps.js`，持有唯一的 `rooms` 集合。
- `snapshots.js` 依赖 `maps.js`，只读取 room/player 数据。
- `staticFiles.js` 依赖 Node `fs`/`path`，不依赖游戏模块。
- `combat.js` 通过参数接收 `roomBroadcast`，依赖 `rooms.spawn`，避免反向依赖 `index.js`。
- `index.js` 作为 composition root 组装上述模块并持有 WebSocket transport helpers。

## Behavioral Contracts

### HTTP

- `/` 继续映射根目录 `index.html`。
- 其他路径保持当前 `path.normalize` 和父路径前缀移除行为。
- Content-Type 映射及未知扩展的 `application/octet-stream` 保持不变。
- 文件读取失败继续返回 404 和 `Not found`。

### WebSocket

保持现有消息类型与字段：`join`、`move`、`shoot`、`welcome`、`feed`、`hit`、`kill`、`respawn`、`roundEnd`、`state`。

以下常量不变：

- `ROUND_SECONDS = 600`
- `DAMAGE = 34`
- `RESPAWN_MS = 3000`
- 更新周期 `50ms`

### Lifecycle

- 房间 key 仍为 `${mode}:${mapId}`。
- 无玩家房间必须删除。
- 断线时必须清除玩家复活定时器。
- 复活回调继续通过房间成员关系、`roundEnded`、`dead` 和 `deathId` 拒绝过期执行。

## Migration Strategy

1. 先提取无副作用的地图、快照和静态文件模块。
2. 再提取房间状态与战斗逻辑，并以依赖参数避免循环引用。
3. 将现有运行时组装逻辑迁移到 `server/index.js`。
4. 最后把根 `server.js` 缩减为兼容 require 入口。

每一步只移动代码并调整 import/export，不改协议或玩法。

## Risks and Mitigations

- **循环依赖**：transport 广播函数由 `index.js` 注入 `combat.js`，不从战斗模块反向 require composition root。
- **状态重复**：`rooms` 只在 `rooms.js` 创建并导出，禁止在其他模块建立副本。
- **定时器回归**：原样保留断线清理和 `deathId` 检查，并加入自动 WebSocket 冒烟验证。
- **入口副作用**：只有 `server/index.js` 启动监听；工具模块被 require 时不监听端口。

## Rollback

该子任务使用单独提交。若启动、HTTP 或 WebSocket 验证失败，可整体 revert 服务端拆分提交，客户端模块化提交不受影响。
