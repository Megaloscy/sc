// Import from index.js
import { 
  units, 
  selectedUnits, 
  players, 
  currentPlayerId, 
  createUnit, 
  selectUnit, 
  deselectUnit, 
  clearSelection, 
  moveSelectedUnits,
  createBuilding,
  selectBuilding,
  deselectBuilding,
  createResourceNode,
  eventSystem
} from './index.js';

// Game state
let canvas, ctx;
let mouseX = 0, mouseY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragEndX = 0, dragEndY = 0;
let lastFrameTime = 0;

// Game systems reference
let gameSystems = null;

// Building mode
let isBuildingMode = false;
let currentBuildingType = null;
let buildingGhost = null;
let canPlaceBuilding = true;

// Effects
const effects = {
  damageIndicators: [],
  destructionEffects: [],
  gatheringEffects: [],
  buildEffects: [],
  selectionEffects: [],
  clickEffects: []
};

// UI state
const uiState = {
  showUnitCommands: false,
  showBuildingMenu: false,
  selectedWorker: null
};

// Debug mode
const debug = {
  showClickRadius: false,
  showNodeInfo: false,
  logEvents: true
};

// ========== EVENT SYSTEM INTEGRATION ==========
function setupEventListeners() {
  if (!eventSystem) {
    console.warn("Event system not available");
    return;
  }

  eventSystem.on('game_ready', (data) => {
    console.log("Game ready event received");
    gameSystems = data.systems || window.gameSystems;
    
    initializeResourceNodes();
    requestAnimationFrame(gameLoop);
    
    // Test vespene nodes
    setTimeout(testVespeneNodes, 1000);
  });

  eventSystem.on('unit_created', (data) => {
    if (debug.logEvents) console.log("Unit created:", data.unitId, data.type);
    showNotification(`New ${data.type} created`, 'info');
  });

  eventSystem.on('unit_selection_changed', (data) => {
    if (data.selected) {
      selectedUnits.add(data.unitId);
      
      // Show selection effect
      const unit = units.get(data.unitId);
      if (unit) {
        showSelectionEffect(unit.x, unit.y, unit.owner);
      }
    } else {
      selectedUnits.delete(data.unitId);
    }
    
    // Update UI state
    updateUIState();
  });

  eventSystem.on('unit_damaged', (data) => {
    showDamageIndicator(data.unitId, data.damage);
  });

  eventSystem.on('unit_destroyed', (data) => {
    if (debug.logEvents) console.log("Unit destroyed:", data.unitId);
    showDestructionEffect(data.x, data.y);
    showNotification(`${data.type} destroyed!`, 'warning');
  });

  eventSystem.on('resources_updated', (data) => {
    updateResourceDisplay(data.playerId, data.resources);
  });

  eventSystem.on('resource_gathered', (data) => {
    if (debug.logEvents) console.log(`Resource gathered: ${data.amount} ${data.resourceType}`);
    showGatheringEffect(data.nodePosition.x, data.nodePosition.y, data.playerId);
  });

  eventSystem.on('resources_deposited', (data) => {
    if (debug.logEvents) console.log(`Worker deposited ${data.minerals} minerals, ${data.vespene} vespene`);
    showNotification(`+${data.minerals} minerals, +${data.vespene} vespene`, 'success');
  });

  eventSystem.on('worker_gather_order', (data) => {
    if (debug.logEvents) console.log(`Worker gather order: ${data.resourceType} at (${data.x},${data.y})`);
    showNotification(`Worker sent to gather ${data.resourceType}`, 'info');
    
    // Show click effect
    showClickEffect(data.x, data.y, data.resourceType === 'minerals' ? '#3498db' : '#2ecc71');
  });

  eventSystem.on('worker_gathering', (data) => {
    if (debug.logEvents) console.log(`Worker gathering: ${data.amount} ${data.resourceType}, carried: ${data.carried}`);
    // Show gathering particles
    const unit = units.get(data.workerId);
    if (unit) {
      showGatheringParticles(unit.x, unit.y, unit.owner);
    }
  });

  eventSystem.on('building_started', (data) => {
    if (debug.logEvents) console.log(`Building ${data.buildingType} started`);
    showBuildEffect(data.x, data.y);
    showNotification(`Building ${data.buildingType} started`, 'info');
  });

  eventSystem.on('building_progress', (data) => {
    // Update building progress visually
    const building = window.gameBuildings?.get(data.buildingId);
    if (building) {
      building.buildProgress = data.progress;
    }
  });

  eventSystem.on('building_completed', (data) => {
    if (debug.logEvents) console.log(`Building ${data.buildingType} completed`);
    showCompletionEffect(data.x, data.y);
    showNotification(`${data.buildingType} completed!`, 'success');
  });

  eventSystem.on('building_created', (data) => {
    if (debug.logEvents) console.log(`Building ${data.type} created`);
  });

  eventSystem.on('building_selected', (data) => {
    if (debug.logEvents) console.log(`Building ${data.type} selected`);
  });

  eventSystem.on('build_order_accepted', (data) => {
    if (debug.logEvents) console.log(`Build order accepted for ${data.buildingType}`);
    exitBuildingMode();
  });

  eventSystem.on('build_error', (data) => {
    console.error(`Build error: ${data.reason}`);
    showNotification(`Cannot build: ${data.reason}`, 'error');
    exitBuildingMode();
  });

  eventSystem.on('build_cancelled', (data) => {
    if (debug.logEvents) console.log(`Build cancelled: ${data.reason}`);
    showNotification(`Build cancelled`, 'warning');
  });

  eventSystem.on('selection_cleared', (data) => {
    if (debug.logEvents) console.log("Selection cleared");
    uiState.showUnitCommands = false;
    uiState.showBuildingMenu = false;
    uiState.selectedWorker = null;
  });

  eventSystem.on('units_selected', (data) => {
    if (debug.logEvents) console.log(`${data.unitIds.length} units selected`);
    updateUIState();
  });

  eventSystem.on('gather_error', (data) => {
    console.error(`Gather error: ${data.reason} for ${data.resourceType}`);
    showNotification(`Cannot gather ${data.resourceType}: ${data.reason}`, 'error');
  });

  console.log("Event listeners setup complete");
}

// ========== GAME INITIALIZATION ==========
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  // Set canvas size
  canvas.width = 800;
  canvas.height = 600;

  // Setup input handlers
  setupInputHandlers();

  // Setup event system listeners
  setupEventListeners();

  // Setup UI
  setupUI();

  // Setup debug panel
  setupDebugPanel();

  console.log("Game initialized");
}

// ========== RESOURCE NODES ==========
function initializeResourceNodes() {
  // Resource nodes are created in index.js now
  console.log("Resource nodes ready");
  
  // Log all resource nodes for debugging
  const nodes = window.gameResourceNodes;
  if (nodes) {
    console.log(`Found ${nodes.size} resource nodes:`);
    nodes.forEach((node, id) => {
      console.log(`  ${id}: ${node.type} at (${node.x},${node.y}) with ${node.amount} resources`);
    });
  }
}

