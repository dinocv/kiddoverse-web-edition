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

// 🌍 Ground
const groundGeo = new THREE.BoxGeometry(32, 1, 32);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.y = -0.5;
scene.add(ground);

// 🏗 Player Object
let player = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.6, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xffcc00 })
);
player.position.set(0, 1, 0);
scene.add(player);

// 🚀 Movement Controls
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;

document.addEventListener('keydown', e => {
    if (e.code === 'KeyW') moveForward = true;
    if (e.code === 'KeyS') moveBackward = true;
    if (e.code === 'KeyA') moveLeft = true;
    if (e.code === 'KeyD') moveRight = true;
});

document.addEventListener('keyup', e => {
    if (e.code === 'KeyW') moveForward = false;
    if (e.code === 'KeyS') moveBackward = false;
    if (e.code === 'KeyA') moveLeft = false;
    if (e.code === 'KeyD') moveRight = false;
});

// 🖱 Mouse Look
let yaw = 0, pitch = 0;
document.addEventListener('mousemove', e => {
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    player.rotation.y = yaw;
});

// 🎯 Raycasting for Block Interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function getBlockInFront() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, false);
    return intersects.length > 0 ? intersects[0] : null;
}

// 🏗 Block Placement & Removal
document.addEventListener('click', () => {
    const hit = getBlockInFront();
    if (hit && hit.object !== player) {
        scene.remove(hit.object);
    }
});

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

// 🎵 Sound Effects for Block Interaction
function playSound(name) {
    const sounds = {
        place_block: "https://cdn.pixabay.com/audio/2022/03/15/audio_3c8bcdfb9d.mp3",
        remove_block: "https://cdn.pixabay.com/audio/2022/03/15/audio_5f8fdfb7c5.mp3"
    };
    const audio = new Audio(sounds[name]);
    audio.play();
}

// 🏗 Animated World
function animate() {
    requestAnimationFrame(animate);

    if (moveForward) player.position.z -= 0.1;
    if (moveBackward) player.position.z += 0.1;
    if (moveLeft) player.position.x -= 0.1;
    if (moveRight) player.position.x += 0.1;

    camera.position.copy(player.position).add(new THREE.Vector3(0, 1.6, 0));
    camera.lookAt(player.position.x, player.position.y + 0.8, player.position.z);

    renderer.render(scene, camera);
}
animate();
const sounds = {
    place_block: "https://cdn.pixabay.com/audio/2022/03/15/audio_3c8bcdfb9d.mp3",
    remove_block: "https://cdn.pixabay.com/audio/2022/03/15/audio_5f8fdfb7c5.mp3"
};
const audio = new Audio(sounds["place_block"]);
audio.play();
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load("https://kenney.nl/assets/ground-texture.png");
player.position.set(0, 1, 0); // Ensures player is above ground
camera.position.set(0, 5, 15); // Better camera view
camera.lookAt(scene.position);


