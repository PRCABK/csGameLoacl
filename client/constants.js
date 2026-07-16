export const PALETTE = {
  accent: 0x33e6e2,
  warn: 0xf3c945,
  red: 0xff5a6e,
  blue: 0x4aa7ff,
  concrete: 0x9aa8b4,
  concreteDark: 0x7f8d98,
  metal: 0x6d7f8c,
  metalDark: 0x556672,
  wood: 0xc48a4a,
  sand: 0xd6b87a,
  sandDark: 0xb8955a,
  sandWall: 0xc9a66f,
  dock: 0x87a0b2,
  town: 0xb9c7d2,
  townRoof: 0x8fa3b2,
  warehouse: 0x7b8894,
  skyCool: 0xc9dff0,
  skyWarm: 0xedd7a8,
  skySoft: 0xd5e7f4,
  skyGray: 0xb8c5cf,
};

export const standingHeight = 1.6;
export const crouchingHeight = 1.05;
export const gravity = 17;
export const jumpSpeed = 6.3;
export const REMOTE_SMOOTHING = .35;
export const MAP_HALF = 25;
export const RADAR_RANGE = 28;
export const SPOT_DURATION = 2500;
export const SPOT_FOV = .85;
export const SPOT_MAX_DIST = 38;
export const FIRE_REVEAL_MS = 2200;

export const WEAPONS = [
  { id: 'sniper', name: 'SNIPER', url: 'models/sniper.glb', length: 0.95, flip: true },
  { id: 'ar', name: 'SCIFI AR', url: 'models/scifi_assault_rifle.glb', length: 0.9, flip: false },
];

export function teamColor(team, fallback = PALETTE.accent) {
  if (team === 'red') return PALETTE.red;
  if (team === 'blue') return PALETTE.blue;
  return fallback;
}

export function teamLabel(team) {
  if (team === 'red') return '红';
  if (team === 'blue') return '蓝';
  return '';
}
