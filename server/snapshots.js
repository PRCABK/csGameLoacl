const { DEFAULT_MAP, MAPS } = require('./maps.js');

const ROUND_SECONDS = 600;

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

module.exports = { ROUND_SECONDS, snapshot, teamScores };
