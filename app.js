// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Orbit controls for pan, zoom, and rotation
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = true;

// Set the camera position
camera.position.set(0, 1, 3); // Set a good starting point for the camera

// Light setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Load the 3D human body model (using a GLTF model)
const loader = new THREE.GLTFLoader();
loader.load(
  new URL("./assets/male_base_mesh.glb", import.meta.url).href,
  (gltf) => {
    const bodyMesh = gltf.scene;

    // Make the body mesh semi-transparent
    // bodyMesh.traverse((child) => {
    //   if (child.isMesh) {
    //     child.material.transparent = true;
    //     child.material.opacity = 0.5; // Semi-transparent
    //   }
    // });

    scene.add(bodyMesh);

    // Fit the camera to the model
    const box = new THREE.Box3().setFromObject(bodyMesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    camera.position.set(center.x, center.y, maxSize * 1.5);
    camera.lookAt(center);

    animate();
  }
);

// Resize handling
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update(); // Update controls for smooth animation
  renderer.render(scene, camera);
}
