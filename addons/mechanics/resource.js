

import AddonRegistry from '/sc/addons/addon-registry.js';


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
}

// 🔥 CRITICAL: This line REGISTERS the addon
AddonRegistry.register('ResourceSystem', 
    (gameEngine) => {
        console.log('🚀 Initializing ResourceSystem addon');
        const resourceSystem = new ResourceSystem();
        gameEngine.resources = resourceSystem;
        resourceSystem.addPlayer('player1');
        console.log('✅ ResourceSystem ready');
        return resourceSystem;
    },
    {
        version: '1.0.0',
        author: 'Game Dev'
    }
);

// Optional: Keep export for direct usage
export default ResourceSystem;