function testVespeneNodes() {
  console.log("=== Testing Vespene Nodes ===");
  
  const nodes = window.gameResourceNodes;
  if (!nodes) {
    console.log("ERROR: No gameResourceNodes found");
    return;
  }
  
  let vespeneCount = 0;
  nodes.forEach((node, id) => {
    console.log(`Node ${id}: type=${node.type}, amount=${node.amount}, pos=(${node.x},${node.y})`);
    if (node.type === 'vespene') {
      vespeneCount++;
    }
  });
  
  console.log(`Total vespene nodes: ${vespeneCount}`);
  
  // Test finding a vespene node
  if (vespeneCount > 0) {
    // Find first vespene node position
    let vespenePos = null;
    nodes.forEach((node, id) => {
      if (node.type === 'vespene' && !vespenePos) {
        vespenePos = { x: node.x, y: node.y, id };
      }
    });
    
    if (vespenePos) {
      const node = findResourceNodeAt(vespenePos.x, vespenePos.y);
      if (node) {
        console.log(`✓ Found vespene node at (${vespenePos.x}, ${vespenePos.y}): ${node.id}`);
      } else {
        console.log(`✗ Could not find vespene node at (${vespenePos.x}, ${vespenePos.y})`);
      }
    }
  }
}

// ========== GAME LOOP ==========
function gameLoop(timestamp) {
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
  // Emit game tick event
  if (eventSystem) {
    eventSystem.emit('game_tick', {
      deltaTime: Math.min(deltaTime, 100),
      timestamp: Date.now()
    });
  }

  // Update all units
  units.forEach(unit => {
    if (unit.update) {
      unit.update(deltaTime);
    }
  });

  // Update all game systems
  if (gameSystems) {
    Object.values(gameSystems).forEach(system => {
      if (system && system.update) {
        system.update(deltaTime);
      }
    });
  }

  // Update effects
  updateEffects(deltaTime);
  
  // Update building ghost position
  if (isBuildingMode) {
    updateBuildingGhost();
  }
}

function render() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background
  drawBackground();
  
  // Draw terrain/grid
  drawTerrain();
  
  // Draw resource nodes
  drawResourceNodes();
  
  // Draw buildings
  drawBuildings();
  
  // Draw units
  drawUnits();
  
  // Draw building ghost if in building mode
  if (isBuildingMode && buildingGhost) {
    drawBuildingGhost();
  }
  
  // Draw drag selection
  if (isDragging) {
    drawDragSelection();
  }
  
  // Draw UI
  drawUI();
  
  // Draw effects
  drawEffects();
  
  // Draw debug info
  if (debug.showNodeInfo || debug.showClickRadius) {
    drawDebugInfo();
  }
}

// ========== DRAWING FUNCTIONS ==========
function drawBackground() {
  // Simple gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTerrain() {
  // Draw subtle grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 0.5;

  const gridSize = 50;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawResourceNodes() {
  const nodes = window.gameResourceNodes;
  if (!nodes) return;
  
  nodes.forEach((node, id) => {
    if (node.amount <= 0) return;
    
    // Draw click radius for debugging
    if (debug.showClickRadius) {
      ctx.strokeStyle = node.type === 'minerals' ? 'rgba(52, 152, 219, 0.3)' : 'rgba(46, 204, 113, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(node.x, node.y, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw mineral node
    if (node.type === 'minerals') {
      // Crystal shape for minerals
      ctx.fillStyle = '#4a90e2';
      ctx.beginPath();
      ctx.moveTo(node.x, node.y - 20);
      ctx.lineTo(node.x + 15, node.y - 5);
      ctx.lineTo(node.x + 15, node.y + 15);
      ctx.lineTo(node.x - 15, node.y + 15);
      ctx.lineTo(node.x - 15, node.y - 5);
      ctx.closePath();
      ctx.fill();
      
      // Draw amount indicator
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(node.amount)}`, node.x, node.y + 35);
      
      // Draw resource icon
      ctx.fillStyle = '#f1c40f';
      ctx.font = '20px Arial';
      ctx.fillText('⛏️', node.x, node.y);
      
      // Label
      ctx.fillStyle = '#3498db';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('MINERALS', node.x, node.y - 35);
    }
    // Draw vespene node
    else if (node.type === 'vespene') {
      // Larger, more visible vespene geyser
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
      ctx.fill();
      
      // Gas effect (pulsing)
      const pulse = (Date.now() % 2000) / 2000;
      const pulseSize = 20 + Math.sin(pulse * Math.PI * 2) * 5;
      ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulseSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner glow
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Amount
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(node.amount)}`, node.x, node.y + 45);
      
      // Icon
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.fillText('💨', node.x, node.y);
      
      // Label - make it very visible
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('VESPENE GAS', node.x, node.y - 40);
      ctx.fillText('(Right-click to gather)', node.x, node.y - 25);
    }
    
    // Draw node info for debugging
    if (debug.showNodeInfo) {
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`ID: ${id.substring(0, 8)}`, node.x, node.y + 60);
    }
  });
}

