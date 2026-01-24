
// Import from index.js
import { 
  units, 
  selectedUnits, 
  players, 
  currentPlayerId,
  eventSystem
} from './index.js';

// Import input handling
import { setupInputHandlers } from './include/input.js';

// Import UI functions
import {
  uiState,
  setupUI,
  setupDebugPanel,
  showNotification
} from './include/ui.js';

// Import event handler
import { setupEventListeners } from './include/event-handler.js';

// Import resource handler functions
import {
  findResourceNodeAt,
  findNearestResourceNode,
  forceVespeneGathering,
  initializeResourceNodes,
  testVespeneNodes
} from './include/resource-handler.js';

// Import building mode functions
import {
  enterBuildingMode,
  exitBuildingMode,
  updateBuildingGhost,
  placeBuilding,
  setCanvas
} from './include/building-mode.js';

// Import game loop
import { initGameLoop, gameLoop, setGameSystems } from './include/game-loop.js';

// Game state
let canvas, ctx;
let mouseX = 0, mouseY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragEndX = 0, dragEndY = 0;

// Game systems reference
let gameSystems = null;

// Debug mode
const debug = {
  showClickRadius: false,
  showNodeInfo: false,
  logEvents: true
};

// Create game state object to pass to modules
const gameState = {
  get mouseX() { return mouseX; },
  set mouseX(x) { mouseX = x; },
  get mouseY() { return mouseY; },
  set mouseY(y) { mouseY = y; },
  get isDragging() { return isDragging; },
  set isDragging(value) { isDragging = value; },
  get dragStartX() { return dragStartX; },
  set dragStartX(x) { dragStartX = x; },
  get dragStartY() { return dragStartY; },
  set dragStartY(y) { dragStartY = y; },
  get dragEndX() { return dragEndX; },
  set dragEndX(x) { dragEndX = x; },
  get dragEndY() { return dragEndY; },
  set dragEndY(y) { dragEndY = y; },
  debug
};

// Store gameState globally for modules that need it
window.gameState = gameState;

// ========== GAME INITIALIZATION ==========
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  // Set canvas size
  canvas.width = 800;
  canvas.height = 600;

  // Set canvas for building mode
  setCanvas(canvas);

  // Initialize game loop with dependencies
  initGameLoop(canvas, ctx, debug, uiState, players, currentPlayerId, selectedUnits);

  // Setup input handlers
  setupInputHandlers(canvas, gameState);

  // Setup event system listeners
  setupEventListeners();

  // Setup UI
  setupUI();

  // Setup debug panel
  setupDebugPanel();

  console.log("Game initialized");
}

// ========== START GAME ==========
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for debugging and other modules
window.gameDebug = {
  units,
  selectedUnits,
  players,
  eventSystem,
  showNotification,
  enterBuildingMode,
  exitBuildingMode,
  findResourceNodeAt,
  findNearestResourceNode,
  forceVespeneGathering,
  debug,
  mouseX, mouseY,
  canvas, ctx
};

// Export functions that other modules need
window.enterBuildingMode = (buildingType) => enterBuildingMode(buildingType, gameState);
window.exitBuildingMode = () => exitBuildingMode(gameState);
window.placeBuilding = (x, y) => placeBuilding(x, y, gameState);
window.showNotification = showNotification;
window.updateBuildingGhost = (x, y) => updateBuildingGhost(x, y, gameState);
window.initializeResourceNodes = initializeResourceNodes;
window.testVespeneNodes = testVespeneNodes;
window.gameLoop = gameLoop;
window.debug = debug;

// Store setGameSystems for event-handler to use
window.setGameSystems = setGameSystems;

// Add console test function
window.testVespene = function() {
  console.log("=== Testing Vespene Gathering ===");
  
  // Find a vespene node
  const nodes = window.gameResourceNodes;
  if (!nodes) {
    console.log("No resource nodes");
    return;
  }
  
  let vespeneNode = null;
  nodes.forEach((node, id) => {
    if (node.type === 'vespene' && node.amount > 0 && !vespeneNode) {
      vespeneNode = { id, ...node };
    }
  });
  
  if (!vespeneNode) {
    console.log("No vespene nodes found");
    return;
  }
  
  console.log(`Found vespene node: ${vespeneNode.id} at (${vespeneNode.x}, ${vespeneNode.y})`);
  
  // Find a worker
  const units = window.gameUnits;
  if (!units) {
    console.log("No units");
    return;
  }
  
  let worker = null;
  units.forEach((unit, id) => {
    if (unit.type === 'worker' && unit.owner === 1 && !worker) {
      worker = { id, unit };
    }
  });
  
  if (!worker) {
    console.log("No worker found");
    return;
  }
  
  console.log(`Found worker: ${worker.id} at (${worker.unit.x}, ${worker.unit.y})`);
  
  // Send worker to gather
  const success = worker.unit.startGathering(vespeneNode.id);
  console.log(`Gather command ${success ? 'successful' : 'failed'}`);
  
  return { worker: worker.id, node: vespeneNode.id, success };
};


























