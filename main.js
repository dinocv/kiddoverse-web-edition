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

// 🎯 Modular Block Placement (LEGO-Style)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function getBlockInFront() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, false);
    return intersects.length > 0 ? intersects[0] : null;
}

// 🏗 Block Placement
document.addEventListener('contextmenu', e => {
    e.preventDefault();
    const hit = getBlockInFront();
    if (hit) {
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0x888888 })
        );
        box.position.copy(hit.point).add(hit.face.normal).divideScalar(1).floor().addScalar(0.5);
        scene.add(box);
    }
});

// 🎵 Sound Effects
function playSound(name) {
    const sounds = {
        place_block: "https://cdn.pixabay.com/audio/2022/03/15/audio_3c8bcdfb9d.mp3",
        remove_block: "https://cdn.pixabay.com/audio/2022/03/15/audio_5f8fdfb7c5.mp3"
    };
    if (sounds[name]) {
        const audio = new Audio(sounds[name]);
        audio.play();
    }
}

// 🏗 Play Sound on Block Placement
document.addEventListener('contextmenu', () => {
    playSound("place_block");
});

// 🎮 Start Animation Loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
