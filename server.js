const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const root = __dirname;
const ROUND_SECONDS = 600;
const DAMAGE = 34;
const RESPAWN_MS = 3000;

// 地图配置：死斗出生点 + 团队红/蓝两侧出生点
const MAPS = {
  neon_dock: {
    id: 'neon_dock',
    name: '霓虹码头',
    dm: [[-14, -10], [14, 10], [-14, 10], [14, -10], [0, -18], [0, 18]],
    red: [[-16, -10], [-16, 0], [-16, 10], [-12, -14], [-12, 14]],
    blue: [[16, -10], [16, 0], [16, 10], [12, -14], [12, 14]],
  },
  dust2: {
    id: 'dust2',
    name: '炽热沙城',
    dm: [[-16, -12], [16, 12], [-16, 12], [16, -12], [0, 0], [0, 18], [0, -18]],
    red: [[-18, -12], [-18, 0], [-18, 12], [-12, -16], [-14, 16]],
    blue: [[18, -12], [18, 0], [18, 12], [12, 16], [14, -16]],
  },
  town: {
    id: 'town',
    name: '风情小镇',
    dm: [[-12, -14], [12, 14], [-12, 14], [12, -14], [0, -8], [0, 10]],
    red: [[-18, -8], [-18, 2], [-18, 12], [-12, -16]],
    blue: [[18, -8], [18, 2], [18, 12], [12, 16]],
  },
  warehouse: {
    id: 'warehouse',
    name: '货运仓库',
    dm: [[-10, -10], [10, 10], [-10, 10], [10, -10], [0, 16], [0, -16]],
    red: [[-18, -6], [-18, 6], [-14, -14], [-14, 14]],
    blue: [[18, -6], [18, 6], [14, -14], [14, 14]],
  },
};
const DEFAULT_MAP = 'neon_dock';

// 房间 key = mode:map；无人时自动删除
const rooms = new Map();
let nextId = 1;

function roomKey(mode, mapId) {
  return `${mode}:${mapId}`;
}

function normalizeMapId(mapId) {
  return MAPS[mapId] ? mapId : DEFAULT_MAP;
}

function createRoom(mode, mapId) {
  return {
    mode, // 'dm' | 'tdm'
    mapId,
    players: new Map(),
    sockets: new Map(),
    startedAt: Date.now(),
    roundEnded: false,
  };
}

function getOrCreateRoom(mode, mapId) {
  const key = roomKey(mode, mapId);
  if (!rooms.has(key)) rooms.set(key, createRoom(mode, mapId));
  return rooms.get(key);
}

function startRound(room) {
  room.startedAt = Date.now();
  room.roundEnded = false;
  for (const p of room.players.values()) {
    p.kills = 0;
    p.deaths = 0;
    p.health = 100;
    if (p.dead) {
      p.dead = false;
      spawn(room, p);
      roomBroadcast(room, { type: 'respawn', victim: p.id, x: p.x, y: p.y, z: p.z });
    }
  }
}

function spawn(room, player) {
  const map = MAPS[room.mapId] || MAPS[DEFAULT_MAP];
  let points = map.dm;
  if (room.mode === 'tdm') points = player.team === 'red' ? map.red : map.blue;
  const point = points[Math.floor(Math.random() * points.length)];
  player.x = point[0];
  player.y = 1.6;
  player.z = point[1];
  player.crouching = false;
}

function teamScores(room) {
  let red = 0, blue = 0;
  for (const p of room.players.values()) {
    if (p.team === 'red') red += p.kills;
    else if (p.team === 'blue') blue += p.kills;
  }
  return { red, blue };
}

function scoreboard(room) {
  const list = [...room.players.values()]
    .map(({ id, name, team, kills, deaths }) => ({ id, name, team, kills, deaths }))
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  if (room.mode === 'tdm') {
    return {
      red: list.filter(p => p.team === 'red'),
      blue: list.filter(p => p.team === 'blue'),
    };
  }
  return { all: list };
}

function snapshot(room) {
  return {
    type: 'state',
    mode: room.mode,
    mapId: room.mapId,
    mapName: (MAPS[room.mapId] || MAPS[DEFAULT_MAP]).name,
    players: [...room.players.values()].map(({ id, name, team, x, y, z, yaw, pitch, health, dead, crouching, kills, deaths }) => ({
      id, name, team, x, y, z, yaw, pitch, health, dead, crouching, kills, deaths,
    })),
    leaderboard: [...room.players.values()].sort((a, b) => b.kills - a.kills).slice(0, 5).map(({ id, name, team, kills }) => ({ id, name, team, kills })),
    teamScores: room.mode === 'tdm' ? teamScores(room) : null,
    scoreboard: scoreboard(room),
    time: room.roundEnded ? 0 : Math.max(0, ROUND_SECONDS - Math.floor((Date.now() - room.startedAt) / 1000)),
    roundEnded: room.roundEnded,
  };
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  const safe = path.normalize(file).replace(/^([.][.][/\\])+/, '');
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.glb': 'model/gltf-binary',
    '.obj': 'text/plain',
    '.mtl': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  };
  fs.readFile(path.join(root, safe), (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(safe)] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });
function send(ws, data) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
function roomBroadcast(room, data) {
  for (const ws of room.sockets.values()) send(ws, data);
}

