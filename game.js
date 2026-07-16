import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

// ---------- 统一调色板（低模卡通写实） ----------
const PALETTE = {
  accent: 0x33e6e2,
  warn: 0xf3c945,
  red: 0xff5a6e,
  blue: 0x4aa7ff,
  ink: 0x243140,
  concrete: 0x9aa8b4,
  concreteDark: 0x7f8d98,
  metal: 0x6d7f8c,
  metalDark: 0x556672,
  wood: 0xc48a4a,
  woodDark: 0x9a6a36,
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

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.skyCool);
scene.fog = new THREE.Fog(0xd7e6f0, 32, 78);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, .1, 100); camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.prepend(renderer.domElement);

// ---------- 电影感光照：主光 + 环境 + 补光 + 轮廓光 ----------
const ambient = new THREE.AmbientLight(0xffffff, .52);
const hemi = new THREE.HemisphereLight(0xfff1df, 0x6b7c8a, .82);
const sun = new THREE.DirectionalLight(0xffe2c0, 1.75);
sun.position.set(14, 28, 12);
sun.castShadow = true;
// 阴影分辨率过高会周期性卡顿，体感像“视角刷新”
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 2; sun.shadow.camera.far = 80;
sun.shadow.camera.left = -28; sun.shadow.camera.right = 28;
sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -28;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
const fill = new THREE.DirectionalLight(0xa9cbff, .42);
fill.position.set(-16, 12, -10);
const rim = new THREE.DirectionalLight(0x8ed8ff, .32);
rim.position.set(2, 10, -18);
scene.add(ambient, hemi, sun, fill, rim);

// 材质分级：地面粗糙、墙体哑光、金属中反光、木头高粗糙
function makeMat(color, style = 'wall') {
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

const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), makeMat(PALETTE.concrete, 'ground'));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(50, 50, 0x6f8ea3, 0xb7c9d6);
grid.position.y = .015; grid.material.transparent = true; grid.material.opacity = .35; scene.add(grid);

const walls = []; // {x,z,w,d,h,climbable}
function box(x, z, w, d, h = 3, color = PALETTE.concrete, collision = true, style = 'wall', climbable = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), makeMat(color, style));
  m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  // 默认可碰撞但不可站立，避免贴墙时镜头被当成平台反复抬升
  if (collision) walls.push({ x, z, w, d, h, climbable: !!climbable });
  return m;
}

// ---------- GLB 模型加载 ----------
const gltfLoader = new GLTFLoader();
const modelCache = new Map();

function loadGltf(url) {
  if (!modelCache.has(url)) {
    modelCache.set(url, new Promise(resolve => {
      gltfLoader.load(url, gltf => resolve(gltf), undefined, err => {
        console.error('模型加载失败', url, err);
        resolve(null);
      });
    }));
  }
  return modelCache.get(url);
}

// 规范化静态道具：缩放到目标高度、底面贴地、XZ 居中
function normalizeProp(root, targetHeight, longAxisToZ = false) {
  const wrapper = new THREE.Group();
  wrapper.add(root);

  let box3 = new THREE.Box3().setFromObject(wrapper);
  const size = box3.getSize(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 1e-6);
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);

  box3 = new THREE.Box3().setFromObject(wrapper);
  const center = box3.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box3.min.y;
  root.updateMatrixWorld(true);

  if (longAxisToZ) {
    box3 = new THREE.Box3().setFromObject(wrapper);
    const s = box3.getSize(new THREE.Vector3());
    // 若当前 X 方向更长，则旋转 90°，让长边朝 Z
    if (s.x > s.z) {
      wrapper.rotation.y = Math.PI / 2;
      wrapper.updateMatrixWorld(true);
      // 旋转后再次贴地居中
      box3 = new THREE.Box3().setFromObject(wrapper);
      const c = box3.getCenter(new THREE.Vector3());
      wrapper.position.x -= c.x;
      wrapper.position.z -= c.z;
      wrapper.position.y -= box3.min.y;
    }
  }

  wrapper.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.castShadow = mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach(mat => {
      if (!mat) return;
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
    });
  });
  return wrapper;
}

let containerTemplatePromise = null;
function loadContainerTemplate() {
  if (!containerTemplatePromise) {
    containerTemplatePromise = loadGltf('models/shipping_container.glb').then(gltf => {
      if (!gltf) return null;
      return normalizeProp(gltf.scene, 2.55, true);
    });
  }
  return containerTemplatePromise;
}

let crateTemplatePromise = null;
function loadCrateTemplate() {
  if (!crateTemplatePromise) {
    crateTemplatePromise = loadGltf('models/box.glb').then(gltf => {
      if (!gltf) return null;
      return normalizeProp(gltf.scene, 1.15, false);
    });
  }
  return crateTemplatePromise;
}

// 角色模板：Generic Male（Idle/Walk/Sprint/Jump）
// 模型自身朝向与游戏 yaw 差 180°，挂载时用子节点偏移
const SOLDIER_YAW_OFFSET = Math.PI;
let soldierTemplate = null, soldierAnimations = null, soldierReady = false;
loadGltf('models/generic_male.glb').then(gltf => {
  if (!gltf) return;
  const root = gltf.scene;
  // 高度约 1.85m，底面贴地
  let box3 = new THREE.Box3().setFromObject(root);
  const size = box3.getSize(new THREE.Vector3());
  const scale = 1.85 / Math.max(size.y, 1e-6);
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  box3 = new THREE.Box3().setFromObject(root);
  const center = box3.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box3.min.y;
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.castShadow = mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach(mat => {
      if (!mat) return;
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      // 卡通写实：略提饱和与对比，降低过灰
      if (mat.color) mat.color.offsetHSL(0, .04, .03);
      mat.roughness = Math.min(.92, (mat.roughness ?? .7) + .05);
    });
  });
  soldierTemplate = root;
  soldierAnimations = gltf.animations || [];
  soldierReady = true;
});

function buildContainerFallback(color = 0x177e9d) {
  const group = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.55, 6), makeMat(color, 'metal'));
  m.position.y = 1.275; m.castShadow = m.receiveShadow = true; group.add(m);
  return group;
}

function buildCrateFallback(size = 1.15) {
  const group = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), makeMat(PALETTE.wood, 'wood'));
  m.position.y = size / 2; m.castShadow = m.receiveShadow = true; group.add(m);
  // 金属包边增强层次
  const rim = new THREE.Mesh(new THREE.BoxGeometry(size + .02, .08, size + .02), makeMat(PALETTE.metalDark, 'metal'));
  rim.position.y = size; group.add(rim);
  return group;
}

// 阵营着色：让第三人称角色更易辨识
function tintTeamModel(root, team) {
  if (!root || !team) return;
  const teamColor = new THREE.Color(team === 'red' ? PALETTE.red : PALETTE.blue);
  root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = mats.map(mat => {
      const c = mat.clone();
      if (c.color) c.color.lerp(teamColor, .38);
      c.emissive = teamColor.clone();
      c.emissiveIntensity = .08;
      return c;
    });
    mesh.material = Array.isArray(mesh.material) ? next : next[0];
  });
}

// placeContainer / placeCrate 在地图系统中覆盖定义（带 map token 与 climbable）

