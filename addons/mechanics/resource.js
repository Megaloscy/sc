// addons/mechanics/resource.js
import AddonRegistry from '../addon-registry.js';

class ResourceSystem {
    constructor() {
        this.resources = {
            gold: 1000,
            wood: 500,
            stone: 200,
            food: 100
        };
        this.players = {};
    }

    addPlayer(playerId) {
        this.players[playerId] = { ...this.resources };
        return this.players[playerId];
    }

    getResource(playerId, resourceType) {
        return this.players[playerId]?.[resourceType] || 0;
    }

    addResource(playerId, resourceType, amount) {
        if (this.players[playerId]) {
            this.players[playerId][resourceType] += amount;
            return true;
        }
        return false;
    }

    // ... more resource management methods ...
}

// Register this addon with the system
AddonRegistry.register('ResourceSystem', 
    // Initialization function
    (gameEngine) => {
        // Create instance
        const resourceSystem = new ResourceSystem();
        
        // Attach to game engine for global access
        gameEngine.resources = resourceSystem;
        
        // Also store in addon registry for direct access
        const addonData = AddonRegistry.getAddon('ResourceSystem');
        if (addonData) {
            addonData.instance = resourceSystem;
        }
        
        // Example: Add default player
        resourceSystem.addPlayer('player1');
        
        console.log('ResourceSystem addon initialized');
    },
    // Optional configuration
    {
        version: '1.0.0',
        author: 'Game Dev',
        defaultResources: {
            gold: 1000,
            wood: 500,
            stone: 200,
            food: 100
        }
    }
);

// Optional: Keep the export for direct module usage
export default ResourceSystem;