function drawBuildings() {
  const buildings = window.gameBuildings;
  if (!buildings) return;
  
  buildings.forEach((building, id) => {
    let color = building.owner === 1 ? '#3498db' : '#e74c3c';
    let borderColor = building.owner === 1 ? '#2980b9' : '#c0392b';
    
    if (building.isBuilding) {
      // Under construction - semi-transparent
      color = building.owner === 1 ? 'rgba(52, 152, 219, 0.5)' : 'rgba(231, 76, 60, 0.5)';
      borderColor = building.owner === 1 ? 'rgba(41, 128, 185, 0.7)' : 'rgba(192, 57, 43, 0.7)';
    }
    
    // Draw building based on type
    switch(building.type) {
      case 'command_center':
        drawCommandCenter(building, color, borderColor);
        break;
      case 'barracks':
        drawBarracks(building, color, borderColor);
        break;
      case 'supply_depot':
        drawSupplyDepot(building, color, borderColor);
        break;
      case 'turret':
        drawTurret(building, color, borderColor);
        break;
      case 'refinery':
        drawRefinery(building, color, borderColor);
        break;
      default:
        drawGenericBuilding(building, color, borderColor);
    }
    
    // Draw construction progress bar
    if (building.isBuilding) {
      const progressWidth = 60;
      const progressHeight = 6;
      const progressX = building.x - progressWidth / 2;
      const progressY = building.y - 50;
      
      // Background
      ctx.fillStyle = '#333';
      ctx.fillRect(progressX, progressY, progressWidth, progressHeight);
      
      // Progress
      const progressPercent = Math.min(building.buildProgress || 0, 100);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(progressX, progressY, progressWidth * (progressPercent / 100), progressHeight);
      
      // Progress text
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(progressPercent)}%`, building.x, progressY - 5);
    }
    
    // Draw health bar for completed buildings
    if (!building.isBuilding) {
      const healthWidth = 50;
      const healthHeight = 5;
      const healthX = building.x - healthWidth / 2;
      const healthY = building.y - 40;
      
      // Background
      ctx.fillStyle = '#333';
      ctx.fillRect(healthX, healthY, healthWidth, healthHeight);
      
      // Health
      const healthPercent = building.health / building.maxHealth;
      ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
      ctx.fillRect(healthX, healthY, healthWidth * healthPercent, healthHeight);
    }
    
    // Draw selection
    if (building.selected) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      switch(building.type) {
        case 'command_center':
          ctx.strokeRect(building.x - 45, building.y - 35, 90, 70);
          break;
        case 'barracks':
          ctx.strokeRect(building.x - 35, building.y - 35, 70, 70);
          break;
        default:
          ctx.strokeRect(building.x - 25, building.y - 25, 50, 50);
      }
      
      ctx.setLineDash([]);
    }
  });
}

function drawCommandCenter(building, color, borderColor) {
  // Main building
  ctx.fillStyle = color;
  ctx.fillRect(building.x - 40, building.y - 30, 80, 60);
  
  // Roof
  ctx.fillStyle = borderColor;
  ctx.beginPath();
  ctx.moveTo(building.x - 40, building.y - 30);
  ctx.lineTo(building.x, building.y - 50);
  ctx.lineTo(building.x + 40, building.y - 30);
  ctx.closePath();
  ctx.fill();
  
  // Door
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(building.x - 10, building.y + 5, 20, 25);
  
  // Windows
  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(building.x - 30, building.y - 10, 10, 10);
  ctx.fillRect(building.x + 20, building.y - 10, 10, 10);
  
  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🏠', building.x, building.y + 5);
}

function drawBarracks(building, color, borderColor) {
  // Main building
  ctx.fillStyle = color;
  ctx.fillRect(building.x - 30, building.y - 30, 60, 60);
  
  // Roof
  ctx.fillStyle = borderColor;
  ctx.fillRect(building.x - 35, building.y - 30, 70, 10);
  
  // Door
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(building.x - 8, building.y + 10, 16, 20);
  
  // Windows
  ctx.fillStyle = '#f1c40f';
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(building.x + (i * 12) - 5, building.y - 15, 8, 8);
  }
  
  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('⚔️', building.x, building.y + 5);
}

function drawSupplyDepot(building, color, borderColor) {
  // Main structure
  ctx.fillStyle = color;
  ctx.fillRect(building.x - 20, building.y - 20, 40, 40);
  
  // Top
  ctx.fillStyle = borderColor;
  ctx.fillRect(building.x - 25, building.y - 25, 50, 10);
  
  // Storage lines
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(building.x - 15, building.y + (i * 10));
    ctx.lineTo(building.x + 15, building.y + (i * 10));
    ctx.stroke();
  }
  
  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('📦', building.x, building.y);
}

function drawTurret(building, color, borderColor) {
  // Base
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(building.x, building.y, 15, 0, Math.PI * 2);
  ctx.fill();
  
  // Turret head
  ctx.fillStyle = borderColor;
  ctx.beginPath();
  ctx.arc(building.x, building.y - 10, 10, 0, Math.PI * 2);
  ctx.fill();
  
  // Gun barrel
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(building.x, building.y - 10);
  ctx.lineTo(building.x + 20, building.y - 20);
  ctx.stroke();
  
  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🔫', building.x, building.y - 10);
}

function drawRefinery(building, color, borderColor) {
  // Base
  ctx.fillStyle = color;
  ctx.fillRect(building.x - 25, building.y - 20, 50, 40);
  
  // Gas tanks
  ctx.fillStyle = borderColor;
  ctx.fillRect(building.x - 20, building.y - 25, 15, 10);
  ctx.fillRect(building.x + 5, building.y - 25, 15, 10);
  
  // Pipes
  ctx.strokeStyle = '#2ecc71';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(building.x - 15, building.y + 20);
  ctx.lineTo(building.x - 15, building.y + 40);
  ctx.moveTo(building.x + 15, building.y + 20);
  ctx.lineTo(building.x + 15, building.y + 40);
  ctx.stroke();
  
  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('⛽', building.x, building.y);
}

function drawGenericBuilding(building, color, borderColor) {
  ctx.fillStyle = color;
  ctx.fillRect(building.x - 25, building.y - 25, 50, 50);
  
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(building.x - 25, building.y - 25, 50, 50);
}

function drawUnits() {
  units.forEach((unit, id) => {
    // Draw unit based on type
    if (unit.type === 'worker') {
      drawWorker(unit);
    } else if (unit.type === 'soldier') {
      drawSoldier(unit);
    } else if (unit.type === 'archer') {
      drawArcher(unit);
    }

    // Draw health bar
    const healthWidth = 30;
    const healthHeight = 4;
    const healthX = unit.x - healthWidth / 2;
    const healthY = unit.y - 20;
    
    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(healthX, healthY, healthWidth, healthHeight);
    
    // Health
    const healthPercent = unit.health / unit.maxHealth;
    ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(healthX, healthY, healthWidth * healthPercent, healthHeight);

    // Draw selection indicator
    if (unit.selected) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw attack target line if attacking
    if (unit.attackTarget) {
      const target = units.get(unit.attackTarget);
      if (target) {
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(unit.x, unit.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw carried resources for workers
    if (unit.type === 'worker' && (unit.carriedResources.minerals > 0 || unit.carriedResources.vespene > 0)) {
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      
      let resourceText = '';
      if (unit.carriedResources.minerals > 0) {
        resourceText += `⛏️${Math.floor(unit.carriedResources.minerals)}`;
      }
      if (unit.carriedResources.vespene > 0) {
        if (resourceText) resourceText += ' ';
        resourceText += `💨${Math.floor(unit.carriedResources.vespene)}`;
      }
      
      ctx.fillText(resourceText, unit.x, unit.y + 25);
    }

    // Draw unit state indicator
    if (unit.state !== 'idle' && unit.state !== 'moving') {
      ctx.fillStyle = getStateColor(unit.state);
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(unit.state.charAt(0).toUpperCase(), unit.x, unit.y + 35);
    }
  });
}

function drawWorker(unit) {
  const color = unit.owner === 1 ? '#3498db' : '#e74c3c';
  const accentColor = unit.owner === 1 ? '#2980b9' : '#c0392b';
  
  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(unit.x, unit.y, 10, 0, Math.PI * 2);
  ctx.fill();
  
  // Tool (pickaxe for mining, wrench for building)
  if (unit.state === 'gathering' || unit.state === 'moving_to_gather') {
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(unit.x + 5, unit.y - 5);
    ctx.lineTo(unit.x + 15, unit.y - 15);
    ctx.stroke();
  } else if (unit.state === 'building' || unit.state === 'moving_to_build') {
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(unit.x + 5, unit.y - 5);
    ctx.lineTo(unit.x + 15, unit.y - 15);
    ctx.lineTo(unit.x + 10, unit.y - 10);
    ctx.stroke();
  }
  
  // Helmet
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(unit.x, unit.y - 5, 8, 0, Math.PI * 2);
  ctx.fill();
  
  // Visor
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(unit.x - 4, unit.y - 7, 8, 3);
}

function drawSoldier(unit) {
  const color = unit.owner === 1 ? '#2980b9' : '#c0392b';
  const accentColor = unit.owner === 1 ? '#1f618d' : '#922b21';
  
  // Body (armor)
  ctx.fillStyle = color;
  ctx.fillRect(unit.x - 12, unit.y - 12, 24, 24);
  
  // Helmet
  ctx.fillStyle = accentColor;
  ctx.fillRect(unit.x - 8, unit.y - 15, 16, 8);
  
  // Weapon
  ctx.strokeStyle = '#7f8c8d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(unit.x + 12, unit.y);
  ctx.lineTo(unit.x + 25, unit.y);
  ctx.stroke();
}

function drawArcher(unit) {
  const color = unit.owner === 1 ? '#9b59b6' : '#8e44ad';
  const accentColor = unit.owner === 1 ? '#8e44ad' : '#6c3483';
  
  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(unit.x, unit.y, 12, 0, Math.PI * 2);
  ctx.fill();
  
  // Quiver
  ctx.fillStyle = accentColor;
  ctx.fillRect(unit.x - 15, unit.y - 5, 6, 15);
  
  // Bow
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(unit.x + 10, unit.y, 15, -Math.PI/4, Math.PI/4);
  ctx.stroke();
}

function drawBuildingGhost() {
  if (!buildingGhost) return;
  
  ctx.fillStyle = canPlaceBuilding ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)';
  ctx.strokeStyle = canPlaceBuilding ? '#2ecc71' : '#e74c3c';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  
  // Draw ghost building
  switch(currentBuildingType) {
    case 'command_center':
      ctx.fillRect(mouseX - 40, mouseY - 30, 80, 60);
      ctx.strokeRect(mouseX - 40, mouseY - 30, 80, 60);
      break;
    case 'barracks':
      ctx.fillRect(mouseX - 30, mouseY - 30, 60, 60);
      ctx.strokeRect(mouseX - 30, mouseY - 30, 60, 60);
      break;
    case 'supply_depot':
      ctx.fillRect(mouseX - 20, mouseY - 20, 40, 40);
      ctx.strokeRect(mouseX - 20, mouseY - 20, 40, 40);
      break;
    case 'turret':
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'refinery':
      ctx.fillRect(mouseX - 25, mouseY - 20, 50, 40);
      ctx.strokeRect(mouseX - 25, mouseY - 20, 50, 40);
      break;
  }
  
  ctx.setLineDash([]);
  
  // Draw building name and cost
  const template = window.gameSystems?.buildings?.getBuildingTemplate(currentBuildingType);
  if (template) {
    ctx.fillStyle = canPlaceBuilding ? '#2ecc71' : '#e74c3c';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${template.name}`, mouseX, mouseY - 50);
    
    ctx.fillStyle = '#f1c40f';
    ctx.font = '12px Arial';
    if (template.cost.minerals) {
      ctx.fillText(`Cost: ${template.cost.minerals} minerals`, mouseX, mouseY + 40);
    }
    if (template.cost.vespene) {
      ctx.fillText(`+ ${template.cost.vespene} vespene`, mouseX, mouseY + 55);
    }
  }
}

