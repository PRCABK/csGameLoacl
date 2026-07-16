const { spawn } = require('./rooms.js');

const DAMAGE = 34;
const RESPAWN_MS = 3000;

function handleShoot(room, player, data, roomBroadcast) {
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

module.exports = { handleShoot };
