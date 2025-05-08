// Global KiddoVerse namespace
var KV = KV || {};

// ... (isTouchDevice, textureLoader, textureCache, generatedTextureCache, createBeveledTexture, loadTexture functions remain the same as "Modern Lego Visual" phase) ...
KV.isTouchDevice = function() { return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)); };
KV.textureLoader = new THREE.TextureLoader(); KV.textureCache = {}; KV.generatedTextureCache = {};
KV.createBeveledTexture = function(cacheKey, color, size = 64, bevelSize = 3, lightColor = 'rgba(255,255,255,0.3)', darkColor = 'rgba(0,0,0,0.2)') { /* ... full function ... */
    if (KV.generatedTextureCache[cacheKey]) { return KV.generatedTextureCache[cacheKey]; }
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = lightColor; ctx.lineWidth = bevelSize;
    ctx.beginPath(); ctx.moveTo(bevelSize / 2, size - bevelSize / 2); ctx.lineTo(bevelSize / 2, bevelSize / 2); ctx.lineTo(size - bevelSize / 2, bevelSize / 2); ctx.stroke();
    ctx.strokeStyle = darkColor;
    ctx.beginPath(); ctx.moveTo(bevelSize / 2, size - bevelSize / 2); ctx.lineTo(size - bevelSize / 2, size - bevelSize / 2); ctx.lineTo(size - bevelSize / 2, bevelSize / 2); ctx.stroke();
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
    KV.generatedTextureCache[cacheKey] = texture; return texture;
};
KV.loadTexture = function(path) { if (KV.textureCache[path]) { return KV.textureCache[path]; } const texture = KV.textureLoader.load(path, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; }, undefined, (err) => { console.error(`Failed to load texture: ${path}`, err); }); texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter; KV.textureCache[path] = texture; return texture; };


KV.textures = {
    // Default Theme Textures
    grass_top: KV.createBeveledTexture('gen_grass_top', '#6A994E', 64, 2),
    grass_side: KV.createBeveledTexture('gen_grass_side', '#A7C957', 64, 2),
    dirt: KV.createBeveledTexture('gen_dirt', '#78574D', 64, 2),
    stone: KV.createBeveledTexture('gen_stone', '#8A8A8A', 64, 2),
    wood_side: KV.createBeveledTexture('gen_wood_side', '#6F4E37', 64, 3),
    wood_top: KV.createBeveledTexture('gen_wood_top', '#8B5A2B', 64, 2),
    leaves: KV.createBeveledTexture('gen_leaves', '#556B2F', 64, 1),
    plastic_red: KV.createBeveledTexture('gen_plastic_red', '#D90429', 64, 4, 'rgba(255,255,255,0.4)', 'rgba(0,0,0,0.3)'),

    // Space Theme Textures - NEW
    moon_rock_surface: KV.createBeveledTexture('gen_moon_rock_surface', '#A0A0B0', 64, 2, 'rgba(200,200,220,0.2)', 'rgba(50,50,60,0.2)'), // Light grey with subtle craters/texture
    moon_rock_deep: KV.createBeveledTexture('gen_moon_rock_deep', '#707080', 64, 2),    // Darker grey for under-surface
    metal_panel_light: KV.createBeveledTexture('gen_metal_panel_light', '#B0B5B8', 64, 1, 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.2)'), // Light metallic panel
    metal_panel_dark: KV.createBeveledTexture('gen_metal_panel_dark', '#656A6E', 64, 1),   // Dark metallic panel
    alien_green_block: KV.createBeveledTexture('gen_alien_green', '#4CAF50', 64, 3, 'rgba(120,255,120,0.3)', 'rgba(0,80,0,0.3)') // For alien structures
};

console.log("KiddoVerse Themes: Utils loaded with space textures.");

KV.getIntersection = function(camera, targetObjects, distanceLimit = Infinity) { /* ... (same) ... */
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(0, 0); raycaster.setFromCamera(pointer, camera); raycaster.far = distanceLimit; const intersects = raycaster.intersectObjects(targetObjects, true); if (intersects.length > 0) { return intersects[0]; } return null;
};
