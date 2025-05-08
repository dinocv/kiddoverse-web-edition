// Global KiddoVerse namespace
var KV = KV || {}; 

// Define Themes - NEW
KV.Themes = {
    DEFAULT: {
        name: "Default",
        skyColor: new THREE.Color(0x87CEEB), // Sky Blue
        fogNearFactor: 1.5, // Multiplier of chunkSize * blockSize
        fogFarFactor: 0.75, // Multiplier of camera.far
        ambientLightIntensity: 1.2,
        directionalLightIntensity: 2.5,
        terrainParams: {
            noiseScaleXZ: 0.025,
            baseHeight: KV.BLOCK_SIZE * 16 * 1.2, // ~19 blocks
            amplitude: KV.BLOCK_SIZE * 16 * 0.9,  // ~14 blocks variation
            stoneDepth: 5, // blocks
            blockPalette: { // Default blocks used if not overridden by more specific biome logic
                surface: KV.BLOCK_TYPES.GRASS,
                subSurface: KV.BLOCK_TYPES.DIRT,
                deepStone: KV.BLOCK_TYPES.STONE,
            },
            // structureChance: 0.01, // Example for adding structures
            // structureBlock: KV.BLOCK_TYPES.WOOD
        }
    },
    SPACE: {
        name: "Space",
        skyColor: new THREE.Color(0x050515), // Very dark blue/black
        fogNearFactor: 2.5, 
        fogFarFactor: 0.85, 
        ambientLightIntensity: 0.4, // Dimmer ambient in space
        directionalLightIntensity: 1.8, // Sun might be harsh but less atmospheric scatter
        terrainParams: {
            noiseScaleXZ: 0.035, // More rugged, craterous terrain
            baseHeight: KV.BLOCK_SIZE * 16 * 0.8,  // Lower base height for "moon surface"
            amplitude: KV.BLOCK_SIZE * 16 * 0.5,   // Less extreme height variation
            stoneDepth: 8, // Deeper "bedrock"
            blockPalette: {
                surface: KV.BLOCK_TYPES.MOON_ROCK,
                subSurface: KV.BLOCK_TYPES.MOON_ROCK, // Moon rock all the way down
                deepStone: KV.BLOCK_TYPES.METAL_PANEL, // Maybe some buried tech?
            },
            // structureChance: 0.005,
            // structureBlock: KV.BLOCK_TYPES.ALIEN_GREEN
        }
    }
    // Add more themes here: OCEAN, MEDIEVAL, etc.
};


class KiddoVerseGame {
    constructor() { 
        if (typeof THREE === 'undefined') { /* ... error handling ... */ return; }
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2500);
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.9;

        this.loadingScreen = document.getElementById('loading-screen');
        this.progressBar = document.getElementById('progress-bar');
        
        this.clock = new THREE.Clock();
        this.world = null; this.player = null; this.controls = null; this.ui = null; this.audioManager = null;

        // Theme Management - NEW
        this.currentThemeName = localStorage.getItem('kiddoVerseTheme') || 'DEFAULT';
        this.currentTheme = KV.Themes[this.currentThemeName] || KV.Themes.DEFAULT;
        console.log("KiddoVerse: Initializing with theme - " + this.currentTheme.name);

        // Apply initial theme settings that affect renderer/scene directly
        this.renderer.setClearColor(this.currentTheme.skyColor); 
        this.scene.background = this.currentTheme.skyColor;
        this.scene.environment = this.scene.background; // Basic environment from background

