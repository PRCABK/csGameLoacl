const { DEFAULT_MAP, MAPS } = require('./maps.js');

// 房间 key = mode:map；无人时自动删除
const rooms = new Map();

function roomKey(mode, mapId) {
  return `${mode}:${mapId}`;
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

function startRound(room, roomBroadcast) {
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

module.exports = { getOrCreateRoom, roomKey, rooms, spawn, startRound };
