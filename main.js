// main.js - Kiddoverse Genesis
console.log("[MAIN.JS] Script execution started.");

// Global variables for Three.js components
let scene, camera, renderer, cube, axesHelper;

// Function to initialize the 3D environment
function initThreeJS() {
    console.log("[INIT] Initializing Three.js environment...");

    // 1. Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.error("[INIT_ERROR] THREE.js library is NOT loaded. Check the script tag in index.html.");
        // Visual error indication on canvas
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.style.backgroundColor = 'red';
            const errorMsg = document.createElement('p');
            errorMsg.textContent = 'Error: 3D Library (THREE.js) failed to load. Check console (F12).';
            errorMsg.style.color = 'white';
            errorMsg.style.position = 'absolute';
            errorMsg.style.top = '50%';
            errorMsg.style.left = '50%';
            errorMsg.style.transform = 'translate(-50%, -50%)';
            errorMsg.style.backgroundColor = 'rgba(0,0,0,0.7)';
            errorMsg.style.padding = '10px';
            errorMsg.style.borderRadius = '5px';
            canvas.parentNode.insertBefore(errorMsg, canvas.nextSibling);
        }
        return; // Stop initialization
    }
    console.log(`[INIT] THREE.js Version: ${THREE.REVISION} loaded successfully.`);

    // 2. Scene: The container for all 3D objects
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Pleasant sky blue
    console.log("[INIT] Scene created with sky blue background.");

    // 3. Camera: The viewpoint into the scene
    const canvasElement = document.getElementById('gameCanvas');
    camera = new THREE.PerspectiveCamera(
        75, // Field of View (degrees)
        canvasElement.clientWidth / canvasElement.clientHeight, // Aspect Ratio (will be updated on resize)
        0.1,  // Near clipping plane
        1000  // Far clipping plane
    );
    camera.position.set(1.5, 2.5, 4); // Positioned to see the origin and cube
    camera.lookAt(0, 0.5, 0);      // Looking at the center of where the cube will be
    console.log(`[INIT] PerspectiveCamera created. Position: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})`);

    // 4. Renderer: Draws the scene onto the canvas
    renderer = new THREE.WebGLRenderer({
        canvas: canvasElement,
        antialias: true // For smoother edges
    });
    // Size will be set by onWindowResize and initially
    console.log("[INIT] WebGLRenderer created and attached to canvas.");

    // 5. Geometry & Material for our first cube
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1); // 1x1x1 unit cube
    const cubeMaterial = new THREE.MeshStandardMaterial({
        color: 0xE74C3C, // A nice, vibrant red
        metalness: 0.3,
        roughness: 0.6
    });
    console.log("[INIT] Cube geometry and material created.");

    // 6. Mesh: The actual 3D object (our cube)
    cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(0, 0.5, 0); // Positioned so its base is at y=0
    scene.add(cube);
    console.log(`[INIT] Cube mesh created and added to scene at position: (${cube.position.x}, ${cube.position.y}, ${cube.position.z})`);

    // 7. Lights: To illuminate the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft ambient light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Simulates sunlight
    directionalLight.position.set(5, 10, 7); // Position of the light source
    scene.add(directionalLight);
    console.log("[INIT] Ambient and Directional lights added to scene.");

    // 8. Axes Helper: Visual guide for X, Y, Z axes
    axesHelper = new THREE.AxesHelper(2.5); // Length of 2.5 units for each axis
    axesHelper.position.set(0, 0.01, 0); // Slightly above ground
    scene.add(axesHelper);
    console.log("[INIT] AxesHelper added to scene.");

    // Event Listener for window resize
    window.addEventListener('resize', onWindowResize, false);
    console.log("[INIT] Window resize event listener attached.");

    // Initial Setup Calls
    onWindowResize(); // Set initial size
    animate(); // Start the rendering loop
    console.log("[INIT] Initial canvas size set and animation loop started. Kiddoverse Genesis Block should be visible!");
}

// Function to handle window resize events
function onWindowResize() {
    console.log("[RESIZE] Window resize event detected.");
    const canvas = document.getElementById('gameCanvas');
    if (!canvas || !camera || !renderer) {
        console.warn("[RESIZE] Canvas, camera, or renderer not ready. Aborting resize.");
        return;
    }

    const headerElem = document.querySelector('header');
    const controlsBarElem = document.querySelector('.controls-bar');

    let availableHeight = window.innerHeight;
    if (headerElem) availableHeight -= headerElem.offsetHeight;
    if (controlsBarElem) availableHeight -= controlsBarElem.offsetHeight;

    // Define padding for the main content area around the canvas
    const mainPaddingVertical = 30; // Total vertical padding (e.g., 15px top + 15px bottom)
    const mainPaddingHorizontal = 30; // Total horizontal padding

    availableHeight -= mainPaddingVertical;

    // Calculate available width based on parent container (main)
    let newWidth = canvas.parentNode.clientWidth - mainPaddingHorizontal;
    newWidth = Math.min(newWidth, 1800); // Max sensible width
    newWidth = Math.max(newWidth, 300); // Min sensible width

    let newHeight = availableHeight;
    newHeight = Math.max(newHeight, 250); // Min sensible height

    // Apply dimensions to canvas style (for display)
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;

    // Update camera aspect ratio
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    // Update renderer drawing buffer size
    renderer.setSize(newWidth, newHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // For crisp rendering on high DPI

    console.log(`[RESIZE] Canvas display set to: ${newWidth}px x ${newHeight}px. Renderer buffer updated.`);
}

// Function for the animation/rendering loop
function animate() {
    requestAnimationFrame(animate);

    // Animation for the cube
    if (cube) {
        cube.rotation.x += 0.004;
        cube.rotation.y += 0.006;
    }

    // Render the scene!
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ---- Main Execution ----
// Wait for the DOM to be fully loaded before initializing Three.js
if (document.readyState === 'loading') {
    console.log("[MAIN.JS] DOM not fully loaded. Attaching DOMContentLoaded listener for initThreeJS.");
    document.addEventListener('DOMContentLoaded', initThreeJS);
} else {
    console.log("[MAIN.JS] DOM already loaded. Calling initThreeJS directly.");
    initThreeJS(); // DOM is already ready
}

console.log("[MAIN.JS] Script execution finished. initThreeJS() scheduled or called.");
