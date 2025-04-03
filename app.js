// Add state variables for region drawing (raycast mode)
let isDrawing = false;
let regionVertices = [];

///------------------------

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

// Add raycaster and mouse for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let raycastMode = false; // Flag to track if raycast mode is enabled

// Event listener for keydown to enable raycast mode
window.addEventListener("keydown", (event) => {
  if (event.key === "r" || event.key === "R") {
    raycastMode = true;
    document.body.style.cursor = "crosshair";
    controls.enabled = false;
  }
});

// Event listener for keyup to disable raycast mode
window.addEventListener("keyup", (event) => {
  if (event.key === "r" || event.key === "R") {
    raycastMode = false;
    document.body.style.cursor = "auto";
    controls.enabled = true;
    if (isDrawing && regionVertices.length > 2) {
      closeRegion();
    }
    isDrawing = false;
  }
});

// Function to get the vertices of a face
function getFaceVertices(geometry, face) {
  const position = geometry.attributes.position; // Access the position attribute of the geometry
  const vertices = [
    new THREE.Vector3().fromBufferAttribute(position, face.a), // Vertex A
    new THREE.Vector3().fromBufferAttribute(position, face.b), // Vertex B
    new THREE.Vector3().fromBufferAttribute(position, face.c), // Vertex C
  ];
  return vertices;
}

// Event listener for mouse clicks
// Event listener for mouse clicks
window.addEventListener("click", (event) => {
  if (!raycastMode) return; // Only proceed if raycast mode is enabled

  // Convert mouse position to normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Perform raycasting
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(scene, true); // Check all child objects

  if (intersects.length > 0) {
    const intersect = intersects[0]; // Get the first intersection
    const face = intersect.face; // The intersected face
    const geometry = intersect.object.geometry; // The geometry of the mesh

    // Highlight the selected face
    highlightFace(geometry, face, intersect.object);

    // Log the vertices of the selected face
    const vertices = getFaceVertices(geometry, face);
    console.log("Selected vertices:", vertices);
  }
});

// Function to highlight a face
function highlightFace(geometry, face, mesh) {
  // Get or create color attribute
  let colorAttribute = geometry.attributes.color;
  if (!colorAttribute) {
    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    // Initialize with white color
    for (let i = 0; i < colors.length; i++) {
      colors[i] = 1.0;
    }
    colorAttribute = new THREE.BufferAttribute(colors, 3);
    geometry.setAttribute("color", colorAttribute);
  }

  // Highlight the selected face in red
  colorAttribute.setXYZ(face.a, 1, 0, 0);
  colorAttribute.setXYZ(face.b, 1, 0, 0);
  colorAttribute.setXYZ(face.c, 1, 0, 0);

  colorAttribute.needsUpdate = true;

  // Ensure the material uses vertex colors
  if (!mesh.material.vertexColors) {
    mesh.material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      flatShading: true,
    });
  }

  mesh.material.needsUpdate = true;
}

/// -------- DRAWWWWING

// Event listener for mouse down to start drawing
window.addEventListener("mousedown", (event) => {
  if (!raycastMode) return;

  if (regionVertices.length > 0) {
    clearSelection();
  }

  // Start drawing
  isDrawing = true;
  regionVertices = []; // Clear previous region

  // Add the first point
  addPointToRegion(event);
});

// Event listener for mouse move while drawing
window.addEventListener("mousemove", (event) => {
  if (!raycastMode || !isDrawing) return;

  // Add points as the mouse moves
  addPointToRegion(event);
});

// Event listener for mouse up to end drawing
window.addEventListener("mouseup", (event) => {
  if (!raycastMode || !isDrawing) return;

  // End drawing
  if (regionVertices.length > 2) {
    closeRegion();
  }

  isDrawing = false;
});