function drawDragSelection() {
  ctx.strokeStyle = 'rgba(241, 196, 15, 0.8)';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(241, 196, 15, 0.1)';
  
  const width = dragEndX - dragStartX;
  const height = dragEndY - dragStartY;
  
  ctx.strokeRect(dragStartX, dragStartY, width, height);
  ctx.fillRect(dragStartX, dragStartY, width, height);
}

function drawUI() {
  // Draw resource display
  drawResourceDisplay();
  
  // Draw selected unit info
  if (selectedUnits.size > 0) {
    drawSelectedUnitInfo();
    drawUnitCommands();
  }
  
  // Draw building mode info
  if (isBuildingMode) {
    drawBuildingModeInfo();
  }
  
  // Draw player info
  drawPlayerInfo();
  
  // Draw debug info
  drawDebugUI();
}

function drawResourceDisplay() {
  const playerResources = players[currentPlayerId]?.resources;
  if (playerResources) {
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 180, 80);
    
    // Border
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 180, 80);
    
    // Title
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Resources', 20, 30);
    
    // Minerals
    ctx.fillStyle = '#4a90e2';
    ctx.font = '14px Arial';
    ctx.fillText('⛏️', 20, 50);
    ctx.fillStyle = '#fff';
    ctx.fillText(`Minerals: ${playerResources.minerals || 0}`, 40, 50);
    
    // Vespene
    ctx.fillStyle = '#2ecc71';
    ctx.fillText('💨', 20, 70);
    ctx.fillStyle = '#fff';
    ctx.fillText(`Vespene: ${playerResources.vespene || 0}`, 40, 70);
    
    // Supply (if available)
    if (window.gameSystems?.resources) {
      const supply = window.gameSystems.resources.getPlayerSupply(currentPlayerId);
      if (supply) {
        ctx.fillStyle = '#f39c12';
        ctx.fillText('👥', 20, 90);
        ctx.fillStyle = '#fff';
        ctx.fillText(`Supply: ${supply.used}/${supply.max}`, 40, 90);
      }
    }
  }
}

function drawSelectedUnitInfo() {
  if (selectedUnits.size === 1) {
    const unitId = Array.from(selectedUnits)[0];
    const unit = units.get(unitId);
    if (unit) {
      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, canvas.height - 140, 200, 130);
      
      // Border
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, canvas.height - 140, 200, 130);
      
      // Unit info
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Selected: ${unit.type.toUpperCase()}`, 20, canvas.height - 120);
      
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(`Health: ${Math.floor(unit.health)}/${unit.maxHealth}`, 20, canvas.height - 100);
      ctx.fillText(`Owner: Player ${unit.owner}`, 20, canvas.height - 85);
      ctx.fillText(`State: ${unit.state}`, 20, canvas.height - 70);
      ctx.fillText(`Position: (${Math.floor(unit.x)}, ${Math.floor(unit.y)})`, 20, canvas.height - 55);
      
      // Worker specific info
      if (unit.type === 'worker') {
        ctx.fillText(`Carrying: ${Math.floor(unit.carriedResources.minerals)} minerals`, 20, canvas.height - 40);
        ctx.fillText(`Carrying: ${Math.floor(unit.carriedResources.vespene)} vespene`, 20, canvas.height - 25);
        ctx.fillText(`Gathering: ${unit.isGathering ? 'Yes' : 'No'}`, 20, canvas.height - 10);
      }
    }
  } else if (selectedUnits.size > 1) {
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 100, 180, 90);
    
    // Border
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, canvas.height - 100, 180, 90);
    
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${selectedUnits.size} units selected`, 20, canvas.height - 80);
    
    // Count unit types
    const unitCounts = {};
    selectedUnits.forEach(id => {
      const unit = units.get(id);
      if (unit) {
        unitCounts[unit.type] = (unitCounts[unit.type] || 0) + 1;
      }
    });
    
    let y = canvas.height - 60;
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    Object.entries(unitCounts).forEach(([type, count]) => {
      ctx.fillText(`${type}: ${count}`, 20, y);
      y += 15;
    });
  }
}

