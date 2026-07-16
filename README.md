# NEON STRIKE

一个基于浏览器的局域网 3D 第一人称死斗小游戏。使用 Three.js 渲染场景，Node.js 和 WebSocket 同步多人状态。

> 当前为可本地运行的原型，适合在同一局域网中和朋友联机试玩。

## 功能

- 多人实时死斗：所有玩家互为敌人
- 方块像素风角色、头顶昵称、个人击杀榜
- 第一人称移动、奔跑、跳跃、下蹲
- 鼠标灵敏度调节
- 简易步枪模型、枪口闪光、曳光弹、命中效果
- 击杀、3 秒复活、随机出生点、10 分钟战局结算
- 场景霓虹招牌“烟台分队”

## 环境要求

- [Node.js](https://nodejs.org/) 18 或更高版本
- 现代浏览器（Chrome、Edge、Firefox 等）

## 启动

```bash
npm install
npm start
```

打开：

```text
http://localhost:3000
```

## 局域网联机

1. 在作为主机的电脑上执行 `npm start`。
2. Windows 执行以下命令查找 IPv4 地址：

   ```powershell
   ipconfig
   ```

3. 朋友连接同一局域网后，在浏览器访问：

   ```text
   http://主机IPv4地址:3000
   ```

   例如：`http://192.168.1.23:3000`。

4. 若无法访问，请确认主机 Windows 防火墙允许 **入站 TCP 3000**；首次启动时也可在 Node.js 防火墙提示中允许“专用网络”。

管理员 PowerShell 创建入站规则：

```powershell
New-NetFirewallRule -DisplayName "NEON STRIKE TCP 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

## 操作说明

| 按键 | 操作 |
| --- | --- |
| `W` `A` `S` `D` | 前后左右移动 |
| `Shift` | 奔跑 |
| `Space` | 跳跃 |
| `C` | 按住下蹲 |
| 鼠标移动 | 转动视角 / 瞄准 |
| 鼠标左键 | 射击 |
| `R` | 装填 |

进入游戏前可通过大厅中的滑块调整鼠标灵敏度。

## 项目结构

```text
├── index.html    # 游戏页面与 HUD
├── style.css     # 界面样式
├── game.js       # Three.js 客户端及游戏表现
├── server.js     # HTTP / WebSocket 服务端与对局状态
└── package.json  # 启动脚本与依赖
```

## 说明

Three.js 通过 CDN 加载，因此即使在局域网中联机，客户端首次打开时仍需要能访问 CDN。该项目仅用于学习和原型演示；实际公网部署还应补充服务端移动校验、射击判定、身份认证与反作弊机制。
