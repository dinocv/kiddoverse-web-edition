// Global KiddoVerse namespace
var KV = KV || {};

KV.World = class World {
    constructor(scene, blockSize, theme) { // Added theme parameter
        this.scene = scene;
        this.blockSize = blockSize;
        this.theme = theme; // Store the current theme
        this.chunkSize = 16;
        this.chunks = {}; // Store chunk data { data, mesh, needsUpdate, ... }
        this.chunkMeshes = new THREE.Group(); // Parent object for all chunk meshes
        this.scene.add(this.chunkMeshes);
        this.noise = new KV.Noise(Date.now() + Math.random()*1000); // Seed differently each time

        this.renderDistance = 3; // Chunks out in X/Z
        this.verticalRenderDistance = 2; // Chunks up/down
        this.lastPlayerChunkX = null;
        this.lastPlayerChunkY = null;
        this.lastPlayerChunkZ = null;

        // Chunk management parameters
        this.maxChunksToKeep = (this.renderDistance * 2 + 3) * (this.renderDistance * 2 + 3) * (this.verticalRenderDistance * 2 + 3); // Slightly larger than view
        this.chunkUnloadDelay = 30000; // ms before inactive chunks are considered for unloading
        this.maxRebuildsPerFrame = 2; // Limit mesh rebuilds per frame to prevent stutter
    }

    async generateInitialChunks(playerPos) {
        console.log(`KiddoVerse Themes: Generating initial world chunks for theme: ${this.theme.name}`);
        const playerChunkX = Math.floor(playerPos.x / (this.chunkSize * this.blockSize));
        const playerChunkY = Math.floor(playerPos.y / (this.chunkSize * this.blockSize));
        const playerChunkZ = Math.floor(playerPos.z / (this.chunkSize * this.blockSize));

        this.lastPlayerChunkX = playerChunkX;
        this.lastPlayerChunkY = playerChunkY;
        this.lastPlayerChunkZ = playerChunkZ;

        await this.loadUnloadChunks(playerChunkX, playerChunkY, playerChunkZ, true); // Force initial load
        console.log("KiddoVerse Themes: Initial chunks generated.");
    }

    getChunkKey(chunkX, chunkY, chunkZ) {
        return `${chunkX},${chunkY},${chunkZ}`;
    }

    // Generates block data for a chunk based on the current theme
    generateChunkData(chunkX, chunkY, chunkZ) {
        const chunkData = new Uint8Array(this.chunkSize * this.chunkSize * this.chunkSize);
        const themeParams = this.theme.terrainParams; // Get params from current theme

        for (let lx = 0; lx < this.chunkSize; lx++) { // Use lx, ly, lz for local coords within chunk
            for (let lz = 0; lz < this.chunkSize; lz++) {
                const worldX = chunkX * this.chunkSize + lx;
                const worldZ = chunkZ * this.chunkSize + lz;

                // Get base surface height from theme noise settings
                const heightNoise = this.noise.simplex2(worldX * themeParams.noiseScaleXZ, worldZ * themeParams.noiseScaleXZ);
                const surfaceY = Math.floor(themeParams.baseHeight + heightNoise * themeParams.amplitude);

                for (let ly = 0; ly < this.chunkSize; ly++) {
                    const worldY = chunkY * this.chunkSize + ly;
                    const index = ly * this.chunkSize * this.chunkSize + lz * this.chunkSize + lx;

                    let blockType = KV.BLOCK_TYPES.AIR; // Default to air

                    // Determine block type based on height relative to surfaceY and theme palette
                    if (worldY < surfaceY - themeParams.stoneDepth) {
                        blockType = themeParams.blockPalette.deepStone || KV.BLOCK_TYPES.STONE; // Use theme deep stone or default
                    } else if (worldY < surfaceY) {
                        blockType = themeParams.blockPalette.subSurface || KV.BLOCK_TYPES.DIRT; // Use theme sub-surface or default
                    } else if (worldY === surfaceY) {
                        blockType = themeParams.blockPalette.surface || KV.BLOCK_TYPES.GRASS; // Use theme surface or default
                    }
                    // Add more complex logic here later for biomes, caves, structures based on worldY, worldX, worldZ, noise values, theme etc.

                    chunkData[index] = blockType;
                }
            }
        }
        return chunkData;
    }

    // Ensures chunk data exists, generating it if necessary
    async ensureChunk(chunkX, chunkY, chunkZ) {
        const key = this.getChunkKey(chunkX, chunkY, chunkZ);
        if (!this.chunks[key]) {
            const chunkData = this.generateChunkData(chunkX, chunkY, chunkZ); // Generate data based on theme
            this.chunks[key] = {
                x: chunkX, y: chunkY, z: chunkZ,
                data: chunkData,
                mesh: null, // Mesh will be built later
                needsUpdate: true, // Flag for mesh generation
                lastAccessed: Date.now(),
                isGeneratingMesh: false // Flag to prevent concurrent builds
            };
            // Don't await mesh build here, let the update loop handle it
        } else {
            this.chunks[key].lastAccessed = Date.now(); // Update access time if chunk exists
        }
        return this.chunks[key];
    }

    // Get block type at world coordinates
    getBlock(worldX, worldY, worldZ) {
        // Calculate chunk coordinates from world coordinates
        const chunkX = Math.floor(worldX / this.blockSize / this.chunkSize);
        const chunkY = Math.floor(worldY / this.blockSize / this.chunkSize);
        const chunkZ = Math.floor(worldZ / this.blockSize / this.chunkSize);

        // Calculate local coordinates within the chunk
        const lx = Math.floor(worldX / this.blockSize) - chunkX * this.chunkSize;
        const ly = Math.floor(worldY / this.blockSize) - chunkY * this.chunkSize;
        const lz = Math.floor(worldZ / this.blockSize) - chunkZ * this.chunkSize;

        const key = this.getChunkKey(chunkX, chunkY, chunkZ);
        const chunk = this.chunks[key];

        // Check if chunk exists and local coordinates are valid
        if (!chunk || lx < 0 || lx >= this.chunkSize || ly < 0 || ly >= this.chunkSize || lz < 0 || lz >= this.chunkSize) {
            return KV.BLOCK_TYPES.AIR; // Outside loaded chunks or invalid coords
        }

        // Calculate index in the 1D chunk data array
        const index = ly * this.chunkSize * this.chunkSize + lz * this.chunkSize + lx;
        return chunk.data[index];
    }

    // Set block type at world coordinates (handles ensuring chunk exists)
    setBlock(worldX, worldY, worldZ, blockType) {
        // Calculate block coordinates
        const bx = Math.floor(worldX / this.blockSize);
        const by = Math.floor(worldY / this.blockSize);
        const bz = Math.floor(worldZ / this.blockSize);

        // Calculate chunk coordinates
        const chunkX = Math.floor(bx / this.chunkSize);
        const chunkY = Math.floor(by / this.chunkSize);
        const chunkZ = Math.floor(bz / this.chunkSize);

        // Calculate local coordinates
        const lx = bx - chunkX * this.chunkSize;
        const ly = by - chunkY * this.chunkSize;
        const lz = bz - chunkZ * this.chunkSize;

        // Ensure the target chunk exists before modifying
        this.ensureChunk(chunkX, chunkY, chunkZ).then(chunk => {
            if (chunk) {
                this.setBlockInternal(chunk, lx, ly, lz, blockType);
            } else {
                 console.error(`Failed to ensure chunk ${this.getChunkKey(chunkX, chunkY, chunkZ)} for setBlock operation.`);
            }
        });
    }

    // Internal function to set block data and flag updates
    setBlockInternal(chunk, localX, localY, localZ, blockType) {
        // Validate local coordinates
        if (localX < 0 || localX >= this.chunkSize ||
            localY < 0 || localY >= this.chunkSize ||
            localZ < 0 || localZ >= this.chunkSize) {
            console.error("Set block internal: Local coordinates out of bounds.", localX, localY, localZ);
            return;
        }

        const index = localY * this.chunkSize * this.chunkSize +
                      localZ * this.chunkSize +
                      localX;

        // Only update if the block type actually changes
        if (chunk.data[index] === blockType) return;

        chunk.data[index] = blockType;
        chunk.needsUpdate = true; // Mark this chunk for remeshing

        // Mark adjacent chunks for remeshing if the block is on a border
        const checkAndUpdateNeighbor = (offsetX, offsetY, offsetZ) => {
            const neighborKey = this.getChunkKey(chunk.x + offsetX, chunk.y + offsetY, chunk.z + offsetZ);
            const neighborChunk = this.chunks[neighborKey];
            if (neighborChunk) {
                neighborChunk.needsUpdate = true;
            }
        };

        if (localX === 0)                   checkAndUpdateNeighbor(-1, 0, 0);
        if (localX === this.chunkSize - 1)  checkAndUpdateNeighbor( 1, 0, 0);
        if (localY === 0)                   checkAndUpdateNeighbor( 0,-1, 0);
        if (localY === this.chunkSize - 1)  checkAndUpdateNeighbor( 0, 1, 0);
        if (localZ === 0)                   checkAndUpdateNeighbor( 0, 0,-1);
        if (localZ === this.chunkSize - 1)  checkAndUpdateNeighbor( 0, 0, 1);
    }

    // Builds the visual mesh for a chunk using optimized geometry
    buildChunkMesh(chunk) {
        // Ensure THREE is loaded before proceeding
        if (typeof THREE === 'undefined') {
             console.error("Cannot build chunk mesh: THREE is not defined.");
             return;
        }
        if (chunk.isGeneratingMesh) return; // Prevent concurrent builds for the same chunk
        chunk.isGeneratingMesh = true;

        // Dispose old geometry and remove mesh if it exists
        if (chunk.mesh) {
            this.chunkMeshes.remove(chunk.mesh);
            chunk.mesh.geometry.dispose();
            // Materials are cached globally, so no need to dispose them here
        }
        chunk.mesh = null;

        // Geometry data arrays
        const positions = []; const normals = []; const uvs = []; const indices = [];
        const materialGroups = []; // Tracks which faces use which material
        let currentIndex = 0; // Tracks vertex count for indexing
        const materials = []; // Array of unique THREE.Material instances used in this chunk
        const materialMap = new Map(); // Maps textureKey to index in `materials` array

        const halfSize = this.blockSize / 2;
        // Calculate the world origin of this chunk (minimum corner)
        const CHUNK_ORIGIN_X = chunk.x * this.chunkSize * this.blockSize;
        const CHUNK_ORIGIN_Y = chunk.y * this.chunkSize * this.blockSize;
        const CHUNK_ORIGIN_Z = chunk.z * this.chunkSize * this.blockSize;

        // Iterate through each block position in the chunk
        for (let ly = 0; ly < this.chunkSize; ly++) {
            for (let lz = 0; lz < this.chunkSize; lz++) {
                for (let lx = 0; lx < this.chunkSize; lx++) {
                    const blockType = chunk.data[ly * this.chunkSize * this.chunkSize + lz * this.chunkSize + lx];
                    if (blockType === KV.BLOCK_TYPES.AIR) continue; // Skip air blocks

                    const blockDef = KV.BLOCK_DEFINITIONS[blockType];
                    if (!blockDef) continue; // Skip undefined block types

                    // Calculate world coordinates of the current block
                    const worldBlockX = chunk.x * this.chunkSize + lx;
                    const worldBlockY = chunk.y * this.chunkSize + ly;
                    const worldBlockZ = chunk.z * this.chunkSize + lz;

                    // Helper function to check if a neighbor block is transparent or air
                    const isNeighborTransparentOrAir = (nBlockX, nBlockY, nBlockZ) => {
                        const neighborBlockType = this.getBlock(nBlockX * this.blockSize, nBlockY * this.blockSize, nBlockZ * this.blockSize);
                        if (neighborBlockType === KV.BLOCK_TYPES.AIR) return true;
                        const neighborDef = KV.BLOCK_DEFINITIONS[neighborBlockType];
                        return neighborDef && neighborDef.transparent;
                    };

                    // Define vertex positions relative to the block's center
                    const p = [
                        [-halfSize, -halfSize, -halfSize], [+halfSize, -halfSize, -halfSize], [+halfSize, +halfSize, -halfSize], [-halfSize, +halfSize, -halfSize],
                        [-halfSize, -halfSize, +halfSize], [+halfSize, -halfSize, +halfSize], [+halfSize, +halfSize, +halfSize], [-halfSize, +halfSize, +halfSize]
                    ];
                    // Calculate block center relative to chunk origin
                    const blockCenterX = lx * this.blockSize + halfSize;
                    const blockCenterY = ly * this.blockSize + halfSize;
                    const blockCenterZ = lz * this.blockSize + halfSize;

                    // Define data for each of the 6 faces
                    const faceData = [ // [normal], [vertex indices from p], [uv coords], texture_key
                        { n: [ 1, 0, 0], v: [1, 5, 6, 2], uv: [[0, 0], [1, 0], [1, 1], [0, 1]], tk: blockDef.textures.side || blockDef.textures.all }, // Right (+X)
                        { n: [-1, 0, 0], v: [4, 0, 3, 7], uv: [[0, 0], [1, 0], [1, 1], [0, 1]], tk: blockDef.textures.side || blockDef.textures.all }, // Left (-X)
                        { n: [ 0, 1, 0], v: [3, 2, 6, 7], uv: [[0, 0], [1, 0], [1, 1], [0, 1]], tk: blockDef.textures.top || blockDef.textures.all },   // Top (+Y)
                        { n: [ 0,-1, 0], v: [0, 4, 5, 1], uv: [[0, 0], [1, 0], [1, 1], [0, 1]], tk: blockDef.textures.bottom || blockDef.textures.all },// Bottom (-Y)
                        { n: [ 0, 0, 1], v: [5, 4, 7, 6], uv: [[0, 0], [1, 0], [1, 1], [0, 1]], tk: blockDef.textures.side || blockDef.textures.all }, // Front (+Z)
                        { n: [ 0, 0,-1], v: [0, 1, 2, 3], uv: [[0, 0], [1, 0], [1, 1], [0, 1]], tk: blockDef.textures.side || blockDef.textures.all }  // Back (-Z)
                    ];

                    // Check each face for visibility
                    for (const face of faceData) {
                        const neighborX = worldBlockX + face.n[0];
                        const neighborY = worldBlockY + face.n[1];
                        const neighborZ = worldBlockZ + face.n[2];

                        // If the face is exposed (neighbor is air or transparent), add it to the geometry
                        if (isNeighborTransparentOrAir(neighborX, neighborY, neighborZ)) {
                            // Get the correct material for this face's texture
                            let materialKey = face.tk;
                            let materialIndex = materialMap.get(materialKey);
                            // If this material hasn't been used in this chunk yet, create/get it and add to lists
                            if (materialIndex === undefined) {
                                const threeMaterial = KV.getBlockMaterial(materialKey, blockDef);
                                materials.push(threeMaterial);
                                materialIndex = materials.length - 1;
                                materialMap.set(materialKey, materialIndex);
                            }

                            // Add vertices, normals, and UVs for this face (quad = 4 vertices)
                            for (let i = 0; i < 4; i++) {
                                const vertexIndex = face.v[i];
                                const vertex = p[vertexIndex];
                                positions.push(blockCenterX + vertex[0], blockCenterY + vertex[1], blockCenterZ + vertex[2]);
                                normals.push(...face.n);
                                uvs.push(...face.uv[i]);
                            }
                            // Add indices for the two triangles forming the quad
                            indices.push(currentIndex, currentIndex + 1, currentIndex + 2);
                            indices.push(currentIndex, currentIndex + 2, currentIndex + 3);

                            // Add or update material group info
                            let currentGroup = materialGroups.length > 0 ? materialGroups[materialGroups.length - 1] : null;
                            if (!currentGroup || currentGroup.materialIndex !== materialIndex) {
                                // Start a new material group
                                materialGroups.push({ start: indices.length - 6, count: 6, materialIndex: materialIndex });
                            } else {
                                // Extend the count of the current material group
                                currentGroup.count += 6;
                            }
                            currentIndex += 4; // Increment vertex count for next face
                        }
                    }
                } // End lx loop
            } // End lz loop
        } // End ly loop

        // If any geometry was generated, create the mesh
        if (indices.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geometry.setIndex(indices);

            // Assign material groups to the geometry
            for (const group of materialGroups) {
                geometry.addGroup(group.start, group.count, group.materialIndex);
            }
            geometry.computeBoundingSphere(); // Help with frustum culling

            // Create the mesh with the generated geometry and collected materials
            const chunkMesh = new THREE.Mesh(geometry, materials);
            // Position the mesh at the chunk's origin (vertices are relative to chunk origin)
            chunkMesh.position.set(CHUNK_ORIGIN_X, CHUNK_ORIGIN_Y, CHUNK_ORIGIN_Z);
            chunkMesh.castShadow = true;
            chunkMesh.receiveShadow = true;

            chunk.mesh = chunkMesh; // Assign mesh to chunk object
            this.chunkMeshes.add(chunk.mesh); // Add mesh to the scene graph
        }

        chunk.needsUpdate = false; // Mark as updated
        chunk.isGeneratingMesh = false; // Release lock
    }

    // Update loop called each frame
    update(playerPosition) {
        // Check if player has moved to a new chunk
        const playerChunkX = Math.floor(playerPosition.x / (this.chunkSize * this.blockSize));
        const playerChunkY = Math.floor(playerPosition.y / (this.chunkSize * this.blockSize));
        const playerChunkZ = Math.floor(playerPosition.z / (this.chunkSize * this.blockSize));

        if (playerChunkX !== this.lastPlayerChunkX ||
            playerChunkY !== this.lastPlayerChunkY ||
            playerChunkZ !== this.lastPlayerChunkZ) {
            // Trigger loading/unloading of chunks asynchronously
            this.loadUnloadChunks(playerChunkX, playerChunkY, playerChunkZ);
            this.lastPlayerChunkX = playerChunkX;
            this.lastPlayerChunkY = playerChunkY;
            this.lastPlayerChunkZ = playerChunkZ;
        }

        // Process a limited number of chunk mesh rebuilds per frame
        let rebuiltCount = 0;
        for (const key in this.chunks) {
            if (rebuiltCount >= this.maxRebuildsPerFrame) break;
            const chunk = this.chunks[key];
            if (chunk.needsUpdate && !chunk.isGeneratingMesh) {
                this.buildChunkMesh(chunk); // Build the mesh for chunks flagged for update
                rebuiltCount++;
            }
        }
    }

    // Load new chunks and unload old ones based on player position
    async loadUnloadChunks(currentPlayerChunkX, currentPlayerChunkY, currentPlayerChunkZ, initialLoad = false) {
        const newChunkPromises = [];
        const activeChunkKeys = new Set(); // Keep track of chunks that should be loaded
        const loadRadius = this.renderDistance;
        const verticalLoadRadius = this.verticalRenderDistance;

        // Identify chunks within render distance
        for (let dx = -loadRadius; dx <= loadRadius; dx++) {
            for (let dz = -loadRadius; dz <= loadRadius; dz++) {
                 for (let dy = -verticalLoadRadius; dy <= verticalLoadRadius; dy++) {
                    const chunkX = currentPlayerChunkX + dx;
                    const chunkY = currentPlayerChunkY + dy;
                    const chunkZ = currentPlayerChunkZ + dz;
                    const key = this.getChunkKey(chunkX, chunkY, chunkZ);
                    activeChunkKeys.add(key);
                    // If chunk doesn't exist, schedule it for creation
                    if (!this.chunks[key]) {
                        newChunkPromises.push(this.ensureChunk(chunkX, chunkY, chunkZ));
                    } else {
                        this.chunks[key].lastAccessed = Date.now(); // Update access time if it exists
                    }
                }
            }
        }

        // Wait for all new chunk data to be generated/ensured
        if (newChunkPromises.length > 0) {
            await Promise.all(newChunkPromises);
        }

        // Unload chunks that are too far or haven't been accessed recently (if cache is full)
        if (Object.keys(this.chunks).length > this.maxChunksToKeep) {
            // Sort chunks by last accessed time (oldest first)
            const sortedChunks = Object.values(this.chunks).sort((a, b) => a.lastAccessed - b.lastAccessed);
            let removedCount = 0;
            for (const chunk of sortedChunks) {
                // Stop if we've removed enough chunks
                if (Object.keys(this.chunks).length - removedCount <= this.maxChunksToKeep) break;

                const key = this.getChunkKey(chunk.x, chunk.y, chunk.z);
                // Check if chunk is outside the active radius AND hasn't been accessed recently
                if (!activeChunkKeys.has(key) && (Date.now() - chunk.lastAccessed > this.chunkUnloadDelay)) {
                    // Dispose mesh and remove chunk data
                    if (chunk.mesh) {
                        this.chunkMeshes.remove(chunk.mesh);
                        chunk.mesh.geometry.dispose();
                        // Materials are cached globally
                    }
                    delete this.chunks[key];
                    removedCount++;
                    // console.log(`KV Themes: Unloaded chunk ${key} (cache strategy)`);
                }
            }
        }
    }
};
console.log("KiddoVerse Themes: World class updated for themes.");