// 卡通招牌（弱霓虹，偏可读）
function neonSign(text, x = 0, z = -23.43, accent = '#33e6e2') {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 180;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '800 100px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.shadowColor = accent; context.shadowBlur = 18;
  context.strokeStyle = accent; context.lineWidth = 5; context.strokeText(text, 512, 92);
  context.fillStyle = '#ffffff'; context.fillText(text, 512, 92);
  const material = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, side: THREE.DoubleSide });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.8), material);
  sign.position.set(x, 3.1, z); scene.add(sign); trackMapObject(sign);
}

// 主题道具：少而精
function propStripe(x, z, w, d, color = PALETTE.warn) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, .03, d), makeMat(color, 'accent'));
  m.position.set(x, .02, z); m.receiveShadow = true; scene.add(m); trackMapObject(m);
}
function propBarrier(x, z, rot = 0, color = PALETTE.metal) {
  const g = new THREE.Group();
  const rail = new THREE.Mesh(new THREE.BoxGeometry(2.4, .12, .12), makeMat(color, 'metal'));
  rail.position.y = .75; g.add(rail);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(.12, .75, .12), makeMat(PALETTE.metalDark, 'metal'));
  legL.position.set(-1, .375, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 1; g.add(legR);
  g.position.set(x, 0, z); g.rotation.y = rot;
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  scene.add(g); trackMapObject(g);
}
function propLamp(x, z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 3.2, 8), makeMat(PALETTE.metalDark, 'metal'));
  pole.position.y = 1.6; g.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.45, .12, .25), makeMat(PALETTE.metal, 'metal'));
  head.position.set(.15, 3.15, 0); g.add(head);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfff1c2, emissive: 0xffd27a, emissiveIntensity: 1.1 }));
  bulb.position.set(.15, 3.02, 0); g.add(bulb);
  const light = new THREE.PointLight(0xffe0a0, .55, 8); light.position.set(.15, 3.0, 0); g.add(light);
  g.position.set(x, 0, z);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g); trackMapObject(g);
}
function propSandbag(x, z, rot = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(1.1, .32, .55), makeMat(PALETTE.sandDark, 'sand'));
    bag.position.set((i - 1) * .05, .16 + i * .3, 0);
    bag.rotation.y = (i - 1) * .05;
    g.add(bag);
  }
  g.position.set(x, 0, z); g.rotation.y = rot;
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  scene.add(g); trackMapObject(g);
}
function propPallet(x, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.3, .14, 1.3), makeMat(PALETTE.wood, 'wood'));
  m.position.set(x, .07, z); m.castShadow = m.receiveShadow = true; scene.add(m); trackMapObject(m);
}

// 地图主题：地面 / 天空 / 雾 / 光照冷暖
function applyMapTheme(theme) {
  scene.background = new THREE.Color(theme.bg);
  scene.fog = new THREE.Fog(theme.fog, theme.fogNear || 30, theme.fogFar || 78);
  floor.material.color.setHex(theme.floor);
  floor.material.roughness = theme.floorRough ?? .96;
  floor.material.metalness = theme.floorMetal ?? .02;
  // 光照冷暖随地图变化
  sun.color.setHex(theme.sun || 0xffe2c0);
  sun.intensity = theme.sunIntensity || 1.75;
  fill.color.setHex(theme.fill || 0xa9cbff);
  fill.intensity = theme.fillIntensity || .42;
  hemi.color.setHex(theme.hemiSky || 0xfff1df);
  hemi.groundColor.setHex(theme.hemiGround || 0x6b7c8a);
  ambient.intensity = theme.ambient ?? .52;
  grid.visible = theme.showGrid !== false;
  if (grid.material) {
    grid.material.color?.setHex?.(theme.gridMain || 0x6f8ea3);
    if (Array.isArray(grid.material)) {
      grid.material[0].color.setHex(theme.gridMain || 0x6f8ea3);
      grid.material[1].color.setHex(theme.gridSub || 0xb7c9d6);
    }
  }
}

const mapProps = []; // 可清理的场景装饰
let mapBuildToken = 0; // 地图加载代数：丢弃过期异步模型回调

function trackMapObject(obj) {
  if (!obj) return;
  obj.userData.mapProp = true;
  mapProps.push(obj);
}

function disposeObject(obj) {
  scene.remove(obj);
  obj.traverse?.(child => {
    if (child.geometry) child.geometry.dispose?.();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => {
        if (!m) return;
        if (m.map) m.map.dispose?.();
        m.dispose?.();
      });
    }
  });
}

function clearMap() {
  mapBuildToken++; // 使旧地图的异步加载失效
  walls.length = 0;
  while (mapProps.length) disposeObject(mapProps.pop());
  // 双保险：扫一遍场景，清掉漏网的地图物体（含异步晚到的）
  const leftovers = scene.children.filter(c => c.userData?.mapProp);
  leftovers.forEach(disposeObject);
}

// 给 box 增强：追踪可清理 mesh + 材质风格
const _box = box;
function boxTracked(x, z, w, d, h = 3, color = PALETTE.concrete, collision = true, style = 'wall') {
  const before = scene.children.length;
  _box(x, z, w, d, h, color, collision, style);
  for (let i = before; i < scene.children.length; i++) trackMapObject(scene.children[i]);
}

// 异步模型：仅当前地图代数有效才加入场景
function placeContainer(x, z, rotation = 0, color = 0x177e9d, stacked = false) {
  const y = stacked ? 2.55 : 0;
  const token = mapBuildToken;
  loadContainerTemplate().then(template => {
    if (token !== mapBuildToken) return; // 地图已切换，丢弃
    const model = template ? template.clone(true) : buildContainerFallback(color);
    model.traverse(mesh => {
      if (!mesh.isMesh || !mesh.material) return;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(m => {
          const c = m.clone();
          if (c.color) c.color.lerp(new THREE.Color(color), .3);
          return c;
        });
      } else {
        mesh.material = mesh.material.clone();
        if (mesh.material.color) mesh.material.color.lerp(new THREE.Color(color), .3);
      }
    });
    model.position.set(x, y, z);
    model.rotation.y = rotation;
    model.userData.mapProp = true;
    scene.add(model);
    // 再次确认代数，防止 then 中途切图
    if (token !== mapBuildToken) { disposeObject(model); return; }
    mapProps.push(model);
  });
  const rawW = 2.5, rawD = 6;
  const w = Math.abs(Math.cos(rotation)) * rawW + Math.abs(Math.sin(rotation)) * rawD;
  const d = Math.abs(Math.sin(rotation)) * rawW + Math.abs(Math.cos(rotation)) * rawD;
  // 集装箱可碰撞、不可站立（防镜头被抬上箱顶）
  walls.push({ x, z, w, d, h: stacked ? 5.1 : 2.55, climbable: false });
}
function placeCrate(x, z, height = 1.15) {
  const token = mapBuildToken;
  loadCrateTemplate().then(template => {
    if (token !== mapBuildToken) return;
    const model = template ? template.clone(true) : buildCrateFallback(1.15);
    model.position.set(x, 0, z);
    if (height !== 1.15) model.scale.y *= height / 1.15;
    model.userData.mapProp = true;
    scene.add(model);
    if (token !== mapBuildToken) { disposeObject(model); return; }
    mapProps.push(model);
  });
  // 木箱允许攀爬
  walls.push({ x, z, w: 1.15, d: 1.15, h: height, climbable: true });
}

