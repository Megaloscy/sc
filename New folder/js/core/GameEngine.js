import { 
    GAME_VERSION, 
    RACES, 
    GAME_STATES, 
    GAME_SETTINGS,
    DEBUG_SETTINGS 
} from './GameConstants.js';
import { InputSystem } from '../systems/InputSystem.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { UISystem } from '../systems/UISystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { Unit } from '../entities/Unit.js';
import { Building } from '../entities/Building.js';
import { Projectile } from '../entities/Projectile.js';
import { AISystem } from '../systems/AISystem.js';
import { DraggableUISystem } from '../systems/DraggableUISystem.js';



// GameEngine - Main Game Controller - Version 1.0.0
class GameEngine {
    static instance = null;
    
    static getInstance() {
        if (!GameEngine.instance) {
            GameEngine.instance = new GameEngine();
        }
        return GameEngine.instance;
    }

    constructor() {
        if (GameEngine.instance) {
            return GameEngine.instance;
        }
        GameEngine.instance = this;
        
        console.log(`Galactic Conquest RTS - Version ${GAME_VERSION}`);
        
        // Initialize systems
        this.inputSystem = new InputSystem(this);
        this.renderSystem = new RenderSystem(this);
        this.uiSystem = new UISystem(this);
        this.collisionSystem = new CollisionSystem(this);
        
		        // Selection
        this.selectedUnits = new Set();
        this.selectedBuildings = new Set(); // Add this line
        this.selectionRect = null;
		
		        // Initialize systems
        this.inputSystem = new InputSystem(this);
        this.renderSystem = new RenderSystem(this);
        this.uiSystem = new UISystem(this);
        this.collisionSystem = new CollisionSystem(this);
        this.aiSystem = new AISystem(this); // Add this line
		this.draggableUISystem = new DraggableUISystem(this);
		
        // Game state
        this.gameState = GAME_STATES.INITIALIZING;
        this.gameTime = 0;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Game world
        this.worldSize = {
            width: GAME_SETTINGS.WORLD_WIDTH,
            height: GAME_SETTINGS.WORLD_HEIGHT
        };
        
        // Camera
        this.camera = {
            x: 0,
            y: 0,
            zoom: GAME_SETTINGS.DEFAULT_ZOOM,
            minZoom: GAME_SETTINGS.MIN_ZOOM,
            maxZoom: GAME_SETTINGS.MAX_ZOOM,
            targetZoom: GAME_SETTINGS.DEFAULT_ZOOM
        };
        
        // Game objects
        this.players = new Map();
        this.units = new Map();
        this.buildings = new Map();
        this.projectiles = new Map();
        this.resources = new Map();
        
        // Selection
        this.selectedUnits = new Set();
        this.selectionRect = null;
        
        // Local player reference
        this.localPlayer = null;
        
        // Performance tracking
        this.frameTimes = [];
        this.averageFrameTime = 0;
        
        // Initialize
        this.init();
    }

    init() {
        console.log('Initializing game engine...');
        
        // Initialize systems
        this.inputSystem.init();
        this.renderSystem.init();
        this.uiSystem.init();
        this.aiSystem.init(); // Add this line
        this.draggableUISystem.init();       
		
        // Create local player
        this.createLocalPlayer();
        
        // Initialize game world
        this.initWorld();
        
        // Create starting base
        this.createStartingBase();
        
        // Update UI
        this.uiSystem.updateUI();
        
        // Start game loop
        this.gameState = GAME_STATES.RUNNING;
        this.startGameLoop();
        
        console.log('Game engine initialized successfully');
    }

    createLocalPlayer() {
        this.localPlayer = {
            id: `player_${Date.now()}`,
            name: 'Player 1',
            race: RACES.TERRAN,
            resources: { ...RACES.TERRAN.startingResources },
            color: RACES.TERRAN.color,
            units: new Set(),
            buildings: new Set(),
            selectedUnits: new Set()
        };
        this.players.set(this.localPlayer.id, this.localPlayer);
        
        this.uiSystem.updatePlayerInfo();
    }

    initWorld() {
        console.log('Initializing game world...');
        
        // Create mineral patches
        for (let i = 0; i < 15; i++) {
            this.createResource({
                id: `mineral_${i}`,
                type: 'mineral',
                amount: 1500 + Math.random() * 1000,
                position: {
                    x: 200 + Math.random() * (this.worldSize.width - 400),
                    y: 200 + Math.random() * (this.worldSize.height - 400)
                },
                radius: 25
            });
        }
        
        // Create gas geysers
        for (let i = 0; i < 10; i++) {
            this.createResource({
                id: `gas_${i}`,
                type: 'gas',
                amount: 1000 + Math.random() * 800,
                position: {
                    x: 200 + Math.random() * (this.worldSize.width - 400),
                    y: 200 + Math.random() * (this.worldSize.height - 400)
                },
                radius: 20
            });
        }
        
        console.log(`World created with ${this.resources.size} resources`);
    }

