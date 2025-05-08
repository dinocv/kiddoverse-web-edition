// Global KiddoVerse namespace
var KV = KV || {};

KV.World = class World {
    constructor(scene, blockSize, theme) { // Added theme parameter
        this.scene = scene;
        this.blockSize = blockSize;
        this.theme = theme; // Store the current theme
        this.chunkSize = 16; 
        this.chunks = {}; 
        this.chunkMeshes = new THREE.Group();
        this.scene.add(this.chunkMeshes);
        this.noise = new KV.Noise(Date.now() + Math.random()*1000); // Seed differently each time

        this.renderDistance = 3; 
        this.verticalRenderDistance = 2; 
        this.lastPlayerChunkX = null; this.lastPlayerChunkY = null; this.lastPlayerChunkZ = null;
        this.maxChunksToKeep = (this.renderDistance*2+3) * (this.renderDistance*2+3) * (this.verticalRenderDistance*2+3);
        this.chunkUnloadDelay = 30000;
        this.maxRebuildsPerFrame = 2; // Can be adjusted based on performance
    }

    async generateInitialChunks(playerPos) { /* ... (same as before, uses internal this.theme) ... */ 
        console.log(`KiddoVerse Themes: Generating initial world chunks for theme: ${this.theme.name}`);
        const playerChunkX = Math.floor(playerPos.x / (this.chunkSize * this.blockSize));
        const playerChunkY = Math.floor(playerPos.y / (this.chunkSize * this.blockSize));
        const playerChunkZ = Math.floor(playerPos.z / (this.chunkSize * this.blockSize));
        this.lastPlayerChunkX = playerChunkX; this.lastPlayerChunkY = playerChunkY; this.lastPlayerChunkZ = playerChunkZ;
        await this.loadUnloadChunks(playerChunkX, playerChunkY, playerChunkZ, true);
        console.log("KiddoVerse Themes: Initial chunks generated.");
    }

    getChunkKey(chunkX, chunkY, chunkZ) { /* ... (same) ... */ return `${chunkX},${chunkY},${chunkZ}`; }

    generateChunkData(chunkX, chunkY, chunkZ) {
        const chunkData = new Uint8Array(this.chunkSize * this.chunkSize * this.chunkSize);
        const themeParams = this.theme.terrainParams; // Get params from current theme

        for (let lx = 0; lx < this.chunkSize; lx++) {
            for (let lz = 0; lz < this.chunkSize; lz++) {
                const worldX = chunkX * this.chunkSize + lx;
                const worldZ = chunkZ * this.chunkSize + lz;

                // Use theme-specific noise parameters
                const heightNoise = this.noise.simplex2(worldX * themeParams.noiseScaleXZ, worldZ * themeParams.noiseScaleXZ);
                const surfaceY = Math.floor(themeParams.baseHeight + heightNoise * themeParams.amplitude);

                for (let ly = 0; ly < this.chunkSize; ly++) {
                    const worldY = chunkY * this.chunkSize + ly;
                    const index = ly * this.chunkSize * this.chunkSize + lz * this.chunkSize + lx;
                    
                    let blockType = KV.BLOCK_TYPES.AIR; // Default to air

                    if (worldY < surfaceY - themeParams.stoneDepth) {
                        blockType = themeParams.blockPalette.deepStone || KV.BLOCK_TYPES.STONE;
                    } else if (worldY < surfaceY) {
                        blockType = themeParams.blockPalette.subSurface || KV.BLOCK_TYPES.DIRT;
                    } else if (worldY === surfaceY) {
                        blockType = themeParams.blockPalette.surface || KV.BLOCK_TYPES.GRASS;
                    }
                    // Basic structure generation example (can be expanded)
                    if (themeParams.structureChance && Math.random() < themeParams.structureChance) {
                        if (worldY === surfaceY + 1 && blockType === KV.BLOCK_TYPES.AIR) { // Place on top of surface blocks
                           // blockType = themeParams.blockPalette.structureBlock || KV.BLOCK_TYPES.WOOD;
                        }
                    }
                    chunkData[index] = blockType;
                }
            }
        }
        return chunkData;
    }

    async ensureChunk(chunkX, chunkY, chunkZ) { /* ... (same, passes internal this.theme if needed by generateChunkData) ... */ 
        const key = this.getChunkKey(chunkX, chunkY, chunkZ);
        if (!this.chunks[key]) {
            const chunkData = this.generateChunkData(chunkX, chunkY, chunkZ); // generateChunkData now uses this.theme
            this.chunks[key] = { x: chunkX, y: chunkY, z: chunkZ, data: chunkData, mesh: null, needsUpdate: true, lastAccessed: Date.now(), isGeneratingMesh: false };
        } else { this.chunks[key].lastAccessed = Date.now(); }
        return this.chunks[key];
    }

    getBlock(worldX, worldY, worldZ) { /* ... (same) ... */ 
        const chunkX = Math.floor(worldX / this.blockSize / this.chunkSize); const chunkY = Math.floor(worldY / this.blockSize / this.chunkSize); const chunkZ = Math.floor(worldZ / this.blockSize / this.chunkSize);
        const lx = Math.floor(worldX / this.blockSize) - chunkX * this.chunkSize; const ly = Math.floor(worldY / this.blockSize) - chunkY * this.chunkSize; const lz = Math.floor(worldZ / this.blockSize) - chunkZ * this.chunkSize;
        const key = this.getChunkKey(chunkX, chunkY, chunkZ); const chunk = this.chunks[key];
        if (!chunk || lx < 0 || lx >= this.chunkSize || ly < 0 || ly >= this.chunkSize || lz < 0 || lz >= this.chunkSize) { return KV.BLOCK_TYPES.AIR; }
        const index = ly * this.chunkSize * this.chunkSize + lz * this.chunkSize + lx; return chunk.data[index];
    }
    setBlock(worldX, worldY, worldZ, blockType) { /* ... (same) ... */ 
        const bx = Math.floor(worldX / this.blockSize); const by = Math.floor(worldY / this.blockSize); const bz = Math.floor(worldZ / this.blockSize);
        const chunkX = Math.floor(bx / this.chunkSize); const chunkY = Math.floor(by / this.chunkSize); const chunkZ = Math.floor(bz / this.chunkSize);
        const lx = bx - chunkX * this.chunkSize; const ly = by - chunkY * this.chunkSize; const lz = bz - chunkZ * this.chunkSize;
        this.ensureChunk(chunkX, chunkY, chunkZ).then(chunk => { if (chunk) { this.setBlockInternal(chunk, lx, ly, lz, blockType); } else { console.error(`Failed to ensure chunk for setBlock.`); } });
    }
    setBlockInternal(chunk, localX, localY, localZ, blockType) { /* ... (same) ... */ 
        if (localX < 0 || localX >= this.chunkSize || localY < 0 || localY >= this.chunkSize || localZ < 0 || localZ >= this.chunkSize) { return; }
        const index = localY * this.chunkSize * this.chunkSize + localZ * this.chunkSize + localX;
        if (chunk.data[index] === blockType) return; chunk.data[index] = blockType; chunk.needsUpdate = true;
        const checkAndUpdateNeighbor = (ox, oy, oz) => { const nk = this.getChunkKey(chunk.x+ox, chunk.y+oy, chunk.z+oz); const nc = this.chunks[nk]; if (nc) nc.needsUpdate = true; };
        if (localX === 0) checkAndUpdateNeighbor(-1,0,0); if (localX === this.chunkSize-1) checkAndUpdateNeighbor(1,0,0); if (localY === 0) checkAndUpdateNeighbor(0,-1,0); if (localY === this.chunkSize-1) checkAndUpdateNeighbor(0,1,0); if (localZ === 0) checkAndUpdateNeighbor(0,0,-1); if (localZ === this.chunkSize-1) checkAndUpdateNeighbor(0,0,1);
    }
    buildChunkMesh(chunk) { /* ... (same as "Modern Lego Visual" / Phase 2, uses KV.getBlockMaterial which is theme-agnostic by itself but gets blockDef) ... */
        if (chunk.isGeneratingMesh) return; chunk.isGeneratingMesh = true;
        if (chunk.mesh) { this.chunkMeshes.remove(chunk.mesh); chunk.mesh.geometry.dispose(); } chunk.mesh = null;
        const positions = []; const normals = []; const uvs = []; const indices = []; const materialGroups = []; let currentIndex = 0; const materials = []; const materialMap = new Map();
        const halfSize = this.blockSize / 2; const CHUNK_ORIGIN_X = chunk.x * this.chunkSize * this.blockSize; const CHUNK_ORIGIN_Y = chunk.y * this.chunkSize * this.blockSize; const CHUNK_ORIGIN_Z = chunk.z * this.chunkSize * this.blockSize;
        for (let ly = 0; ly < this.chunkSize; ly++) { for (let lz = 0; lz < this.chunkSize; lz++) { for (let lx = 0; lx < this.chunkSize; lx++) {
            const blockType = chunk.data[ly*this.chunkSize*this.chunkSize + lz*this.chunkSize + lx]; if (blockType === KV.BLOCK_TYPES.AIR) continue;
            const blockDef = KV.BLOCK_DEFINITIONS[blockType]; if (!blockDef) continue;
            const worldBlockX = chunk.x*this.chunkSize+lx; const worldBlockY = chunk.y*this.chunkSize+ly; const worldBlockZ = chunk.z*this.chunkSize+lz;
            const isNTA = (nbx,nby,nbz)=>{ const nbt=this.getBlock(nbx*this.blockSize,nby*this.blockSize,nbz*this.blockSize); if(nbt===KV.BLOCK_TYPES.AIR)return true; const nd=KV.BLOCK_DEFINITIONS[nbt]; return nd&&nd.transparent; };
            const p = [[-halfSize,-halfSize,-halfSize],[+halfSize,-halfSize,-halfSize],[+halfSize,+halfSize,-halfSize],[-halfSize,+halfSize,-halfSize],[-halfSize,-halfSize,+halfSize],[+halfSize,-halfSize,+halfSize],[+halfSize,+halfSize,+halfSize],[-halfSize,+halfSize,+halfSize]];
            const bcX=lx*this.blockSize+halfSize; const bcY=ly*this.blockSize+halfSize; const bcZ=lz*this.blockSize+halfSize;
            const faceData = [{n:[1,0,0],v:[1,5,6,2],uv:[[0,0],[1,0],[1,1],[0,1]],tk:blockDef.textures.side||blockDef.textures.all},{n:[-1,0,0],v:[4,0,3,7],uv:[[0,0],[1,0],[1,1],[0,1]],tk:blockDef.textures.side||blockDef.textures.all},{n:[0,1,0],v:[3,2,6,7],uv:[[0,0],[1,0],[1,1],[0,1]],tk:blockDef.textures.top||blockDef.textures.all},{n:[0,-1,0],v:[0,4,5,1],uv:[[0,0],[1,0],[1,1],[0,1]],tk:blockDef.textures.bottom||blockDef.textures.all},{n:[0,0,1],v:[5,4,7,6],uv:[[0,0],[1,0],[1,1],[0,1]],tk:blockDef.textures.side||blockDef.textures.all},{n:[0,0,-1],v:[0,1,2,3],uv:[[0,0],[1,0],[1,1],[0,1]],tk:blockDef.textures.side||blockDef.textures.all}];
            for(const face of faceData){ if(isNTA(worldBlockX+face.n[0],worldBlockY+face.n[1],worldBlockZ+face.n[2])){
                let matKey=face.tk; let matIdx=materialMap.get(matKey); if(matIdx===undefined){ const threeMat=KV.getBlockMaterial(matKey,blockDef); materials.push(threeMat); matIdx=materials.length-1; materialMap.set(matKey,matIdx); }
                for(let i=0;i<4;i++){ const v=p[face.v[i]]; positions.push(bcX+v[0],bcY+v[1],bcZ+v[2]); normals.push(...face.n); uvs.push(...face.uv[i]); }
                indices.push(currentIndex,currentIndex+1,currentIndex+2, currentIndex,currentIndex+2,currentIndex+3);
                let curGrp=materialGroups.length>0?materialGroups[materialGroups.length-1]:null; if(!curGrp||curGrp.materialIndex!==matIdx){materialGroups.push({start:indices.length-6,count:6,materialIndex:matIdx});}else{curGrp.count+=6;} currentIndex+=4;
            }}
        }}}
        if(indices.length>0){ const geom=new THREE.BufferGeometry(); geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geom.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3)); geom.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2)); geom.setIndex(indices); for(const grp of materialGroups){geom.addGroup(grp.start,grp.count,grp.materialIndex);} geom.computeBoundingSphere(); const chunkMesh=new THREE.Mesh(geom,materials); chunkMesh.position.set(CHUNK_ORIGIN_X,CHUNK_ORIGIN_Y,CHUNK_ORIGIN_Z); chunkMesh.castShadow=true; chunkMesh.receiveShadow=true; chunk.mesh=chunkMesh; this.chunkMeshes.add(chunk.mesh); }
        chunk.needsUpdate=false; chunk.isGeneratingMesh=false;
    }
    update(playerPosition) { /* ... (same) ... */ 
        const pCX = Math.floor(playerPosition.x/(this.chunkSize*this.blockSize)); const pCY = Math.floor(playerPosition.y/(this.chunkSize*this.blockSize)); const pCZ = Math.floor(playerPosition.z/(this.chunkSize*this.blockSize));
        if(pCX!==this.lastPlayerChunkX||pCY!==this.lastPlayerChunkY||pCZ!==this.lastPlayerChunkZ){this.loadUnloadChunks(pCX,pCY,pCZ); this.lastPlayerChunkX=pCX; this.lastPlayerChunkY=pCY; this.lastPlayerChunkZ=pCZ;}
        let rebuilt=0; for(const key in this.chunks){if(rebuilt>=this.maxRebuildsPerFrame)break; const chunk=this.chunks[key]; if(chunk.needsUpdate&&!chunk.isGeneratingMesh){this.buildChunkMesh(chunk); rebuilt++;}}
    }
    async loadUnloadChunks(currentPlayerChunkX, currentPlayerChunkY, currentPlayerChunkZ, initialLoad = false) { /* ... (same) ... */ 
        const newChunkPromises = []; const activeChunkKeys = new Set(); const loadR = this.renderDistance; const vLoadR = this.verticalRenderDistance;
        for(let dx=-loadR;dx<=loadR;dx++){for(let dz=-loadR;dz<=loadR;dz++){for(let dy=-vLoadR;dy<=vLoadR;dy++){
            const cX=currentPlayerChunkX+dx; const cY=currentPlayerChunkY+dy; const cZ=currentPlayerChunkZ+dz;
            const key=this.getChunkKey(cX,cY,cZ); activeChunkKeys.add(key); if(!this.chunks[key]){newChunkPromises.push(this.ensureChunk(cX,cY,cZ));}else{this.chunks[key].lastAccessed=Date.now();}
        }}}
        if(newChunkPromises.length>0){await Promise.all(newChunkPromises);}
        if(Object.keys(this.chunks).length > this.maxChunksToKeep){
            const sorted=Object.values(this.chunks).sort((a,b)=>a.lastAccessed-b.lastAccessed); let removed=0;
            for(const chunk of sorted){if(Object.keys(this.chunks).length-removed<=this.maxChunksToKeep)break; const key=this.getChunkKey(chunk.x,chunk.y,chunk.z); if(!activeChunkKeys.has(key)&&(Date.now()-chunk.lastAccessed > this.chunkUnloadDelay)){if(chunk.mesh){this.chunkMeshes.remove(chunk.mesh); chunk.mesh.geometry.dispose();} delete this.chunks[key]; removed++;}}
        }
    }
};
console.log("KiddoVerse Themes: World class updated for themes.");