function buildMap_neon_dock() {
  applyMapTheme({
    bg: PALETTE.skyCool, fog: 0xd2e4f1, floor: PALETTE.dock,
    sun: 0xffe7cc, fill: 0x9ec6ff, ambient: .5, showGrid: true,
  });
  // 边界墙：深色描边，提升掩体可读性
  boxTracked(0, -24, 50, 1, 5, PALETTE.concreteDark); boxTracked(0, 24, 50, 1, 5, PALETTE.concreteDark);
  boxTracked(-24, 0, 1, 50, 5, PALETTE.concreteDark); boxTracked(24, 0, 1, 50, 5, PALETTE.concreteDark);
  // 主题：少量集装箱 + 路障/灯，不堆满
  placeContainer(-10, -6, 0, 0x2a7f9e);
  placeContainer(10, 6, Math.PI / 2, 0xc45b4a);
  placeContainer(0, 12, 0, 0x4f6f82);
  placeCrate(-7.8, -6, 1.15); placeCrate(8, 3.8, 1.15);
  propBarrier(-2, -2, Math.PI / 5); propBarrier(3, 5, -Math.PI / 4);
  propLamp(-14, -14); propLamp(14, 14);
  propStripe(0, 0, 6, .35, PALETTE.accent);
  neonSign('烟台分队');
}

// 炽热沙城：中路 + 双通道，主题道具=沙袋/矮墙
function buildMap_dust2() {
  applyMapTheme({
    bg: PALETTE.skyWarm, fog: 0xead4a4, floor: PALETTE.sand,
    floorRough: .98, sun: 0xffd19a, fill: 0xffc9a0, fillIntensity: .28,
    hemiSky: 0xffe4b8, hemiGround: 0x8a7350, ambient: .46, showGrid: false,
    fogNear: 28, fogFar: 74,
  });
  boxTracked(0, -24, 50, 1, 5, PALETTE.sandDark, true, 'sand');
  boxTracked(0, 24, 50, 1, 5, PALETTE.sandDark, true, 'sand');
  boxTracked(-24, 0, 1, 50, 5, PALETTE.sandDark, true, 'sand');
  boxTracked(24, 0, 1, 50, 5, PALETTE.sandDark, true, 'sand');
  // 中路分割与两侧建筑（颜色对比更强）
  boxTracked(-3.2, 0, 1.8, 16, 2.6, PALETTE.sandWall, true, 'sand');
  boxTracked(3.2, 0, 1.8, 16, 2.6, PALETTE.sandWall, true, 'sand');
  boxTracked(-13, -11, 8, 2.6, 3.2, 0xddc08a, true, 'sand');
  boxTracked(-16, -5, 2.6, 7, 3.2, PALETTE.sandWall, true, 'sand');
  boxTracked(13, 11, 8, 2.6, 3.2, 0xddc08a, true, 'sand');
  boxTracked(16, 5, 2.6, 7, 3.2, PALETTE.sandWall, true, 'sand');
  // 少量集装箱作为大型掩体
  placeContainer(-8, 9, Math.PI / 2, 0xc27a3a);
  placeContainer(8, -9, Math.PI / 2, 0x9a4d3d);
  propSandbag(-5, -3, .2); propSandbag(5, 3, -.15); propSandbag(0, 12, 0);
  propBarrier(0, -8, 0, PALETTE.sandDark);
  neonSign('DUST II', 0, -23.4, '#e2b15a');
}

// 风情小镇：街巷 + 路灯/条纹，少集装箱
function buildMap_town() {
  applyMapTheme({
    bg: PALETTE.skySoft, fog: 0xdbeaf5, floor: 0x93a0aa,
    sun: 0xffefd2, fill: 0xb7d3ff, ambient: .55, fogNear: 30, fogFar: 76,
  });
  boxTracked(0, -24, 50, 1, 5, PALETTE.concreteDark);
  boxTracked(0, 24, 50, 1, 5, PALETTE.concreteDark);
  boxTracked(-24, 0, 1, 50, 5, PALETTE.concreteDark);
  boxTracked(24, 0, 1, 50, 5, PALETTE.concreteDark);
  // 房屋体块：墙浅顶深，增强轮廓
  boxTracked(-11, -10, 7, 6, 3.6, PALETTE.town);
  boxTracked(-11, 9, 7, 6, 3.6, 0xa9bac7);
  boxTracked(11, -8, 7, 6, 3.6, PALETTE.town);
  boxTracked(11, 10, 7, 6, 3.6, 0xa9bac7);
  boxTracked(0, 0, 4.2, 4.2, 3.2, PALETTE.townRoof);
  // 巷道矮墙
  boxTracked(-4, -16, 10, 1.1, 1.8, PALETTE.concrete);
  boxTracked(4, 16, 10, 1.1, 1.8, PALETTE.concrete);
  boxTracked(-16, 0, 1.1, 8, 1.8, PALETTE.concrete);
  boxTracked(16, 0, 1.1, 8, 1.8, PALETTE.concrete);
  placeCrate(-2, -6, 1.15); placeCrate(2, 6, 1.15);
  propLamp(-8, 0); propLamp(8, 0); propLamp(0, -12);
  propStripe(-11, 0, .4, 10, PALETTE.warn); propStripe(11, 0, .4, 10, PALETTE.accent);
  neonSign('TOWN', 0, -23.4, '#6ec8ff');
}

// 货运仓库：货架走廊 + 少量集装箱 + 栈板
function buildMap_warehouse() {
  applyMapTheme({
    bg: PALETTE.skyGray, fog: 0xc2ced6, floor: PALETTE.warehouse,
    sun: 0xf2f5ff, sunIntensity: 1.35, fill: 0xd7e7ff, fillIntensity: .55,
    hemiSky: 0xeef4ff, hemiGround: 0x667481, ambient: .48, showGrid: true,
    fogNear: 24, fogFar: 70,
  });
  boxTracked(0, -24, 50, 1, 5, PALETTE.metalDark, true, 'metal');
  boxTracked(0, 24, 50, 1, 5, PALETTE.metalDark, true, 'metal');
  boxTracked(-24, 0, 1, 50, 5, PALETTE.metalDark, true, 'metal');
  boxTracked(24, 0, 1, 50, 5, PALETTE.metalDark, true, 'metal');
  // 双排货架墙，形成射击走廊
  boxTracked(-8, 0, 1.3, 24, 3.6, PALETTE.metal, true, 'metal');
  boxTracked(8, 0, 1.3, 24, 3.6, PALETTE.metal, true, 'metal');
  placeContainer(-14, -6, 0, 0x2f6f86);
  placeContainer(14, 6, 0, 0xb85a45);
  placeContainer(0, -12, Math.PI / 2, 0x60727e);
  placeCrate(0, 0, 1.15); placeCrate(-4, 8, 1.15); placeCrate(4, -8, 1.15);
  propPallet(-3, 3); propPallet(3, -3); propPallet(12, 0);
  propStripe(0, 0, 14, .28, PALETTE.warn);
  propLamp(-18, -18); propLamp(18, 18);
  neonSign('WAREHOUSE', 0, -23.4, '#9ad7ff');
}

