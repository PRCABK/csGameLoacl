import * as THREE from 'three';
import { PALETTE } from './constants.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.skyCool);
scene.fog = new THREE.Fog(0xd7e6f0, 32, 78);

export const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, .1, 100);
camera.rotation.order = 'YXZ';

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.prepend(renderer.domElement);

// ---------- 电影感光照：主光 + 环境 + 补光 + 轮廓光 ----------
export const ambient = new THREE.AmbientLight(0xffffff, .52);
export const hemi = new THREE.HemisphereLight(0xfff1df, 0x6b7c8a, .82);
export const sun = new THREE.DirectionalLight(0xffe2c0, 1.75);
sun.position.set(14, 28, 12);
sun.castShadow = true;
// 阴影分辨率过高会周期性卡顿，体感像“视角刷新”
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 2;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -28;
sun.shadow.camera.right = 28;
sun.shadow.camera.top = 28;
sun.shadow.camera.bottom = -28;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
export const fill = new THREE.DirectionalLight(0xa9cbff, .42);
fill.position.set(-16, 12, -10);
export const rim = new THREE.DirectionalLight(0x8ed8ff, .32);
rim.position.set(2, 10, -18);
scene.add(ambient, hemi, sun, fill, rim);

// 材质分级：地面粗糙、墙体哑光、金属中反光、木头高粗糙
export function makeMat(color, style = 'wall') {
  const presets = {
    ground: { metalness: .02, roughness: .96 },
    wall: { metalness: .06, roughness: .88 },
    sand: { metalness: .01, roughness: .97 },
    metal: { metalness: .58, roughness: .36 },
    wood: { metalness: .03, roughness: .92 },
    accent: { metalness: .18, roughness: .48, emissive: color, emissiveIntensity: .12 },
  };
  const p = presets[style] || presets.wall;
  return new THREE.MeshStandardMaterial({
    color,
    metalness: p.metalness,
    roughness: p.roughness,
    emissive: p.emissive || 0x000000,
    emissiveIntensity: p.emissiveIntensity || 0,
  });
}

export const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), makeMat(PALETTE.concrete, 'ground'));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

export const grid = new THREE.GridHelper(50, 50, 0x6f8ea3, 0xb7c9d6);
grid.position.y = .015;
grid.material.transparent = true;
grid.material.opacity = .35;
scene.add(grid);

export const walls = []; // {x,z,w,d,h,climbable}

export function box(x, z, w, d, h = 3, color = PALETTE.concrete, collision = true, style = 'wall', climbable = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), makeMat(color, style));
  m.position.set(x, h / 2, z);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  if (collision) walls.push({ x, z, w, d, h, climbable: !!climbable });
  return m;
}
