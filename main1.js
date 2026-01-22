// main.js - Core Game Engine
export class GameEngine {
    constructor() {
        this.addons = {
            terrain: {},
            races: {},
            mechanics: {},
            ai: {}
        };
        this.entities = new Map();
        this.players = [];
        this.gameLoop = null;
        this.lastTime = 0;
    }

    registerAddon(type, name, addon) {
        if (!this.addons[type]) this.addons[type] = {};
        this.addons[type][name] = addon;
        addon.initialize?.(this);
    }

    initialize() {
        console.log('Game engine initialized');
    }

    start() {
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame(this.update.bind(this));
    }

    update(timestamp) {
        const delta = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Update all entities
        this.entities.forEach(entity => entity.update?.(delta));

        // Update AI
        Object.values(this.addons.ai).forEach(ai => ai.update?.(delta));

        this.gameLoop = requestAnimationFrame(this.update.bind(this));
    }
}

// Entity System
export class Entity {
    constructor(type, addon, config = {}) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.addon = addon;
        this.components = {};
        Object.assign(this, config);
    }

    addComponent(name, component) {
        this.components[name] = component;
        return this;
    }

    update(delta) {
        // Update all components
        Object.values(this.components).forEach(component => {
            component.update?.(delta, this);
        });
    }
}

// Helper function to create entities
export function createEntity(type, config = {}) {
    return new Entity(type, null, config);
}