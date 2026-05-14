import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  FirstPersonControls,
  PerspectiveCamera,
  useTexture,
  PointerLockControls,
} from "@react-three/drei";
import * as THREE from "three";

// Level Generator for Backrooms Game
class BackroomsLevelGenerator {
  constructor(
    levelWidth = 100,
    levelDepth = 100,
    roomSize = 10,
    corridorWidth = 3
  ) {
    this.levelWidth = levelWidth; // Total width of the level
    this.levelDepth = levelDepth; // Total depth of the level
    this.roomSize = roomSize; // Average room size
    this.corridorWidth = corridorWidth; // Width of corridors
    this.grid = []; // Grid representation of the level
    this.exitPosition = null; // Position of the exit staircase
    this.rooms = []; // Array to store room data
  }

  // Initialize the grid with walls
  initializeGrid() {
    this.grid = Array(this.levelWidth)
      .fill()
      .map(() => Array(this.levelDepth).fill(1)); // 1 represents wall
  }

  // Generate the level using a modified binary space partitioning (BSP) algorithm
  generateLevel() {
    this.initializeGrid();
    this.rooms = [];

    // Create initial room boundaries
    const rootSpace = {
      x: 1,
      z: 1,
      width: this.levelWidth - 2,
      depth: this.levelDepth - 2,
    };

    // Recursively partition the space
    this.partitionSpace(rootSpace, 0);

    // Generate corridors to connect rooms
    this.generateCorridors();

    // Place the exit staircase in a suitable location
    this.placeExitStaircase();

    return {
      grid: this.grid,
      exitPosition: this.exitPosition,
      rooms: this.rooms,
    };
  }

  // Recursively partition space to create rooms
  partitionSpace(space, depth) {
    const MAX_DEPTH = 4; // Maximum recursion depth
    const MIN_ROOM_SIZE = this.roomSize;

    // Base case: if space is too small or we've reached max depth
    if (
      depth >= MAX_DEPTH ||
      space.width < MIN_ROOM_SIZE * 1.5 ||
      space.depth < MIN_ROOM_SIZE * 1.5
    ) {
      // Create a room within this space
      this.createRoom(space);
      return;
    }

    // Decide whether to split horizontally or vertically
    const splitHorizontally = Math.random() > 0.5;

    if (splitHorizontally && space.width >= MIN_ROOM_SIZE * 2) {
      // Split horizontally
      const splitPosition = Math.floor(
        MIN_ROOM_SIZE + Math.random() * (space.width - MIN_ROOM_SIZE * 2)
      );

      // Create left and right spaces
      const leftSpace = {
        x: space.x,
        z: space.z,
        width: splitPosition,
        depth: space.depth,
      };

      const rightSpace = {
        x: space.x + splitPosition + 1,
        z: space.z,
        width: space.width - splitPosition - 1,
        depth: space.depth,
      };

      // Recursively partition the new spaces
      this.partitionSpace(leftSpace, depth + 1);
      this.partitionSpace(rightSpace, depth + 1);
    } else if (!splitHorizontally && space.depth >= MIN_ROOM_SIZE * 2) {
      // Split vertically
      const splitPosition = Math.floor(
        MIN_ROOM_SIZE + Math.random() * (space.depth - MIN_ROOM_SIZE * 2)
      );

      // Create top and bottom spaces
      const topSpace = {
        x: space.x,
        z: space.z,
        width: space.width,
        depth: splitPosition,
      };

      const bottomSpace = {
        x: space.x,
        z: space.z + splitPosition + 1,
        width: space.width,
        depth: space.depth - splitPosition - 1,
      };

      // Recursively partition the new spaces
      this.partitionSpace(topSpace, depth + 1);
      this.partitionSpace(bottomSpace, depth + 1);
    } else {
      // If we can't split anymore, create a room
      this.createRoom(space);
    }
  }