const MAP_BUILDERS = {
  neon_dock: buildMap_neon_dock,
  dust2: buildMap_dust2,
  town: buildMap_town,
  warehouse: buildMap_warehouse,
};
const MAP_NAMES = {
  neon_dock: '霓虹码头',
  dust2: '炽热沙城',
  town: '风情小镇',
  warehouse: '货运仓库',
};

function loadMap(mapId) {
  clearMap();
  const builder = MAP_BUILDERS[mapId] || MAP_BUILDERS.neon_dock;
  builder();
}

// 不在启动时预建地图，等 welcome 后再 loadMap，避免异步集装箱泄漏到其他地图

const remotes = new Map(), raycaster = new THREE.Raycaster(), keys = {}, velocity = new THREE.Vector3(), effects = [];
const spottedEnemies = new Map(); // id -> 消失时间戳
let socket, myId, joined = false, alive = true, ammo = 30, reloading = false, lastShot = 0, lastNetwork = 0, gunKick = 0, verticalVelocity = 0, sensitivity = 1;
let gameMode = 'dm', myTeam = null, tabHeld = false, selectedMode = 'dm', selectedTeam = 'red', selectedMap = 'neon_dock', currentMapId = 'neon_dock';
let intentionalUnlock = false; // 主动解锁鼠标时，不自动弹暂停
let pendingRespawnTimer = null;
let lastDeathId = 0;
let lastCameraXZ = null;
let ignoreTeleportUntil = 0; // 允许传送的时间窗（welcome/respawn）
let mouseLookReadyAt = 0; // 重新锁鼠后短时间忽略尖峰 movement
const standingHeight = 1.6, crouchingHeight = 1.05, gravity = 17, jumpSpeed = 6.3;
const MAP_HALF = 25, RADAR_RANGE = 28, SPOT_DURATION = 2500, SPOT_FOV = .85, SPOT_MAX_DIST = 38;

// 第一人称武器：复活时随机切换
const gun = new THREE.Group();
const muzzle = new THREE.Object3D();
gun.add(muzzle);
gun.position.set(.28, -.22, -.42);
gun.rotation.set(.02, .08, .02);
camera.add(gun); scene.add(camera);

const WEAPONS = [
  { id: 'sniper', name: 'SNIPER', url: 'models/sniper.glb', length: 0.95, flip: true },
  { id: 'ar', name: 'SCIFI AR', url: 'models/scifi_assault_rifle.glb', length: 0.9, flip: false },
];
const weaponModels = new Map(); // id -> THREE.Object3D
let currentWeaponId = null;
let weaponsReady = false;

function prepareWeaponModel(gltf, length = 0.95, flip = true) {
  const model = gltf.scene.clone(true);
  let box3 = new THREE.Box3().setFromObject(model);
  let size = box3.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z, 1e-6);
  model.scale.setScalar(length / longest);
  model.updateMatrixWorld(true);
  box3 = new THREE.Box3().setFromObject(model);
  size = box3.getSize(new THREE.Vector3());
  // 长边朝向相机前方（-Z）
  if (size.x >= size.z) model.rotation.y = Math.PI / 2;
  if (flip) model.rotation.y += Math.PI;
  model.updateMatrixWorld(true);
  box3 = new THREE.Box3().setFromObject(model);
  const center = box3.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.updateMatrixWorld(true);
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach(mat => {
      if (!mat) return;
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      // 枪械偏金属可读
      mat.metalness = Math.max(mat.metalness ?? .4, .45);
      mat.roughness = Math.min(mat.roughness ?? .5, .55);
    });
  });
  // 记录枪口局部坐标（模型最前端 -Z）
  box3 = new THREE.Box3().setFromObject(model);
  model.userData.muzzleLocal = new THREE.Vector3(0, box3.max.y * .15, box3.min.z);
  return model;
}

function attachFallbackGun() {
  // 清掉旧模型（保留 muzzle）
  [...gun.children].forEach(c => { if (c !== muzzle) gun.remove(c); });
  const gunMetal = new THREE.MeshStandardMaterial({ color: 0x182631, metalness: .85, roughness: .28 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, 1.2), gunMetal);
  body.position.set(0, 0, -.5); gun.add(body);
  muzzle.position.set(0, 0, -1.15);
}

function equipWeapon(weaponId) {
  const def = WEAPONS.find(w => w.id === weaponId) || WEAPONS[0];
  const model = weaponModels.get(def.id);
  // 移除当前枪模
  [...gun.children].forEach(c => { if (c !== muzzle) gun.remove(c); });
  if (!model) { attachFallbackGun(); currentWeaponId = def.id; updateWeaponHud(def); return; }
  gun.add(model);
  const m = model.userData.muzzleLocal || new THREE.Vector3(0, 0, -.8);
  muzzle.position.copy(m);
  currentWeaponId = def.id;
  updateWeaponHud(def);
}

function updateWeaponHud(def) {
  const el = document.querySelector('.weapon');
  if (!el) return;
  const strong = el.querySelector('strong');
  el.innerHTML = `${def.name} <i></i><strong>${strong ? strong.textContent : ammo}</strong><small>/ ∞</small>`;
}

function equipRandomWeapon(excludeCurrent = true) {
  let pool = WEAPONS;
  if (excludeCurrent && currentWeaponId && WEAPONS.length > 1) {
    pool = WEAPONS.filter(w => w.id !== currentWeaponId);
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  equipWeapon(pick.id);
  return pick;
}

// 预加载全部武器
Promise.all(WEAPONS.map(w => loadGltf(w.url).then(gltf => {
  if (gltf) weaponModels.set(w.id, prepareWeaponModel(gltf, w.length, w.flip));
}))).then(() => {
  weaponsReady = true;
  if (!currentWeaponId) equipRandomWeapon(false);
});

const hud = document.querySelector('#hud'), menu = document.querySelector('#menu'), respawn = document.querySelector('#respawn'), endPanel = document.querySelector('#end-panel'), pausePanel = document.querySelector('#pause-panel');
let paused = false;

function openPauseMenu() {
  if (!joined || paused || !endPanel.classList.contains('hidden')) return;
  paused = true;
  intentionalUnlock = true;
  document.exitPointerLock?.();
  pausePanel.classList.remove('hidden');
}
function armMouseLook(delayMs = 120) {
  // 重新获得 pointer lock 后，前几帧 movement 常有异常尖峰
  mouseLookReadyAt = performance.now() + delayMs;
}
function closePauseMenu(resume = true) {
  if (!paused) return;
  paused = false;
  pausePanel.classList.add('hidden');
  if (resume && joined && alive && endPanel.classList.contains('hidden')) {
    intentionalUnlock = false;
    armMouseLook();
    document.body.requestPointerLock();
  }
}
function returnToLobby() {
  // 断开连接并回到开始界面
  try { socket?.close(); } catch {}
  location.reload();
}
document.querySelector('#pause-continue').addEventListener('click', () => closePauseMenu(true));
document.querySelector('#pause-lobby').addEventListener('click', returnToLobby);
const minimap = document.querySelector('#minimap'), minimapCtx = minimap.getContext('2d');

// 昵称标签：纯文字悬浮，无背景框
function nicknameTag(name, team = null) {
  const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 80;
  const context = canvas.getContext('2d');
  context.font = '700 42px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  // 黑描边 + 阵营色字，远距离更可读
  context.lineWidth = 7; context.strokeStyle = 'rgba(0, 0, 0, .72)'; context.strokeText(name, 192, 40);
  context.fillStyle = team === 'red' ? '#ff7a8a' : team === 'blue' ? '#7cbcff' : '#ffffff';
  context.fillText(name, 192, 40);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
  sprite.position.y = 2.5; sprite.scale.set(2.25, .48, 1); return sprite;
}

// 头顶阵营光点：提升敌人/队友辨识
function teamMarker(team) {
  if (!team) return null;
  const color = team === 'red' ? PALETTE.red : PALETTE.blue;
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(.1, 10, 10),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.85, roughness: .35, metalness: .1 })
  );
  m.position.y = 2.15;
  m.castShadow = false;
  return m;
}

