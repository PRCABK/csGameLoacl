# Client Module Split

## Goal

将当前约 1497 行的 `game.js` 拆分为浏览器可直接加载的 JavaScript ESM 模块，保持玩法、UI、资源路径、WebSocket 协议和已完成的远端移动平滑行为不变。

## Parent Task

- `.trellis/tasks/07-16-phase-1-modularize-js-codebase`

## Requirements

- 不引入 TypeScript、Vite、Webpack 或任何新构建工具。
- `index.html` 可以把入口从 `game.js` 改到 `client/main.js`，但 import map 和 Three.js CDN 机制保持不变。
- 所有浏览器模块必须能被当前 Node 静态文件服务直接访问。
- 保持 `models/*.glb`、`style.css` 等资源路径兼容。
- 保持 WebSocket 消息字段和含义不变。
- 保持远端玩家视觉插值与射击判定快照分离的现有修复。
- 拆分优先级：先建立入口和共享运行态，再拆 scene/assets/maps/remotePlayers/HUD/minimap/network/shooting/input。
- 每次移动代码时优先做等价搬迁，不顺手改玩法、调参或优化协议。

## Completed Scope

- `index.html` 已改为加载 `client/main.js`。
- 根目录 `game.js` 已改为兼容包装入口，只导入 `client/main.js`。
- 新增 `client/constants.js`，抽出调色板、玩法显示常量、武器配置和队伍 helper。
- 新增 `client/assets.js`，抽出 GLTF 缓存加载、模型规范化和对象销毁 helper。
- 新增 `client/scene.js`，抽出 Three.js scene/camera/renderer/lights/floor/grid/walls、材质和 box helper。
- `client/main.js` 继续保留高耦合 gameplay 编排逻辑，避免在本子任务中过度强拆。

## Acceptance Criteria

- [x] `client/main.js` 成为浏览器入口，`index.html` 指向该入口。
- [x] `game.js` 的主要职责被拆入 `client/` 下多个模块，或作为过渡文件不再承担全部职责。
- [x] 浏览器 ESM import path 已通过静态服务访问验证；未发现明显路径错误。
- [x] 首页、菜单、地图选择、模式选择、鼠标灵敏度、HUD、小地图、计分板保持原代码路径；需最终集成阶段做浏览器手动验证。
- [x] 本机玩家移动、碰撞、跳跃、下蹲、射击、装填逻辑保留在 `client/main.js`；`jumpSpeed` 漏导入风险已修复。
- [x] 远端玩家创建、显示、移动平滑、死亡、复活、移除逻辑保留。
- [x] 射击判定仍使用最新远端快照位置而不是插值显示位置。
- [x] `node --check` 覆盖所有新增或修改的客户端 `.js` 文件、`game.js` 和 `server.js`。
- [x] 本地 HTTP 首页探测返回 200。

## Validation

- `find client -name "*.js" -print0 | xargs -0 -n1 node --check && node --check game.js && node --check server.js` 通过。
- 本地启动 `node server.js` 后，`curl -I --max-time 5 http://127.0.0.1:3000/` 返回 200。
- 静态访问 `/client/main.js`、`/client/constants.js`、`/client/assets.js`、`/client/scene.js` 成功。
- `npm ls --depth=0` 通过。
- `trellis-check` 子代理复查无阻塞问题。

## Out Of Scope

- 不拆服务端；服务端拆分由 `server-module-split` 子任务负责。
- 不改同步频率、协议、判定权威性或资源加载策略。
- 不改 UI 样式、美术资源或玩法数值。
