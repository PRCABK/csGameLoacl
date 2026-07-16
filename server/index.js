const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const { handleShoot } = require('./combat.js');
const { MAPS, normalizeMapId } = require('./maps.js');
const { getOrCreateRoom, roomKey, rooms, spawn, startRound } = require('./rooms.js');
const { ROUND_SECONDS, snapshot, teamScores } = require('./snapshots.js');
const { createStaticFileHandler } = require('./staticFiles.js');

const root = path.join(__dirname, '..');
let nextId = 1;

const server = http.createServer(createStaticFileHandler(root));
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
      if (room.roundEnded) startRound(room, roomBroadcast);

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

    if (data.type === 'shoot') handleShoot(room, player, data, roomBroadcast);
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
    if (room.players.size === 0) rooms.delete(roomKey(room.mode, room.mapId));
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
