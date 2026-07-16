# NEON STRIKE

基于浏览器的局域网 3D 第一人称对战小游戏。  
Three.js 渲染 + Node.js/WebSocket 同步。

> 适合同一局域网内和朋友快速开黑试玩。

## 功能

### 模式
- **死斗**：所有人互为敌人
- **团队竞技**：红 vs 蓝，同队不可误伤
- 大厅选择模式 / 阵营 / 地图后进入
- 房间按「模式 + 地图」隔离，无人自动关闭

### 地图
- 霓虹码头
- 炽热沙城
- 风情小镇
- 货运仓库

### 战斗与表现
- 第一人称移动、奔跑、跳跃、下蹲
- 随机武器（狙击 / 科幻步枪）
- 曳光弹、枪口闪光、命中火花
- **战斗反馈增强**：
  - 准星命中变色
  - Hitmarker
  - 击杀横幅 `ENEMY DOWN`
  - 命中敌人闪白
  - 低血量屏幕脉冲
- 击杀播报、3 秒复活、10 分钟结算

### 信息与 UI
- 顶部比分 / 击杀
- 左侧击杀榜
- **CS 风格圆形小地图**
  - 自己朝向扇形
  - 视野发现敌人
  - **开火暴露**
  - **TDM 队友常显**
  - 地图名 / 模式标签
- Tab 计分板（团队分列 / 死斗总榜）
- Esc 暂停并返回大厅

## 环境要求

- Node.js 18+
- 现代浏览器（Chrome / Edge / Firefox）

## 启动

```bash
npm install
npm start
```

打开：

```text
http://localhost:3000
```

## 宣传页（GitHub Pages）

仓库内置宣传落地页：`docs/index.html`。

启用方式：

1. GitHub 仓库 → **Settings** → **Pages**
2. Source 选择 **Deploy from a branch**
3. Branch 选 `main`，目录选 `/docs`
4. 保存后访问：

```text
https://prcabk.github.io/csGameLoacl/
```

## 局域网联机

1. 主机执行 `npm start`
2. Windows 查 IP：

```powershell
ipconfig
```

3. 同网段朋友访问：

```text
http://主机IPv4:3000
```

例如：`http://192.168.1.23:3000`

4. 如无法访问，放行主机防火墙 **TCP 3000**（专用网络）：

```powershell
New-NetFirewallRule -DisplayName "NEON STRIKE TCP 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

## 操作

| 按键 | 操作 |
| --- | --- |
| `W A S D` | 移动 |
| `Shift` | 奔跑 |
| `Space` | 跳跃 |
| `C` | 下蹲 |
| 鼠标 | 瞄准 |
| 左键 | 射击 |
| `R` | 装填 |
| `Tab` | 计分板 |
| `Esc` | 暂停 / 返回大厅 |

大厅可调鼠标灵敏度。

## 项目结构

```text
├── index.html
├── style.css
├── game.js          # 客户端兼容入口，加载 client/main.js
├── client/
│   ├── main.js      # 客户端玩法、网络、输入、HUD 与主循环
│   ├── constants.js # 共享常量、武器与队伍辅助函数
│   ├── scene.js     # Three.js 场景、渲染器与碰撞基础设施
│   └── assets.js    # GLB 加载、缓存与资源释放
├── server.js        # npm start 兼容入口，加载 server/index.js
├── server/
│   ├── index.js     # HTTP/WebSocket 组装、连接与更新循环
│   ├── maps.js      # 地图配置与地图 ID 归一化
│   ├── rooms.js     # 房间状态、回合与出生逻辑
│   ├── snapshots.js # 状态快照、比分与计分板
│   ├── staticFiles.js # 静态文件服务
│   └── combat.js    # 命中、击杀与复活
├── models/          # 角色 / 枪械 / 场景 GLB
├── package.json
└── README.md
```

## 说明

- Three.js 通过 CDN 加载，首次打开需要可访问 CDN
- 当前为学习/原型项目，不包含完整反作弊
- 公网部署前建议补：服务端权威移动校验、更严射击判定、身份认证
