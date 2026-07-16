import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();
const modelCache = new Map();

export function loadGltf(url) {
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
export function normalizeProp(root, targetHeight, longAxisToZ = false) {
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
    const currentSize = box3.getSize(new THREE.Vector3());
    // 若当前 X 方向更长，则旋转 90°，让长边朝 Z
    if (currentSize.x > currentSize.z) {
      wrapper.rotation.y = Math.PI / 2;
      wrapper.updateMatrixWorld(true);
      // 旋转后再次贴地居中
      box3 = new THREE.Box3().setFromObject(wrapper);
      const rotatedCenter = box3.getCenter(new THREE.Vector3());
      wrapper.position.x -= rotatedCenter.x;
      wrapper.position.z -= rotatedCenter.z;
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

export function disposeObject(obj) {
  obj.parent?.remove(obj);
  obj.traverse?.(child => {
    if (child.geometry) child.geometry.dispose?.();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(mat => {
        if (!mat) return;
        if (mat.map) mat.map.dispose?.();
        mat.dispose?.();
      });
    }
  });
}
