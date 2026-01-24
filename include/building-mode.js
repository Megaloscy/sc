

// Import from index.js
import { units, selectedUnits, currentPlayerId, eventSystem } from '/sc/index.js';

// Import UI functions
import { showNotification } from './ui.js';

// Import resource handler
import { findResourceNodeAt } from './resource-handler.js';

// Building mode state (will be managed by main.js and passed in)
let isBuildingMode = false;
let currentBuildingType = null;
let buildingGhost = null;
let canPlaceBuilding = true;
let canvas = null;
let mouseX = 0;
let mouseY = 0;

// Export functions to manage building mode
export function enterBuildingMode(buildingType, gameState) {
  console.log(`Entering building mode for ${buildingType}`);
  
  if (selectedUnits.size === 0) {
    console.log("No units selected");
    showNotification('Select a worker first', 'error');
    return;
  }
  
  // Check if any selected unit is a worker
  const hasWorker = Array.from(selectedUnits).some(id => {
    const unit = units.get(id);
    return unit && unit.type === 'worker';
  });
  
  if (!hasWorker) {
    console.log("No workers in selection");
    showNotification('Select a worker to build', 'error');
    return;
  }
  
  // Check if building system is available
  if (!window.gameSystems?.buildings) {
    console.log("Building system not available");
    showNotification('Building system not available', 'error');
    return;
  }
  
  // Check if player can build this
  const canBuild = window.gameSystems.buildings.canBuild(buildingType, currentPlayerId);
  if (!canBuild) {
    console.log(`Cannot build ${buildingType}`);
    showNotification(`Cannot build ${buildingType}`, 'error');
    return;
  }
  
  isBuildingMode = true;
  currentBuildingType = buildingType;
  
  const template = window.gameSystems.buildings.getBuildingTemplate(buildingType);
  if (template) {
    buildingGhost = {
      type: buildingType,
      width: template.size.width * 20,
      height: template.size.height * 20,
      color: '#2ecc71'
    };
  }
  
  console.log(`Building mode active for ${buildingType}`);
  showNotification(`Build ${buildingType} - Right-click to place`, 'info');
  
  // Update gameState if provided
  if (gameState) {
    gameState.isBuildingMode = true;
    gameState.currentBuildingType = buildingType;
    gameState.buildingGhost = buildingGhost;
  }
}

export function exitBuildingMode(gameState) {
  console.log("Exiting building mode");
  isBuildingMode = false;
  currentBuildingType = null;
  buildingGhost = null;
  canPlaceBuilding = true;
  
  // Update gameState if provided
  if (gameState) {
    gameState.isBuildingMode = false;
    gameState.currentBuildingType = null;
    gameState.buildingGhost = null;
    gameState.canPlaceBuilding = true;
  }
}

export function updateBuildingGhost(mouseXPos, mouseYPos, gameState) {
  mouseX = mouseXPos;
  mouseY = mouseYPos;
  
  if (!buildingGhost || !window.gameBuildings) return;
  
  // Check if placement is valid (not overlapping other buildings)
  canPlaceBuilding = true;
  
  const ghostRect = {
    x: mouseX - buildingGhost.width / 2,
    y: mouseY - buildingGhost.height / 2,
    width: buildingGhost.width,
    height: buildingGhost.height
  };
  
  // Check collision with existing buildings
  window.gameBuildings.forEach(building => {
    if (building.isBuilding) return; // Skip buildings under construction
    
    let buildingWidth = 50;
    let buildingHeight = 50;
    
    switch(building.type) {
      case 'command_center':
        buildingWidth = 80;
        buildingHeight = 60;
        break;
      case 'barracks':
        buildingWidth = 60;
        buildingHeight = 60;
        break;
      case 'refinery':
        buildingWidth = 50;
        buildingHeight = 40;
        break;
    }
    
    const buildingRect = {
      x: building.x - buildingWidth / 2,
      y: building.y - buildingHeight / 2,
      width: buildingWidth,
      height: buildingHeight
    };
    
    if (rectsOverlap(ghostRect, buildingRect)) {
      canPlaceBuilding = false;
    }
  });
  
  // Check bounds
  if (canvas && (ghostRect.x < 0 || ghostRect.x + ghostRect.width > canvas.width ||
      ghostRect.y < 0 || ghostRect.y + ghostRect.height > canvas.height)) {
    canPlaceBuilding = false;
  }
  
  // For refinery, check if on vespene geyser
  if (currentBuildingType === 'refinery') {
    const onVespene = findResourceNodeAt(mouseX, mouseY);
    if (!onVespene || onVespene.type !== 'vespene') {
      canPlaceBuilding = false;
    }
  }
  
  // Update gameState if provided
  if (gameState) {
    gameState.canPlaceBuilding = canPlaceBuilding;
  }
}

function rectsOverlap(rect1, rect2) {
  return !(rect1.x + rect1.width < rect2.x ||
           rect2.x + rect2.width < rect1.x ||
           rect1.y + rect1.height < rect2.y ||
           rect2.y + rect2.height < rect1.y);
}

export function placeBuilding(x, y, gameState) {
  console.log(`Attempting to place ${currentBuildingType} at (${x}, ${y})`);
  
  if (!currentBuildingType || !selectedUnits.size || !canPlaceBuilding) {
    console.log(`Cannot place: type=${currentBuildingType}, selected=${selectedUnits.size}, canPlace=${canPlaceBuilding}`);
    showNotification('Cannot place building here', 'error');
    return;
  }
  
  // Use first selected worker
  const workerId = Array.from(selectedUnits)[0];
  const worker = units.get(workerId);
  
  if (!worker || worker.type !== 'worker') {
    console.log(`Selected unit is not a worker: ${workerId}`);
    showNotification('Select a worker to build', 'error');
    exitBuildingMode(gameState);
    return;
  }
  
  // Check if building system exists
  if (!window.gameSystems?.buildings) {
    console.log("Building system not loaded");
    showNotification('Building system not loaded', 'error');
    exitBuildingMode(gameState);
    return;
  }
  
  console.log(`Sending build order for ${currentBuildingType} at (${x}, ${y}) with worker ${workerId}`);
  
  // Send build order
  eventSystem.emit('build_order', {
    buildingType: currentBuildingType,
    x,
    y,
    playerId: currentPlayerId,
    workerId
  });
}

// Getter functions for current state
export function getBuildingModeState() {
  return {
    isBuildingMode,
    currentBuildingType,
    buildingGhost,
    canPlaceBuilding
  };
}

// Set canvas for bounds checking
export function setCanvas(canvasElement) {
  canvas = canvasElement;
}