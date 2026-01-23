// ========== EVENT SYSTEM ==========
class EventSystem {
  constructor() {
    this.listeners = new Map();
  }

  // Subscribe to an event
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
    return () => this.off(eventName, callback);
  }

  // Unsubscribe from an event
  off(eventName, callback) {
    if (!this.listeners.has(eventName)) return;
    const callbacks = this.listeners.get(eventName);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  // Emit an event with data
  emit(eventName, data = {}) {
    if (!this.listeners.has(eventName)) return;
    const callbacks = this.listeners.get(eventName);
    
    [...callbacks].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for "${eventName}":`, error);
      }
    });
  }

  clear(eventName) {
    this.listeners.delete(eventName);
  }

  clearAll() {
    this.listeners.clear();
  }
}

// ========== UNIT CLASS ==========


// ========== UNIT CLASS (FIXED VERSION) ==========
class Unit {
  constructor(id, type, x, y, owner) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.owner = owner;
    this.selected = false;
    this.health = 100;
    this.maxHealth = 100;
    
    // Movement properties
    this.moveSpeed = 2.0;
    this.targetX = x;
    this.targetY = y;
    this.isMoving = false;
    this.movePath = [];
    
    // Combat properties
    this.attackDamage = 10;
    this.attackRange = 50;
    this.attackCooldown = 1.0;
    this.attackTimer = 0;
    this.attackTarget = null;
    this.canAttack = type !== 'worker';
    
    // Gathering properties - SIMPLIFIED AND FIXED
    this.gatherSpeed = 5; // Resources per second
    this.carryCapacity = 20;
    this.carriedResources = { minerals: 0, vespene: 0 }; // PROPERLY INITIALIZED
    this.gatherTarget = null;
    this.isGathering = false;
    this.returnTarget = null;
    
    // Building properties
    this.buildSpeed = 30;
    this.buildTarget = null;
    this.isBuilding = false;
    this.buildProgress = 0;
    
    // State
    this.state = 'idle';
    
    // Set unit-specific stats
    this.setUnitStats();
    
    console.log(`Created ${type} unit ${id} at (${x}, ${y})`);
  }

  setUnitStats() {
    switch(this.type) {
      case 'worker':
        this.moveSpeed = 1.5;
        this.attackDamage = 5;
        this.attackRange = 10;
        this.canAttack = false;
        this.maxHealth = 60;
        this.health = 60;
        this.gatherSpeed = 8;
        this.carryCapacity = 20;
        this.buildSpeed = 30;
        break;
      case 'soldier':
        this.moveSpeed = 2.0;
        this.attackDamage = 15;
        this.attackRange = 40;
        this.attackCooldown = 1.5;
        this.maxHealth = 100;
        this.health = 100;
        break;
      case 'archer':
        this.moveSpeed = 2.2;
        this.attackDamage = 12;
        this.attackRange = 80;
        this.attackCooldown = 2.0;
        this.maxHealth = 75;
        this.health = 75;
        break;
    }
  }

  update(deltaTime) {
    const deltaSeconds = deltaTime / 1000;
    
    if (this.attackTimer > 0) {
      this.attackTimer -= deltaSeconds;
    }
    
    this.updateMovement(deltaSeconds);
    this.updateCombat(deltaSeconds);
    
    // Worker-specific updates
    if (this.type === 'worker') {
      this.updateGathering(deltaSeconds);
      this.updateBuilding(deltaSeconds);
    }
  }

  // ========== FIXED MOVEMENT ==========
  updateMovement(deltaSeconds) {
    if (!this.isMoving) return;
    
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 1) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.isMoving = false;
      
      // IMPORTANT: When worker reaches gather target, ensure state changes
      if (this.state === 'moving_to_gather' && this.gatherTarget) {
        console.log(`Worker ${this.id} reached gather target, switching to gathering`);
        this.state = 'gathering';
      }
      // Check if we reached a building site
      else if (this.state === 'moving_to_build' && this.buildTarget) {
        this.state = 'building';
      }
      // Check if we reached command center to deposit
      else if (this.state === 'returning_resources') {
        console.log(`Worker ${this.id} reached deposit location`);
        this.depositResources();
      }
      else {
        this.state = 'idle';
      }
      return;
    }
    
    const moveDistance = this.moveSpeed * deltaSeconds * 60;
    const ratio = moveDistance / distance;
    
    this.x += dx * ratio;
    this.y += dy * ratio;
  }

  updateCombat(deltaSeconds) {
    if (!this.attackTarget || !this.canAttack || this.attackTimer > 0) {
      return;
    }
    
    const targetUnit = window.gameUnits?.get(this.attackTarget);
    if (!targetUnit || targetUnit.health <= 0) {
      this.clearAttackTarget();
      return;
    }
    
    const dx = targetUnit.x - this.x;
    const dy = targetUnit.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= this.attackRange) {
      this.attack(targetUnit);
    } else {
      this.moveTo(targetUnit.x, targetUnit.y);
    }
  }

  // ========== FIXED GATHERING METHOD ==========
  updateGathering(deltaSeconds) {
    // Quick check - if not gathering, return immediately
    if (!this.isGathering || !this.gatherTarget) {
      return;
    }
    
    // Get the resource node
    const node = window.gameResourceNodes?.get(this.gatherTarget);
    if (!node || node.amount <= 0) {
      console.log(`Worker ${this.id}: Node not found or depleted`);
      this.stopGathering();
      return;
    }
    
    // Check distance to node
    const dx = node.x - this.x;
    const dy = node.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If too far, move closer
    if (distance > 30) {
      if (this.state !== 'moving_to_gather') {
        this.state = 'moving_to_gather';
        this.moveTo(node.x, node.y);
      }
      return;
    }
    
    // We're at the node! Make sure we're in gathering state
    if (this.state !== 'gathering') {
      console.log(`Worker ${this.id} at node, switching to gathering state`);
      this.state = 'gathering';
    }
    
    // ====== THIS IS THE CRITICAL FIX ======
    // Calculate how much to gather
    const gatherAmount = this.gatherSpeed * deltaSeconds;
    
    if (node.type === 'minerals') {
      // Gather minerals
      const availableCapacity = this.carryCapacity - this.carriedResources.minerals;
      const actualGather = Math.min(gatherAmount, node.amount, availableCapacity);
      
      if (actualGather > 0) {
        this.carriedResources.minerals += actualGather;
        node.amount -= actualGather;
        
        // Update global node
        if (window.gameResourceNodes) {
          const globalNode = window.gameResourceNodes.get(this.gatherTarget);
          if (globalNode) globalNode.amount = node.amount;
        }
        
        if (window.eventSystem) {
          window.eventSystem.emit('worker_gathering', {
            workerId: this.id,
            nodeId: this.gatherTarget,
            resourceType: 'minerals',
            amount: actualGather,
            carried: this.carriedResources.minerals,
            nodeRemaining: node.amount
          });
        }
        
        // Check if full
        if (this.carriedResources.minerals >= this.carryCapacity) {
          this.returnResources();
        }
      }
    } 
    else if (node.type === 'vespene') {
      // ====== VESPENE GATHERING FIXED ======
      const availableCapacity = this.carryCapacity - this.carriedResources.vespene;
      const actualGather = Math.min(gatherAmount, node.amount, availableCapacity);
      
      console.log(`Worker ${this.id} gathering vespene: ${actualGather} (capacity: ${availableCapacity}, node: ${node.amount})`);
      
      if (actualGather > 0) {
        // THIS LINE WAS PROBABLY NOT WORKING BEFORE
        this.carriedResources.vespene += actualGather;
        node.amount -= actualGather;
        
        console.log(`✅ Worker ${this.id} gathered ${actualGather} vespene! Total: ${this.carriedResources.vespene}`);
        
        // Update global node
        if (window.gameResourceNodes) {
          const globalNode = window.gameResourceNodes.get(this.gatherTarget);
          if (globalNode) {
            globalNode.amount = node.amount;
            console.log(`   Node updated: ${globalNode.amount} vespene remaining`);
          }
        }
        
        // Emit event
        if (window.eventSystem) {
          window.eventSystem.emit('worker_gathering', {
            workerId: this.id,
            nodeId: this.gatherTarget,
            resourceType: 'vespene',
            amount: actualGather,
            carried: this.carriedResources.vespene,
            nodeRemaining: node.amount
          });
        }
        
        // Check if full
        if (this.carriedResources.vespene >= this.carryCapacity) {
          console.log(`Worker ${this.id} vespene full (${this.carriedResources.vespene}/${this.carryCapacity}), returning`);
          this.returnResources();
        }
      } else {
        console.log(`Worker ${this.id} cannot gather vespene: gatherAmount=${gatherAmount}, node.amount=${node.amount}, availableCapacity=${availableCapacity}`);
      }
    }
  }

  updateBuilding(deltaSeconds) {
    if (!this.isBuilding || !this.buildTarget) return;
    
    const building = window.gameBuildings?.get(this.buildTarget);
    if (!building) {
      this.stopBuilding();
      return;
    }
    
    const dx = building.x - this.x;
    const dy = building.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 40) {
      this.moveTo(building.x, building.y);
      return;
    }
    
    this.buildProgress += this.buildSpeed * deltaSeconds;
    this.state = 'building';
    
    if (window.eventSystem) {
      window.eventSystem.emit('building_progress', {
        workerId: this.id,
        buildingId: this.buildTarget,
        progress: this.buildProgress,
        buildingType: building.type
      });
    }
    
    if (this.buildProgress >= 100) {
      this.completeBuilding();
    }
  }

  moveTo(x, y) {
    this.targetX = x;
    this.targetY = y;
    this.isMoving = true;
    
    if (this.attackTarget) {
      this.clearAttackTarget();
    }
    
    // Update state based on current action
    if (this.isGathering) {
      this.state = 'moving_to_gather';
    } else if (this.isBuilding) {
      this.state = 'moving_to_build';
    } else if (this.state === 'returning_resources') {
      // Keep returning resources state
    } else {
      this.state = 'moving';
    }
  }

  attackTargetUnit(targetId) {
    const targetUnit = window.gameUnits?.get(targetId);
    if (!targetUnit || targetUnit.owner === this.owner) {
      return false;
    }
    
    this.attackTarget = targetId;
    this.state = 'attacking';
    this.isMoving = false;
    
    return true;
  }

  attack(targetUnit) {
    if (this.attackTimer > 0) return;
    
    if (window.gameSystems?.combat) {
      window.gameSystems.combat.attack(this.id, targetUnit.id, this.attackDamage);
    } else {
      targetUnit.takeDamage(this.attackDamage);
    }
    
    this.attackTimer = this.attackCooldown;
  }

  clearAttackTarget() {
    this.attackTarget = null;
    this.state = 'idle';
  }

  // ========== GATHERING METHODS ==========
  startGathering(nodeId) {
    console.log(`Worker ${this.id} starting to gather from node ${nodeId}`);
    
    const node = window.gameResourceNodes?.get(nodeId);
    if (!node) {
      console.log(`Node ${nodeId} not found`);
      return false;
    }
    
    // Allow gathering from both minerals and vespene
    if (node.type !== 'minerals' && node.type !== 'vespene') {
      console.log(`Cannot gather from node type: ${node.type}`);
      return false;
    }
    
    this.gatherTarget = nodeId;
    this.isGathering = true;
    this.state = 'moving_to_gather';
    
    // Clear other actions
    this.clearAttackTarget();
    this.stopBuilding();
    
    this.moveTo(node.x, node.y);
    
    if (window.eventSystem) {
      window.eventSystem.emit('worker_gather_order', {
        workerId: this.id,
        nodeId,
        resourceType: node.type,
        x: node.x,
        y: node.y
      });
    }
    
    console.log(`Worker ${this.id} moving to gather ${node.type} at (${node.x}, ${node.y})`);
    return true;
  }

  returnResources() {
    console.log(`Worker ${this.id} returning resources`);
    console.log(`  Carrying: ${this.carriedResources.minerals} minerals, ${this.carriedResources.vespene} vespene`);
    
    // Find nearest command center
    let nearestBase = null;
    let nearestDistance = Infinity;
    
    const buildings = window.gameBuildings;
    if (buildings) {
      buildings.forEach((building, id) => {
        if (building.owner === this.owner && building.type === 'command_center' && !building.isBuilding) {
          const dx = building.x - this.x;
          const dy = building.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestBase = { id, building };
          }
        }
      });
    }
    
    if (nearestBase) {
      console.log(`Found command center at (${nearestBase.building.x}, ${nearestBase.building.y})`);
      this.returnTarget = nearestBase.id;
      this.isGathering = false;
      this.state = 'returning_resources';
      this.moveTo(nearestBase.building.x, nearestBase.building.y);
    } else {
      console.log(`No command center found, depositing at current location`);
      this.depositResources();
    }
  }

  depositResources() {
    console.log(`Worker ${this.id} depositing resources`);
    
    if (window.gameSystems?.resources) {
      // Deposit minerals
      if (this.carriedResources.minerals > 0) {
        const newTotal = window.gameSystems.resources.addResources(
          this.owner,
          'minerals',
          this.carriedResources.minerals
        );
        console.log(`Deposited ${this.carriedResources.minerals} minerals, total now: ${newTotal}`);
      }
      
      // Deposit vespene
      if (this.carriedResources.vespene > 0) {
        const newTotal = window.gameSystems.resources.addResources(
          this.owner,
          'vespene',
          this.carriedResources.vespene
        );
        console.log(`✅ Deposited ${this.carriedResources.vespene} vespene, total now: ${newTotal}`);
      }
      
      if (window.eventSystem) {
        window.eventSystem.emit('resources_deposited', {
          workerId: this.id,
          playerId: this.owner,
          minerals: this.carriedResources.minerals,
          vespene: this.carriedResources.vespene
        });
      }
      
      // Reset carried resources
      this.carriedResources = { minerals: 0, vespene: 0 };
    }
    
    // Resume gathering if target still exists and has resources
    if (this.gatherTarget) {
      const node = window.gameResourceNodes?.get(this.gatherTarget);
      if (node && node.amount > 0) {
        console.log(`Worker ${this.id} resuming gathering`);
        this.isGathering = true;
        this.state = 'moving_to_gather';
        this.moveTo(node.x, node.y);
      } else {
        console.log(`Worker ${this.id} node depleted, stopping`);
        this.stopGathering();
      }
    } else {
      this.state = 'idle';
    }
  }

  stopGathering() {
    console.log(`Worker ${this.id} stopping gathering`);
    this.isGathering = false;
    this.gatherTarget = null;
    this.state = 'idle';
  }

  // ========== BUILDING METHODS ==========
  startBuilding(buildingType, x, y) {
    const buildingId = `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const building = {
      id: buildingId,
      type: buildingType,
      x,
      y,
      owner: this.owner,
      health: 1,
      maxHealth: 1000,
      isBuilding: true,
      buildProgress: 0,
      requiresWorker: true,
      workerId: this.id
    };
    
    if (!window.gameBuildings) {
      window.gameBuildings = new Map();
    }
    window.gameBuildings.set(buildingId, building);
    
    this.buildTarget = buildingId;
    this.isBuilding = true;
    this.buildProgress = 0;
    this.state = 'moving_to_build';
    
    this.clearAttackTarget();
    this.stopGathering();
    
    this.moveTo(x, y);
    
    if (window.eventSystem) {
      window.eventSystem.emit('building_started', {
        workerId: this.id,
        buildingId,
        buildingType,
        x,
        y,
        playerId: this.owner
      });
    }
    
    return buildingId;
  }

  completeBuilding() {
    const building = window.gameBuildings?.get(this.buildTarget);
    if (!building) return;
    
    building.isBuilding = false;
    building.health = building.maxHealth;
    building.workerId = null;
    
    this.isBuilding = false;
    this.buildTarget = null;
    this.buildProgress = 0;
    this.state = 'idle';
    
    if (window.eventSystem) {
      window.eventSystem.emit('building_completed', {
        workerId: this.id,
        buildingId: this.buildTarget,
        buildingType: building.type,
        x: building.x,
        y: building.y,
        playerId: this.owner
      });
    }
  }

  stopBuilding() {
    this.isBuilding = false;
    this.buildTarget = null;
    this.buildProgress = 0;
    this.state = 'idle';
  }

  takeDamage(amount) {
    const oldHealth = this.health;
    this.health = Math.max(0, this.health - amount);
    
    if (window.eventSystem) {
      window.eventSystem.emit('unit_damaged', {
        unitId: this.id,
        oldHealth,
        newHealth: this.health,
        damage: amount
      });
    }

    if (this.health <= 0) {
      if (window.eventSystem) {
        window.eventSystem.emit('unit_destroyed', {
          unitId: this.id,
          type: this.type,
          owner: this.owner,
          x: this.x,
          y: this.y
        });
      }
    }
  }

  canSee(otherUnit, visionRange = 100) {
    const dx = otherUnit.x - this.x;
    const dy = otherUnit.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= visionRange;
  }

  setSelected(selected) {
    const wasSelected = this.selected;
    this.selected = selected;
    
    if (wasSelected !== selected && window.eventSystem) {
      window.eventSystem.emit('unit_selection_changed', {
        unitId: this.id,
        selected,
        owner: this.owner,
        type: this.type
      });
    }
  }
}





