// Function to add a point to the region
function addPointToRegion(event) {
  // Convert mouse position to normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Perform raycasting
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(scene, true);

  if (intersects.length > 0) {
    const intersect = intersects[0];
    const face = intersect.face;
    const geometry = intersect.object.geometry;
    const mesh = intersect.object;

    // Get vertices of the face
    const vertices = getFaceVertices(geometry, face);

    // Add the face vertices to the region
    for (const vertex of vertices) {
      // Check if the vertex is already in the region (avoid duplicates)
      if (!isVertexInRegion(vertex)) {
        regionVertices.push(vertex);

        // Highlight the vertex
        highlightVertex(geometry, vertex, mesh);
      }
    }
    // Also highlight the face itself to ensure continuous coverage
    highlightFace(geometry, face, mesh);
  }
}

// Function to check if a vertex is already in the region
function isVertexInRegion(vertex) {
  const threshold = 0.001; // Small threshold for float comparison
  return regionVertices.some(
    (v) =>
      Math.abs(v.x - vertex.x) < threshold &&
      Math.abs(v.y - vertex.y) < threshold &&
      Math.abs(v.z - vertex.z) < threshold
  );
}

// Function to close the region

function closeRegion() {
  if (regionVertices.length < 3) return; // Need at least 3 vertices for a valid region

  // Find all the meshes that have vertices in our region
  const affectedMeshes = new Set();
  scene.traverse((object) => {
    if (object.isMesh) {
      affectedMeshes.add(object);
    }
  });

  // Process each affected mesh
  affectedMeshes.forEach((mesh) => {
    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    // Get or create color attribute
    let colorAttribute = geometry.attributes.color;
    if (!colorAttribute) {
      const colors = new Float32Array(position.count * 3);
      // Initialize with white color
      for (let i = 0; i < colors.length; i++) {
        colors[i] = 1.0;
      }
      colorAttribute = new THREE.BufferAttribute(colors, 3);
      geometry.setAttribute("color", colorAttribute);
    }

    // Create a simple polygon from the selected vertices for point-in-polygon test
    const polygon2D = createSimplified2DPolygon(regionVertices);

    // Check all the faces in the geometry to see if they're inside the region
    for (let i = 0; i < position.count; i += 3) {
      const v1 = new THREE.Vector3().fromBufferAttribute(position, i);
      const v2 = new THREE.Vector3().fromBufferAttribute(position, i + 1);
      const v3 = new THREE.Vector3().fromBufferAttribute(position, i + 2);

      // Get the center of the face
      const center = new THREE.Vector3()
        .add(v1)
        .add(v2)
        .add(v3)
        .divideScalar(3);

      // Project to 2D for simpler containment test
      const point2D = projectTo2D(center);

      // If the face center is inside our region, color the whole face
      if (isPointInPolygon(point2D, polygon2D)) {
        // Color all three vertices of the face
        colorAttribute.setXYZ(i, 1, 0, 0);
        colorAttribute.setXYZ(i + 1, 1, 0, 0);
        colorAttribute.setXYZ(i + 2, 1, 0, 0);
      }
    }

    colorAttribute.needsUpdate = true;

    // Ensure the material uses vertex colors
    if (!mesh.material.vertexColors) {
      mesh.material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        flatShading: true,
      });
    }
  });

  // Display the vertices in the upper right
  displayVertices(regionVertices);
}

// Helper function to create a simplified 2D polygon for containment tests
function createSimplified2DPolygon(vertices3D) {
  return vertices3D.map((v) => projectTo2D(v));
}

// Helper function to project a 3D point onto a 2D plane
function projectTo2D(point3D) {
  // You can choose different projection planes based on your needs
  // Here we'll use XY plane for simplicity
  return { x: point3D.x, y: point3D.y };
}

