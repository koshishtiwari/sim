import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const DroneSimulation = () => {
  const mountRef = useRef(null);
  const [collectedBoxes, setCollectedBoxes] = useState([]);
  const [totalBoxes, setTotalBoxes] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);

  useEffect(() => {
    if (!isGameStarted) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.8);
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Add grid for reference
    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);

    // Create room boundaries (10x10x10m)
    const roomSize = 10;
    const roomGeometry = new THREE.BoxGeometry(roomSize, roomSize, roomSize);
    const roomMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xaaaaaa, 
      wireframe: true, 
      transparent: true, 
      opacity: 0.5 
    });
    const room = new THREE.Mesh(roomGeometry, roomMaterial);
    scene.add(room);

    // Create drone (5x5 inches converted to meters)
    const inchToMeter = 0.0254;
    const droneSize = 5 * inchToMeter;
    const droneGeometry = new THREE.BoxGeometry(droneSize, droneSize, droneSize);
    const droneMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const drone = new THREE.Mesh(droneGeometry, droneMaterial);
    scene.add(drone);

    // Add propellers to drone for visual effect
    const propellerGeometry = new THREE.CylinderGeometry(droneSize/4, droneSize/4, droneSize/20, 32);
    const propellerMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

    const propPositions = [
      [droneSize/2, droneSize/2, droneSize/2],
      [droneSize/2, droneSize/2, -droneSize/2],
      [-droneSize/2, droneSize/2, droneSize/2],
      [-droneSize/2, droneSize/2, -droneSize/2]
    ];

    const propellers = [];
    propPositions.forEach(pos => {
      const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
      propeller.position.set(pos[0], pos[1], pos[2]);
      propeller.rotation.x = Math.PI/2;
      drone.add(propeller);
      propellers.push(propeller);
    });

    // Create 100 randomly placed boxes (50x50 inches converted to meters)
    const boxSize = 50 * inchToMeter;
    const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const boxes = [];
    const boxesData = [];

    const colorPalette = [
      0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 
      0xff00ff, 0x00ffff, 0xff8000, 0x8000ff,
      0x00ff80, 0xff0080, 0x80ff00, 0x0080ff
    ];

    // Create boxes with random positions and colors
    for (let i = 0; i < 100; i++) {
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      const colorName = getColorName(color);

      const boxMaterial = new THREE.MeshPhongMaterial({ 
        color, 
        transparent: true, 
        opacity: 0.5 
      });

      const box = new THREE.Mesh(boxGeometry, boxMaterial);

      // Random position within room bounds, accounting for box size
      const maxPos = (roomSize / 2) - (boxSize / 2);
      box.position.set(
        (Math.random() * 2 - 1) * maxPos,
        (Math.random() * 2 - 1) * maxPos,
        (Math.random() * 2 - 1) * maxPos
      );

      scene.add(box);
      boxes.push(box);
      boxesData.push({
        id: i,
        color: colorName,
        mesh: box,
        collected: false
      });
    }

    // Setup orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Drone movement variables
    let droneVelocity = new THREE.Vector3(0, 0, 0);
    const droneSpeed = 0.05;
    let currentTarget = findClosestBox(drone.position, boxesData);

    // Game state
    let isRunning = true;

    // Animation loop
    const animate = function() {
      if (!isRunning) return;

      requestAnimationFrame(animate);

      // If we have a target, move towards it
      if (currentTarget && !currentTarget.collected) {
        const direction = new THREE.Vector3()
          .subVectors(currentTarget.mesh.position, drone.position)
          .normalize();

        droneVelocity.copy(direction.multiplyScalar(droneSpeed));
        drone.position.add(droneVelocity);

        // Rotate propellers for visual effect
        propellers.forEach(prop => {
          prop.rotation.y += 0.3;
        });

        // Check if drone reached the box
        const distance = drone.position.distanceTo(currentTarget.mesh.position);
        if (distance < boxSize / 2) {
          // Mark as collected
          currentTarget.collected = true;
          scene.remove(currentTarget.mesh);

          // Update UI
          setCollectedBoxes(prev => [...prev, currentTarget]);
          setTotalBoxes(prev => prev - 1);

          // Find next target
          currentTarget = findClosestBox(drone.position, boxesData);

          // Check if game over
          if (!currentTarget) {
            isRunning = false;
            setGameOver(true);
            setIsGameStarted(false);
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    // Helper function to find the closest uncollected box
    function findClosestBox(position, boxes) {
      let closestBox = null;
      let closestDistance = Infinity;

      for (const box of boxes) {
        if (box.collected) continue;

        const distance = position.distanceTo(box.mesh.position);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestBox = box;
        }
      }

      return closestBox;
    }

    // Helper function to get color name from hex
    function getColorName(hex) {
      const colorMap = {
        0xff0000: 'Red',
        0x00ff00: 'Green',
        0x0000ff: 'Blue',
        0xffff00: 'Yellow',
        0xff00ff: 'Magenta',
        0x00ffff: 'Cyan',
        0xff8000: 'Orange',
        0x8000ff: 'Purple',
        0x00ff80: 'Mint',
        0xff0080: 'Pink',
        0x80ff00: 'Lime',
        0x0080ff: 'Sky Blue'
      };

      return colorMap[hex] || 'Unknown';
    }

    animate();

    // Clean up on component unmount
    return () => {
      isRunning = false;
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [isGameStarted]);

  // Calculate counts of each color
  const colorCounts = {};
  collectedBoxes.forEach(box => {
    colorCounts[box.color] = (colorCounts[box.color] || 0) + 1;
  });

  return (
    <div className="flex flex-col items-center p-4">
      {!isGameStarted ? (
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to Drone Simulation</h1>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => {
              setCollectedBoxes([]);
              setTotalBoxes(100);
              setGameOver(false);
              setIsGameStarted(true);
            }}
          >
            Start Game
          </button>
        </div>
      ) : (
        <>
          <div className="flex w-full max-w-6xl">
            <div className="w-3/4" ref={mountRef}></div>

            <div className="w-1/4 bg-gray-100 p-4 ml-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Collection Status</h2>
              <p className="mb-4">Boxes Remaining: {totalBoxes}</p>
              <p className="mb-4">Boxes Collected: {collectedBoxes.length}</p>

              <h3 className="text-lg font-semibold mb-2">Collected Colors:</h3>
              <ul className="space-y-1">
                {Object.entries(colorCounts).map(([color, count]) => (
                  <li key={color} className="flex justify-between">
                    <span>{color}:</span>
                    <span>{count}</span>
                  </li>
                ))}
              </ul>

              {gameOver && (
                <div className="mt-8 p-4 bg-yellow-100 rounded-lg text-center">
                  <h2 className="text-2xl font-bold text-yellow-800">GAME OVER</h2>
                  <p className="text-yellow-700">All boxes collected!</p>
                  <button
                    className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
                    onClick={() => setIsGameStarted(false)}
                  >
                    Back to Start
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 text-gray-600 text-sm">
            <p>The drone will automatically navigate to and collect all boxes.</p>
            <p>You can use the mouse to rotate the camera view and scroll to zoom.</p>
          </div>
        </>
      )}
    </div>
  );
};

export default DroneSimulation;