        this.currentBlockType = KV.BLOCK_TYPES.PLASTIC_RED; 
    }

    applyThemeSettings(theme) { // Helper to apply theme to scene
        this.scene.background = theme.skyColor;
        this.renderer.setClearColor(theme.skyColor);
        this.scene.environment = this.scene.background;

        if (this.scene.fog) {
            this.scene.fog.color.copy(theme.skyColor);
            this.scene.fog.near = KV.BLOCK_SIZE * (KV.World.prototype.chunkSize || 16) * theme.fogNearFactor;
            this.scene.fog.far = this.camera.far * theme.fogFarFactor;
        } else {
            this.scene.fog = new THREE.Fog(theme.skyColor, KV.BLOCK_SIZE * (KV.World.prototype.chunkSize || 16) * theme.fogNearFactor, this.camera.far * theme.fogFarFactor);
        }

        // Adjust lights based on theme
        const hemisphereLight = this.scene.getObjectByName("hemisphereLight");
        if (hemisphereLight) hemisphereLight.intensity = theme.ambientLightIntensity;
        
        const directionalLight = this.scene.getObjectByName("directionalLight");
        if (directionalLight) directionalLight.intensity = theme.directionalLightIntensity;
    }

    async startGame() {
        if (typeof THREE === 'undefined') return; 
        this.updateProgress(10);
        
        this.applyThemeSettings(this.currentTheme); // Apply theme specific visual settings

        // Lighting
        const hemisphereLight = new THREE.HemisphereLight(0xB1E1FF, 0xB97A20, this.currentTheme.ambientLightIntensity); 
        hemisphereLight.name = "hemisphereLight"; // Name for later access
        this.scene.add(hemisphereLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, this.currentTheme.directionalLightIntensity);
        directionalLight.name = "directionalLight";
        directionalLight.position.set(80, 120, 60); 
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048; directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 10; directionalLight.shadow.camera.far = 300;
        const shadowCamSize = KV.BLOCK_SIZE * (KV.World.prototype.chunkSize || 16) * 2.5; 
        directionalLight.shadow.camera.left = -shadowCamSize; directionalLight.shadow.camera.right = shadowCamSize;
        directionalLight.shadow.camera.top = shadowCamSize; directionalLight.shadow.camera.bottom = -shadowCamSize;
        directionalLight.shadow.bias = -0.0005; 

        this.scene.add(directionalLight); this.scene.add(directionalLight.target); directionalLight.target.position.set(0,0,0);
        this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.updateProgress(20);
        this.audioManager = new KV.AudioManager(this.camera); this.audioManager.setScene(this.scene);
        this.updateProgress(30);

        this.world = new KV.World(this.scene, KV.BLOCK_SIZE, this.currentTheme); // Pass theme to world
        this.updateProgress(40);

        this.player = new KV.Player(this.scene, this.camera, this.world, this.audioManager);
        await this.world.generateInitialChunks(this.player.position); 
        this.updateProgress(80);

        this.controls = new KV.Controls(this.camera, this.renderer.domElement, this.player, this.world, this, this.audioManager);
        this.updateProgress(90);

        this.ui = new KV.UI(this); // UI initializes after theme is set
        this.updateProgress(95);

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').then(reg => console.log('KV SW registered.', reg)).catch(err => console.error('KV SW reg failed:', err));}
        this.updateProgress(100);
        setTimeout(() => { if (this.loadingScreen) this.loadingScreen.style.display = 'none'; }, 300);
        this.animate();
    }

    // Method to change theme - NEW
    // For now, this will reload the page to apply the new theme from scratch.
    // More advanced: dispose old world, create new one in place (complex).
    changeTheme(themeName) {
        if (KV.Themes[themeName] && this.currentThemeName !== themeName) {
            console.log(`KiddoVerse: Changing theme to ${themeName}`);
            localStorage.setItem('kiddoVerseTheme', themeName);
            window.location.reload(); // Simple way to re-initialize with new theme
        } else if (!KV.Themes[themeName]) {
            console.warn(`KiddoVerse: Theme "${themeName}" not found.`);
        }
    }

    updateProgress(percentage) { /* ... (same) ... */ if(this.progressBar) this.progressBar.style.width = percentage + '%';}
    setCurrentBlockType(blockId) { /* ... (same) ... */ this.currentBlockType = blockId; }
    onWindowResize() { /* ... (same) ... */ this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(window.innerWidth, window.innerHeight); this.applyThemeSettings(this.currentTheme); /* Re-apply fog on resize */ }
    animate() { /* ... (same) ... */ requestAnimationFrame(this.animate.bind(this)); const dt = Math.min(this.clock.getDelta(),0.1); if(this.controls)this.controls.update(dt); if(this.player)this.player.update(dt); if(this.world&&this.player)this.world.update(this.player.position); this.renderer.render(this.scene,this.camera); }
}

let kiddoVerseGameInstance;
window.addEventListener('DOMContentLoaded', () => { /* ... (same DOMContentLoaded listener as before) ... */
    const loadingText = document.getElementById('loading-text'); const progressBarContainer = document.getElementById('progress-bar-container');
    if(window.location.protocol==='file:'){if(loadingText)loadingText.innerHTML="KV: Game may not function optimally from file system.<br>Recommend local web server.";}
    if(typeof THREE==='undefined'){if(loadingText)loadingText.textContent='Error: THREE.js library not found.'; if(progressBarContainer)progressBarContainer.style.display='none'; return;}
    kiddoVerseGameInstance = new KiddoVerseGame();
    if(kiddoVerseGameInstance&&typeof kiddoVerseGameInstance.startGame==='function'){ if(typeof KV!=='undefined'&&KV.World&&KV.Player&&KV.Controls&&KV.UI&&KV.AudioManager&&KV.Noise&&KV.BLOCK_DEFINITIONS&&KV.isTouchDevice){kiddoVerseGameInstance.startGame();}else{console.error("KV: Core components missing."); if(loadingText)loadingText.textContent='Error: Core game components missing.'; if(progressBarContainer)progressBarContainer.style.display='none';}}else{if(loadingText&&typeof THREE!=='undefined'){loadingText.textContent='Error: Game initialization failed.';} if(progressBarContainer)progressBarContainer.style.display='none';}
});
console.log("KiddoVerse Themes: Main game script updated for themes.");
