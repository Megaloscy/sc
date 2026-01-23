import Unit from './Unit.js';

// ========== GLOBAL STATE ==========
export const units = new Map();
export const selectedUnits = new Set();
export const players = {
  1: { id: 1, name: "Player 1", resources: { minerals: 500, vespene: 0 } },
  2: { id: 2, name: "Player 2", resources: { minerals: 500, vespene: 0 } }
};

export let currentPlayerId = 1;

// Make game state globally accessible
window.gameUnits = units;
window.gameBuildings = new Map();
window.gameResourceNodes = new Map();

// ========== UNIT MANAGEMENT FUNCTIONS ==========
export function createUnit(type, x, y, owner) {
  const id = `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const unit = new Unit(id, type, x, y, owner);
  units.set(id, unit);
  
  if (window.eventSystem) {
    window.eventSystem.emit('unit_created', {
      unitId: id,
      type,
      x,
      y,
      owner,
      health: unit.health
    });
  }
  
  return id;
}

export function selectUnit(unitId) {
  const unit = units.get(unitId);
  if (unit && unit.owner === currentPlayerId) {
    unit.setSelected(true);
    selectedUnits.add(unitId);
    
    if (window.eventSystem) {
      window.eventSystem.emit('units_selected', {
        unitIds: Array.from(selectedUnits),
        playerId: currentPlayerId
      });
    }
    
    return true;
  }
  return false;
}

export function deselectUnit(unitId) {
  const unit = units.get(unitId);
  if (unit) {
    unit.setSelected(false);
    selectedUnits.delete(unitId);
  }
}

export function clearSelection() {
  selectedUnits.forEach(unitId => {
    const unit = units.get(unitId);
    if (unit) {
      unit.setSelected(false);
    }
  });
  selectedUnits.clear();
  
  // Also deselect buildings
  if (window.gameBuildings) {
    window.gameBuildings.forEach(building => {
      building.selected = false;
    });
  }
  
  if (window.eventSystem) {
    window.eventSystem.emit('selection_cleared', { playerId: currentPlayerId });
  }
}

export function moveSelectedUnits(targetX, targetY) {
  selectedUnits.forEach(unitId => {
    const unit = units.get(unitId);
    if (unit) {
      unit.moveTo(targetX, targetY);
    }
  });
}

// ========== BUILDING FUNCTIONS ==========
export function createBuilding(type, x, y, owner) {
  const buildingId = `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const building = {
    id: buildingId,
    type,
    x,
    y,
    owner,
    health: 1000,
    maxHealth: 1000,
    selected: false,
    isBuilding: false
  };
  
  // Add to buildings map
  if (!window.gameBuildings) {
    window.gameBuildings = new Map();
  }
  window.gameBuildings.set(buildingId, building);
  
  if (window.eventSystem) {
    window.eventSystem.emit('building_created', {
      buildingId,
      type,
      x,
      y,
      owner,
      health: building.health
    });
  }
  
  return buildingId;
}

export function selectBuilding(buildingId) {
  const building = window.gameBuildings?.get(buildingId);
  if (building && building.owner === currentPlayerId) {
    building.selected = true;
    
    if (window.eventSystem) {
      window.eventSystem.emit('building_selected', {
        buildingId,
        type: building.type,
        owner: building.owner
      });
    }
    
    return true;
  }
  return false;
}

export function deselectBuilding(buildingId) {
  const building = window.gameBuildings?.get(buildingId);
  if (building) {
    building.selected = false;
  }
}

// ========== RESOURCE NODE FUNCTIONS ==========
export function createResourceNode(type, x, y, amount = 1500) {
  const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const node = {
    id: nodeId,
    type,
    x,
    y,
    amount,
    initialAmount: amount
  };
  
  window.gameResourceNodes.set(nodeId, node);
  
  if (window.eventSystem) {
    window.eventSystem.emit('resource_node_created', {
      nodeId,
      type,
      x,
      y,
      amount
    });
  }
  
  return nodeId;
}

// Add to window
window.forceVespeneGather = function(workerId) {
  const worker = units.get(workerId);
  if (worker) {
    return worker.forceGatherVespene();
  }
  return false;
};