import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';

// 🎮 Setup Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 💡 Lighting & Shadows
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// 🌍 Ground Texture
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load("https://kenney.nl/assets/ground-texture.png");
const groundGeo = new THREE.BoxGeometry(32, 1, 32);
const groundMat = new THREE.MeshStandardMaterial({ map: groundTexture });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.y = -0.5;
scene.add(ground);

// 🏗 Player Object (Fixing Missing Player)
let player = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.6, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xffcc00 })
);
player.position.set(0, 1, 0);
scene.add(player);

// 🎮 Start Animation Loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
