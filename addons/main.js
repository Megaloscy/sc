
// Export as ES6 module
export class GameEngine {
    constructor() {
        this.entities = [];
        this.players = new Map();
        this.canvas = null;
        this.context = null;
        this.eventListeners = new Map();
        this.isInitialized = false;
        this.lastUpdateTime = 0;
        
        console.log('🎮 GameEngine created');
    }

    async init(canvasId = 'gameCanvas') {
        console.log('🔄 Initializing GameEngine...');
        
        // Get or create canvas
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.warn(`Canvas #${canvasId} not found, creating one`);
            this.canvas = document.createElement('canvas');
            this.canvas.id = canvasId;
            this.canvas.width = 1024;
            this.canvas.height = 768;
            this.canvas.style.cursor = 'crosshair';
            document.body.appendChild(this.canvas);
        }
        
        this.context = this.canvas.getContext('2d');
        
        // Set up event system
        this.setupEvents();
        
        this.isInitialized = true;
        console.log('✅ GameEngine initialized');
        
        return this;
    }

    setupEvents() {
        // Basic event system
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('click', (e) => this.handleClick(e));
        
        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleRightClick(e);
        });
        
        console.log('📡 Event system set up');
    }

    handleKeyDown(event) {
        // Trigger keydown event
        this.triggerEvent('keydown', {
            key: event.key,
            code: event.code,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            event: event
        });
    }

    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        this.triggerEvent('click', { 
            x: Math.round(x), 
            y: Math.round(y), 
            button: event.button,
            event: event 
        });
    }

    handleRightClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        this.triggerEvent('rightclick', { 
            x: Math.round(x), 
            y: Math.round(y),
            event: event 
        });
    }

    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }

    off(eventName, callback) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    triggerEvent(eventName, data) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            for (const listener of listeners) {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            }
        }
    }

    update(deltaTime, currentTime) {
        if (!this.isInitialized) return;
        
        this.lastUpdateTime = currentTime;
        
        // Update all entities
        for (const entity of this.entities) {
            if (entity.update && typeof entity.update === 'function') {
                entity.update(deltaTime);
            }
        }
        
        // Trigger update event
        this.triggerEvent('update', { deltaTime, currentTime });
    }

    createEntity(entityData) {
        const entity = {
            id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            created: Date.now(),
            ...entityData
        };
        
        this.entities.push(entity);
        this.triggerEvent('entity:created', entity);
        
        return entity.id;
    }

    getEntity(entityId) {
        return this.entities.find(e => e.id === entityId);
    }

    removeEntity(entityId) {
        const index = this.entities.findIndex(e => e.id === entityId);
        if (index > -1) {
            const entity = this.entities[index];
            this.entities.splice(index, 1);
            this.triggerEvent('entity:removed', entity);
            return true;
        }
        return false;
    }

    getEntities() {
        return [...this.entities];
    }

    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    addPlayer(playerData) {
        const player = {
            id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...playerData
        };
        
        this.players.set(player.id, player);
        this.triggerEvent('player:added', player);
        
        console.log(`👤 Player added: ${player.id} (${player.name})`);
        return player.id;
    }

    getPlayerIds() {
        return Array.from(this.players.keys());
    }

    getCanvas() {
        return this.canvas;
    }

    getContext() {
        return this.context;
    }
	
	
	// In the GameEngine class in main.js, add:
getAddon(addonName) {
    // This method should be called by other systems to get addons
    // In your main game class, you'll need to expose the addonLoader
    // For now, we'll return null and handle it differently
    return null;
}

// Also add a method to get players:
get players() {
    return this._players || new Map();
}

set players(value) {
    this._players = value;
}
	
	
	
	
	
}

// Example Entity class (optional, for reference)
export class Entity {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.id = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.created = Date.now();
    }

    update(deltaTime) {
        // To be overridden by specific entity types
    }

    render(ctx) {
        // To be overridden by specific entity types
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x - 5, this.y - 5, 10, 10);
    }
}
