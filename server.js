const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const root = __dirname;
const players = new Map();
const spawnPoints = [[-14, -10], [14, 10], [-14, 10], [14, -10], [0, -18], [0, 18]];
let nextId = 1, startedAt = Date.now();

const server = http.createServer((req, res) => {
  const file = req.url === '/' ? 'index.html' : req.url.slice(1);
  const safe = path.normalize(file).replace(/^([.][.][/\\])+/, '');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
  fs.readFile(path.join(root, safe), (err, data) => { if (err) { res.writeHead(404); res.end('Not found'); return; } res.writeHead(200, { 'Content-Type': types[path.extname(safe)] || 'application/octet-stream' }); res.end(data); });
});
const wss = new WebSocket.Server({ server });
function send(ws, data) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
function broadcast(data) { for (const ws of wss.clients) send(ws, data); }
function spawn(player) { const point = spawnPoints[Math.floor(Math.random() * spawnPoints.length)]; player.x = point[0]; player.y = 1.6; player.z = point[1]; player.crouching = false; }
function snapshot() { return { type: 'state', players: [...players.values()].map(({ id, name, x, y, z, yaw, pitch, health, dead, crouching, kills }) => ({ id, name, x, y, z, yaw, pitch, health, dead, crouching, kills })), leaderboard: [...players.values()].sort((a, b) => b.kills - a.kills).slice(0, 5).map(({ id, name, kills }) => ({ id, name, kills })), time: Math.max(0, 600 - Math.floor((Date.now() - startedAt) / 1000)) }; }
wss.on('connection', ws => {
  const id = String(nextId++); let player;
  ws.on('message', raw => { let data; try { data = JSON.parse(raw); } catch { return; }
    if (data.type === 'join' && !player) { player = { id, name: String(data.name || 'Rookie').slice(0, 14), x: 0, y: 1.6, z: 0, yaw: 0, pitch: 0, health: 100, dead: false, crouching: false, kills: 0 }; spawn(player); players.set(id, player); send(ws, { type: 'welcome', id, x: player.x, z: player.z }); broadcast({ type: 'feed', text: `${player.name} 加入了死斗战区` }); }
    if (!player || player.dead) return;
    if (data.type === 'move') { player.x = Math.max(-22, Math.min(22, data.x)); player.y = Math.max(1.0, Math.min(4.5, data.y)); player.z = Math.max(-22, Math.min(22, data.z)); player.yaw = data.yaw; player.pitch = data.pitch; player.crouching = !!data.crouching; }
    if (data.type === 'shoot') { const victim = players.get(data.target); if (!victim || victim.dead || victim.id === player.id) return; victim.health -= 34; broadcast({ type: 'hit', victim: victim.id }); if (victim.health <= 0) { victim.dead = true; player.kills++; broadcast({ type: 'kill', killer: player.id, killerName: player.name, victim: victim.id, victimName: victim.name }); setTimeout(() => { if (players.has(victim.id)) { victim.dead = false; victim.health = 100; spawn(victim); } }, 3000); } }
  });
  ws.on('close', () => { if (player) { players.delete(id); broadcast({ type: 'feed', text: `${player.name} 离开了战区` }); } });
});
setInterval(() => { if (Date.now() - startedAt > 600000) { startedAt = Date.now(); players.forEach(player => { player.kills = 0; }); } broadcast(snapshot()); }, 50);
server.listen(process.env.PORT || 3000, () => console.log('NEON STRIKE running at http://localhost:3000'));