  // Create a room within the given space
  createRoom(space) {
    // Add some randomness to room size
    const roomWidth = Math.floor(space.width * (0.6 + Math.random() * 0.3));
    const roomDepth = Math.floor(space.depth * (0.6 + Math.random() * 0.3));

    // Calculate room position within the space (centered)
    const startX = space.x + Math.floor((space.width - roomWidth) / 2);
    const startZ = space.z + Math.floor((space.depth - roomDepth) / 2);

    // Carve out the room (set cells to 0 for empty space)
    for (let x = startX; x < startX + roomWidth; x++) {
      for (let z = startZ; z < startZ + roomDepth; z++) {
        if (x >= 0 && x < this.levelWidth && z >= 0 && z < this.levelDepth) {
          this.grid[x][z] = 0; // 0 represents empty space
        }
      }
    }

    // Store room data for corridor generation
    this.rooms.push({
      x: startX,
      z: startZ,
      width: roomWidth,
      depth: roomDepth,
      centerX: startX + Math.floor(roomWidth / 2),
      centerZ: startZ + Math.floor(roomDepth / 2),
    });
  }

  // Generate corridors to connect all rooms
  generateCorridors() {
    if (!this.rooms || this.rooms.length <= 1) return;

    // Sort rooms by position to help create more natural paths
    const sortedRooms = [...this.rooms].sort(
      (a, b) => a.centerX + a.centerZ - (b.centerX + b.centerZ)
    );

    // Connect each room to the next one in the sorted list
    for (let i = 0; i < sortedRooms.length - 1; i++) {
      const roomA = sortedRooms[i];
      const roomB = sortedRooms[i + 1];

      this.createCorridor(
        roomA.centerX,
        roomA.centerZ,
        roomB.centerX,
        roomB.centerZ
      );
    }

    // Add some random additional corridors for complexity
    const numExtraCorridors = Math.floor(this.rooms.length * 0.3);
    for (let i = 0; i < numExtraCorridors; i++) {
      const roomA = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      const roomB = this.rooms[Math.floor(Math.random() * this.rooms.length)];

      if (roomA !== roomB) {
        this.createCorridor(
          roomA.centerX,
          roomA.centerZ,
          roomB.centerX,
          roomB.centerZ
        );
      }
    }
  }

  // Create a corridor between two points using L-shaped path
  createCorridor(x1, z1, x2, z2) {
    // Determine corridor width (may vary slightly)
    const width = this.corridorWidth;
    const halfWidth = Math.floor(width / 2);

    // Decide whether to go X then Z, or Z then X (randomize for variety)
    const xFirst = Math.random() > 0.5;

    if (xFirst) {
      // Horizontal corridor
      const xStart = Math.min(x1, x2);
      const xEnd = Math.max(x1, x2);

      for (let x = xStart; x <= xEnd; x++) {
        for (let offset = -halfWidth; offset <= halfWidth; offset++) {
          const z = z1 + offset;
          if (x >= 0 && x < this.levelWidth && z >= 0 && z < this.levelDepth) {
            this.grid[x][z] = 0;
          }
        }
      }

      // Vertical corridor
      const zStart = Math.min(z1, z2);
      const zEnd = Math.max(z1, z2);

      for (let z = zStart; z <= zEnd; z++) {
        for (let offset = -halfWidth; offset <= halfWidth; offset++) {
          const x = x2 + offset;
          if (x >= 0 && x < this.levelWidth && z >= 0 && z < this.levelDepth) {
            this.grid[x][z] = 0;
          }
        }
      }
    } else {
      // Vertical corridor first
      const zStart = Math.min(z1, z2);
      const zEnd = Math.max(z1, z2);

      for (let z = zStart; z <= zEnd; z++) {
        for (let offset = -halfWidth; offset <= halfWidth; offset++) {
          const x = x1 + offset;
          if (x >= 0 && x < this.levelWidth && z >= 0 && z < this.levelDepth) {
            this.grid[x][z] = 0;
          }
        }
      }

      // Horizontal corridor
      const xStart = Math.min(x1, x2);
      const xEnd = Math.max(x1, x2);

      for (let x = xStart; x <= xEnd; x++) {
        for (let offset = -halfWidth; offset <= halfWidth; offset++) {
          const z = z2 + offset;
          if (x >= 0 && x < this.levelWidth && z >= 0 && z < this.levelDepth) {
            this.grid[x][z] = 0;
          }
        }
      }
    }
  }

