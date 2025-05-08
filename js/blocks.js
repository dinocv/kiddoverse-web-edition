// Global KiddoVerse namespace
var KV = KV || {};

KV.BLOCK_SIZE = 1;

KV.BLOCK_TYPES = {
    AIR: 0,
    // Default Theme Blocks
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5,
    PLASTIC_RED: 6,
    // Space Theme Blocks - NEW
    MOON_ROCK: 7,
    METAL_PANEL: 8,
    ALIEN_GREEN: 9,
};

const PLASTIC_ROUGHNESS = 0.3; // Shinier plastic
const PLASTIC_METALNESS = 0.05;

// Default material properties, can be overridden by theme
const DEFAULT_MATERIAL_PROPS = { roughness: 0.7, metalness: 0.0 };

KV.BLOCK_DEFINITIONS = {
    [KV.BLOCK_TYPES.GRASS]: { id: KV.BLOCK_TYPES.GRASS, name: 'Grass', breakable: true, transparent: false, textures: { top: 'grass_top', bottom: 'dirt', side: 'grass_side' }, materialProps: { roughness: 0.8, metalness: 0.0 } },
    [KV.BLOCK_TYPES.DIRT]: { id: KV.BLOCK_TYPES.DIRT, name: 'Dirt', breakable: true, transparent: false, textures: { all: 'dirt' }, materialProps: { roughness: 0.9, metalness: 0.0 } },
    [KV.BLOCK_TYPES.STONE]: { id: KV.BLOCK_TYPES.STONE, name: 'Stone', breakable: true, transparent: false, textures: { all: 'stone' }, materialProps: { roughness: 0.7, metalness: 0.1 } },
    [KV.BLOCK_TYPES.WOOD]: { id: KV.BLOCK_TYPES.WOOD, name: 'Wood', breakable: true, transparent: false, textures: { top: 'wood_top', bottom: 'wood_top', side: 'wood_side' }, materialProps: { roughness: 0.6, metalness: 0.0 } },
    [KV.BLOCK_TYPES.LEAVES]: { id: KV.BLOCK_TYPES.LEAVES, name: 'Leaves', breakable: true, transparent: true, textures: { all: 'leaves' }, materialProps: { roughness: 0.8, metalness: 0.0, side: THREE.DoubleSide } },
    [KV.BLOCK_TYPES.PLASTIC_RED]: { id: KV.BLOCK_TYPES.PLASTIC_RED, name: 'Red Plastic', breakable: true, transparent: false, textures: { all: 'plastic_red' }, materialProps: { roughness: PLASTIC_ROUGHNESS, metalness: PLASTIC_METALNESS } },
    
    // Space Theme Blocks - NEW
    [KV.BLOCK_TYPES.MOON_ROCK]: {
        id: KV.BLOCK_TYPES.MOON_ROCK, name: 'Moon Rock', breakable: true, transparent: false,
        textures: { all: 'moon_rock_surface' }, // Could have different top/side if desired
        materialProps: { roughness: 0.85, metalness: 0.05 }
    },
    [KV.BLOCK_TYPES.METAL_PANEL]: {
        id: KV.BLOCK_TYPES.METAL_PANEL, name: 'Metal Panel', breakable: true, transparent: false,
        textures: { all: 'metal_panel_light' }, // Could alternate dark/light panels
        materialProps: { roughness: 0.2, metalness: 0.8 } // More metallic
    },
    [KV.BLOCK_TYPES.ALIEN_GREEN]: {
        id: KV.BLOCK_TYPES.ALIEN_GREEN, name: 'Alien Block', breakable: true, transparent: false,
        textures: { all: 'alien_green_block' },
        materialProps: { roughness: 0.5, metalness: 0.1, emissive: '#1A2A0A', emissiveIntensity: 0.2 } // Slight glow
    }
};

KV.blockMaterialsCache = {};

KV.getBlockMaterial = function(textureKey, blockDef) { /* ... (function remains the same as "Modern Lego Visual", it correctly uses blockDef.materialProps) ... */
    const props = blockDef.materialProps || DEFAULT_MATERIAL_PROPS; // Use default if not specified
    const cacheKey = `${textureKey}_r${props.roughness}_m${props.metalness}_t${blockDef.transparent ? 1:0}_s${props.side || THREE.FrontSide}_e${props.emissive || '0'}`;

    if (KV.blockMaterialsCache[cacheKey]) { return KV.blockMaterialsCache[cacheKey]; }
    if (!KV.textures[textureKey]) {
        console.warn(`Texture key "${textureKey}" not found for block "${blockDef.name}". Using fallback material.`);
        const errorMaterial = new THREE.MeshStandardMaterial({ color: 0xff00ff, name: `error_${textureKey}`, roughness: 0.5, metalness: 0.0 });
        KV.blockMaterialsCache[cacheKey] = errorMaterial; return errorMaterial;
    }
    const materialConfig = {
        map: KV.textures[textureKey],
        roughness: props.roughness,
        metalness: props.metalness,
        transparent: blockDef.transparent,
        alphaTest: blockDef.transparent ? 0.1 : 0,
        side: props.side || THREE.FrontSide,
        name: textureKey
    };
    if (props.emissive) {
        materialConfig.emissive = new THREE.Color(props.emissive);
        if (props.emissiveIntensity) materialConfig.emissiveIntensity = props.emissiveIntensity;
    }
    const material = new THREE.MeshStandardMaterial(materialConfig);
    KV.blockMaterialsCache[cacheKey] = material; return material;
};

console.log("KiddoVerse Themes: Blocks definitions updated for space.");