// Add to index.js Unit class
function forceGatherVespene() {
  console.log(`xxxxxxxxxxxxxxxxxxxxxx----------------------------FORCE GATHER called for worker ${this.id}`);
  
  // Find any vespene node
  let vespeneNode = null;
  window.gameResourceNodes?.forEach((node, id) => {
    if (node.type === 'vespene' && node.amount > 0 && !vespeneNode) {
      vespeneNode = { id, ...node };
    }
  });
  
  if (!vespeneNode) {
    console.log("No vespene nodes found");
    return false;
  }
  
  console.log(`---------------------------Found vespene node: ${vespeneNode.id} with ${vespeneNode.amount} gas`);
  
  // Direct gather - bypass all logic
  const gatherAmount = 10;
  
  // Update worker
  this.carriedResources.vespene += gatherAmount;
  console.log(`Worker now has ${this.carriedResources.vespene} vespene`);
  
  // Update node
  vespeneNode.amount -= gatherAmount;
  console.log(`Node now has ${vespeneNode.amount} vespene`);
  
  // Update global node
  if (window.gameResourceNodes) {
    const globalNode = window.gameResourceNodes.get(vespeneNode.id);
    if (globalNode) {
      globalNode.amount = vespeneNode.amount;
    }
  }
  
  // Emit event
  if (window.eventSystem) {
    window.eventSystem.emit('worker_gathering', {
      workerId: this.id,
      nodeId: vespeneNode.id,
      resourceType: 'vespene',
      amount: gatherAmount,
      carried: this.carriedResources.vespene,
      nodeRemaining: vespeneNode.amount
    });
  }
  
  return true;
}