// Helper function to check if a point is inside a polygon
function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Function to highlight a vertex
function highlightVertex(geometry, vertex, mesh) {
  // Find the index of this vertex in the geometry
  const position = geometry.attributes.position;
  let vertexIndex = -1;

  for (let i = 0; i < position.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(position, i);
    if (vertex.distanceTo(v) < 0.0001) {
      vertexIndex = i;
      break;
    }
  }

  if (vertexIndex === -1) return;

  // Get or create color attribute
  let colorAttribute = geometry.attributes.color;
  if (!colorAttribute) {
    const colors = new Float32Array(position.count * 3);
    // Initialize with white color
    for (let i = 0; i < colors.length; i++) {
      colors[i] = 1.0;
    }
    colorAttribute = new THREE.BufferAttribute(colors, 3);
    geometry.setAttribute("color", colorAttribute);
  }

  // Set the color to red for this vertex
  colorAttribute.setXYZ(vertexIndex, 1, 0, 0);
  colorAttribute.needsUpdate = true;

  // Ensure the material uses vertex colors
  if (!mesh.material.vertexColors) {
    mesh.material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      flatShading: true,
    });
  }
}

// Create a container for displaying vertices
let vertexDisplayContainer = document.createElement("div");
vertexDisplayContainer.style.position = "absolute";
vertexDisplayContainer.style.top = "10px";
vertexDisplayContainer.style.right = "10px";
vertexDisplayContainer.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
vertexDisplayContainer.style.padding = "10px";
vertexDisplayContainer.style.borderRadius = "5px";
vertexDisplayContainer.style.maxHeight = "300px";
vertexDisplayContainer.style.overflowY = "auto";
vertexDisplayContainer.style.display = "none";
document.body.appendChild(vertexDisplayContainer);

// Function to display vertices in the upper right
function displayVertices(vertices) {
  vertexDisplayContainer.style.display = "block";
  vertexDisplayContainer.innerHTML = "<h3>Region Vertices</h3>";

  const vertexList = document.createElement("ul");
  vertices.forEach((vertex, index) => {
    const item = document.createElement("li");
    item.textContent = `V${index}: (${vertex.x.toFixed(3)}, ${vertex.y.toFixed(
      3
    )}, ${vertex.z.toFixed(3)})`;
    vertexList.appendChild(item);
  });

  vertexDisplayContainer.appendChild(vertexList);

  // Add button container for layout
  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.justifyContent = "space-between";
  buttonContainer.style.marginTop = "10px";

  // Add a clear selection button
  const clearButton = document.createElement("button");
  clearButton.textContent = "Clear Selection";
  clearButton.style.backgroundColor = "#ff4d4d";
  clearButton.style.color = "white";
  clearButton.style.border = "none";
  clearButton.style.padding = "5px 10px";
  clearButton.style.borderRadius = "3px";
  clearButton.style.cursor = "pointer";
  clearButton.addEventListener("click", () => {
    clearSelection();
  });
  buttonContainer.appendChild(clearButton);

  // Add a close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "Close Panel";
  closeButton.style.backgroundColor = "#4d4d4d";
  closeButton.style.color = "white";
  closeButton.style.border = "none";
  closeButton.style.padding = "5px 10px";
  closeButton.style.borderRadius = "3px";
  closeButton.style.cursor = "pointer";
  closeButton.addEventListener("click", () => {
    vertexDisplayContainer.style.display = "none";
  });
  buttonContainer.appendChild(closeButton);

  vertexDisplayContainer.appendChild(buttonContainer);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update(); // Update controls for smooth animation
  renderer.render(scene, camera);
}

function clearSelection() {
  // Clear highlighted vertices
  scene.traverse((object) => {
    if (object.isMesh && object.geometry.attributes.color) {
      const geometry = object.geometry;
      const colorAttribute = geometry.attributes.color;
      const colors = colorAttribute.array;

      // Reset all colors to white (1,1,1)
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = 1.0; // R
        colors[i + 1] = 1.0; // G
        colors[i + 2] = 1.0; // B
      }

      colorAttribute.needsUpdate = true;
    }
  });

  // Clear the vertex arrays
  regionVertices = [];
  selectedVertices = [];

  // Hide the display panel
  vertexDisplayContainer.style.display = "none";

  // Log message to confirm clearing
  console.log("Selection cleared");
}

// Add an event listener for the Escape key to clear the selection
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearSelection();
  }
});
