class BuildingSystem {
  constructor(eventSystem) {
    this.eventSystem = eventSystem;
    this.buildingTemplates = this.initializeTemplates();
    this.buildQueue = new Map(); // playerId -> building queue
    
    if (this.eventSystem) {
      this.setupEventListeners();
    }
    
    console.log("BuildingSystem initialized");
  }

  initializeTemplates() {
    return {
      'command_center': {
        name: 'Command Center',
        cost: { minerals: 400 },
        buildTime: 90,
        size: { width: 4, height: 3 },
        hitpoints: 1500,
        abilities: ['train_worker', 'resource_dropoff'],
        description: 'Main base structure, trains workers and receives resources'
      },
      'barracks': {
        name: 'Barracks',
        cost: { minerals: 150 },
        buildTime: 60,
        size: { width: 3, height: 3 },
        hitpoints: 1000,
        abilities: ['train_soldier'],
        requirements: ['command_center'],
        description: 'Trains ground combat units'
      },
      'supply_depot': {
        name: 'Supply Depot',
        cost: { minerals: 100 },
        buildTime: 30,
        size: { width: 2, height: 2 },
        hitpoints: 400,
        providesSupply: 8,
        description: 'Provides supply capacity for more units'
      },
      'turret': {
        name: 'Missile Turret',
        cost: { minerals: 100 },
        buildTime: 25,
        size: { width: 1, height: 1 },
        hitpoints: 250,
        attackDamage: 12,
        attackRange: 100,
        description: 'Anti-air and ground defense structure'
      },
	      'refinery': {
      name: 'Refinery',
      cost: { minerals: 100 },
      buildTime: 40,
      size: { width: 2, height: 2 },
      hitpoints: 750,
      abilities: ['extract_vespene'],
      requirements: ['command_center'],
      description: 'Extracts vespene gas from geysers. Must be built on a vespene geyser.'
    }
    };
  }

  setupEventListeners() {
    this.eventSystem.on('building_started', this.handleBuildingStarted.bind(this));
    this.eventSystem.on('building_completed', this.handleBuildingCompleted.bind(this));
    this.eventSystem.on('build_order', this.handleBuildOrder.bind(this));
    this.eventSystem.on('cancel_build', this.handleCancelBuild.bind(this));
  }

  handleBuildingStarted(data) {
    console.log(`Building ${data.buildingType} started at (${data.x}, ${data.y})`);
    
    // Check if player can afford the building
    const template = this.buildingTemplates[data.buildingType];
    if (!template) {
      console.error(`Unknown building type: ${data.buildingType}`);
      return;
    }
    
    // Deduct resources
    if (window.gameSystems?.resources) {
      const canAfford = window.gameSystems.resources.canAfford(data.playerId, template.cost);
      if (!canAfford) {
        this.eventSystem.emit('build_cancelled', {
          reason: 'insufficient_resources',
          buildingType: data.buildingType,
          playerId: data.playerId
        });
        return;
      }
      
      window.gameSystems.resources.deductResources(data.playerId, template.cost);
    }
  }

  handleBuildingCompleted(data) {
    console.log(`Building ${data.buildingType} completed`);
    
    // Emit event for other systems (production, etc.)
    this.eventSystem.emit('building_ready', {
      buildingId: data.buildingId,
      type: data.buildingType,
      x: data.x,
      y: data.y,
      playerId: data.playerId
    });
  }

  handleBuildOrder(data) {
    const { buildingType, x, y, playerId, workerId } = data;
    const template = this.buildingTemplates[buildingType];
    
    if (!template) {
      this.eventSystem.emit('build_error', {
        reason: 'invalid_building_type',
        buildingType,
        playerId
      });
      return;
    }
    
    // Check requirements
    if (template.requirements) {
      const hasRequirements = this.checkRequirements(playerId, template.requirements);
      if (!hasRequirements) {
        this.eventSystem.emit('build_error', {
          reason: 'requirements_not_met',
          buildingType,
          requirements: template.requirements,
          playerId
        });
        return;
      }
    }
    
    // Find worker
    const units = window.gameUnits;
    if (!units) return;
    
    const worker = units.get(workerId);
    if (!worker || worker.type !== 'worker' || worker.owner !== playerId) {
      this.eventSystem.emit('build_error', {
        reason: 'invalid_worker',
        workerId,
        playerId
      });
      return;
    }
    
    // Start building
    const buildingId = worker.startBuilding(buildingType, x, y);
    
    if (buildingId) {
      this.eventSystem.emit('build_order_accepted', {
        buildingId,
        buildingType,
        x,
        y,
        playerId,
        workerId,
        cost: template.cost
      });
    }
  }

  handleCancelBuild(data) {
    const { buildingId, playerId } = data;
    const buildings = window.gameBuildings;
    
    if (!buildings) return;
    
    const building = buildings.get(buildingId);
    if (!building || building.owner !== playerId) return;
    
    if (building.isBuilding) {
      // Refund partial resources
      const template = this.buildingTemplates[building.type];
      if (template && window.gameSystems?.resources) {
        const refundPercentage = building.buildProgress / 100;
        const refund = {};
        
        Object.keys(template.cost).forEach(resourceType => {
          refund[resourceType] = Math.floor(template.cost[resourceType] * refundPercentage);
        });
        
        window.gameSystems.resources.addResources(playerId, refund);
      }
      
      // Remove building
      buildings.delete(buildingId);
      
      // Free worker
      if (building.workerId) {
        const worker = window.gameUnits?.get(building.workerId);
        if (worker) {
          worker.stopBuilding();
        }
      }
      
      this.eventSystem.emit('build_cancelled', {
        buildingId,
        playerId,
        refunded: true
      });
    }
  }

  checkRequirements(playerId, requirements) {
    const buildings = window.gameBuildings;
    if (!buildings) return false;
    
    for (const building of buildings.values()) {
      if (building.owner === playerId && !building.isBuilding) {
        if (requirements.includes(building.type)) {
          return true;
        }
      }
    }
    
    return false;
  }

  getBuildingTemplate(type) {
    return this.buildingTemplates[type];
  }

  getAllTemplates() {
    return { ...this.buildingTemplates };
  }

  canBuild(buildingType, playerId) {
    const template = this.buildingTemplates[buildingType];
    if (!template) return false;
    
    // Check resources
    if (window.gameSystems?.resources) {
      if (!window.gameSystems.resources.canAfford(playerId, template.cost)) {
        return false;
      }
    }
    
    // Check requirements
    if (template.requirements) {
      return this.checkRequirements(playerId, template.requirements);
    }
    
    return true;
  }

  update(deltaTime) {
    // Update building construction progress
    const buildings = window.gameBuildings;
    if (!buildings) return;
    
    buildings.forEach((building, id) => {
      if (building.isBuilding && building.workerId) {
        // Progress is handled by the worker's updateBuilding method
      }
    });
  }
}

export default BuildingSystem;