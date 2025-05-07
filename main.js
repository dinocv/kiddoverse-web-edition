// main.js
console.log("main.js starting...");

// Ensure Three.js is loaded
if (typeof THREE === 'undefined') {
    console.error("THREE.js has not been loaded! Check the script tag in index.html.");
    // Potentially add a user-facing message on the page itself
    document.body.innerHTML = '<div style="color: red; text-align: center; padding-top: 50px;">Error: Required 3D library (Three.js) failed to load. Please check your internet connection or contact support.</div>' + document.body.innerHTML;
} else {
    console.log("THREE.js loaded successfully. Version:", THREE.REVISION);

    let scene, camera, renderer, cube, axesHelper;

    function init() {
        console.log("init() called");

        // 1. Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        console.log("Scene created");

        // 2. Camera
        camera = new THREE.PerspectiveCamera(
            75, // Field of View
            window.innerWidth / window.innerHeight, // Aspect Ratio (will be updated by onWindowResize)
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        camera.position.set(1.5, 2.5, 4); // Slightly different initial camera position for a better view
        camera.lookAt(0, 0.5, 0); // Look at the center of where the cube will be
        console.log("Camera created, position:", camera.position);

        // 3. Renderer
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error("gameCanvas element not found!");
            return; // Stop if canvas is not found
        }
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        // Size will be set by onWindowResize
        console.log("Renderer created");

        // 4. Geometry
        const geometry = new THREE.BoxGeometry(1, 1, 1); // A 1x1x1 cube

        // 5. Material
        const material = new THREE.MeshStandardMaterial({
            color: 0xff0000, // Red
            metalness: 0.2,
            roughness: 0.7
        });
        console.log("Geometry and Material created");

        // 6. Mesh (The Cube)
        cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 0.5, 0); // Place cube so its bottom is at y=0 (0.5 because cube is 1 unit high, origin at center)
        scene.add(cube);
        console.log("Cube created and added to scene at position:", cube.position);

        // 7. Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Soft white light
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
        directionalLight.position.set(5, 10, 7.5);
        // directionalLight.castShadow = true; // We'll enable shadows later
        scene.add(directionalLight);
        console.log("Lights added to scene");

        // Axes Helper
        axesHelper = new THREE.AxesHelper(3); // Length of 3 units for each axis
        axesHelper.position.set(0,0.01,0); // Slightly above ground to prevent z-fighting if we add a plane
        scene.add(axesHelper);
        console.log("AxesHelper added to scene");

        // Event Listeners
        window.addEventListener('resize', onWindowResize, false);
        console.log("Resize event listener added");

        // Initial Setup Calls
        onWindowResize(); // Call once to set initial size of canvas and renderer
        animate(); // Start the animation loop
        console.log("Initial resize and animation loop started.");
    }

    function onWindowResize() {
        console.log("onWindowResize() triggered");
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        const headerElem = document.querySelector('header');
        const controlsBarElem = document.querySelector('.controls-bar');
        
        let availableHeight = window.innerHeight;
        if (headerElem) availableHeight -= headerElem.offsetHeight;
        if (controlsBarElem) availableHeight -= controlsBarElem.offsetHeight;
        
        // Add some padding
        availableHeight -= 40; // 20px top, 20px bottom padding for canvas within main area

        let newWidth = window.innerWidth * 0.95; // Use 95% of window width
        newWidth = Math.min(newWidth, 1200); // Max width for very large screens
        let newHeight = availableHeight;
        newHeight = Math.max(newHeight, 300); // Min height 300px

        // Set canvas style dimensions
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
        
        // Update camera
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();

        // Update renderer
        renderer.setSize(newWidth, newHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // For sharper rendering
        console.log(`Canvas resized to: ${newWidth}x${newHeight}. Renderer size set.`);
    }

    function animate() {
        requestAnimationFrame(animate);

        // Animation for the cube
        if (cube) {
            cube.rotation.x += 0.005;
            cube.rotation.y += 0.007;
        }

        renderer.render(scene, camera);
    }

    // Start the initialization process once the DOM is fully loaded
    if (document.readyState === 'loading') { // Loading hasn't finished yet
        document.addEventListener('DOMContentLoaded', init);
        console.log("DOMContentLoaded event listener added for init.");
    } else { // `DOMContentLoaded` has already fired
        init();
        console.log("DOM already loaded, calling init() directly.");
    }

    console.log("main.js finished executing initial script.");
}
