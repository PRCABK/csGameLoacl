# Implementation Plan: Modularization Integration Verification

## Execution Checklist

1. 记录基线
   - 核对最近客户端/服务端拆分提交、入口文件和当前工作区。
   - 创建 `verification.md`，区分自动通过、人工通过、未执行和失败。

2. 静态检查
   - 对 `game.js`、`server.js`、`client/*.js`、`server/*.js` 运行 `node --check`。
   - 运行 `npm ls --depth=0`。
   - 核对 `package.json`、`index.html`、根兼容入口和模块引用。

3. HTTP 与 WebSocket 自动冒烟
   - 通过根目录 `npm start`/等价根入口启动隔离端口。
   - 验证 `/`、`client/main.js`、其他代表性模块/资源和 404。
   - 使用两个 `ws` 客户端验证加入、状态、移动、命中、击杀、复活、离开及空房重建。
   - 无论成功失败都关闭连接和服务进程。

4. 浏览器与局域网清单
   - 执行可用的真实浏览器单人检查；不能自动观察的项目明确标记人工。
   - 当前无第二台同网设备：写入未执行原因和以后可执行的双设备操作步骤，不标记为通过。

5. 文档与父任务对照
   - 更新 README 项目结构树，反映 `client/`、`server/` 和两个兼容入口。
   - 在 `verification.md` 逐项映射当前任务和父任务验收标准。

6. 质量门
   - 运行 `trellis-check`，复核无临时进程/脚本/依赖残留。
   - 重跑静态检查和必要的自动冒烟。
   - 更新任务 checklist，进入 spec 判断和提交。

## Validation Commands

```powershell
node --check game.js
node --check server.js
fd --type f --extension js . client server -x node --check
npm ls --depth=0
npm start
```

动态验证使用任务内临时脚本和非冲突端口；脚本在提交前删除，结果写入 `verification.md`。

## Review Gate

- 自动检查结果有实际输出或断言证据。
- 浏览器/局域网未执行项没有被标记为通过。
- README 只反映既有模块化，不引入新的使用方式。
- 没有产品代码、依赖或协议变化。
- 父任务每条验收标准均能追溯到验证证据。

## Rollback Point

README 和验证记录形成一个聚焦提交。若发现代码回归，停止提交验证结论，返回相应代码任务修复后重新执行本计划。