    createResource(resourceData) {
        this.resources.set(resourceData.id, resourceData);
    }

    createStartingBase() {
        const startX = 500;
        const startY = 500;
        
        // Create command center
        const commandCenter = new Building(
            `building_cc_${Date.now()}`,
            'Command Center',
            this.localPlayer.id,
            { x: startX, y: startY },
            this.localPlayer.race
        );
        this.addBuilding(commandCenter);
        
        // Create workers
        for (let i = 0; i < 4; i++) {
            const worker = new Unit(
                `unit_worker_${i}_${Date.now()}`,
                this.localPlayer.race.worker,
                'worker',
                this.localPlayer.id,
                {
                    x: startX + (i * 50) - 75,
                    y: startY - 50
                },
                this.localPlayer.race
            );
            this.addUnit(worker);
        }
        
        // Center camera on starting base
        this.centerCameraOn(startX, startY);
    }

    addUnit(unit) {
        this.units.set(unit.id, unit);
        if (unit.playerId === this.localPlayer.id) {
            this.localPlayer.units.add(unit.id);
        }
    }

    addBuilding(building) {
        this.buildings.set(building.id, building);
        if (building.playerId === this.localPlayer.id) {
            this.localPlayer.buildings.add(building.id);
        }
    }

    removeUnit(unitId) {
        const unit = this.units.get(unitId);
        if (unit) {
            if (unit.playerId === this.localPlayer.id) {
                this.localPlayer.units.delete(unitId);
            }
            this.units.delete(unitId);
            this.selectedUnits.delete(unitId);
        }
    }

    removeBuilding(buildingId) {
        const building = this.buildings.get(buildingId);
        if (building) {
            if (building.playerId === this.localPlayer.id) {
                this.localPlayer.buildings.delete(buildingId);
            }
            this.buildings.delete(buildingId);
        }
    }

    startGameLoop() {
        console.log('Starting game loop...');
        this.gameLoop(performance.now());
    }

