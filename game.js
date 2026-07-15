import * as THREE from 'three';

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07111a); scene.fog = new THREE.Fog(0x07111a, 24, 68);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, .1, 100); camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; document.body.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0x7dcae5, 0x10202c, 2)); const sun = new THREE.DirectionalLight(0xb9efff, 2); sun.position.set(5, 16, 8); sun.castShadow = true; scene.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ color: 0x132633, roughness: .8, metalness: .3 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(50, 50, 0x2d8190, 0x193b4d); grid.position.y = .01; scene.add(grid);
const walls = []; function box(x, z, w, d, h = 3, color = 0x203d4e, collision = true) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, metalness: .55, roughness: .4 })); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m); if (collision) walls.push({ x, z, w, d, h }); }
function container(x, z, rotation = 0, color = 0x216d8a, stacked = false) { const group = new THREE.Group(); const material = new THREE.MeshStandardMaterial({ color, metalness: .65, roughness: .42 }); const shell = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.55, 6), material); shell.castShadow = shell.receiveShadow = true; group.add(shell); const ribMaterial = new THREE.MeshStandardMaterial({ color: 0x102a36, metalness: .8, roughness: .3 }); for (let i = -2.55; i <= 2.55; i += .5) { const rib = new THREE.Mesh(new THREE.BoxGeometry(2.56, 2.35, .07), ribMaterial); rib.position.set(0, 0, i); group.add(rib); } group.position.set(x, stacked ? 3.84 : 1.275, z); group.rotation.y = rotation; group.traverse(mesh => { mesh.castShadow = mesh.receiveShadow = true; }); scene.add(group); const w = Math.abs(Math.cos(rotation)) * 2.5 + Math.abs(Math.sin(rotation)) * 6, d = Math.abs(Math.sin(rotation)) * 2.5 + Math.abs(Math.cos(rotation)) * 6; walls.push({ x, z, w, d, h: stacked ? 5.1 : 2.55 }); }
function crate(x, z, size = 1.15, height = 1.15) { const material = new THREE.MeshStandardMaterial({ color: 0x7b4925, roughness: .85 }); const wood = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), material); wood.position.set(x, height / 2, z); wood.castShadow = wood.receiveShadow = true; scene.add(wood); const edge = new THREE.LineSegments(new THREE.EdgesGeometry(wood.geometry), new THREE.LineBasicMaterial({ color: 0xd69b55 })); edge.position.copy(wood.position); scene.add(edge); walls.push({ x, z, w: size, d: size, h: height }); }
// 原创货运码头布局：集装箱提供掩体，木箱作为登上低集装箱的踏台。
box(0, -24, 50, 1, 5); box(0, 24, 50, 1, 5); box(-24, 0, 1, 50, 5); box(24, 0, 1, 50, 5);
container(-10, -8, 0, 0x177e9d); container(-10, -2, 0, 0xc13f3f); container(-10, -8, 0, 0x356ba5, true); crate(-8.1, -8, 1.15, 1.2);
container(9, 8, Math.PI / 2, 0xd0832d); container(15, 8, Math.PI / 2, 0x2e8d63); container(9, 8, Math.PI / 2, 0x8b3f92, true); crate(9, 5.9, 1.15, 1.2);
container(-4, 12, Math.PI / 2, 0x366a9a); container(5, -13, Math.PI / 2, 0xb94747); container(0, 2, 0, 0x60727e); crate(2.1, 2, 1.1, 1.15);
// 北侧墙面的霓虹招牌。
function neonSign(text) { const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 180; const context = canvas.getContext('2d'); context.clearRect(0, 0, canvas.width, canvas.height); context.font = '800 108px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.shadowColor = '#00f6ff'; context.shadowBlur = 28; context.strokeStyle = '#00dfe9'; context.lineWidth = 4; context.strokeText(text, 512, 91); context.fillStyle = '#ecffff'; context.fillText(text, 512, 91); const material = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, side: THREE.DoubleSide }); const sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.94), material); sign.position.set(0, 3, -23.43); scene.add(sign); }
neonSign('烟台小分队');
const blueMat = new THREE.MeshStandardMaterial({ color: 0x20d8df, emissive: 0x07565e, metalness: .5 }), redMat = new THREE.MeshStandardMaterial({ color: 0xf04e68, emissive: 0x5b0b1c, metalness: .5 });
const remotes = new Map(), raycaster = new THREE.Raycaster(), keys = {}, velocity = new THREE.Vector3(), effects = []; let socket, myId, joined = false, alive = true, ammo = 30, reloading = false, lastShot = 0, lastNetwork = 0, gunKick = 0, verticalVelocity = 0, sensitivity = 1;
const standingHeight = 1.6, crouchingHeight = 1.05, gravity = 17, jumpSpeed = 6.3;

// 第一人称简易步枪模型，挂载到相机以保持在视野右下角。
const gun = new THREE.Group();
const gunMetal = new THREE.MeshStandardMaterial({ color: 0x182631, metalness: .85, roughness: .28 });
const gunAccent = new THREE.MeshStandardMaterial({ color: 0x28d9d5, emissive: 0x08716f, emissiveIntensity: 1.7, metalness: .5 });
function gunPart(geometry, material, x, y, z) { const part = new THREE.Mesh(geometry, material); part.position.set(x, y, z); gun.add(part); return part; }
gunPart(new THREE.BoxGeometry(.34, .22, .92), gunMetal, .34, -.28, -.62);
gunPart(new THREE.BoxGeometry(.11, .1, .85), gunMetal, .34, -.25, -1.45);
gunPart(new THREE.BoxGeometry(.22, .36, .32), gunMetal, .3, -.49, -.35).rotation.x = -.22;
gunPart(new THREE.BoxGeometry(.05, .035, .62), gunAccent, .34, -.14, -.72);
gunPart(new THREE.BoxGeometry(.08, .1, .11), gunMetal, .34, -.11, -1.03);
const muzzle = new THREE.Object3D(); muzzle.position.set(.34, -.25, -1.9); gun.add(muzzle);
gun.position.set(.48, -.42, -.72); gun.rotation.set(-.12, -.18, 0); camera.add(gun); scene.add(camera);
const hud = document.querySelector('#hud'), menu = document.querySelector('#menu'), respawn = document.querySelector('#respawn'), endPanel = document.querySelector('#end-panel');
// 方块像素风人形：头、躯干、四肢均为独立方块，方便射线命中与动作表现。
function nicknameTag(name) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 48;
  const context = canvas.getContext('2d'); context.font = '700 25px sans-serif'; context.textAlign = 'center';
  context.fillStyle = 'rgba(3, 10, 16, .82)'; context.fillRect(0, 3, 256, 39);
  context.strokeStyle = '#48e6df'; context.strokeRect(1, 4, 254, 38);
  context.fillStyle = '#efffff'; context.fillText(name, 128, 31);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
  sprite.position.y = 2.52; sprite.scale.set(1.55, .29, 1); return sprite;
}
function model(id, name) {
  const group = new THREE.Group();
  const uniform = id.charCodeAt(0) % 2 ? blueMat : redMat;
  const skin = new THREE.MeshStandardMaterial({ color: 0xd99a6d, roughness: .9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x17212b, roughness: .65, metalness: .25 });
  const parts = {};
  function part(name, size, material, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; mesh.userData.playerId = id;
    group.add(mesh); parts[name] = mesh; return mesh;
  }
  part('leftLeg', [.3, .78, .3], dark, -.19, .39, 0);
  part('rightLeg', [.3, .78, .3], dark, .19, .39, 0);
  part('body', [.78, .82, .38], uniform, 0, 1.17, 0);
  part('head', [.62, .62, .62], skin, 0, 1.89, 0);
  // 护目镜与阵营色肩章让远距离识别更明显。
  part('visor', [.48, .13, .03], dark, 0, 1.94, -.325);
  part('leftArm', [.25, .76, .28], uniform, -.53, 1.2, 0);
  part('rightArm', [.25, .76, .28], uniform, .53, 1.2, -.08);
  const rifle = part('rifle', [.12, .12, .78], dark, .57, .99, -.46); rifle.rotation.x = -.18;
  group.add(nicknameTag(name));
  group.userData.parts = parts; scene.add(group); return group;
}
function animateRemote(remote, time) {
  remote.mesh.position.y = remote.data.y - standingHeight + (remote.data.crouching ? -.38 : 0);
  remote.mesh.scale.y = remote.data.crouching ? .77 : 1;
  const parts = remote.mesh.userData.parts; if (!parts) return;
  const swing = remote.walking ? Math.sin(time * .011) * .58 : 0;
  parts.leftLeg.rotation.x = swing; parts.rightLeg.rotation.x = -swing;
  parts.leftArm.rotation.x = -swing * .7; parts.rightArm.rotation.x = swing * .35 - .3;
}
function collides(x, z, eyeY) { return walls.some(b => x > b.x - b.w / 2 - .45 && x < b.x + b.w / 2 + .45 && z > b.z - b.d / 2 - .45 && z < b.z + b.d / 2 + .45 && eyeY < b.h + 1.1); }
function platformHeight(x, z) { return walls.reduce((top, b) => x > b.x - b.w / 2 - .32 && x < b.x + b.w / 2 + .32 && z > b.z - b.d / 2 - .32 && z < b.z + b.d / 2 + .32 ? Math.max(top, b.h) : top, 0); }
function join(name) { socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`); socket.onopen = () => socket.send(JSON.stringify({ type: 'join', name })); socket.onmessage = event => receive(JSON.parse(event.data)); }
function receive(data) { if (data.type === 'welcome') { myId = data.id; joined = true; menu.classList.add('hidden'); hud.classList.remove('hidden'); camera.position.set(data.x, 1.6, data.z); document.body.requestPointerLock(); notice('死斗模式：所有玩家均为敌人'); }
 if (data.type === 'state') { document.querySelector('#timer').textContent = `${String(Math.floor(data.time / 60)).padStart(2,'0')}:${String(data.time % 60).padStart(2,'0')}`; const board = document.querySelector('#leaderboard'); board.replaceChildren(...data.leaderboard.map((player, index) => { const item = document.createElement('li'); item.className = player.id === myId ? 'me' : ''; item.textContent = `${index + 1}. ${player.name}`; const kills = document.createElement('b'); kills.textContent = player.kills; item.append(kills); return item; })); const me = data.players.find(player => player.id === myId); if (me) document.querySelector('#my-kills').textContent = me.kills; const seen = new Set(); data.players.forEach(p => { if (p.id === myId) return; seen.add(p.id); let r = remotes.get(p.id); if (!r) { r = { mesh: model(p.id, p.name), data: p, walking: false }; remotes.set(p.id, r); } r.walking = Math.hypot(p.x - r.data.x, p.z - r.data.z) > .015; r.data = p; r.mesh.visible = !p.dead; r.mesh.position.set(p.x, 0, p.z); r.mesh.rotation.y = p.yaw; }); remotes.forEach((r,id) => { if (!seen.has(id)) { scene.remove(r.mesh); remotes.delete(id); } }); }
 if (data.type === 'hit' && data.victim === myId) { document.querySelector('#health').textContent = Math.max(0, +document.querySelector('#health').textContent - 34); document.querySelector('#health').classList.toggle('low', +document.querySelector('#health').textContent <= 34); const flash = document.querySelector('#damage-flash'); flash.classList.add('active'); setTimeout(() => flash.classList.remove('active'), 130); }
 if (data.type === 'kill') { feed(`<strong>${data.killerName}</strong> ▸ ${data.victimName}`); if (data.victim === myId) die(); }
 if (data.type === 'respawn' && data.victim === myId) { camera.position.set(data.x, data.y, data.z); ammo = 30; reloading = false; verticalVelocity = 0; document.querySelector('.weapon strong').textContent = ammo; }
 if (data.type === 'roundEnd') { alive = false; document.exitPointerLock(); document.querySelector('#winner').textContent = `${data.winner} 以 ${data.kills} 次击杀获胜`; endPanel.classList.remove('hidden'); }
 if (data.type === 'feed') feed(data.text); }
function die() { alive = false; respawn.classList.remove('hidden'); let n = 3; const el = document.querySelector('#respawn-count'); const timer = setInterval(() => { el.textContent = --n; if (!n) { clearInterval(timer); alive = true; ammo = 30; reloading = false; document.querySelector('.weapon strong').textContent = ammo; document.querySelector('#health').textContent = 100; document.querySelector('#health').classList.remove('low'); respawn.classList.add('hidden'); } }, 1000); }
function feed(text) { const el = document.createElement('div'); el.className = 'kill'; el.innerHTML = text; document.querySelector('#kill-feed').prepend(el); setTimeout(() => el.remove(), 3500); }
function notice(text) { const el = document.querySelector('#notice'); el.textContent = text; setTimeout(() => { if (el.textContent === text) el.textContent = ''; }, 2000); }
function addShotEffect(end) {
  const origin = new THREE.Vector3(); muzzle.getWorldPosition(origin);
  const direction = end.clone().sub(origin); const length = direction.length();
  const tracer = new THREE.Mesh(new THREE.CylinderGeometry(.012, .025, length, 5), new THREE.MeshBasicMaterial({ color: 0xffdf72, transparent: true }));
  tracer.position.copy(origin).addScaledVector(direction, .5); tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); scene.add(tracer); effects.push({ mesh: tracer, life: .055 });
  const flash = new THREE.PointLight(0xffc34d, 6, 5); flash.position.copy(origin); scene.add(flash); effects.push({ mesh: flash, life: .035 });
}
function addImpact(point) {
  const spark = new THREE.Mesh(new THREE.SphereGeometry(.11, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2d45, transparent: true })); spark.position.copy(point); scene.add(spark); effects.push({ mesh: spark, life: .16, expand: true });
}
function shoot() { if (!alive || reloading || !ammo || performance.now() - lastShot < 115) return; lastShot = performance.now(); gunKick = 1; ammo--; document.querySelector('.weapon strong').textContent = ammo; raycaster.setFromCamera(new THREE.Vector2(), camera); const direction = new THREE.Vector3(); camera.getWorldDirection(direction); const end = camera.position.clone().addScaledVector(direction, 45); const targets = [...remotes.values()].filter(r => !r.data.dead).map(r => r.mesh); const hit = raycaster.intersectObjects(targets, true)[0]; if (hit) { end.copy(hit.point); addImpact(hit.point); const targetId = hit.object.userData.playerId; if (targetId) socket.send(JSON.stringify({ type: 'shoot', target: targetId })); } addShotEffect(end); if (!ammo) reload(); }
function reload() { if (reloading || ammo === 30) return; reloading = true; notice('装填中...'); setTimeout(() => { ammo = 30; reloading = false; document.querySelector('.weapon strong').textContent = ammo; }, 1300); }
addEventListener('keydown', e => { keys[e.code] = true; if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault(); if (e.code === 'KeyR') reload(); if (e.code === 'Space' && alive && verticalVelocity === 0) verticalVelocity = jumpSpeed; }); addEventListener('keyup', e => keys[e.code] = false);
addEventListener('mousemove', e => { if (document.pointerLockElement === document.body && alive) { camera.rotation.y -= e.movementX * .0022 * sensitivity; camera.rotation.x -= e.movementY * .0022 * sensitivity; camera.rotation.x = Math.max(-1.3, Math.min(1.3, camera.rotation.x)); } });
const sensitivityInput = document.querySelector('#sensitivity'); sensitivityInput.addEventListener('input', () => { sensitivity = +sensitivityInput.value; document.querySelector('#sensitivity-value').value = sensitivity.toFixed(1); }); addEventListener('mousedown', () => { if (joined) document.body.requestPointerLock(); shoot(); });
document.querySelector('#join-form').addEventListener('submit', e => { e.preventDefault(); join(document.querySelector('#player-name').value.trim() || 'Rookie'); });
function loop(time) { requestAnimationFrame(loop); remotes.forEach(remote => animateRemote(remote, time)); effects.forEach(effect => { effect.life -= .016; if (effect.expand) effect.mesh.scale.multiplyScalar(1.16); if (effect.mesh.material) effect.mesh.material.opacity = Math.max(0, effect.life * 10); }); for (let i = effects.length - 1; i >= 0; i--) if (effects[i].life <= 0) { scene.remove(effects[i].mesh); effects.splice(i, 1); } gunKick = Math.max(0, gunKick - .12); gun.position.z = -.72 + gunKick * .13; gun.rotation.x = -.12 - gunKick * .13; if (joined && alive) { const forward = new THREE.Vector3(); camera.getWorldDirection(forward); forward.y = 0; forward.normalize(); const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize(); velocity.set(0,0,0); if (keys.KeyW) velocity.add(forward); if (keys.KeyS) velocity.sub(forward); if (keys.KeyD) velocity.add(right); if (keys.KeyA) velocity.sub(right); const groundHeight = platformHeight(camera.position.x, camera.position.z); const crouching = keys.KeyC && verticalVelocity === 0; const targetHeight = groundHeight + (crouching ? crouchingHeight : standingHeight); const speed = (keys.ShiftLeft && !crouching ? .065 : .045) * (crouching ? .45 : 1); verticalVelocity -= gravity * .016; camera.position.y += verticalVelocity * .016; if (camera.position.y <= targetHeight) { camera.position.y = targetHeight; verticalVelocity = 0; } if (velocity.lengthSq()) { velocity.normalize().multiplyScalar(speed); const nx = camera.position.x + velocity.x, nz = camera.position.z + velocity.z; if (!collides(nx, camera.position.z, camera.position.y)) camera.position.x = nx; if (!collides(camera.position.x, nz, camera.position.y)) camera.position.z = nz; } if (socket.readyState === WebSocket.OPEN && time - lastNetwork > 45) { socket.send(JSON.stringify({ type: 'move', x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: camera.rotation.y, pitch: camera.rotation.x, crouching })); lastNetwork = time; } } renderer.render(scene, camera); }
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }); loop();
