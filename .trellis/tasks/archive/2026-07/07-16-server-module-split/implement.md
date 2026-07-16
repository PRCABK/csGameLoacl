# Implementation Plan: Server Module Split

## Execution Checklist

1. 建立 `server/maps.js`
   - 原样迁移 `MAPS`、`DEFAULT_MAP`、`normalizeMapId`。
   - 保持地图 ID、名称和出生点数组不变。

2. 建立 `server/rooms.js`
   - 迁移 `rooms`、`roomKey`、`createRoom`、`getOrCreateRoom`、`startRound`、`spawn`。
   - 保留房间状态字段和回合重置语义。
   - 将广播函数作为 `startRound` 参数传入，避免依赖运行时入口。

3. 建立 `server/snapshots.js`
   - 迁移 `teamScores`、`scoreboard`、`snapshot`。
   - 保持 `state` payload 字段、排序、前五排行榜和剩余时间算法不变。

4. 建立 `server/staticFiles.js`
   - 导出可传给 `http.createServer` 的 handler 工厂或处理函数。
   - 保持根目录、路径处理、Content-Type 和 404 行为不变。

5. 建立 `server/combat.js`
   - 迁移射击目标校验、友伤拒绝、伤害、击杀和复活逻辑。
   - 通过参数接收 room、player、message 和 broadcast helper。
   - 保留 `deathId`、旧定时器清理和断线后的成员检查。

6. 建立 `server/index.js`
   - 组装 HTTP、WebSocket、房间、快照和战斗模块。
   - 保留加入、移动、断开、50ms 广播及回合结束逻辑。
   - 保持 `process.env.PORT || 3000` 和启动输出。

7. 缩减根目录 `server.js`
   - 仅执行 `require('./server/index.js')`，继续兼容 `npm start`。

## Automated Validation

```bash
node --check server.js
node --check server/index.js
node --check server/maps.js
node --check server/rooms.js
node --check server/snapshots.js
node --check server/staticFiles.js
node --check server/combat.js
npm ls --depth=0
```

启动临时服务后验证：

- HTTP `/` 返回 200 且正文包含游戏页面标识。
- 不存在文件返回 404 和 `Not found`。
- WebSocket 客户端发送 `join` 后收到 `welcome` 与 `state`。
- 两个 WebSocket 客户端可验证移动进入快照、射击产生 `hit`、连续命中产生 `kill`，约 3 秒后产生 `respawn`。
- 客户端关闭后，剩余客户端收到离开 feed；全部关闭后服务保持正常。

## Review Gate

检查时逐字段比较拆分前合同：

- `welcome`、`state`、`hit`、`kill`、`respawn`、`roundEnd` 字段不变。
- 地图配置、常量、房间 key 和更新频率不变。
- `rooms` 只有一个所有者。
- 无循环依赖或新增运行时依赖。
- 根 `server.js` 与 `package.json` 启动方式兼容。

## Rollback Point

验证通过后形成一个聚焦提交。任何协议或生命周期回归均整体回退该提交，不在本任务中顺带修改玩法。