  // Place the exit staircase in a suitable location
  placeExitStaircase() {
    if (!this.rooms || this.rooms.length === 0) return;

    // Choose a room that's far from the center of the level
    let farthestRoom = this.rooms[0];
    let maxDistance = 0;
    const centerX = Math.floor(this.levelWidth / 2);
    const centerZ = Math.floor(this.levelDepth / 2);

    this.rooms.forEach((room) => {
      const distance = Math.sqrt(
        Math.pow(room.centerX - centerX, 2) +
          Math.pow(room.centerZ - centerZ, 2)
      );

      if (distance > maxDistance) {
        maxDistance = distance;
        farthestRoom = room;
      }
    });

    // Place the exit staircase in the selected room
    const stairX = farthestRoom.centerX;
    const stairZ = farthestRoom.centerZ;

    // Mark the staircase location with special value (2)
    this.grid[stairX][stairZ] = 2; // 2 represents exit staircase

    // Store the exit position
    this.exitPosition = { x: stairX, z: stairZ };

    // Clear area around the staircase to ensure it's accessible
    const clearRadius = 3;
    for (let x = stairX - clearRadius; x <= stairX + clearRadius; x++) {
      for (let z = stairZ - clearRadius; z <= stairZ + clearRadius; z++) {
        if (x >= 0 && x < this.levelWidth && z >= 0 && z < this.levelDepth) {
          if (this.grid[x][z] === 1) {
            // Only clear walls, not the staircase itself
            this.grid[x][z] = 0;
          }
        }
      }
    }
  }

  // Get wall positions based on the grid
  getWallPositions() {
    const walls = [];

    for (let x = 0; x < this.levelWidth; x++) {
      for (let z = 0; z < this.levelDepth; z++) {
        if (this.grid[x][z] === 1) {
          // Assign a random pattern type (0-3) to each wall
          const patternType = Math.floor(Math.random() * 4);
          walls.push({ x, z, patternType });
        }
      }
    }

    return walls;
  }

  // Get exit staircase position
  getExitPosition() {
    return this.exitPosition;
  }
}

// Create a wall texture with a specific pattern type
const createWallTexture = (patternType = 0) => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  // Fill with base yellow color
  context.fillStyle = "#f5f5dc";
  context.fillRect(0, 0, 512, 512);

  // Add different patterns based on pattern type
  switch (patternType) {
    case 0: // Default vertical stripes
      context.fillStyle = "#f0e68c";
      for (let y = 0; y < 512; y += 64) {
        for (let x = 0; x < 512; x += 64) {
          if ((x + y) % 128 === 0) {
            context.fillRect(x, y, 32, 64);
          }
        }
      }
      break;

    case 1: // Horizontal stripes
      context.fillStyle = "#e6d66a";
      for (let y = 0; y < 512; y += 64) {
        context.fillRect(0, y, 512, 16);
      }
      break;

    case 2: // Grid pattern
      context.fillStyle = "#e6d66a";
      for (let y = 0; y < 512; y += 64) {
        context.fillRect(0, y, 512, 4);
      }
      for (let x = 0; x < 512; x += 64) {
        context.fillRect(x, 0, 4, 512);
      }
      break;

    case 3: // Dots pattern
      context.fillStyle = "#e6d66a";
      for (let y = 0; y < 512; y += 32) {
        for (let x = 0; x < 512; x += 32) {
          context.beginPath();
          context.arc(x + 16, y + 16, 4, 0, Math.PI * 2);
          context.fill();
        }
      }
      break;
  }

  // Add slight noise for all pattern types
  context.fillStyle = "rgba(0,0,0,0.05)";
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    context.fillRect(x, y, 1, 1);
  }

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
};

