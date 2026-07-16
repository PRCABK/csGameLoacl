# Design: Modularization Integration Verification

## Scope and Boundaries

该任务是验证与文档任务，不改变应用架构。验证以现有外部入口为边界：

- `npm start -> node server.js -> server/index.js`。
- `index.html -> client/main.js`，根 `game.js` 保留兼容导入。
- 浏览器与服务端继续使用同源 WebSocket URL。

唯一计划内产品文件修改是 README 的项目结构树；验证证据写入任务目录的 `verification.md`。

## Validation Layers

1. 静态层：全部拆分 JavaScript 文件的 `node --check`、依赖完整性、入口引用核对。
2. HTTP 层：真实启动服务后检查首页、客户端模块、样式/代表性资源以及 404 合同。
3. WebSocket 层：两个程序化客户端在同一房间完成加入、状态、移动、战斗、复活和离开流程，再验证空房删除后的干净重建。
4. 浏览器层：人工检查 CDN 模块加载、Three.js 场景、输入/Pointer Lock、HUD 和视觉反馈。
5. 局域网层：当前无第二台设备，本轮记录为环境受限；保留通过主机 IPv4 访问并验证互相可见、移动平滑、射击/击杀/复活和断线离开的人工步骤。

## Evidence Contract

`verification.md` 按检查项记录：命令或操作、结果、关键断言、执行环境和未执行原因。自动检查失败视为任务失败并先诊断；设备或真实浏览器不可用属于环境限制，必须留下可执行步骤，不伪造通过。

临时冒烟脚本可在任务执行中创建，但验证后删除，不引入测试依赖或永久测试框架。

## Compatibility Review

- 不改变根入口、端口默认值、HTTP 路径或 WebSocket 字段。
- README 只更新目录结构，不改变现有启动及局域网说明。
- 验证使用非默认临时端口时，仍需单独确认 `npm start` 默认入口可启动。

## Risk and Mitigation

- CDN/浏览器图形能力无法由 Node 冒烟完全覆盖：保留明确的浏览器人工清单。
- 局域网和防火墙依赖外部环境：不自动修改系统设置，只记录步骤和结果。
- 持续运行的服务可能残留：自动验证必须在 `finally` 中关闭客户端与子进程。

## Rollback

除 README 和任务验证记录外不应产生产品改动。若验证暴露回归，停止本任务的完成流程，另行修复并重跑完整验证；README 修改可随任务提交整体回退。
