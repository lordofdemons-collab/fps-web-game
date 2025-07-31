// main.js
import * as THREE from 'https://esm.sh/three@0.178.0';
import { GLTFLoader } from 'https://esm.sh/three@0.178.0/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'https://esm.sh/three@0.178.0/examples/jsm/controls/PointerLockControls.js';

let scene, camera, renderer, controls;
let bullets = [], enemies = [], enemySpeed = 0.05;
let health = 100, score = 0, wave = 1;
let ammo = 10, maxAmmo = 10;
let isGameOver = false;

const enemyFireRate = 2000; // ms
const playerSpeed = 0.15;

const clock = new THREE.Clock();

const enemyGLBPath = 'assets/enemy.glb';
const shootSound = new Audio('assets/shoot.mp3');
const hitSound = new Audio('assets/hit.mp3');
const bgMusic = new Audio('assets/bg-music.mp3');

bgMusic.loop = true;

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, renderer.domElement);

  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    controls.lock();
    bgMusic.play();
    spawnEnemies(3);
  });

  scene.add(controls.getObject());

  // Skybox
  const loader = new THREE.CubeTextureLoader();
  const texture = loader.load([
    'assets/skybox/px.jpg', 'assets/skybox/nx.jpg',
    'assets/skybox/py.jpg', 'assets/skybox/ny.jpg',
    'assets/skybox/pz.jpg', 'assets/skybox/nz.jpg'
  ]);
  scene.background = texture;

  // Lighting
  const light = new THREE.HemisphereLight(0xffffff, 0x444444);
  light.position.set(0, 200, 0);
  scene.add(light);

  // Ground
  const groundTexture = new THREE.TextureLoader().load('assets/ground.jpg');
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(25, 25);
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTexture });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Ammo Reload
  document.addEventListener('keydown', e => {
    if (e.code === 'KeyR') ammo = maxAmmo;
  });

  // Shoot
  document.addEventListener('click', () => {
    if (!controls.isLocked || ammo <= 0) return;
    shootSound.play();
    ammo--;
    updateAmmo();

    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    bullet.position.copy(controls.getObject().position);
    bullet.quaternion.copy(camera.quaternion);
    scene.add(bullet);
    bullets.push(bullet);
  });
}

function spawnEnemies(count) {
  const gltfLoader = new GLTFLoader();
  for (let i = 0; i < count; i++) {
    gltfLoader.load(enemyGLBPath, gltf => {
      const enemy = gltf.scene;
      enemy.scale.set(1.2, 1.2, 1.2);
      const angle = Math.random() * Math.PI * 2;
      const radius = 50;
      enemy.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      scene.add(enemy);
      enemies.push(enemy);

      enemy.userData.shootInterval = setInterval(() => {
        if (!isGameOver && enemy.position.distanceTo(controls.getObject().position) < 20) {
          hitSound.play();
          health -= 10;
          updateHealth();
        }
      }, enemyFireRate);
    });
  }
}

function updateAmmo() {
  document.getElementById('ammo').textContent = `Ammo: ${ammo}/${maxAmmo}`;
}

function updateHealth() {
  document.getElementById('health-fill').style.width = `${health}%`;
  if (health <= 0 && !isGameOver) {
    isGameOver = true;
    alert('Game Over! Your score: ' + score);
    location.reload();
  }
}

function updateScore() {
  document.getElementById('score').textContent = `Wave ${wave} - Score: ${score}`;
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  bullets.forEach((b, i) => {
    b.translateZ(-1);
    enemies.forEach((e, j) => {
      if (b.position.distanceTo(e.position) < 1) {
        scene.remove(e);
        enemies.splice(j, 1);
        scene.remove(b);
        bullets.splice(i, 1);
        score += 10;
        updateScore();
      }
    });
  });

  // Move enemies
  enemies.forEach(e => {
    const dir = new THREE.Vector3();
    dir.subVectors(controls.getObject().position, e.position).normalize();
    e.position.add(dir.multiplyScalar(enemySpeed));
  });

  if (enemies.length === 0 && !isGameOver) {
    wave++;
    spawnEnemies(2 + wave);
    updateScore();
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
