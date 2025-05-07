import * as BABYLON from 'https://cdn.jsdelivr.net/npm/babylonjs@latest/babylon.js';

// 🎮 Setup Babylon.js Engine
const canvas = document.getElementById("gameCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// 📷 Camera Setup
const camera = new BABYLON.ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 4, 10, BABYLON.Vector3.Zero(), scene);
camera.attachControl(canvas, true);

// 💡 Lighting
const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
light.intensity = 0.7;

// 🌍 Ground
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
groundMaterial.diffuseTexture = new BABYLON.Texture("https://kenney.nl/assets/ground-texture.png", scene);
ground.material = groundMaterial;

// 🏗 Player Object
const player = BABYLON.MeshBuilder.CreateBox("player", { size: 1 }, scene);
player.position.y = 1;
player.material = new BABYLON.StandardMaterial("playerMaterial", scene);
player.material.diffuseColor = new BABYLON.Color3(1, 1, 0); // Yellow

// 🎮 Start Game Loop
engine.runRenderLoop(() => {
    scene.render();
});

// Resize Handling
window.addEventListener("resize", () => {
    engine.resize();
});
