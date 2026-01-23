class ResourceSystem {
  constructor(eventSystem) {
    console.log("Initializing ResourceSystem...");
    
    this.eventSystem = eventSystem;
    this.resourceNodes = new Map(); // resource node ID -> {type, amount, x, y}
    this.playerResources = new Map(); // playerId -> {minerals: amount, vespene: amount}
    this.playerSupply = new Map(); // playerId -> {used: amount, max: amount}
    this.resourceGatherers = new Map(); // workerId -> {nodeId, playerId, lastGatherTime}
    
    // Initialize default resources for players
    this.initializeDefaultResources();
    
    // Listen for events if event system is provided
    if (this.eventSystem) {
      this.setupEventListeners();
    }
    
    console.log("ResourceSystem initialized");
  }

  initializeDefaultResources() {
    // Initialize player resources
    this.playerResources.set(1, { minerals: 500, vespene: 0 });
    this.playerResources.set(2, { minerals: 500, vespene: 0 });
    
    // Initialize player supply
    this.playerSupply.set(1, { used: 4, max: 10 }); // Starting with 4 units
    this.playerSupply.set(2, { used: 3, max: 10 }); // Starting with 3 units
    
    console.log("Default resources initialized");
  }

  setupEventListeners() {
    console.log("Setting up ResourceSystem event listeners...");
    
    try {
      // Bind methods
      this.handleResourceGathered = this.handleResourceGathered.bind(this);
      this.handleResourceSpent = this.handleResourceSpent.bind(this);
      this.handleUnitDestroyed = this.handleUnitDestroyed.bind(this);
      this.handleBuildingCompleted = this.handleBuildingCompleted.bind(this);
      this.handleProductionStarted = this.handleProductionStarted.bind(this);
      this.handleGameReady = this.handleGameReady.bind(this);
      this.handleWorkerGatherOrder = this.handleWorkerGatherOrder.bind(this);
      this.handleWorkerGathering = this.handleWorkerGathering.bind(this);
      this.handleResourcesDeposited = this.handleResourcesDeposited.bind(this);
      this.handleBuildOrder = this.handleBuildOrder.bind(this);
      
      // Register event listeners
      this.eventSystem.on('resource_gathered', this.handleResourceGathered);
      this.eventSystem.on('resource_spent', this.handleResourceSpent);
      this.eventSystem.on('unit_destroyed', this.handleUnitDestroyed);
      this.eventSystem.on('building_completed', this.handleBuildingCompleted);
      this.eventSystem.on('production_started', this.handleProductionStarted);
      this.eventSystem.on('game_ready', this.handleGameReady);
      this.eventSystem.on('worker_gather_order', this.handleWorkerGatherOrder);
      this.eventSystem.on('worker_gathering', this.handleWorkerGathering);
      this.eventSystem.on('resources_deposited', this.handleResourcesDeposited);
      this.eventSystem.on('build_order', this.handleBuildOrder);
      
      console.log("ResourceSystem event listeners registered");
    } catch (error) {
      console.error("ResourceSystem: Failed to setup event listeners:", error);
    }
  }

  // ========== RESOURCE NODE MANAGEMENT ==========
  addResourceNode(id, type, x, y, amount = 1500) {
    console.log(`Adding resource node: ${id} (${type}) at (${x}, ${y}) with ${amount} resources`);
    
    this.resourceNodes.set(id, {
      id,
      type,
      x,
      y,
      amount,
      initialAmount: amount,
      isActive: true
    });
    
    // Also add to global resource nodes map for easy access
    if (!window.gameResourceNodes) {
      window.gameResourceNodes = new Map();
    }
    window.gameResourceNodes.set(id, {
      id,
      type,
      x,
      y,
      amount
    });
    
    // Emit event for resource node creation
    if (this.eventSystem) {
      this.eventSystem.emit('resource_node_added', {
        nodeId: id,
        type,
        x,
        y,
        amount,
        maxAmount: amount
      });
    }
    
    return id;
  }

  removeResourceNode(nodeId) {
    const node = this.resourceNodes.get(nodeId);
    if (node) {
      this.resourceNodes.delete(nodeId);
      
      // Also remove from global map
      if (window.gameResourceNodes) {
        window.gameResourceNodes.delete(nodeId);
      }
      
      if (this.eventSystem) {
        this.eventSystem.emit('resource_node_removed', {
          nodeId,
          type: node.type,
          x: node.x,
          y: node.y
        });
      }
      
      console.log(`Resource node ${nodeId} removed`);
      return true;
    }
    return false;
  }

  getResourceNode(nodeId) {
    return this.resourceNodes.get(nodeId);
  }

  getResourceNodes() {
    return Array.from(this.resourceNodes.values()).map(node => ({
      ...node
    }));
  }

  gatherResource(nodeId, playerId, amount) {
    const node = this.resourceNodes.get(nodeId);
    if (!node || node.amount <= 0) {
      return { success: false, reason: 'Node depleted or not found' };
    }

    const gatherAmount = Math.min(amount, node.amount);
    node.amount -= gatherAmount;

    // Add resources to player
    this.addResources(playerId, node.type, gatherAmount);

    // Emit resource gathered event
    if (this.eventSystem) {
      this.eventSystem.emit('resource_gathered', {
        playerId,
        resourceType: node.type,
        amount: gatherAmount,
        nodeId,
        nodeRemaining: node.amount,
        nodePosition: { x: node.x, y: node.y }
      });
    }

    // Update global resource node
    if (window.gameResourceNodes) {
      const globalNode = window.gameResourceNodes.get(nodeId);
      if (globalNode) {
        globalNode.amount = node.amount;
      }
    }

    // If node is depleted, remove it
    if (node.amount <= 0) {
      node.isActive = false;
      setTimeout(() => this.removeResourceNode(nodeId), 1000); // Delay removal for visual effect
    }

    return { success: true, amount: gatherAmount };
  }

  // ========== PLAYER RESOURCE MANAGEMENT ==========
  addResources(playerId, resourceType, amount) {
    if (!this.playerResources.has(playerId)) {
      this.playerResources.set(playerId, { minerals: 0, vespene: 0 });
    }

    const resources = this.playerResources.get(playerId);
    const currentAmount = resources[resourceType] || 0;
    resources[resourceType] = currentAmount + amount;

    // Update global players object
    if (window.players && window.players[playerId]) {
      window.players[playerId].resources[resourceType] = resources[resourceType];
    }

    // Emit resources updated event
    if (this.eventSystem) {
      this.eventSystem.emit('resources_updated', {
        playerId,
        resources: { ...resources },
        change: { [resourceType]: amount },
        source: 'gathering'
      });
    }

    console.log(`Player ${playerId} gained ${amount} ${resourceType}. Total: ${resources[resourceType]}`);
    
    return resources[resourceType];
  }

  deductResources(playerId, cost) {
    if (!this.playerResources.has(playerId)) {
      return false;
    }

    const resources = this.playerResources.get(playerId);
    const canAfford = this.canAfford(playerId, cost);

    if (!canAfford) {
      console.log(`Player ${playerId} cannot afford:`, cost);
      return false;
    }

    // Store old amounts for event
    const oldAmounts = { ...resources };

    // Deduct each resource type
    Object.keys(cost).forEach(resourceType => {
      if (resources[resourceType] !== undefined) {
        resources[resourceType] -= cost[resourceType];
      }
    });

    // Update global players object
    if (window.players && window.players[playerId]) {
      window.players[playerId].resources = { ...resources };
    }

    // Emit resource spent event
    if (this.eventSystem) {
      this.eventSystem.emit('resource_spent', {
        playerId,
        cost,
        oldAmounts,
        newAmounts: { ...resources },
        timestamp: Date.now()
      });

      // Also emit resources updated
      const changes = {};
      Object.keys(cost).forEach(type => {
        changes[type] = -cost[type];
      });
      
      this.eventSystem.emit('resources_updated', {
        playerId,
        resources: { ...resources },
        change: changes,
        source: 'spending'
      });
    }

    console.log(`Player ${playerId} spent:`, cost, `Remaining:`, resources);
    return true;
  }

  canAfford(playerId, cost) {
    if (!this.playerResources.has(playerId)) {
      return false;
    }

    const resources = this.playerResources.get(playerId);
    
    // Check each resource type in cost
    for (const [resourceType, amount] of Object.entries(cost)) {
      if (!resources[resourceType] || resources[resourceType] < amount) {
        return false;
      }
    }

    return true;
  }

  getPlayerResources(playerId) {
    if (!this.playerResources.has(playerId)) {
      // Initialize if not exists
      this.playerResources.set(playerId, { minerals: 0, vespene: 0 });
    }
    
    return { ...this.playerResources.get(playerId) };
  }

  getAllPlayersResources() {
    const result = {};
    this.playerResources.forEach((resources, playerId) => {
      result[playerId] = { ...resources };
    });
    return result;
  }

  // ========== SUPPLY MANAGEMENT ==========
  getPlayerSupply(playerId) {
    if (!this.playerSupply.has(playerId)) {
      this.playerSupply.set(playerId, { used: 0, max: 10 });
    }
    return { ...this.playerSupply.get(playerId) };
  }

  increaseSupply(playerId, amount) {
    if (!this.playerSupply.has(playerId)) {
      this.playerSupply.set(playerId, { used: 0, max: 10 });
    }
    
    const supply = this.playerSupply.get(playerId);
    supply.max += amount;
    
    this.eventSystem.emit('supply_updated', {
      playerId,
      supply: { ...supply }
    });
    
    return supply.max;
  }

  useSupply(playerId, amount = 1) {
    if (!this.playerSupply.has(playerId)) {
      this.playerSupply.set(playerId, { used: 0, max: 10 });
    }
    
    const supply = this.playerSupply.get(playerId);
    if (supply.used + amount > supply.max) {
      return false; // Not enough supply
    }
    
    supply.used += amount;
    
    this.eventSystem.emit('supply_updated', {
      playerId,
      supply: { ...supply }
    });
    
    return true;
  }

  freeSupply(playerId, amount = 1) {
    if (!this.playerSupply.has(playerId)) return false;
    
    const supply = this.playerSupply.get(playerId);
    supply.used = Math.max(0, supply.used - amount);
    
    this.eventSystem.emit('supply_updated', {
      playerId,
      supply: { ...supply }
    });
    
    return true;
  }

  canTrainUnit(playerId, unitCost, supplyCost = 1) {
    if (!this.canAfford(playerId, unitCost)) {
      return { canAfford: false, reason: 'insufficient_resources' };
    }
    
    if (!this.useSupply(playerId, supplyCost)) {
      return { canAfford: true, canTrain: false, reason: 'insufficient_supply' };
    }
    
    // Refund the supply check since we're just checking
    this.freeSupply(playerId, supplyCost);
    
    return { canAfford: true, canTrain: true };
  }

  // ========== EVENT HANDLERS ==========
  handleResourceGathered(data) {
    console.log(`Player ${data.playerId} gathered ${data.amount} ${data.resourceType}`);
    
    // Update global resource node
    if (window.gameResourceNodes) {
      const node = window.gameResourceNodes.get(data.nodeId);
      if (node) {
        node.amount = data.nodeRemaining;
      }
    }
  }

  handleResourceSpent(data) {
    console.log(`Player ${data.playerId} spent resources:`, data.cost);
  }

  handleUnitDestroyed(data) {
    console.log(`Unit destroyed: ${data.unitId} (${data.type})`);
    
    // Free supply when unit is destroyed
    if (data.owner) {
      let supplyCost = 1;
      switch(data.type) {
        case 'worker':
          supplyCost = 1;
          break;
        case 'soldier':
          supplyCost = 1;
          break;
        case 'archer':
          supplyCost = 1;
          break;
      }
      
      this.freeSupply(data.owner, supplyCost);
    }
  }

  handleBuildingCompleted(data) {
    console.log(`Building ${data.buildingType} completed for player ${data.playerId}`);
    
    // Some buildings provide supply
    if (data.buildingType === 'supply_depot') {
      this.increaseSupply(data.playerId, 8); // Supply depots provide 8 supply
    }
  }

  handleProductionStarted(data) {
    console.log(`Production started for player ${data.playerId}:`, data);
    
    // Deduct unit production costs if not already deducted
    if (data.cost) {
      const success = this.deductResources(data.playerId, data.cost);
      
      if (this.eventSystem) {
        this.eventSystem.emit('production_cost_deducted', {
          ...data,
          deductionSuccess: success,
          remainingResources: this.getPlayerResources(data.playerId)
        });
      }
    }
  }

  handleGameReady(data) {
    console.log("ResourceSystem: Game ready event received");
    
    // Initialize player resources from game data if needed
    if (data.players) {
      Object.entries(data.players).forEach(([playerId, playerData]) => {
        if (playerData.resources) {
          this.playerResources.set(parseInt(playerId), { ...playerData.resources });
          
          // Emit initial resource state
          if (this.eventSystem) {
            this.eventSystem.emit('resources_updated', {
              playerId: parseInt(playerId),
              resources: { ...playerData.resources },
              change: {},
              source: 'initialization'
            });
          }
        }
      });
    }
    
    console.log("ResourceSystem ready with initial player resources");
  }

  handleWorkerGatherOrder(data) {
    console.log(`Worker ${data.workerId} ordered to gather ${data.resourceType}`);
    
    // Register worker as gathering from this node
    this.resourceGatherers.set(data.workerId, {
      nodeId: data.nodeId,
      playerId: data.playerId || 1,
      lastGatherTime: Date.now()
    });
  }

  handleWorkerGathering(data) {
    // Update last gather time
    const gatherer = this.resourceGatherers.get(data.workerId);
    if (gatherer) {
      gatherer.lastGatherTime = Date.now();
    }
    
    // This is where we would handle continuous gathering
    // For now, resources are added in the worker's update loop
  }

  handleResourcesDeposited(data) {
    console.log(`Worker ${data.workerId} deposited resources for player ${data.playerId}`);
    
    // Clear gatherer registration when resources are deposited
    this.resourceGatherers.delete(data.workerId);
    
    // Resources are already added in the worker's depositResources method
    // This is just for logging and event handling
  }

  handleBuildOrder(data) {
    console.log(`Build order received for ${data.buildingType}`);
    
    // Get building cost from building system
    const buildingSystem = window.gameSystems?.buildings;
    if (!buildingSystem) {
      console.error("Building system not available");
      return;
    }
    
    const template = buildingSystem.getBuildingTemplate(data.buildingType);
    if (!template) {
      console.error(`Unknown building type: ${data.buildingType}`);
      return;
    }
    
    // Check if player can afford
    if (!this.canAfford(data.playerId, template.cost)) {
      this.eventSystem.emit('build_error', {
        reason: 'insufficient_resources',
        buildingType: data.buildingType,
        playerId: data.playerId,
        cost: template.cost,
        available: this.getPlayerResources(data.playerId)
      });
      return;
    }
    
    // Deduct resources immediately
    const success = this.deductResources(data.playerId, template.cost);
    
    if (success) {
      this.eventSystem.emit('build_order_accepted', {
        buildingId: data.buildingId,
        buildingType: data.buildingType,
        x: data.x,
        y: data.y,
        playerId: data.playerId,
        workerId: data.workerId,
        cost: template.cost,
        remainingResources: this.getPlayerResources(data.playerId)
      });
    } else {
      this.eventSystem.emit('build_error', {
        reason: 'deduction_failed',
        buildingType: data.buildingType,
        playerId: data.playerId
      });
    }
  }

  // ========== RESOURCE GENERATION (for testing/demo) ==========
  generateResourcesOverTime(deltaTime) {
    // This could be used for passive resource generation or resource regeneration
    // For example, command centers could generate minerals over time
    
    // Not implemented in basic version
  }

  // ========== DEBUG/HELPER METHODS ==========
  setPlayerResources(playerId, resources) {
    this.playerResources.set(playerId, { ...resources });
    
    if (this.eventSystem) {
      this.eventSystem.emit('resources_updated', {
        playerId,
        resources: { ...resources },
        change: {},
        source: 'debug'
      });
    }
    
    // Update global players object
    if (window.players && window.players[playerId]) {
      window.players[playerId].resources = { ...resources };
    }
    
    console.log(`Debug: Set player ${playerId} resources to:`, resources);
  }

  addResourceNodeAtRandom(type, amount = 1000) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return null;
    
    const x = Math.random() * (canvas.width - 100) + 50;
    const y = Math.random() * (canvas.height - 100) + 50;
    const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return this.addResourceNode(id, type, x, y, amount);
  }

  // ========== UPDATE METHOD FOR GAME LOOP ==========
  update(deltaTime) {
    // Generate resources over time if needed
    this.generateResourcesOverTime(deltaTime);
    
    // Check for depleted resource nodes and clean up gatherers
    this.cleanupDepletedNodes();
  }

  cleanupDepletedNodes() {
    // Remove gatherers for depleted nodes
    const depletedNodes = new Set();
    
    this.resourceNodes.forEach((node, nodeId) => {
      if (node.amount <= 0) {
        depletedNodes.add(nodeId);
      }
    });
    
    this.resourceGatherers.forEach((gatherer, workerId) => {
      if (depletedNodes.has(gatherer.nodeId)) {
        this.resourceGatherers.delete(workerId);
        
        // Notify worker to stop gathering
        if (this.eventSystem) {
          this.eventSystem.emit('resource_node_depleted', {
            nodeId: gatherer.nodeId,
            workerId
          });
        }
      }
    });
  }

  // ========== STATISTICS ==========
  getResourceStatistics() {
    const stats = {
      totalNodes: this.resourceNodes.size,
      activeNodes: 0,
      totalMinerals: 0,
      totalVespene: 0,
      activeGatherers: this.resourceGatherers.size,
      playerResources: {}
    };
    
    this.resourceNodes.forEach(node => {
      if (node.amount > 0) {
        stats.activeNodes++;
        if (node.type === 'minerals') {
          stats.totalMinerals += node.amount;
        } else if (node.type === 'vespene') {
          stats.totalVespene += node.amount;
        }
      }
    });
    
    this.playerResources.forEach((resources, playerId) => {
      stats.playerResources[playerId] = { ...resources };
    });
    
    return stats;
  }
}

export default ResourceSystem;