// 远端玩家：Generic Male，未加载完时用胶囊体占位
function createPlayerModel(id, name, team = null) {
  const group = new THREE.Group();
  group.add(nicknameTag(name, team)); group.userData.playerId = id; group.userData.team = team;
  const marker = teamMarker(team); if (marker) group.add(marker);
  if (soldierReady && soldierTemplate) attachSoldier(group, id, team);
  else {
    const color = team === 'red' ? PALETTE.red : team === 'blue' ? PALETTE.blue : PALETTE.accent;
    const fallback = new THREE.Mesh(new THREE.CapsuleGeometry(.42, 1.1, 5, 10), makeMat(color, 'wall'));
    fallback.position.y = 1.05; fallback.castShadow = true; fallback.userData.playerId = id;
    group.add(fallback); group.userData.fallback = fallback;
  }
  scene.add(group); return group;
}

function attachSoldier(group, id, team = group.userData.team) {
  if (group.userData.hasSoldier || !soldierTemplate) return;
  if (group.userData.fallback) { group.remove(group.userData.fallback); group.userData.fallback = null; }
  const clone = cloneSkeleton(soldierTemplate);
  clone.traverse(mesh => { if (mesh.isMesh) mesh.userData.playerId = id; });
  tintTeamModel(clone, team);
  // 用固定子节点做朝向偏移，父节点只跟 yaw
  const orient = new THREE.Group();
  orient.rotation.y = SOLDIER_YAW_OFFSET;
  orient.add(clone);
  group.add(orient);
  group.userData.hasSoldier = true;
  group.userData.soldier = clone;
  if (!soldierAnimations?.length) return;
  const mixer = new THREE.AnimationMixer(clone), actions = {};
  soldierAnimations.forEach(clip => {
    const action = mixer.clipAction(clip);
    actions[clip.name] = action;
    const lower = clip.name.toLowerCase();
    if (lower.includes('idle') || lower.includes('grounded') || lower.includes('stand')) {
      // Idle 优先于 Grounded
      if (lower.includes('idle')) actions.Idle = action;
      else actions.Idle = actions.Idle || action;
    }
    if (lower.includes('walk')) actions.Walk = actions.Walk || action;
    if (lower.includes('sprint') || lower.includes('run')) actions.Run = actions.Run || action;
    if (lower.includes('jump')) actions.Jump = actions.Jump || action;
  });
  const base = actions.Idle || actions[Object.keys(actions)[0]];
  if (base) base.play();
  group.userData.mixer = mixer;
  group.userData.actions = actions;
  group.userData.currentAction = base || null;
}

function animateRemote(remote) {
  if (soldierReady) attachSoldier(remote.mesh, remote.data.id, remote.data.team);
  remote.mesh.position.y = remote.data.y - standingHeight + (remote.data.crouching ? -.38 : 0);
  remote.mesh.scale.y = remote.data.crouching ? .77 : 1;

  const actions = remote.mesh.userData.actions;
  if (actions) {
    const walk = actions.Walk || actions.Run;
    const idle = actions.Idle || actions[Object.keys(actions)[0]];
    const currentAction = (remote.walking && walk) ? walk : idle;
    const prevAction = remote.mesh.userData.currentAction;
    if (currentAction && currentAction !== prevAction) {
      if (prevAction) prevAction.fadeOut(.15);
      currentAction.reset().fadeIn(.15).play();
      remote.mesh.userData.currentAction = currentAction;
    }
  }
  const mixer = remote.mesh.userData.mixer;
  if (mixer) mixer.update(.016);
}

function collides(x, z, eyeY) {
  return walls.some(b =>
    x > b.x - b.w / 2 - .45 && x < b.x + b.w / 2 + .45 &&
    z > b.z - b.d / 2 - .45 && z < b.z + b.d / 2 + .45 &&
    eyeY < b.h + 1.1
  );
}
// 暂时禁用站立平台：一律贴地，消除高度吸附造成的周期性镜头跳动
function platformHeight() {
  return 0;
}

// 线段是否被墙体遮挡（用于雷达发现判定）
function lineBlocked(x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  return walls.some(b => {
    if (b.h < 1.2) return false;
    const minX = b.x - b.w / 2, maxX = b.x + b.w / 2, minZ = b.z - b.d / 2, maxZ = b.z + b.d / 2;
    let t0 = 0, t1 = 1;
    const clip = (p, q) => {
      if (Math.abs(p) < 1e-8) return q >= 0;
      const r = q / p;
      if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; }
      return true;
    };
    return clip(-dx, x1 - minX) && clip(dx, maxX - x1) && clip(-dz, z1 - minZ) && clip(dz, maxZ - z1) && t0 < t1 && t0 > 0.02 && t0 < .98;
  });
}

function spotEnemy(id) { if (id && id !== myId) spottedEnemies.set(id, performance.now() + SPOT_DURATION); }

// 更新可见敌人标记
function updateSpotted() {
  if (!joined || !alive) return;
  const now = performance.now();
  const forward = new THREE.Vector3(); camera.getWorldDirection(forward); forward.y = 0;
  if (forward.lengthSq() < 1e-6) return; forward.normalize();
  remotes.forEach((remote, id) => {
    if (remote.data.dead) { spottedEnemies.delete(id); return; }
    const dx = remote.data.x - camera.position.x, dz = remote.data.z - camera.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > SPOT_MAX_DIST || dist < .2) return;
    if ((dx / dist) * forward.x + (dz / dist) * forward.z < SPOT_FOV) return;
    if (!lineBlocked(camera.position.x, camera.position.z, remote.data.x, remote.data.z)) spotEnemy(id);
  });
  spottedEnemies.forEach((until, id) => { if (until < now || !remotes.has(id) || remotes.get(id).data.dead) spottedEnemies.delete(id); });
}