    gameLoop(currentTime) {
        if (this.gameState !== GAME_STATES.RUNNING) {
            return;
        }
        
        // Calculate delta time
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        this.gameTime += this.deltaTime;
        
        // Update FPS
        this.updateFPS(currentTime);
        
        // Update game state
        this.update();
        
        // Render game
        this.render();
        
        // Continue loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    updateFPS(currentTime) {
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            
            // Update FPS display
            if (DEBUG_SETTINGS.SHOW_FPS) {
                document.getElementById('fpsCounter').textContent = Math.floor(this.fps);
            }
        }
    }

    update() {
        // Update input system
        this.inputSystem.update(this.deltaTime);
        
        // Update camera
        this.updateCamera();
        
        // Update game objects
        this.updateUnits();
        this.updateBuildings();
        this.updateProjectiles();
        
        // Check collisions
        this.collisionSystem.update();
        
        // Clean up destroyed objects
        this.cleanup();
        
        // Update UI
        this.uiSystem.updateSelectionUI();
        
        // Update draggable UI system
        this.draggableUISystem.update(); // This line might be causing issues if update expects deltaTime
    }

    updateCamera() {
        // Smooth zoom transition
        if (Math.abs(this.camera.zoom - this.camera.targetZoom) > 0.01) {
            this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.3;
        }
        
        // Clamp camera to world bounds
        this.clampCamera();
    }

    clampCamera() {
        const viewportWidth = this.renderSystem.getCanvasWidth() / this.camera.zoom;
        const viewportHeight = this.renderSystem.getCanvasHeight() / this.camera.zoom;
        
        this.camera.x = Math.max(0, Math.min(this.worldSize.width - viewportWidth, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.worldSize.height - viewportHeight, this.camera.y));
    }

    updateUnits() {
        for (const [id, unit] of this.units) {
            unit.update(this.deltaTime, this);
        }
    }

    updateBuildings() {
        for (const [id, building] of this.buildings) {
            building.update(this.deltaTime, this);
        }
    }

    updateProjectiles() {
        for (const [id, projectile] of this.projectiles) {
            projectile.update(this.deltaTime);
            if (projectile.lifetime <= 0) {
                this.projectiles.delete(id);
            }
        }
    }

    cleanup() {
        // Remove dead units
        for (const [id, unit] of this.units) {
            if (unit.health <= 0) {
                this.removeUnit(id);
            }
        }
        
        // Remove destroyed buildings
        for (const [id, building] of this.buildings) {
            if (building.health <= 0) {
                this.removeBuilding(id);
            }
        }
        
        // Remove empty resources
        for (const [id, resource] of this.resources) {
            if (resource.amount <= 0) {
                this.resources.delete(id);
            }
        }
    }

    render() {
        this.renderSystem.render();
    }

    // Camera controls
    centerCameraOn(x, y) {
        const viewportWidth = this.renderSystem.getCanvasWidth() / this.camera.zoom;
        const viewportHeight = this.renderSystem.getCanvasHeight() / this.camera.zoom;
        
        this.camera.x = x - viewportWidth / 2;
        this.camera.y = y - viewportHeight / 2;
        this.clampCamera();
    }

    resetCamera() {
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.zoom = GAME_SETTINGS.DEFAULT_ZOOM;
        this.camera.targetZoom = GAME_SETTINGS.DEFAULT_ZOOM;
        this.clampCamera();
    }

    zoomIn() {
        this.inputSystem.handleZoom(-100, 
            this.renderSystem.getCanvasWidth() / 2, 
            this.renderSystem.getCanvasHeight() / 2);
    }

    zoomOut() {
        this.inputSystem.handleZoom(100, 
            this.renderSystem.getCanvasWidth() / 2, 
            this.renderSystem.getCanvasHeight() / 2);
    }

    // Selection methods
    selectUnits(unitIds) {
        this.selectedUnits.clear();
        unitIds.forEach(id => {
            if (this.units.has(id)) {
                const unit = this.units.get(id);
                if (unit.playerId === this.localPlayer.id) {
                    this.selectedUnits.add(id);
                }
            }
        });
        this.uiSystem.updateSelectionUI();
    }

    clearSelection() {
        this.selectedUnits.clear();
        this.uiSystem.updateSelectionUI();
    }

    // Utility methods
    screenToWorld(screenX, screenY) {
        return this.renderSystem.screenToWorld(screenX, screenY);
    }

    worldToScreen(worldPos) {
        return this.renderSystem.worldToScreen(worldPos);
    }

    distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Resource management
    addResources(playerId, resources) {
        const player = this.players.get(playerId);
        if (player) {
            Object.keys(resources).forEach(resource => {
                player.resources[resource] = (player.resources[resource] || 0) + resources[resource];
            });
            this.uiSystem.updateUI();
        }
    }

    canAfford(playerId, cost) {
        const player = this.players.get(playerId);
        if (!player) return false;
        
        return Object.keys(cost).every(resource => 
            (player.resources[resource] || 0) >= cost[resource]
        );
    }

    spendResources(playerId, cost) {
        const player = this.players.get(playerId);
        if (!player) return false;
        
        if (!this.canAfford(playerId, cost)) {
            return false;
        }
        
        Object.keys(cost).forEach(resource => {
            player.resources[resource] -= cost[resource];
        });
        
        this.uiSystem.updateUI();
        return true;
    }

    // Game state management
    pauseGame() {
        if (this.gameState === GAME_STATES.RUNNING) {
            this.gameState = GAME_STATES.PAUSED;
            console.log('Game paused');
        }
    }

    resumeGame() {
        if (this.gameState === GAME_STATES.PAUSED) {
            this.gameState = GAME_STATES.RUNNING;
            this.lastTime = performance.now();
            console.log('Game resumed');
        }
    }

    getGameState() {
        return this.gameState;
    }

    getSelectedUnits() {
        return Array.from(this.selectedUnits).map(id => this.units.get(id));
    }

    // Debug methods
    toggleDebugInfo() {
        DEBUG_SETTINGS.SHOW_DEBUG_INFO = !DEBUG_SETTINGS.SHOW_DEBUG_INFO;
        this.uiSystem.updateDebugInfo();
    }

    addTestEnemy() {
        const enemyUnit = new Unit(
            `enemy_${Date.now()}`,
            'Zergling',
            'infantry',
            'enemy_player',
            {
                x: 800 + Math.random() * 100,
                y: 500 + Math.random() * 100
            },
            RACES.ZERG
        );
        this.addUnit(enemyUnit);
        
        const enemyBuilding = new Building(
            `enemy_building_${Date.now()}`,
            'Hatchery',
            'enemy_player',
            { x: 900, y: 700 },
            RACES.ZERG
        );
        this.addBuilding(enemyBuilding);
        
        console.log('Test enemy added');
    }
	
	
	    // Add these methods to GameEngine class:

    selectObjects(unitIds, buildingIds) {
        this.selectedUnits.clear();
        this.selectedBuildings = new Set(); // Add this property to constructor too
        
        unitIds.forEach(id => {
            if (this.units.has(id)) {
                const unit = this.units.get(id);
                if (unit.playerId === this.localPlayer.id) {
                    this.selectedUnits.add(id);
                }
            }
        });
        
        buildingIds.forEach(id => {
            if (this.buildings.has(id)) {
                const building = this.buildings.get(id);
                if (building.playerId === this.localPlayer.id) {
                    this.selectedBuildings.add(id);
                }
            }
        });
        
        this.uiSystem.updateSelectionUI();
    }

    clearSelection() {
        this.selectedUnits.clear();
        this.selectedBuildings = new Set();
        this.uiSystem.updateSelectionUI();
    }

    getSelectedObjects() {
        return {
            units: Array.from(this.selectedUnits).map(id => this.units.get(id)),
            buildings: Array.from(this.selectedBuildings || new Set()).map(id => this.buildings.get(id))
        };
    }
	
	
	
	
}







export { GameEngine };