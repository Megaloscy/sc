// Game Constants - Version 1.0.0
export const GAME_VERSION = "1.0.0";

// Race Definitions
export const RACES = {
    TERRAN: { 
        name: 'Terran', 
        color: '#4a86e8', 
        baseUnit: 'Marine',
        worker: 'SCV',
        startingResources: {
            energy: 1000,
            metal: 500,
            crystal: 300,
            gas: 200
        }
    },
    ZERG: { 
        name: 'Zerg', 
        color: '#ff66cc', 
        baseUnit: 'Zergling',
        worker: 'Drone',
        startingResources: {
            energy: 800,
            metal: 600,
            crystal: 400,
            gas: 300
        }
    },
    PROTOSS: { 
        name: 'Protoss', 
        color: '#ffcc00', 
        baseUnit: 'Zealot',
        worker: 'Probe',
        startingResources: {
            energy: 1200,
            metal: 400,
            crystal: 500,
            gas: 200
        }
    },
    ELDRITCH: { 
        name: 'Eldritch', 
        color: '#9900ff', 
        baseUnit: 'Cultist',
        worker: 'Acolyte',
        startingResources: {
            energy: 900,
            metal: 450,
            crystal: 350,
            gas: 250
        }
    },
    CYBORG: { 
        name: 'Cyborg', 
        color: '#00ccff', 
        baseUnit: 'Cyborg',
        worker: 'Technician',
        startingResources: {
            energy: 1100,
            metal: 550,
            crystal: 250,
            gas: 350
        }
    },
    XENO: { 
        name: 'Xeno', 
        color: '#00ff99', 
        baseUnit: 'Xenomorph',
        worker: 'Worker Drone',
        startingResources: {
            energy: 850,
            metal: 650,
            crystal: 300,
            gas: 400
        }
    },
    MECHANICAL: { 
        name: 'Mechanical', 
        color: '#666666', 
        baseUnit: 'Automaton',
        worker: 'Constructor',
        startingResources: {
            energy: 1300,
            metal: 700,
            crystal: 200,
            gas: 100
        }
    },
    ELEMENTAL: { 
        name: 'Elemental', 
        color: '#ff3300', 
        baseUnit: 'Elemental',
        worker: 'Channeler',
        startingResources: {
            energy: 950,
            metal: 350,
            crystal: 600,
            gas: 150
        }
    }
};

// Unit Types
export const UNIT_TYPES = {
    WORKER: 'worker',
    INFANTRY: 'infantry',
    VEHICLE: 'vehicle',
    AIR: 'air',
    BUILDING: 'building'
};

// Game States
export const GAME_STATES = {
    INITIALIZING: 'initializing',
    RUNNING: 'running',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

// Resource Types
export const RESOURCE_TYPES = {
    ENERGY: 'energy',
    METAL: 'metal',
    CRYSTAL: 'crystal',
    GAS: 'gas'
};

// Default Game Settings
export const GAME_SETTINGS = {
    GRID_SIZE: 32,
    WORLD_WIDTH: 2000,
    WORLD_HEIGHT: 2000,
    MIN_ZOOM: 0.5,
    MAX_ZOOM: 3.0,
    DEFAULT_ZOOM: 1.5,
    CAMERA_SPEED: 500,
    FPS_LIMIT: 60,
    UNIT_OVERLAP_THRESHOLD: 0.2, // Max 20% overlap
    BUILDING_NO_OVERLAP: true
};

// Building Definitions
export const BUILDINGS = {
    TERRAN: [
        { id: 'barracks', name: 'Barracks', cost: { metal: 150 }, buildTime: 60, size: { width: 80, height: 60 } },
        { id: 'factory', name: 'Factory', cost: { metal: 200, gas: 100 }, buildTime: 80, size: { width: 100, height: 80 } },
        { id: 'starport', name: 'Starport', cost: { metal: 150, gas: 150 }, buildTime: 70, size: { width: 90, height: 70 } },
        { id: 'supply_depot', name: 'Supply Depot', cost: { metal: 100 }, buildTime: 40, size: { width: 60, height: 60 } }
    ],
    ZERG: [
        { id: 'spawning_pool', name: 'Spawning Pool', cost: { metal: 200 }, buildTime: 70, size: { width: 70, height: 70 } },
        { id: 'hydralisk_den', name: 'Hydralisk Den', cost: { metal: 150, gas: 100 }, buildTime: 80, size: { width: 80, height: 60 } },
        { id: 'spire', name: 'Spire', cost: { metal: 200, gas: 200 }, buildTime: 100, size: { width: 100, height: 80 } }
    ],
    PROTOSS: [
        { id: 'gateway', name: 'Gateway', cost: { metal: 150, crystal: 50 }, buildTime: 65, size: { width: 80, height: 60 } },
        { id: 'cybernetics_core', name: 'Cybernetics Core', cost: { metal: 120, gas: 80 }, buildTime: 55, size: { width: 70, height: 70 } },
        { id: 'stargate', name: 'Stargate', cost: { metal: 180, gas: 150 }, buildTime: 85, size: { width: 90, height: 80 } }
    ]
    // Add other races as needed
};

// Unit Definitions
export const UNIT_DEFINITIONS = {
    WORKER: {
        name: 'Worker',
        type: UNIT_TYPES.WORKER,
        radius: 10,
        health: 100,
        speed: 60,
        attackRange: 5,
        attackDamage: 5,
        attackSpeed: 0.5,
        buildTime: 30,
        cost: { metal: 50 }
    },
    INFANTRY: {
        name: 'Infantry',
        type: UNIT_TYPES.INFANTRY,
        radius: 12,
        health: 150,
        speed: 80,
        attackRange: 40,
        attackDamage: 15,
        attackSpeed: 1.0,
        buildTime: 45,
        cost: { metal: 100, gas: 25 }
    },
    VEHICLE: {
        name: 'Vehicle',
        type: UNIT_TYPES.VEHICLE,
        radius: 15,
        health: 300,
        speed: 50,
        attackRange: 60,
        attackDamage: 25,
        attackSpeed: 0.7,
        buildTime: 75,
        cost: { metal: 200, gas: 100 }
    }
};

// Command Types
export const COMMAND_TYPES = {
    MOVE: 'move',
    STOP: 'stop',
    ATTACK: 'attack',
    PATROL: 'patrol',
    GATHER: 'gather',
    BUILD: 'build',
    REPAIR: 'repair',
    HEAL: 'heal'
};

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
    MOVE: ['m', 'M'],
    STOP: ['s', 'S'],
    ATTACK: ['a', 'A'],
    PATROL: ['p', 'P'],
    GATHER: ['g', 'G'],
    BUILD: ['b', 'B'],
    SELECT_ALL: ['ctrl+a', 'ctrl+A'],
    DESELECT: ['escape', 'Escape'],
    CENTER_CAMERA: [' ', 'Space'],
    TOGGLE_DEBUG: ['`', '~']
};

// Debug Settings
export const DEBUG_SETTINGS = {
    SHOW_GRID: true,
    SHOW_COLLISION_BOXES: false,
    SHOW_PATHFINDING: false,
    SHOW_FPS: true,
    SHOW_DEBUG_INFO: false
};

export default {
    GAME_VERSION,
    RACES,
    UNIT_TYPES,
    GAME_STATES,
    RESOURCE_TYPES,
    GAME_SETTINGS,
    BUILDINGS,
    UNIT_DEFINITIONS,
    COMMAND_TYPES,
    KEYBOARD_SHORTCUTS,
    DEBUG_SETTINGS
};