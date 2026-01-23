// ========== UNIT CLASS ==========
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

  // Add to index.js Unit class
  forceGatherVespene() {
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
}

export default Unit;