// Add to window
window.forceVespeneGather = function(workerId) {
  const worker = units.get(workerId);
    console.log(`---------------------------Found vespene node: ${vespeneNode.id} with ${vespeneNode.amount} gas`);
  
  if (worker) {
    return worker.forceGatherVespene();
  }
  return false;
};






























// ========== BUILDING FUNCTIONS ==========
function createBuilding(type, x, y, owner) {
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
  
  if (eventSystem) {
    eventSystem.emit('building_created', {
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

function selectBuilding(buildingId) {
  const building = window.gameBuildings?.get(buildingId);
  if (building && building.owner === currentPlayerId) {
    building.selected = true;
    
    if (eventSystem) {
      eventSystem.emit('building_selected', {
        buildingId,
        type: building.type,
        owner: building.owner
      });
    }
    
    return true;
  }
  return false;
}

function deselectBuilding(buildingId) {
  const building = window.gameBuildings?.get(buildingId);
  if (building) {
    building.selected = false;
  }
}

// ========== GLOBAL STATE ==========
const units = new Map();
const selectedUnits = new Set();
const players = {
  1: { id: 1, name: "Player 1", resources: { minerals: 500, vespene: 0 } },
  2: { id: 2, name: "Player 2", resources: { minerals: 500, vespene: 0 } }
};

let currentPlayerId = 1;

// Make game state globally accessible
window.gameUnits = units;
window.gameBuildings = new Map();
window.gameResourceNodes = new Map();

// ========== EVENT SYSTEM INSTANCE ==========
const eventSystem = new EventSystem();
window.eventSystem = eventSystem;

// ========== UNIT MANAGEMENT FUNCTIONS ==========
function createUnit(type, x, y, owner) {
  const id = `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const unit = new Unit(id, type, x, y, owner);
  units.set(id, unit);
  
  eventSystem.emit('unit_created', {
    unitId: id,
    type,
    x,
    y,
    owner,
    health: unit.health
  });
  
  return id;
}

function selectUnit(unitId) {
  const unit = units.get(unitId);
  if (unit && unit.owner === currentPlayerId) {
    unit.setSelected(true);
    selectedUnits.add(unitId);
    
    eventSystem.emit('units_selected', {
      unitIds: Array.from(selectedUnits),
      playerId: currentPlayerId
    });
    
    return true;
  }
  return false;
}

function deselectUnit(unitId) {
  const unit = units.get(unitId);
  if (unit) {
    unit.setSelected(false);
    selectedUnits.delete(unitId);
  }
}

function clearSelection() {
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
  
  eventSystem.emit('selection_cleared', { playerId: currentPlayerId });
}

function moveSelectedUnits(targetX, targetY) {
  selectedUnits.forEach(unitId => {
    const unit = units.get(unitId);
    if (unit) {
      unit.moveTo(targetX, targetY);
    }
  });
}

// ========== RESOURCE NODE FUNCTIONS ==========
function createResourceNode(type, x, y, amount = 1500) {
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
  
  if (eventSystem) {
    eventSystem.emit('resource_node_created', {
      nodeId,
      type,
      x,
      y,
      amount
    });
  }
  
  return nodeId;
}


// In index.js, find the updateGathering method in the Unit class and REPLACE it with:

function updateGathering(deltaTime) {
  // DEBUG: Always log when this is called
  console.log(`[GATHER DEBUG] Worker ${this.id} updateGathering called`);
  
  // Convert to seconds
  const deltaSeconds = deltaTime / 1000;
  
  // If not gathering or no target, return
  if (!this.isGathering || !this.gatherTarget) {
    console.log(`[GATHER DEBUG] Not gathering or no target. isGathering=${this.isGathering}, target=${this.gatherTarget}`);
    return;
  }
  
  // Get the node
  const node = window.gameResourceNodes?.get(this.gatherTarget);
  if (!node) {
    console.log(`[GATHER DEBUG] Node ${this.gatherTarget} not found`);
    this.stopGathering();
    return;
  }
  
  // Check node has resources
  if (node.amount <= 0) {
    console.log(`[GATHER DEBUG] Node ${this.gatherTarget} depleted`);
    this.stopGathering();
    return;
  }
  
  console.log(`[GATHER DEBUG] Node found: ${node.type}, amount: ${node.amount}`);
  
  // Check distance to node
  const dx = node.x - this.x;
  const dy = node.y - this.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  console.log(`[GATHER DEBUG] Distance to node: ${distance}`);
  
  // If too far, move closer
  if (distance > 30) {
    console.log(`[GATHER DEBUG] Too far, moving closer`);
    if (this.state !== 'moving_to_gather') {
      this.state = 'moving_to_gather';
      this.moveTo(node.x, node.y);
    }
    return;
  }
  
  // We're at the node! Start gathering
  console.log(`[GATHER DEBUG] At node! Starting to gather...`);
  
  // Make sure we're in gathering state
  if (this.state !== 'gathering') {
    console.log(`[GATHER DEBUG] Changing state to 'gathering'`);
    this.state = 'gathering';
  }
  
  // SIMPLE GATHERING LOGIC - THIS IS THE FIX
  const gatherAmount = 5; // Fixed amount per update
  
  if (node.type === 'minerals') {
    // Simple mineral gathering
    const toGather = Math.min(gatherAmount, node.amount, this.carryCapacity - this.carriedResources.minerals);
    
    if (toGather > 0) {
      this.carriedResources.minerals += toGather;
      node.amount -= toGather;
      
      console.log(`[GATHER SUCCESS] Gathered ${toGather} minerals! Total: ${this.carriedResources.minerals}`);
      
      // Update global node
      if (window.gameResourceNodes) {
        const globalNode = window.gameResourceNodes.get(this.gatherTarget);
        if (globalNode) globalNode.amount = node.amount;
      }
      
      // Emit event
      if (window.eventSystem) {
        window.eventSystem.emit('worker_gathering', {
          workerId: this.id,
          nodeId: this.gatherTarget,
          resourceType: 'minerals',
          amount: toGather,
          carried: this.carriedResources.minerals
        });
      }
      
      // Check if full
      if (this.carriedResources.minerals >= this.carryCapacity) {
        this.returnResources();
      }
    }
  } 
  else if (node.type === 'vespene') {
    // SIMPLE VESPENE GATHERING - THIS IS WHAT WAS BROKEN
    const toGather = Math.min(gatherAmount, node.amount, this.carryCapacity - this.carriedResources.vespene);
    
    console.log(`[VESPENE DEBUG] Trying to gather: min(${gatherAmount}, ${node.amount}, ${this.carryCapacity - this.carriedResources.vespene}) = ${toGather}`);
    
    if (toGather > 0) {
      // THIS IS THE CRITICAL LINE THAT WASN'T WORKING
      this.carriedResources.vespene += toGather;
      node.amount -= toGather;
      
      console.log(`🎉 [VESPENE SUCCESS] Gathered ${toGather} vespene gas! 🎉`);
      console.log(`   Worker now has: ${this.carriedResources.vespene} vespene`);
      console.log(`   Node has left: ${node.amount} vespene`);
      
      // Update global node
      if (window.gameResourceNodes) {
        const globalNode = window.gameResourceNodes.get(this.gatherTarget);
        if (globalNode) {
          globalNode.amount = node.amount;
          console.log(`   Global node updated: ${globalNode.amount}`);
        }
      }
      
      // Emit event
      if (window.eventSystem) {
        window.eventSystem.emit('worker_gathering', {
          workerId: this.id,
          nodeId: this.gatherTarget,
          resourceType: 'vespene',
          amount: toGather,
          carried: this.carriedResources.vespene,
          nodeRemaining: node.amount
        });
      }
      
      // Check if full
      if (this.carriedResources.vespene >= this.carryCapacity) {
        console.log(`[VESPENE FULL] Returning to base with ${this.carriedResources.vespene} vespene`);
        this.returnResources();
      }
    } else {
      console.log(`[VESPENE FAILED] Cannot gather. toGather=${toGather}`);
      console.log(`   Reasons: gatherAmount=${gatherAmount}, node.amount=${node.amount}, availableCapacity=${this.carryCapacity - this.carriedResources.vespene}`);
    }
  }
}




// ========== SYSTEM INITIALIZATION ==========
async function initializeSystems() {
  try {
    console.log("Starting system initialization...");
    
    const systems = {};

    // Load and initialize addons in order
    console.log("Loading Resources system...");
    const ResourcesModule = await import('./Addons/mechanics/Resource.js');
    systems.resources = new ResourcesModule.default(eventSystem);
    console.log("Resources system loaded");
    
    console.log("Loading Combat system...");
    const CombatModule = await import('./Addons/mechanics/Combat.js');
    systems.combat = new CombatModule.default(eventSystem);
    console.log("Combat system loaded");
    
    console.log("Loading AI system...");
    const AIModule = await import('./Addons/AI/basicAI.js');
    systems.ai = new AIModule.default(eventSystem);
    console.log("AI system loaded");
    
    console.log("Loading Races system...");
    const RacesModule = await import('./Addons/Races/human.js');
    systems.races = new RacesModule.default(eventSystem);
    console.log("Races system loaded");
    
    console.log("Loading Terrain system...");
    const TerrainModule = await import('./Addons/terrain/uneven-terrain.js');
    systems.terrain = new TerrainModule.default(eventSystem);
    console.log("Terrain system loaded");
    
    // Load Building system if it exists
    try {
      console.log("Loading Building system...");
      const BuildingModule = await import('./Addons/Buildings/Buildings.js');
      systems.buildings = new BuildingModule.default(eventSystem);
      console.log("Building system loaded");
    } catch (error) {
      console.log("Building system not found, skipping...");
    }

    // Store globally
    window.gameSystems = systems;
    
    console.log('All systems initialized:', Object.keys(systems));
    
    // Test event system
    eventSystem.on('test_event', (data) => {
      console.log("✓ Event System Working:", data.message);
    });
    eventSystem.emit('test_event', { message: "Event system is operational!" });
    
    // Emit game ready event
    eventSystem.emit('game_ready', { systems });
    
    // Initialize resource nodes
    initializeGameResources();
    
    return systems;
  } catch (error) {
    console.error('Failed to initialize systems:', error);
    console.error('Error details:', error.message);
    return null;
  }
}

function initializeGameResources() {
  // Create initial resource nodes
  createResourceNode('minerals', 300, 200, 2000);
  createResourceNode('minerals', 500, 300, 2000);
  createResourceNode('minerals', 200, 400, 2000);
  createResourceNode('vespene', 400, 100, 1000);
  
  console.log("Resource nodes initialized");
}

// ========== INITIAL SETUP ==========
// Create initial units
createUnit('worker', 120, 180, 1);
createUnit('worker', 150, 180, 1);
createUnit('soldier', 200, 150, 1);
createUnit('archer', 250, 200, 1);
createUnit('worker', 580, 380, 2);
createUnit('soldier', 450, 450, 2);
createUnit('soldier', 500, 500, 2);

// Create initial command centers
createBuilding('command_center', 100, 200, 1);
createBuilding('command_center', 600, 400, 2);

// Initialize game systems
initializeSystems().then(systems => {
  console.log('Game initialization complete');
  
  // Emit initial resource state
  eventSystem.emit('resources_updated', {
    playerId: 1,
    resources: players[1].resources
  });
  eventSystem.emit('resources_updated', {
    playerId: 2,
    resources: players[2].resources
  });
});

// ========== EXPORTS ==========
export {
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
  eventSystem,
  Unit
};

// Debug helpers
window.debug = {
  addResources: (playerId, type, amount) => {
    if (window.gameSystems?.resources) {
      window.gameSystems.resources.addResources(playerId, type, amount);
    }
  },
  spawnUnit: (type, x, y, owner = 1) => createUnit(type, x, y, owner),
  spawnBuilding: (type, x, y, owner = 1) => createBuilding(type, x, y, owner),
  getUnits: () => units,
  getBuildings: () => window.gameBuildings,
  getResourceNodes: () => window.gameResourceNodes,
  getSystems: () => window.gameSystems
};



// Add this to index.js for immediate testing
window.testGatherImmediate = function(workerId = null) {
  console.log("=== IMMEDIATE GATHER TEST ===");
  
  // Find a worker
  if (!workerId) {
    const workers = [];
    units.forEach((unit, id) => {
      if (unit.type === 'worker' && unit.owner === 1) {
        workers.push(id);
      }
    });
    if (workers.length > 0) workerId = workers[0];
  }
  
  const worker = units.get(workerId);
  if (!worker) {
    console.log("Worker not found");
    return;
  }
  
  console.log(`Using worker: ${workerId}`);
  console.log(`Worker state: ${worker.state}`);
  console.log(`Carrying: ${worker.carriedResources.minerals} minerals, ${worker.carriedResources.vespene} vespene`);
  
  // Find a vespene node
  let vespeneNode = null;
  window.gameResourceNodes?.forEach((node, id) => {
    if (node.type === 'vespene' && node.amount > 0 && !vespeneNode) {
      vespeneNode = { id, ...node };
    }
  });
  
  if (!vespeneNode) {
    console.log("No vespene node found");
    return;
  }
  
  console.log(`Using vespene node: ${vespeneNode.id}`);
  console.log(`Node amount: ${vespeneNode.amount}`);
  
  // MANUALLY SET UP FOR GATHERING
  console.log("\n=== MANUAL SETUP ===");
  
  // 1. Position worker at node
  worker.x = vespeneNode.x;
  worker.y = vespeneNode.y;
  console.log(`Set worker position to (${worker.x}, ${worker.y})`);
  
  // 2. Set gather target
  worker.gatherTarget = vespeneNode.id;
  console.log(`Set gather target: ${worker.gatherTarget}`);
  
  // 3. Enable gathering
  worker.isGathering = true;
  console.log(`Set isGathering: ${worker.isGathering}`);
  
  // 4. Set state to gathering
  worker.state = 'gathering';
  console.log(`Set state: ${worker.state}`);
  
  // 5. Manually call updateGathering with a reasonable deltaTime
  console.log("\n=== CALLING updateGathering ===");
  worker.updateGathering(100); // 100ms
  
  // Check results
  console.log("\n=== RESULTS ===");
  console.log(`Worker vespene: ${worker.carriedResources.vespene}`);
  console.log(`Node remaining: ${vespeneNode.amount}`);
  
  // Update global node
  if (window.gameResourceNodes) {
    const globalNode = window.gameResourceNodes.get(vespeneNode.id);
    console.log(`Global node amount: ${globalNode?.amount}`);
  }
  
  return {
    success: worker.carriedResources.vespene > 0,
    vespeneGathered: worker.carriedResources.vespene,
    nodeRemaining: vespeneNode.amount
  };
};