function drawUnitCommands() {
  // Check if selected units include workers
  const hasWorker = Array.from(selectedUnits).some(id => {
    const unit = units.get(id);
    return unit && unit.type === 'worker';
  });
  
  if (hasWorker) {
    // Draw worker command panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(canvas.width - 210, 10, 200, 180);
    
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width - 210, 10, 200, 180);
    
    ctx.fillStyle = '#3498db';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Worker Commands', canvas.width - 200, 30);
    
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText('G - Gather nearest resource', canvas.width - 200, 50);
    ctx.fillText('B - Build Barracks', canvas.width - 200, 65);
    ctx.fillText('S - Build Supply Depot', canvas.width - 200, 80);
    ctx.fillText('T - Build Turret', canvas.width - 200, 95);
    ctx.fillText('C - Build Command Center', canvas.width - 200, 110);
    ctx.fillText('R - Build Refinery (on gas)', canvas.width - 200, 125);
    ctx.fillText('Right-click resource: Gather', canvas.width - 200, 140);
    ctx.fillText('Right-click ground: Move', canvas.width - 200, 155);
    ctx.fillText('Right-click enemy: Attack', canvas.width - 200, 170);
  }
}

function drawBuildingModeInfo() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(canvas.width / 2 - 150, 10, 300, 40);
  
  ctx.strokeStyle = '#2ecc71';
  ctx.lineWidth = 2;
  ctx.strokeRect(canvas.width / 2 - 150, 10, 300, 40);
  
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`BUILDING MODE: ${currentBuildingType.toUpperCase()}`, canvas.width / 2, 30);
  
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.fillText('Right-click to place, ESC to cancel', canvas.width / 2, 50);
}

function drawPlayerInfo() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(canvas.width - 150, canvas.height - 40, 140, 30);
  
  ctx.fillStyle = currentPlayerId === 1 ? '#3498db' : '#e74c3c';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Player ${currentPlayerId}`, canvas.width - 80, canvas.height - 20);
}

function drawDebugUI() {
  if (!debug.showNodeInfo) return;
  
  // Draw mouse position
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Mouse: (${mouseX}, ${mouseY})`, canvas.width - 150, 30);
  
  // Draw selected units count
  ctx.fillText(`Selected: ${selectedUnits.size}`, canvas.width - 150, 45);
  
  // Draw total units
  ctx.fillText(`Total units: ${units.size}`, canvas.width - 150, 60);
  
  // Draw resource nodes info
  const nodes = window.gameResourceNodes;
  if (nodes) {
    ctx.fillText(`Resource nodes: ${nodes.size}`, canvas.width - 150, 75);
    
    // Count by type
    let minerals = 0, vespene = 0;
    nodes.forEach(node => {
      if (node.type === 'minerals') minerals++;
      else if (node.type === 'vespene') vespene++;
    });
    ctx.fillText(`Minerals: ${minerals}, Vespene: ${vespene}`, canvas.width - 150, 90);
  }
}