wss.on('connection', ws => {
  const id = String(nextId++);
  let player = null;
  let room = null;

  ws.on('message', raw => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    if (data.type === 'join' && !player) {
      const mode = data.mode === 'tdm' ? 'tdm' : 'dm';
      const mapId = normalizeMapId(data.map);
      let team = null;
      if (mode === 'tdm') team = data.team === 'blue' ? 'blue' : 'red';

      room = getOrCreateRoom(mode, mapId);
      if (room.roundEnded) startRound(room);

      player = {
        id,
        name: String(data.name || 'Rookie').slice(0, 14),
        team,
        x: 0, y: 1.6, z: 0,
        yaw: 0, pitch: 0,
        health: 100,
        dead: false,
        crouching: false,
        kills: 0,
        deaths: 0,
        deathId: 0,
      };
      spawn(room, player);
      room.players.set(id, player);
      room.sockets.set(id, ws);

      send(ws, {
        type: 'welcome',
        id,
        mode: room.mode,
        mapId: room.mapId,
        mapName: MAPS[room.mapId].name,
        team: player.team,
        x: player.x,
        y: player.y,
        z: player.z,
      });
      const teamText = mode === 'tdm' ? `（${team === 'red' ? '红方' : '蓝方'}）` : '';
      roomBroadcast(room, {
        type: 'feed',
        text: `${player.name}${teamText} 加入了${MAPS[room.mapId].name}·${mode === 'tdm' ? '团队竞技' : '死斗'}`,
      });
      return;
    }

    if (!player || !room || player.dead || room.roundEnded) return;

    if (data.type === 'move') {
      player.x = Math.max(-22, Math.min(22, data.x));
      player.y = Math.max(1.0, Math.min(4.5, data.y));
      player.z = Math.max(-22, Math.min(22, data.z));
      player.yaw = data.yaw;
      player.pitch = data.pitch;
      player.crouching = !!data.crouching;
    }

    if (data.type === 'shoot') {
      const victim = room.players.get(data.target);
      if (!victim || victim.dead || victim.id === player.id) return;
      if (room.mode === 'tdm' && player.team && player.team === victim.team) return;

      victim.health -= DAMAGE;
      roomBroadcast(room, { type: 'hit', victim: victim.id });
      if (victim.health <= 0) {
        // 已死亡则忽略，防止重复 kill/respawn 定时器导致误传送
        if (victim.dead) return;
        victim.dead = true;
        victim.deathId = (victim.deathId || 0) + 1;
        const deathId = victim.deathId;
        victim.deaths++;
        player.kills++;
        roomBroadcast(room, {
          type: 'kill',
          killer: player.id,
          killerName: player.name,
          killerTeam: player.team,
          victim: victim.id,
          victimName: victim.name,
          victimTeam: victim.team,
        });
        // 清理旧定时器，保证每次死亡只有一个复活任务
        if (victim.respawnTimer) {
          clearTimeout(victim.respawnTimer);
          victim.respawnTimer = null;
        }
        victim.respawnTimer = setTimeout(() => {
          victim.respawnTimer = null;
          if (!room.players.has(victim.id) || room.roundEnded) return;
          if (!victim.dead || victim.deathId !== deathId) return;
          victim.dead = false;
          victim.health = 100;
          spawn(room, victim);
          roomBroadcast(room, {
            type: 'respawn',
            victim: victim.id,
            x: victim.x,
            y: victim.y,
            z: victim.z,
            deathId,
          });
        }, RESPAWN_MS);
      }
    }
  });

  ws.on('close', () => {
    if (!player || !room) return;
    if (player.respawnTimer) {
      clearTimeout(player.respawnTimer);
      player.respawnTimer = null;
    }
    room.players.delete(id);
    room.sockets.delete(id);
    roomBroadcast(room, { type: 'feed', text: `${player.name} 离开了战区` });
    if (room.players.size === 0) {
      rooms.delete(roomKey(room.mode, room.mapId));
    }
    player = null;
    room = null;
  });
});

setInterval(() => {
  for (const room of rooms.values()) {
    if (!room.roundEnded && room.players.size > 0 && Date.now() - room.startedAt >= ROUND_SECONDS * 1000) {
      room.roundEnded = true;
      let winnerText = '无人';
      let kills = 0;
      if (room.mode === 'tdm') {
        const scores = teamScores(room);
        if (scores.red === scores.blue) winnerText = `平局 ${scores.red}:${scores.blue}`;
        else if (scores.red > scores.blue) { winnerText = `红方`; kills = scores.red; }
        else { winnerText = `蓝方`; kills = scores.blue; }
        roomBroadcast(room, { type: 'roundEnd', mode: 'tdm', winner: winnerText, kills, teamScores: scores });
      } else {
        const winner = [...room.players.values()].sort((a, b) => b.kills - a.kills)[0];
        winnerText = winner ? winner.name : '无人';
        kills = winner ? winner.kills : 0;
        roomBroadcast(room, { type: 'roundEnd', mode: 'dm', winner: winnerText, kills });
      }
    }
    roomBroadcast(room, snapshot(room));
  }
}, 50);

server.listen(process.env.PORT || 3000, () => console.log('NEON STRIKE running at http://localhost:3000'));
