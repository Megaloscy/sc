// ========== SYSTEM INITIALIZATION ==========
export async function initializeSystems() {
  try {
    console.log("Starting system initialization...");
    
    const systems = {};

    // Load and initialize addons in order
    console.log("Loading Resources system...");
    const ResourcesModule = await import('/sc/Addons/mechanics/Resource.js');
    systems.resources = new ResourcesModule.default(window.eventSystem);
    console.log("Resources system loaded");
    
    console.log("Loading Combat system...");
    const CombatModule = await import('/sc/Addons/mechanics/Combat.js');
    systems.combat = new CombatModule.default(window.eventSystem);
    console.log("Combat system loaded");
    
    console.log("Loading AI system...");
    const AIModule = await import('/sc/Addons/AI/basicAI.js');
    systems.ai = new AIModule.default(window.eventSystem);
    console.log("AI system loaded");
    
    console.log("Loading Races system...");
    const RacesModule = await import('/sc/Addons/Races/human.js');
    systems.races = new RacesModule.default(window.eventSystem);
    console.log("Races system loaded");
    
    console.log("Loading Terrain system...");
    const TerrainModule = await import('/sc/Addons/terrain/uneven-terrain.js');
    systems.terrain = new TerrainModule.default(window.eventSystem);
    console.log("Terrain system loaded");
    
    // Load Building system if it exists
    try {
      console.log("Loading Building system...");
      const BuildingModule = await import('/sc/Addons/Buildings/Buildings.js');
      systems.buildings = new BuildingModule.default(window.eventSystem);
      console.log("Building system loaded");
    } catch (error) {
      console.log("Building system not found, skipping...");
    }

    // Store globally
    window.gameSystems = systems;
    
    console.log('All systems initialized:', Object.keys(systems));
    
    // Test event system
    window.eventSystem.on('test_event', (data) => {
      console.log("✓ Event System Working:", data.message);
    });
    window.eventSystem.emit('test_event', { message: "Event system is operational!" });
    
    // Emit game ready event
    window.eventSystem.emit('game_ready', { systems });
    
    // Initialize resource nodes
    initializeGameResources();
    
    return systems;
  } catch (error) {
    console.error('Failed to initialize systems:', error);
    console.error('Error details:', error.message);
    return null;
  }
}

export function initializeGameResources() {
  // Create initial resource nodes
  window.createResourceNode('minerals', 300, 200, 2000);
  window.createResourceNode('minerals', 500, 300, 2000);
  window.createResourceNode('minerals', 200, 400, 2000);
  window.createResourceNode('vespene', 400, 100, 1000);
  
  console.log("Resource nodes initialized");
}

// Debug helpers
window.debug = {
  addResources: (playerId, type, amount) => {
    if (window.gameSystems?.resources) {
      window.gameSystems.resources.addResources(playerId, type, amount);
    }
  },
  spawnUnit: (type, x, y, owner = 1) => window.createUnit(type, x, y, owner),
  spawnBuilding: (type, x, y, owner = 1) => window.createBuilding(type, x, y, owner),
  getUnits: () => window.gameUnits,
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
    window.gameUnits.forEach((unit, id) => {
      if (unit.type === 'worker' && unit.owner === 1) {
        workers.push(id);
      }
    });
    if (workers.length > 0) workerId = workers[0];
  }
  
  const worker = window.gameUnits.get(workerId);
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