function drawDebugInfo() {
  if (debug.showClickRadius) {
    // Draw mouse click radius
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawEffects() {
  // Draw damage indicators
  effects.damageIndicators.forEach(indicator => {
    ctx.fillStyle = indicator.color;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, indicator.lifetime / 500);
    ctx.fillText(indicator.text, indicator.x, indicator.y);
    ctx.globalAlpha = 1;
  });

  // Draw destruction effects
  effects.destructionEffects.forEach(effect => {
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Draw gathering effects
  effects.gatheringEffects.forEach(effect => {
    ctx.fillStyle = effect.color;
    ctx.globalAlpha = Math.min(1, effect.lifetime / 300);
    ctx.fillRect(effect.x, effect.y, 3, 3);
    ctx.globalAlpha = 1;
  });

  // Draw build effects
  effects.buildEffects.forEach(effect => {
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Draw selection effects
  effects.selectionEffects.forEach(effect => {
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Draw click effects
  effects.clickEffects.forEach(effect => {
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
  });
}

// ========== EFFECTS SYSTEM ==========
function showDamageIndicator(unitId, damage) {
  const unit = units.get(unitId);
  if (unit) {
    effects.damageIndicators.push({
      x: unit.x,
      y: unit.y - 30,
      text: `-${damage}`,
      color: '#e74c3c',
      lifetime: 1000,
      startTime: Date.now(),
      velocityY: -0.05
    });
  }
}

function showDestructionEffect(x, y) {
  effects.destructionEffects.push({
    x,
    y,
    radius: 5,
    maxRadius: 30,
    color: '#e74c3c',
    lifetime: 500,
    startTime: Date.now()
  });
}

function showGatheringEffect(x, y, playerId) {
  const color = playerId === 1 ? '#3498db' : '#e74c3c';
  for (let i = 0; i < 5; i++) {
    effects.gatheringEffects.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      color,
      lifetime: 800,
      startTime: Date.now()
    });
  }
}

function showGatheringParticles(x, y, owner) {
  const color = owner === 1 ? '#3498db' : '#e74c3c';
  for (let i = 0; i < 3; i++) {
    effects.gatheringEffects.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      color,
      lifetime: 400,
      startTime: Date.now()
    });
  }
}

function showBuildEffect(x, y) {
  effects.buildEffects.push({
    x,
    y,
    radius: 10,
    maxRadius: 50,
    color: '#f1c40f',
    lifetime: 1000,
    startTime: Date.now()
  });
}

function showCompletionEffect(x, y) {
  effects.buildEffects.push({
    x,
    y,
    radius: 20,
    maxRadius: 100,
    color: '#2ecc71',
    lifetime: 800,
    startTime: Date.now()
  });
}

function showSelectionEffect(x, y, owner) {
  const color = owner === 1 ? '#3498db' : '#e74c3c';
  effects.selectionEffects.push({
    x,
    y,
    radius: 15,
    maxRadius: 25,
    color,
    lifetime: 300,
    startTime: Date.now()
  });
}

function showClickEffect(x, y, color = '#f1c40f') {
  effects.clickEffects.push({
    x,
    y,
    radius: 5,
    maxRadius: 20,
    color,
    lifetime: 300,
    startTime: Date.now()
  });
}

function updateEffects(deltaTime) {
  const now = Date.now();
  
  ['damageIndicators', 'destructionEffects', 'gatheringEffects', 'buildEffects', 'selectionEffects', 'clickEffects'].forEach(effectType => {
    effects[effectType] = effects[effectType].filter(effect => {
      effect.lifetime -= deltaTime;
      
      if (effectType === 'damageIndicators') {
        effect.y += effect.velocityY * deltaTime;
        effect.x += (Math.random() - 0.5) * 0.02 * deltaTime;
      } else if (effectType === 'destructionEffects' || effectType === 'buildEffects' || effectType === 'clickEffects') {
        const progress = 1 - (effect.lifetime / (effect.lifetime + deltaTime));
        if (effectType === 'destructionEffects') {
          effect.radius = effect.maxRadius * progress;
        } else if (effectType === 'buildEffects') {
          effect.radius = effect.maxRadius * (1 - progress);
        } else if (effectType === 'clickEffects') {
          effect.radius = effect.maxRadius * progress;
        }
      } else if (effectType === 'selectionEffects') {
        const progress = effect.lifetime / (effect.lifetime + deltaTime);
        effect.radius = effect.maxRadius * progress;
      }
      
      return effect.lifetime > 0;
    });
  });
}

function getStateColor(state) {
  switch(state) {
    case 'attacking': return '#e74c3c';
    case 'gathering': return '#f1c40f';
    case 'building': return '#3498db';
    case 'returning_resources': return '#2ecc71';
    case 'moving_to_gather': return '#f39c12';
    case 'moving_to_build': return '#9b59b6';
    default: return '#fff';
  }
}

// ========== INPUT HANDLING ==========
function setupInputHandlers() {
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('contextmenu', handleRightClick);
  
  document.addEventListener('keydown', handleKeyDown);
  
  console.log("Input handlers setup complete");
}

function handleMouseDown(event) {
  mouseX = event.offsetX;
  mouseY = event.offsetY;
  
  if (event.button === 0) { // Left click
    dragStartX = mouseX;
    dragStartY = mouseY;
    dragEndX = mouseX;
    dragEndY = mouseY;
    isDragging = true;
    
    // Clear previous selection
    clearSelection();
  }
}

function handleMouseMove(event) {
  mouseX = event.offsetX;
  mouseY = event.offsetY;
  
  if (isDragging) {
    dragEndX = mouseX;
    dragEndY = mouseY;
  }
}

function handleMouseUp(event) {
  if (event.button === 0) { // Left click release
    isDragging = false;
    
    // Check if it was a click or drag
    const dragDistance = Math.sqrt(
      Math.pow(dragEndX - dragStartX, 2) + 
      Math.pow(dragEndY - dragStartY, 2)
    );
    
    if (dragDistance < 5) {
      // Click - select unit or building
      handleClickSelection(mouseX, mouseY);
    } else {
      // Drag - select multiple units
      handleDragSelection();
    }
  }
}

function handleClickSelection(x, y) {
  console.log(`Click at (${x}, ${y})`);
  
  // First check for buildings
  let clickedBuilding = null;
  const buildings = window.gameBuildings;
  if (buildings) {
    for (const [id, building] of buildings.entries()) {
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
      
      if (x >= building.x - buildingWidth/2 && x <= building.x + buildingWidth/2 &&
          y >= building.y - buildingHeight/2 && y <= building.y + buildingHeight/2) {
        clickedBuilding = { id, building };
        console.log(`Clicked on building: ${building.type}`);
        break;
      }
    }
  }
  
  if (clickedBuilding && clickedBuilding.building.owner === currentPlayerId) {
    // Select building
    selectBuilding(clickedBuilding.id);
    return;
  }
  
  // Check for units
  handleUnitClick(x, y);
}

function handleUnitClick(x, y) {
  console.log(`Looking for unit at (${x}, ${y})`);
  
  let clickedUnit = null;
  let clickedUnitId = null;
  let closestDistance = Infinity;
  
  units.forEach((unit, id) => {
    const distance = Math.sqrt(Math.pow(unit.x - x, 2) + Math.pow(unit.y - y, 2));
    console.log(`  Unit ${id} at (${unit.x}, ${unit.y}), distance: ${distance}`);
    
    if (distance < 20 && distance < closestDistance) {
      closestDistance = distance;
      clickedUnit = unit;
      clickedUnitId = id;
    }
  });
  
  if (clickedUnit && clickedUnit.owner === currentPlayerId) {
    console.log(`Selected unit: ${clickedUnitId} (${clickedUnit.type})`);
    selectUnit(clickedUnitId);
  } else if (clickedUnit) {
    console.log(`Unit belongs to enemy player ${clickedUnit.owner}`);
  } else {
    console.log("No unit found at click location");
  }
}

function handleDragSelection() {
  const left = Math.min(dragStartX, dragEndX);
  const right = Math.max(dragStartX, dragEndX);
  const top = Math.min(dragStartY, dragEndY);
  const bottom = Math.max(dragStartY, dragEndY);
  
  console.log(`Drag selection: (${left}, ${top}) to (${right}, ${bottom})`);
  
  let selectedCount = 0;
  units.forEach((unit, id) => {
    if (unit.owner === currentPlayerId &&
        unit.x >= left && unit.x <= right &&
        unit.y >= top && unit.y <= bottom) {
      selectUnit(id);
      selectedCount++;
    }
  });
  
  console.log(`Selected ${selectedCount} units via drag`);
}

function handleRightClick(event) {
  event.preventDefault();
  console.log(`\n=== Right click at (${mouseX}, ${mouseY}) ===`);
  
  if (isBuildingMode && currentBuildingType) {
    console.log(`Placing building: ${currentBuildingType}`);
    placeBuilding(mouseX, mouseY);
    return;
  }
  
  if (selectedUnits.size > 0) {
    console.log(`Processing right-click for ${selectedUnits.size} selected units`);
    
    // FIRST: Check if right-clicked on resource node (minerals OR vespene)
    const clickedNode = findResourceNodeAt(mouseX, mouseY);
    if (clickedNode) {
      console.log(`✓ Found ${clickedNode.type} node: ${clickedNode.id} at (${clickedNode.x}, ${clickedNode.y})`);
      console.log(`  Amount: ${clickedNode.amount}, Distance from click: ${Math.sqrt(Math.pow(clickedNode.x - mouseX, 2) + Math.pow(clickedNode.y - mouseY, 2))}`);
      
      // Show click effect
      showClickEffect(mouseX, mouseY, clickedNode.type === 'minerals' ? '#3498db' : '#2ecc71');
      
      // Send ALL selected workers to gather
      let workersSent = 0;
      selectedUnits.forEach(unitId => {
        const unit = units.get(unitId);
        if (unit && unit.type === 'worker') {
          console.log(`  Sending worker ${unitId} to gather ${clickedNode.type}`);
          const success = unit.startGathering(clickedNode.id);
          if (success) {
            workersSent++;
            console.log(`    Worker ${unitId} accepted gather command`);
          } else {
            console.log(`    Worker ${unitId} rejected gather command`);
          }
        }
      });
      
      if (workersSent > 0) {
        showNotification(`${workersSent} worker(s) sent to gather ${clickedNode.type}`, 'info');
      } else {
        showNotification('No workers could be sent to gather', 'warning');
      }
      return;
    } else {
      console.log(`✗ No resource node found at (${mouseX}, ${mouseY})`);
    }
    
    // SECOND: Check if right-clicked on enemy
    let clickedEnemy = null;
    units.forEach((unit, id) => {
      if (unit.owner !== currentPlayerId && unit.health > 0) {
        const distance = Math.sqrt(
          Math.pow(unit.x - mouseX, 2) + 
          Math.pow(unit.y - mouseY, 2)
        );
        if (distance < 20) {
          clickedEnemy = { id, unit };
        }
      }
    });
    
    if (clickedEnemy) {
      console.log(`✓ Found enemy: ${clickedEnemy.id} (${clickedEnemy.unit.type})`);
      
      selectedUnits.forEach(unitId => {
        const unit = units.get(unitId);
        if (unit && unit.canAttack) {
          unit.attackTargetUnit(clickedEnemy.id);
        }
      });
      
      eventSystem.emit('attack_order_issued', {
        unitIds: Array.from(selectedUnits),
        target: { x: mouseX, y: mouseY },
        targetUnitId: clickedEnemy.id,
        playerId: currentPlayerId
      });
      
      showNotification('Attack!', 'warning');
    } else {
      // THIRD: Move to location (no resource, no enemy)
      console.log(`Moving ${selectedUnits.size} units to (${mouseX}, ${mouseY})`);
      
      // Show move click effect
      showClickEffect(mouseX, mouseY, '#f1c40f');
      
      moveSelectedUnits(mouseX, mouseY);
      
      eventSystem.emit('move_order_issued', {
        unitIds: Array.from(selectedUnits),
        target: { x: mouseX, y: mouseY },
        playerId: currentPlayerId
      });
    }
  } else {
    console.log("No units selected for right-click command");
  }
}

function handleKeyDown(event) {
  console.log(`Key pressed: ${event.key} (ctrl: ${event.ctrlKey})`);
  
  switch (event.key) {
    case 'Escape':
      console.log("Escape pressed");
      clearSelection();
      if (isBuildingMode) {
        exitBuildingMode();
        showNotification('Build mode cancelled', 'info');
      }
      break;
    case 'b':
    case 'B':
      if (!event.ctrlKey) {
        console.log("Entering building mode: barracks");
        enterBuildingMode('barracks');
      }
      break;
    case 'c':
    case 'C':
      if (!event.ctrlKey) {
        console.log("Entering building mode: command_center");
        enterBuildingMode('command_center');
      }
      break;
    case 's':
    case 'S':
      if (!event.ctrlKey) {
        console.log("Entering building mode: supply_depot");
        enterBuildingMode('supply_depot');
      }
      break;
    case 't':
    case 'T':
      if (!event.ctrlKey) {
        console.log("Entering building mode: turret");
        enterBuildingMode('turret');
      }
      break;
    case 'r':
    case 'R':
      if (!event.ctrlKey) {
        console.log("Entering building mode: refinery");
        enterBuildingMode('refinery');
      }
      break;
    case 'g':
    case 'G':
      // Gather command
      console.log("Gather command (G key)");
      if (selectedUnits.size > 0) {
        const nearestNode = findNearestResourceNode();
        if (nearestNode) {
          console.log(`Found nearest ${nearestNode.type} node at (${nearestNode.x}, ${nearestNode.y})`);
          
          let workersSent = 0;
          selectedUnits.forEach(unitId => {
            const unit = units.get(unitId);
            if (unit && unit.type === 'worker') {
              const success = unit.startGathering(nearestNode.id);
              if (success) workersSent++;
            }
          });
          
          if (workersSent > 0) {
            showNotification(`${workersSent} worker(s) sent to gather ${nearestNode.type}`, 'info');
          } else {
            showNotification('No workers selected or cannot gather', 'warning');
          }
        } else {
          console.log("No resource nodes found nearby");
          showNotification('No resource nodes nearby', 'warning');
        }
      }
      break;
    case 'a':
    case 'A':
      if (event.ctrlKey || event.metaKey) {
        // Select all units
        console.log("Select all units (Ctrl+A)");
        let selectedCount = 0;
        units.forEach((unit, id) => {
          if (unit.owner === currentPlayerId) {
            selectUnit(id);
            selectedCount++;
          }
        });
        console.log(`Selected ${selectedCount} units`);
        showNotification(`Selected ${selectedCount} units`, 'info');
      }
      break;
    case 'v':
    case 'V':
      if (event.ctrlKey) {
        console.log("Force vespene gathering (Ctrl+V)");
        forceVespeneGathering();
      }
      break;
    case 'd':
    case 'D':
      if (event.ctrlKey) {
        console.log("Toggle debug mode");
        debug.showClickRadius = !debug.showClickRadius;
        debug.showNodeInfo = !debug.showNodeInfo;
        debug.logEvents = !debug.logEvents;
        showNotification(`Debug mode ${debug.showClickRadius ? 'ON' : 'OFF'}`, 'info');
      }
      break;
    case ' ':
      // Center camera on selection (not implemented yet)
      console.log("Space pressed - center camera");
      break;
  }
}

// ========== RESOURCE NODE FUNCTIONS ==========
function findResourceNodeAt(x, y) {
  const nodes = window.gameResourceNodes;
  if (!nodes) {
    console.log("  No resource nodes in game");
    return null;
  }
  
  console.log(`  Searching ${nodes.size} resource nodes...`);
  
  let foundNode = null;
  let closestDistance = Infinity;
  
  nodes.forEach((node, id) => {
    if (node.amount <= 0) {
      console.log(`    Node ${id} depleted, skipping`);
      return;
    }
    
    const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
    console.log(`    Node ${id} (${node.type}) at (${node.x}, ${node.y}), distance: ${distance.toFixed(1)}`);
    
    // Check if within click radius (30 pixels)
    if (distance < 30 && distance < closestDistance) {
      closestDistance = distance;
      foundNode = { id, ...node };
      console.log(`      ✓ Within range!`);
    }
  });
  
  if (foundNode) {
    console.log(`  Found ${foundNode.type} node: ${foundNode.id} at distance ${closestDistance.toFixed(1)}`);
  } else {
    console.log(`  No resource node found within 30px of (${x}, ${y})`);
  }
  
  return foundNode;
}

function findBuildingAt(x, y) {
  const buildings = window.gameBuildings;
  if (!buildings) return null;
  
  for (const [id, building] of buildings.entries()) {
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
    
    if (x >= building.x - buildingWidth/2 && x <= building.x + buildingWidth/2 &&
        y >= building.y - buildingHeight/2 && y <= building.y + buildingHeight/2) {
      return { id, building };
    }
  }
  return null;
}

function findNearestResourceNode() {
  if (!window.gameResourceNodes || !selectedUnits.size) {
    console.log("Cannot find nearest node: no nodes or no selection");
    return null;
  }
  
  // Get first selected unit position
  const unitId = Array.from(selectedUnits)[0];
  const unit = units.get(unitId);
  if (!unit) {
    console.log("First selected unit not found");
    return null;
  }
  
  console.log(`Finding nearest resource node to unit at (${unit.x}, ${unit.y})`);
  
  let nearestNode = null;
  let nearestDistance = Infinity;
  
  window.gameResourceNodes.forEach((node, id) => {
    if (node.amount <= 0) return;
    
    const distance = Math.sqrt(
      Math.pow(node.x - unit.x, 2) + 
      Math.pow(node.y - unit.y, 2)
    );
    
    console.log(`  Node ${id} (${node.type}) at distance ${distance.toFixed(1)}`);
    
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestNode = { id, ...node };
    }
  });
  
  if (nearestNode) {
    console.log(`Nearest node: ${nearestNode.type} at distance ${nearestDistance.toFixed(1)}`);
  } else {
    console.log("No resource nodes found");
  }
  
  return nearestNode;
}

function forceVespeneGathering() {
  console.log("=== FORCE VESPENE GATHERING ===");
  
  const nodes = window.gameResourceNodes;
  const units = window.gameUnits;
  
  if (!nodes || !units) {
    console.log("Missing nodes or units");
    return;
  }
  
  // Find first vespene node
  let vespeneNode = null;
  nodes.forEach((node, id) => {
    if (node.type === 'vespene' && node.amount > 0 && !vespeneNode) {
      vespeneNode = { id, ...node };
      console.log(`Found vespene node: ${id} at (${node.x}, ${node.y})`);
    }
  });
  
  if (!vespeneNode) {
    console.log("No vespene nodes found");
    showNotification('No vespene nodes available', 'warning');
    return;
  }
  
  // Send all selected workers
  let workersSent = 0;
  selectedUnits.forEach(unitId => {
    const unit = units.get(unitId);
    if (unit && unit.type === 'worker') {
      console.log(`Sending worker ${unitId} to vespene at (${vespeneNode.x}, ${vespeneNode.y})`);
      unit.moveTo(vespeneNode.x, vespeneNode.y);
      unit.gatherTarget = vespeneNode.id;
      unit.isGathering = true;
      unit.state = 'moving_to_gather';
      workersSent++;
    }
  });
  
  if (workersSent > 0) {
    showNotification(`Force sent ${workersSent} worker(s) to vespene`, 'info');
  } else {
    showNotification('No workers selected', 'warning');
  }
}

// ========== BUILDING MODE FUNCTIONS ==========
function enterBuildingMode(buildingType) {
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
}

function exitBuildingMode() {
  console.log("Exiting building mode");
  isBuildingMode = false;
  currentBuildingType = null;
  buildingGhost = null;
  canPlaceBuilding = true;
}

function updateBuildingGhost() {
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
  if (ghostRect.x < 0 || ghostRect.x + ghostRect.width > canvas.width ||
      ghostRect.y < 0 || ghostRect.y + ghostRect.height > canvas.height) {
    canPlaceBuilding = false;
  }
  
  // For refinery, check if on vespene geyser
  if (currentBuildingType === 'refinery') {
    const onVespene = findResourceNodeAt(mouseX, mouseY);
    if (!onVespene || onVespene.type !== 'vespene') {
      canPlaceBuilding = false;
    }
  }
}

function rectsOverlap(rect1, rect2) {
  return !(rect1.x + rect1.width < rect2.x ||
           rect2.x + rect2.width < rect1.x ||
           rect1.y + rect1.height < rect2.y ||
           rect2.y + rect2.height < rect1.y);
}

function placeBuilding(x, y) {
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
    exitBuildingMode();
    return;
  }
  
  // Check if building system exists
  if (!window.gameSystems?.buildings) {
    console.log("Building system not loaded");
    showNotification('Building system not loaded', 'error');
    exitBuildingMode();
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

// ========== HELPER FUNCTIONS ==========
function updateResourceDisplay(playerId, resources) {
  if (players[playerId]) {
    players[playerId].resources = { ...resources };
  }
}

function updateUIState() {
  // Check if selected units include workers
  const workers = Array.from(selectedUnits).filter(id => {
    const unit = units.get(id);
    return unit && unit.type === 'worker';
  });
  
  uiState.showUnitCommands = workers.length > 0;
  uiState.selectedWorker = workers.length === 1 ? workers[0] : null;
}

// ========== UI FUNCTIONS ==========
function setupUI() {
  // Create notification container
  const notificationContainer = document.createElement('div');
  notificationContainer.id = 'notification-container';
  notificationContainer.style.cssText = `
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    max-width: 400px;
    pointer-events: none;
  `;
  document.body.appendChild(notificationContainer);
  
  console.log("UI setup complete");
}

function setupDebugPanel() {
  const debugPanel = document.createElement('div');
  debugPanel.id = 'debug-panel';
  debugPanel.style.cssText = `
    position: absolute;
    top: 100px;
    right: 10px;
    background: rgba(0,0,0,0.7);
    color: #fff;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 1000;
    max-width: 300px;
  `;
  
  debugPanel.innerHTML = `
    <h4 style="margin:0 0 10px 0; color:#f1c40f">Debug Controls</h4>
    <div>Ctrl+D: Toggle debug info</div>
    <div>Ctrl+V: Force vespene gather</div>
    <div>G: Gather nearest resource</div>
    <div>ESC: Cancel/clear selection</div>
  `;
  
  document.body.appendChild(debugPanel);
}

function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  if (!container) return;
  
  const notification = document.createElement('div');
  
  let bgColor, textColor;
  switch(type) {
    case 'error':
      bgColor = '#e74c3c';
      textColor = '#fff';
      break;
    case 'warning':
      bgColor = '#f39c12';
      textColor = '#fff';
      break;
    case 'success':
      bgColor = '#2ecc71';
      textColor = '#fff';
      break;
    default:
      bgColor = '#3498db';
      textColor = '#fff';
  }
  
  notification.style.cssText = `
    background: ${bgColor};
    color: ${textColor};
    padding: 10px 20px;
    margin-bottom: 5px;
    border-radius: 4px;
    opacity: 0;
    transform: translateY(-20px);
    transition: opacity 0.3s, transform 0.3s;
    text-align: center;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    max-width: 400px;
  `;
  
  notification.textContent = message;
  container.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '0.9';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// ========== START GAME ==========
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for debugging
window.gameDebug = {
  units,
  selectedUnits,
  players,
  eventSystem,
  effects,
  showNotification,
  enterBuildingMode,
  exitBuildingMode,
  findResourceNodeAt,
  findNearestResourceNode,
  forceVespeneGathering,
  debug
};

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