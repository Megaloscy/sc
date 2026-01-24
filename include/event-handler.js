








// Import from index.js
import { units, selectedUnits, players, currentPlayerId, eventSystem } from '/sc/index.js';

// Import effects
import { 
  showDamageIndicator, 
  showDestructionEffect, 
  showGatheringEffect, 
  showGatheringParticles, 
  showBuildEffect, 
  showCompletionEffect, 
  showSelectionEffect, 
  showClickEffect
} from './effects.js';

// Import UI functions
import { 
  showNotification, 
  updateResourceDisplay, 
  updateUIState, 
  uiState 
} from './ui.js';

// Import building mode functions from window (to avoid circular dependencies)
// These will be set from main.js

let gameSystems = null;

export function setupEventListeners() {
  if (!eventSystem) {
    console.warn("Event system not available");
    return;
  }

  eventSystem.on('game_ready', (data) => {
    console.log("Game ready event received");
    gameSystems = data.systems || window.gameSystems;
    
    // Call initializeResourceNodes from window
    if (window.initializeResourceNodes) {
      window.initializeResourceNodes();
    }
    
    // Start game loop
    if (window.gameLoop) {
      requestAnimationFrame(window.gameLoop);
    }
    
    // Test vespene nodes
    setTimeout(() => {
      if (window.testVespeneNodes) {
        window.testVespeneNodes();
      }
    }, 1000);
  });

  eventSystem.on('unit_created', (data) => {
    if (window.debug?.logEvents) console.log("Unit created:", data.unitId, data.type);
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
    if (window.debug?.logEvents) console.log("Unit destroyed:", data.unitId);
    showDestructionEffect(data.x, data.y);
    showNotification(`${data.type} destroyed!`, 'warning');
  });

  eventSystem.on('resources_updated', (data) => {
    updateResourceDisplay(data.playerId, data.resources);
  });

  eventSystem.on('resource_gathered', (data) => {
    if (window.debug?.logEvents) console.log(`Resource gathered: ${data.amount} ${data.resourceType}`);
    showGatheringEffect(data.nodePosition.x, data.nodePosition.y, data.playerId);
  });

  eventSystem.on('resources_deposited', (data) => {
    if (window.debug?.logEvents) console.log(`Worker deposited ${data.minerals} minerals, ${data.vespene} vespene`);
    showNotification(`+${data.minerals} minerals, +${data.vespene} vespene`, 'success');
  });

  eventSystem.on('worker_gather_order', (data) => {
    if (window.debug?.logEvents) console.log(`Worker gather order: ${data.resourceType} at (${data.x},${data.y})`);
    showNotification(`Worker sent to gather ${data.resourceType}`, 'info');
    
    // Show click effect
    showClickEffect(data.x, data.y, data.resourceType === 'minerals' ? '#3498db' : '#2ecc71');
  });

  eventSystem.on('worker_gathering', (data) => {
    if (window.debug?.logEvents) console.log(`Worker gathering: ${data.amount} ${data.resourceType}, carried: ${data.carried}`);
    // Show gathering particles
    const unit = units.get(data.workerId);
    if (unit) {
      showGatheringParticles(unit.x, unit.y, unit.owner);
    }
  });

  eventSystem.on('building_started', (data) => {
    if (window.debug?.logEvents) console.log(`Building ${data.buildingType} started`);
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
    if (window.debug?.logEvents) console.log(`Building ${data.buildingType} completed`);
    showCompletionEffect(data.x, data.y);
    showNotification(`${data.buildingType} completed!`, 'success');
  });

  eventSystem.on('building_created', (data) => {
    if (window.debug?.logEvents) console.log(`Building ${data.type} created`);
  });

  eventSystem.on('building_selected', (data) => {
    if (window.debug?.logEvents) console.log(`Building ${data.type} selected`);
  });

  eventSystem.on('build_order_accepted', (data) => {
    if (window.debug?.logEvents) console.log(`Build order accepted for ${data.buildingType}`);
    // Call exitBuildingMode from window
    if (window.exitBuildingMode) {
      window.exitBuildingMode();
    }
  });

  eventSystem.on('build_error', (data) => {
    console.error(`Build error: ${data.reason}`);
    showNotification(`Cannot build: ${data.reason}`, 'error');
    // Call exitBuildingMode from window
    if (window.exitBuildingMode) {
      window.exitBuildingMode();
    }
  });

  eventSystem.on('build_cancelled', (data) => {
    if (window.debug?.logEvents) console.log(`Build cancelled: ${data.reason}`);
    showNotification(`Build cancelled`, 'warning');
  });

  eventSystem.on('selection_cleared', (data) => {
    if (window.debug?.logEvents) console.log("Selection cleared");
    uiState.showUnitCommands = false;
    uiState.showBuildingMenu = false;
    uiState.selectedWorker = null;
  });

  eventSystem.on('units_selected', (data) => {
    if (window.debug?.logEvents) console.log(`${data.unitIds.length} units selected`);
    updateUIState();
  });

  eventSystem.on('gather_error', (data) => {
    console.error(`Gather error: ${data.reason} for ${data.resourceType}`);
    showNotification(`Cannot gather ${data.resourceType}: ${data.reason}`, 'error');
  });

  console.log("Event listeners setup complete");
}

// Export for main.js
export function setGameSystems(systems) {
  gameSystems = systems;
}

export function getGameSystems() {
  return gameSystems;
}