const BackroomsGame = () => {
  const controlsRef = useRef();
  const playerRef = useRef({
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    canJump: false,
    prevTime: performance.now(),
  });

  const [lightsData, setLightsData] = useState([]);
  const { camera } = useThree();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelData, setLevelData] = useState(null);
  const [isNearExit, setIsNearExit] = useState(false);

  // Audio listener for 3D sound
  const [sound, setSound] = useState(null);
  const audioListener = useMemo(() => new THREE.AudioListener(), []);

  // Create textures
  const textureLoader = new THREE.TextureLoader();

  // Create different wall texture variations
  const wallTextures = useMemo(() => {
    return [
      createWallTexture(0),
      createWallTexture(1),
      createWallTexture(2),
      createWallTexture(3),
    ];
  }, []);

  // Create floor texture
  const floorTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");

    // Base color
    context.fillStyle = "#eee8aa";
    context.fillRect(0, 0, 512, 512);

    // Add carpet pattern
    context.fillStyle = "#e6e0a3";
    for (let y = 0; y < 512; y += 16) {
      for (let x = 0; x < 512; x += 16) {
        if ((x + y) % 32 === 0) {
          context.fillRect(x, y, 8, 8);
        }
      }
    }

    // Add slight noise
    context.fillStyle = "rgba(0,0,0,0.1)";
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      context.fillRect(x, y, 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    return texture;
  }, []);

  // Create staircase texture
  const stairsTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");

    // Base darker color
    context.fillStyle = "#c5c5a3";
    context.fillRect(0, 0, 256, 256);

    // Add stair pattern
    context.fillStyle = "#807f5d";
    for (let y = 0; y < 256; y += 32) {
      context.fillRect(0, y, 256, 16);
    }

    // Add wear and tear
    context.fillStyle = "rgba(0,0,0,0.2)";
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = 1 + Math.random() * 3;
      context.fillRect(x, y, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  // Generate level data using the level generator
  const generateLevelData = useCallback((level) => {
    // Adjust level parameters based on the current level number
    const levelWidth = 80 + level * 5; // Increase size with level
    const levelDepth = 80 + level * 5;
    const roomSize = Math.max(8, 15 - level); // Rooms get smaller as levels increase
    const corridorWidth = Math.max(2, 4 - Math.floor(level / 2)); // Corridors get narrower

    const generator = new BackroomsLevelGenerator(
      levelWidth,
      levelDepth,
      roomSize,
      corridorWidth
    );
    const levelData = generator.generateLevel();

    return {
      ...levelData,
      level,
      wallPositions: generator.getWallPositions(),
      width: levelWidth,
      depth: levelDepth,
    };
  }, []);

  // Initialize level and setup audio
  useEffect(() => {
    camera.position.set(0, 1.7, 0);
    camera.add(audioListener);

    // Generate the initial level
    const newLevelData = generateLevelData(currentLevel);
    setLevelData(newLevelData);

    // Place player at a suitable starting position (center of a room)
    if (newLevelData.rooms && newLevelData.rooms.length > 0) {
      // Start in the first room
      const startRoom = newLevelData.rooms[0];
      camera.position.set(startRoom.centerX, 1.7, startRoom.centerZ);
    }

    // Create ambient sound
    const sound = new THREE.Audio(audioListener);
    const audioLoader = new THREE.AudioLoader();

    audioLoader.load("/Level_-1_ambience.mp3.mpeg", (buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(0.5);

      // Fade in the ambient sound
      let volume = 0;
      sound.setVolume(volume);
      sound.play();

      const fadeIn = setInterval(() => {
        if (volume < 0.5) {
          volume += 0.05;
          sound.setVolume(volume);
        } else {
          clearInterval(fadeIn);
        }
      }, 100);

      setSound(sound);
    });

    // Initialize light fixtures based on the level size
    const lights = [];
    const levelWidth = newLevelData.width || 100;
    const levelDepth = newLevelData.depth || 100;

    // Place lights in a grid pattern
    const lightSpacing = 10;
    for (let x = 0; x <= levelWidth; x += lightSpacing) {
      for (let z = 0; z <= levelDepth; z += lightSpacing) {
        lights.push({
          position: [x, 2.8, z],
          intensity: 1,
          originalIntensity: 1,
        });
      }
    }
    setLightsData(lights);

    // Setup player controls
    const onKeyDown = (event) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          playerRef.current.moveForward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          playerRef.current.moveLeft = true;
          break;
        case "KeyS":
        case "ArrowDown":
          playerRef.current.moveBackward = true;
          break;
        case "KeyD":
        case "ArrowRight":
          playerRef.current.moveRight = true;
          break;
        case "KeyE":
          // Interact with exit staircase if nearby
          if (isNearExit) {
            goToNextLevel();
          }
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          playerRef.current.moveForward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          playerRef.current.moveLeft = false;
          break;
        case "KeyS":
        case "ArrowDown":
          playerRef.current.moveBackward = false;
          break;
        case "KeyD":
        case "ArrowRight":
          playerRef.current.moveRight = false;
          break;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    return () => {
      // Cleanup audio when component unmounts
      if (sound) {
        sound.stop();
      }
      camera.remove(audioListener);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [camera, audioListener, generateLevelData, currentLevel]);

  // Function to go to the next level
  const goToNextLevel = useCallback(() => {
    const nextLevel = currentLevel + 1;
    const newLevelData = generateLevelData(nextLevel);

    // Play transition sound/effect if needed

    // Fade out screen

    // Update state with new level data
    setCurrentLevel(nextLevel);
    setLevelData(newLevelData);

    // Place player at a suitable starting position
    if (newLevelData.rooms && newLevelData.rooms.length > 0) {
      const startRoom = newLevelData.rooms[0];
      camera.position.set(startRoom.centerX, 1.7, startRoom.centerZ);
    }

    // Show level notification
    console.log(`Welcome to Level ${nextLevel}`);
  }, [currentLevel, generateLevelData, camera]);

  // Handle player movement and check if near exit
  useFrame(() => {
    if (controlsRef.current && levelData) {
      const time = performance.now();
      const delta = (time - playerRef.current.prevTime) / 1000;

      playerRef.current.velocity.x -=
        playerRef.current.velocity.x * 10.0 * delta;
      playerRef.current.velocity.z -=
        playerRef.current.velocity.z * 10.0 * delta;

      playerRef.current.direction.z =
        Number(playerRef.current.moveForward) -
        Number(playerRef.current.moveBackward);
      playerRef.current.direction.x =
        Number(playerRef.current.moveRight) -
        Number(playerRef.current.moveLeft);
      playerRef.current.direction.normalize();

      const speed = 12.0;
      if (playerRef.current.moveForward || playerRef.current.moveBackward) {
        playerRef.current.velocity.z -=
          playerRef.current.direction.z * speed * delta;
      }
      if (playerRef.current.moveLeft || playerRef.current.moveRight) {
        playerRef.current.velocity.x -=
          playerRef.current.direction.x * speed * delta;
      }

      controlsRef.current.moveRight(-playerRef.current.velocity.x * delta);
      controlsRef.current.moveForward(-playerRef.current.velocity.z * delta);

      playerRef.current.prevTime = time;

      // Check if player is near the exit staircase
      if (levelData.exitPosition) {
        const playerPosition = camera.position;
        const exitPosition = new THREE.Vector3(
          levelData.exitPosition.x,
          0,
          levelData.exitPosition.z
        );

        const distanceToExit = playerPosition.distanceTo(exitPosition);

        // If player is within 3 units of the exit
        setIsNearExit(distanceToExit < 3);
      }

      // Random light flickering
      setLightsData((prev) => {
        return prev.map((light) => {
          // Random chance to flicker
          if (Math.random() > 0.99) {
            const flickerIntensity =
              light.originalIntensity * (0.5 + Math.random() * 0.5);
            return { ...light, intensity: flickerIntensity };
          }
          // Random chance to restore original intensity
          if (
            light.intensity !== light.originalIntensity &&
            Math.random() > 0.7
          ) {
            return { ...light, intensity: light.originalIntensity };
          }
          return light;
        });
      });
    }
  });

  // Exit prompt UI component
  const ExitPrompt = () => {
    if (!isNearExit) return null;

    return (
      <div
        className="exit-prompt"
        style={{
          position: "absolute",
          bottom: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          color: "#f5f5dc",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          padding: "10px 20px",
          borderRadius: "5px",
          fontFamily: "Courier New, monospace",
          zIndex: 1000,
        }}
      >
        Press E to descend to Level {currentLevel + 1}
      </div>
    );
  };

  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.2} />

      {/* Fluorescent light fixtures */}
      {lightsData.map((light, index) => (
        <group key={index} position={light.position}>
          {/* Light fixture */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[4, 0.2, 0.8]} />
            <meshBasicMaterial color="#ffffee" />
          </mesh>
          {/* Light source */}
          <pointLight
            position={[0, -0.1, 0]}
            intensity={light.intensity}
            color="#ffffcc"
            distance={15}
            decay={1}
          />
        </group>
      ))}

      {/* Floor - ensure it's properly sized and positioned */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[levelData?.width / 2 || 50, 0, levelData?.depth / 2 || 50]}
      >
        <planeGeometry
          args={[levelData?.width + 10 || 110, levelData?.depth + 10 || 110]}
        />
        <meshStandardMaterial map={floorTexture} side={THREE.DoubleSide} />
      </mesh>

      {/* Ceiling - ensure it's properly sized and positioned */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[levelData?.width / 2 || 50, 3, levelData?.depth / 2 || 50]}
      >
        <planeGeometry
          args={[levelData?.width + 10 || 110, levelData?.depth + 10 || 110]}
        />
        <meshStandardMaterial map={wallTextures[0]} side={THREE.DoubleSide} />
      </mesh>

      {/* Generate walls based on the level data */}
      {levelData && (
        <group>
          {levelData.wallPositions?.map((wall, index) => (
            <mesh key={`wall-${index}`} position={[wall.x, 1.5, wall.z]}>
              <boxGeometry args={[1, 3, 1]} />
              <meshStandardMaterial map={wallTextures[wall.patternType || 0]} />
            </mesh>
          ))}

          {/* Exit staircase */}
          {levelData.exitPosition && (
            <group
              position={[levelData.exitPosition.x, 0, levelData.exitPosition.z]}
            >
              {/* Staircase structure */}
              {Array.from({ length: 8 }).map((_, i) => (
                <mesh
                  key={`stair-${i}`}
                  position={[0, -i * 0.3, (i * 0.3) / 2]}
                >
                  <boxGeometry args={[2, 0.3, 3 / 8]} />
                  <meshStandardMaterial map={stairsTexture} />
                </mesh>
              ))}

              {/* Staircase walls */}
              <mesh position={[0, 1.5, 1.5]}>
                <boxGeometry args={[2.5, 3, 0.2]} />
                <meshStandardMaterial map={stairsTexture} />
              </mesh>

              <mesh position={[0, 1.5, -1.5]}>
                <boxGeometry args={[2.5, 3, 0.2]} />
                <meshStandardMaterial map={stairsTexture} />
              </mesh>

              {/* Trigger zone (invisible) */}
              <mesh position={[0, 1, 0]} visible={false}>
                <boxGeometry args={[2, 2, 3]} />
                <meshBasicMaterial transparent opacity={0} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* Player controls */}
      <PointerLockControls ref={controlsRef} />

      {/* Exit prompt UI */}
      {isNearExit && <ExitPrompt />}
    </>
  );
};

export default BackroomsGame;