// CS 风格圆形雷达
function drawMinimap() {
  const size = minimap.width, cx = size / 2, cy = size / 2, scale = (size * .42) / RADAR_RANGE;
  const ctx = minimapCtx, yaw = camera.rotation.y;
  ctx.clearRect(0, 0, size, size);

  // 背景与网格
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, size / 2 - 1, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#061018'; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#163244'; ctx.lineWidth = 1;
  for (let r = 1; r <= 3; r++) {
    ctx.beginPath(); ctx.arc(cx, cy, (RADAR_RANGE * r / 3) * scale, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(cx, 8); ctx.lineTo(cx, size - 8); ctx.moveTo(8, cy); ctx.lineTo(size - 8, cy); ctx.stroke();

  // 以自己为中心、朝向朝上
  ctx.translate(cx, cy); ctx.rotate(yaw);
  const toRadar = (x, z) => [ (x - camera.position.x) * scale, (z - camera.position.z) * scale ];

  // 地图边界
  ctx.strokeStyle = '#2a6a78'; ctx.lineWidth = 2;
  const [bx, bz] = toRadar(-MAP_HALF, -MAP_HALF);
  ctx.strokeRect(bx, bz, MAP_HALF * 2 * scale, MAP_HALF * 2 * scale);

  // 障碍物
  ctx.fillStyle = '#1b4a58cc';
  walls.forEach(b => {
    if (b.h < 1) return;
    const [wx, wz] = toRadar(b.x - b.w / 2, b.z - b.d / 2);
    ctx.fillRect(wx, wz, b.w * scale, b.d * scale);
  });

  // 已发现的敌人
  const now = performance.now();
  spottedEnemies.forEach((until, id) => {
    const remote = remotes.get(id);
    if (!remote || remote.data.dead) return;
    const [ex, ez] = toRadar(remote.data.x, remote.data.z);
    if (Math.hypot(ex, ez) > size * .48) return;
    const alpha = Math.min(1, (until - now) / 400);
    ctx.fillStyle = `rgba(255, 72, 88, ${alpha})`;
    ctx.beginPath(); ctx.arc(ex, ez, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255, 180, 180, ${alpha})`; ctx.lineWidth = 1; ctx.stroke();
  });

  ctx.restore();

  // 自己：始终朝上的箭头
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#4cf0e8';
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#0a2a30'; ctx.lineWidth = 1; ctx.stroke();
  // 视野扇形
  ctx.fillStyle = 'rgba(76, 240, 232, .12)';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 34, -Math.PI / 2 - .55, -Math.PI / 2 + .55); ctx.closePath(); ctx.fill();
  ctx.restore();

  // 外圈描边
  ctx.strokeStyle = '#3adad2'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2); ctx.stroke();
}
function join(name) {
  // 防止重复点击产生多个连接，旧连接残留消息可能干扰状态
  if (joined || (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING))) {
    return;
  }
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  socket.onopen = () => socket.send(JSON.stringify({
    type: 'join',
    name,
    mode: selectedMode,
    map: selectedMap,
    team: selectedMode === 'tdm' ? selectedTeam : null,
  }));
  socket.onmessage = event => receive(JSON.parse(event.data));
  socket.onclose = () => {
    // 对局中异常断线时不自动重连，避免被当成新玩家刷出生点
    if (joined && endPanel.classList.contains('hidden')) {
      notice('连接已断开');
    }
  };
}

// 仅在允许窗口内改相机坐标；并记录异常瞬移便于排查
function setCameraPos(x, y, z, reason = '') {
  const ny = y ?? standingHeight;
  if (lastCameraXZ) {
    const dist = Math.hypot(x - lastCameraXZ.x, z - lastCameraXZ.z);
    if (dist > 1.5 && performance.now() > ignoreTeleportUntil) {
      console.warn('[anti-teleport] 拦截异常瞬移', { dist, reason, from: lastCameraXZ, to: { x, z } });
      return false;
    }
  }
  camera.position.set(x, ny, z);
  lastCameraXZ = { x, z };
  return true;
}
function allowTeleport(ms = 500) {
  ignoreTeleportUntil = performance.now() + ms;
}

function updateTopScore(data) {
  const left = document.querySelector('#score-left');
  const leftLabel = document.querySelector('#score-left-label');
  const right = document.querySelector('#score-right');
  const rightLabel = document.querySelector('#score-right-label');
  const modeLabel = document.querySelector('#mode-label');
  if (data.mode === 'tdm') {
    left.textContent = data.teamScores?.red ?? 0;
    right.textContent = data.teamScores?.blue ?? 0;
    left.className = 'red'; right.className = 'cyan';
    leftLabel.textContent = '红队'; rightLabel.textContent = '蓝队';
    right.classList.remove('hidden'); rightLabel.classList.remove('hidden');
    modeLabel.textContent = myTeam === 'red' ? '团队·红方' : '团队·蓝方';
  } else {
    const me = data.players.find(p => p.id === myId);
    left.textContent = me ? me.kills : 0;
    left.className = 'cyan';
    leftLabel.textContent = '我的击杀';
    right.classList.add('hidden'); rightLabel.classList.add('hidden');
    modeLabel.textContent = '死斗模式';
  }
}

function renderTabScoreboard(data) {
  const body = document.querySelector('#tab-body');
  if (!body) return;
  const row = (p) => `<li class="${p.id === myId ? 'me' : ''}"><span>${p.name}</span><span>${p.kills}</span><span>${p.deaths ?? 0}</span></li>`;
  const head = `<div class="tab-head"><span>玩家</span><span>击杀</span><span>死亡</span></div>`;
  if (data.mode === 'tdm') {
    const red = data.scoreboard?.red || [];
    const blue = data.scoreboard?.blue || [];
    body.innerHTML = `<div class="tab-cols">
      <div class="tab-team red"><h3>红队 ${data.teamScores?.red ?? 0}</h3>${head}<ul>${red.map(row).join('') || '<li><span>暂无成员</span><span>0</span><span>0</span></li>'}</ul></div>
      <div class="tab-team blue"><h3>蓝队 ${data.teamScores?.blue ?? 0}</h3>${head}<ul>${blue.map(row).join('') || '<li><span>暂无成员</span><span>0</span><span>0</span></li>'}</ul></div>
    </div>`;
  } else {
    const all = data.scoreboard?.all || data.leaderboard || [];
    body.innerHTML = `<div class="tab-all">${head}<ul>${all.map(row).join('')}</ul></div>`;
  }
}

function receive(data) {
  if (data.type === 'welcome') {
    myId = String(data.id); gameMode = data.mode || 'dm'; myTeam = data.team || null;
    currentMapId = data.mapId || selectedMap || 'neon_dock';
    loadMap(currentMapId);
    joined = true; menu.classList.add('hidden'); hud.classList.remove('hidden');
    allowTeleport(1000);
    setCameraPos(data.x, data.y || standingHeight, data.z, 'welcome');
    armMouseLook(180);
    document.body.requestPointerLock(); equipRandomWeapon(false);
    const mapName = data.mapName || MAP_NAMES[currentMapId] || currentMapId;
    notice(gameMode === 'tdm'
      ? `${mapName} · 团队竞技（${myTeam === 'red' ? '红方' : '蓝方'}）`
      : `${mapName} · 死斗模式`);
  }
  if (data.type === 'state') {
    document.querySelector('#timer').textContent = `${String(Math.floor(data.time / 60)).padStart(2,'0')}:${String(data.time % 60).padStart(2,'0')}`;
    updateTopScore(data);
    if (tabHeld) renderTabScoreboard(data);
    const board = document.querySelector('#leaderboard');
    board.replaceChildren(...(data.leaderboard || []).map((player, index) => {
      const item = document.createElement('li');
      item.className = player.id === myId ? 'me' : '';
      const tag = data.mode === 'tdm' ? (player.team === 'red' ? '红' : '蓝') + ' ' : '';
      item.textContent = `${index + 1}. ${tag}${player.name}`;
      const kills = document.createElement('b'); kills.textContent = player.kills; item.append(kills);
      return item;
    }));
    const seen = new Set();
    data.players.forEach(p => {
      if (p.id === myId) return;
      seen.add(p.id);
      let r = remotes.get(p.id);
      if (!r) { r = { mesh: createPlayerModel(p.id, p.name, p.team), data: p, walking: false }; remotes.set(p.id, r); }
      r.walking = Math.hypot(p.x - r.data.x, p.z - r.data.z) > .015;
      r.data = p; r.mesh.visible = !p.dead; r.mesh.position.set(p.x, 0, p.z); r.mesh.rotation.y = p.yaw;
    });
    remotes.forEach((r, id) => { if (!seen.has(id)) { scene.remove(r.mesh); remotes.delete(id); } });
  }
  if (data.type === 'hit' && data.victim === myId && alive) {
    const hpEl = document.querySelector('#health');
    const next = Math.max(0, +hpEl.textContent - 34);
    hpEl.textContent = next;
    hpEl.classList.toggle('low', next <= 34);
    const flash = document.querySelector('#damage-flash'); flash.classList.add('active'); setTimeout(() => flash.classList.remove('active'), 130);
    // 血量归零只触发一次死亡，避免重复 die 干扰镜头
    if (next <= 0) die();
  }
  if (data.type === 'kill') {
    const kTeam = data.killerTeam === 'red' ? '红' : data.killerTeam === 'blue' ? '蓝' : '';
    const vTeam = data.victimTeam === 'red' ? '红' : data.victimTeam === 'blue' ? '蓝' : '';
    const kName = kTeam ? `[${kTeam}] ${data.killerName}` : data.killerName;
    const vName = vTeam ? `[${vTeam}] ${data.victimName}` : data.victimName;
    feed(`<strong>${kName}</strong> ▸ ${vName}`);
    if (data.victim === myId && alive) die();
  }
  if (data.type === 'respawn' && String(data.victim) === String(myId)) {
    // 活人一律忽略复活包（这是“每隔几秒被刷出生点”的最常见原因）
    if (alive) {
      console.warn('[respawn-ignored] 存活状态收到 respawn', data);
      return;
    }
    // 同一 deathId 不重复处理
    if (data.deathId != null && data.deathId === lastDeathId && lastDeathId !== 0) return;
    if (data.deathId != null) lastDeathId = data.deathId;
    if (pendingRespawnTimer) { clearInterval(pendingRespawnTimer); pendingRespawnTimer = null; }
    allowTeleport(800);
    setCameraPos(data.x, data.y || standingHeight, data.z, 'respawn');
    // 不重置 yaw/pitch
    verticalVelocity = 0;
    ammo = 30; reloading = false; alive = true;
    document.querySelector('.weapon strong').textContent = ammo;
    document.querySelector('#health').textContent = 100;
    document.querySelector('#health').classList.remove('low');
    respawn.classList.add('hidden');
    equipRandomWeapon(true);
    if (!paused && endPanel.classList.contains('hidden')) {
      intentionalUnlock = false;
      armMouseLook(180);
      document.body.requestPointerLock();
    }
    notice(`已切换武器：${WEAPONS.find(w => w.id === currentWeaponId)?.name || ''}`);
  }
  if (data.type === 'roundEnd') {
    alive = false;
    intentionalUnlock = true;
    document.exitPointerLock();
    if (data.mode === 'tdm') {
      const s = data.teamScores || { red: 0, blue: 0 };
      document.querySelector('#winner').textContent = data.winner.includes('平局')
        ? `平局 ${s.red}:${s.blue}`
        : `${data.winner} 获胜（${s.red}:${s.blue}）`;
    } else {
      document.querySelector('#winner').textContent = `${data.winner} 以 ${data.kills} 次击杀获胜`;
    }
    endPanel.classList.remove('hidden');
  }
  if (data.type === 'feed') feed(data.text);
}
function die() {
  if (!alive) return; // 防重入
  alive = false;
  verticalVelocity = 0;
  // 清按键，避免复活瞬间带着旧移动状态
  for (const k of Object.keys(keys)) keys[k] = false;
  respawn.classList.remove('hidden');
  let n = 3;
  const el = document.querySelector('#respawn-count');
  el.textContent = n;
  if (pendingRespawnTimer) clearInterval(pendingRespawnTimer);
  // 仅做倒计时 UI；真正复活以服务端 respawn 为准
  pendingRespawnTimer = setInterval(() => {
    n -= 1;
    el.textContent = Math.max(0, n);
    if (n <= 0) {
      clearInterval(pendingRespawnTimer);
      pendingRespawnTimer = null;
    }
  }, 1000);
}
function feed(text) { const el = document.createElement('div'); el.className = 'kill'; el.innerHTML = text; document.querySelector('#kill-feed').prepend(el); setTimeout(() => el.remove(), 3500); }
function notice(text) { const el = document.querySelector('#notice'); el.textContent = text; setTimeout(() => { if (el.textContent === text) el.textContent = ''; }, 2000); }
function addShotEffect(end) {
  const origin = new THREE.Vector3(); muzzle.getWorldPosition(origin);
  const direction = end.clone().sub(origin); const length = direction.length();
  const tracer = new THREE.Mesh(new THREE.CylinderGeometry(.012, .025, length, 5), new THREE.MeshBasicMaterial({ color: 0xffdf72, transparent: true }));
  tracer.position.copy(origin).addScaledVector(direction, .5); tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); scene.add(tracer); effects.push({ mesh: tracer, life: .055 });
  // 枪口光不投射阴影，避免把残留物体“闪”出来
  const flash = new THREE.PointLight(0xffc34d, 3.2, 4); flash.castShadow = false; flash.position.copy(origin); scene.add(flash); effects.push({ mesh: flash, life: .035 });
}
function addImpact(point) {
  const spark = new THREE.Mesh(new THREE.SphereGeometry(.11, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2d45, transparent: true })); spark.position.copy(point); scene.add(spark); effects.push({ mesh: spark, life: .16, expand: true });
}
function findPlayerId(obj) {
  let o = obj;
  while (o) { if (o.userData && o.userData.playerId) return o.userData.playerId; o = o.parent; }
  return null;
}
function shoot() {
  if (!alive || reloading || !ammo || paused || performance.now() - lastShot < 115) return;
  lastShot = performance.now(); gunKick = 1; ammo--; document.querySelector('.weapon strong').textContent = ammo;
  raycaster.setFromCamera(new THREE.Vector2(), camera);
  const direction = new THREE.Vector3(); camera.getWorldDirection(direction);
  const end = camera.position.clone().addScaledVector(direction, 45);
  // 团队模式：只能瞄准敌方
  const targets = [...remotes.values()].filter(r => {
    if (r.data.dead) return false;
    if (gameMode === 'tdm' && myTeam && r.data.team === myTeam) return false;
    return true;
  }).map(r => r.mesh);
  const hit = raycaster.intersectObjects(targets, true)[0];
  if (hit) {
    end.copy(hit.point); addImpact(hit.point);
    const targetId = findPlayerId(hit.object);
    if (targetId) { spotEnemy(targetId); socket.send(JSON.stringify({ type: 'shoot', target: targetId })); }
  }
  addShotEffect(end); if (!ammo) reload();
}
function reload() { if (reloading || ammo === 30) return; reloading = true; notice('装填中...'); setTimeout(() => { ammo = 30; reloading = false; document.querySelector('.weapon strong').textContent = ammo; }, 1300); }
addEventListener('keydown', e => {
  if (e.code === 'Tab') {
    if (joined) {
      e.preventDefault();
      tabHeld = true;
      document.querySelector('#tab-scoreboard').classList.remove('hidden');
    }
    return;
  }
  if (e.code === 'Escape') {
    if (!joined || !endPanel.classList.contains('hidden')) return;
    e.preventDefault();
    if (paused) closePauseMenu(true);
    else openPauseMenu();
    return;
  }
  if (paused) return;
  keys[e.code] = true;
  if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyR') reload();
  if (e.code === 'Space' && alive && verticalVelocity === 0) verticalVelocity = jumpSpeed;
});
addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Tab') {
    tabHeld = false;
    document.querySelector('#tab-scoreboard').classList.add('hidden');
  }
});
addEventListener('mousemove', e => {
  if (paused || !alive || document.pointerLockElement !== document.body) return;
  // 锁鼠刚恢复时丢弃输入，避免尖峰导致镜头猛甩
  if (performance.now() < mouseLookReadyAt) return;
  // 限制单帧最大转动（约 35°），防止异常 movement 把视角打飞
  const maxStep = 0.6;
  let dx = e.movementX || 0;
  let dy = e.movementY || 0;
  // 过大尖峰直接忽略（常见于 pointerlock 重获、窗口焦点变化）
  if (Math.abs(dx) > 80 || Math.abs(dy) > 80) return;
  let yawDelta = dx * .0022 * sensitivity;
  let pitchDelta = dy * .0022 * sensitivity;
  if (yawDelta > maxStep) yawDelta = maxStep;
  if (yawDelta < -maxStep) yawDelta = -maxStep;
  if (pitchDelta > maxStep) pitchDelta = maxStep;
  if (pitchDelta < -maxStep) pitchDelta = -maxStep;
  camera.rotation.y -= yawDelta;
  camera.rotation.x -= pitchDelta;
  camera.rotation.x = Math.max(-1.3, Math.min(1.3, camera.rotation.x));
});
const sensitivityInput = document.querySelector('#sensitivity'); sensitivityInput.addEventListener('input', () => { sensitivity = +sensitivityInput.value; document.querySelector('#sensitivity-value').value = sensitivity.toFixed(1); });
addEventListener('mousedown', () => {
  if (!joined || paused || !endPanel.classList.contains('hidden')) return;
  if (document.pointerLockElement !== document.body) {
    armMouseLook();
    document.body.requestPointerLock();
    return; // 本次点击只用于锁鼠，不射击，避免锁鼠瞬间乱转
  }
  shoot();
});
// 暂停只由 ESC 显式触发；锁鼠成功后重新武装鼠标输入
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) {
    intentionalUnlock = false;
    armMouseLook(100);
  }
});
// 大厅：模式 / 阵营选择
document.querySelectorAll('#mode-pick .mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#mode-pick .mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMode = btn.dataset.mode;
    document.querySelector('#team-pick-wrap').classList.toggle('hidden', selectedMode !== 'tdm');
  });
});
document.querySelectorAll('#team-pick .team-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#team-pick .team-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedTeam = btn.dataset.team;
  });
});
document.querySelectorAll('#map-pick .map-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#map-pick .map-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMap = btn.dataset.map;
  });
});
document.querySelector('#join-form').addEventListener('submit', e => {
  e.preventDefault();
  join(document.querySelector('#player-name').value.trim() || 'Rookie');
});
function loop(time) {
  requestAnimationFrame(loop);
  remotes.forEach(remote => animateRemote(remote, time));
  effects.forEach(effect => {
    effect.life -= .016;
    if (effect.expand) effect.mesh.scale.multiplyScalar(1.16);
    if (effect.mesh.material) effect.mesh.material.opacity = Math.max(0, effect.life * 10);
  });
  for (let i = effects.length - 1; i >= 0; i--) if (effects[i].life <= 0) { scene.remove(effects[i].mesh); effects.splice(i, 1); }
  gunKick = Math.max(0, gunKick - .12);
  gun.position.z = -.42 + gunKick * .1;
  gun.rotation.x = .02 - gunKick * .08;
  if (joined && alive && !paused) {
    const forward = new THREE.Vector3(); camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    velocity.set(0, 0, 0);
    if (keys.KeyW) velocity.add(forward);
    if (keys.KeyS) velocity.sub(forward);
    if (keys.KeyD) velocity.add(right);
    if (keys.KeyA) velocity.sub(right);
    const groundHeight = platformHeight(camera.position.x, camera.position.z, camera.position.y);
    const crouching = keys.KeyC && verticalVelocity === 0;
    const targetHeight = groundHeight + (crouching ? crouchingHeight : standingHeight);
    const speed = (keys.ShiftLeft && !crouching ? .065 : .045) * (crouching ? .45 : 1);
    verticalVelocity -= gravity * .016;
    camera.position.y += verticalVelocity * .016;
    // 落地吸附：只在下落接触时贴地，避免每帧强制改 y 造成视角抖动
    if (camera.position.y <= targetHeight) {
      camera.position.y = targetHeight;
      verticalVelocity = 0;
    } else if (verticalVelocity === 0 && camera.position.y > targetHeight + .02 && groundHeight === 0) {
      // 离开可站物体后平滑落回地面，而不是瞬移
      verticalVelocity = -0.01;
    }
    if (velocity.lengthSq()) {
      velocity.normalize().multiplyScalar(speed);
      const nx = camera.position.x + velocity.x, nz = camera.position.z + velocity.z;
      if (!collides(nx, camera.position.z, camera.position.y)) camera.position.x = nx;
      if (!collides(camera.position.x, nz, camera.position.y)) camera.position.z = nz;
    }
    if (socket && socket.readyState === WebSocket.OPEN && time - lastNetwork > 45) {
      socket.send(JSON.stringify({
        type: 'move',
        x: camera.position.x, y: camera.position.y, z: camera.position.z,
        yaw: camera.rotation.y, pitch: camera.rotation.x, crouching,
      }));
      lastNetwork = time;
    }
    // 持续更新基准位置，避免正常移动被 anti-teleport 误判
    lastCameraXZ = { x: camera.position.x, z: camera.position.z };
  }
  if (joined) { updateSpotted(); drawMinimap(); }
  renderer.render(scene, camera);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }); loop();
