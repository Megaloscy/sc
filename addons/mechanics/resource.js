export default class ResourceSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.name = 'resource';
        this.resources = new Map();
        this.mineralFields = [];
        this.dependencies = [];
    }

    async init() {
        console.log('Initializing ResourceSystem...');
        this.generateMineralFields();
        return this;
    }

    generateMineralFields() {
        const mapSize = { width: 128, height: 128 };
        this.mineralFields = [];
        
        // Create 8 mineral fields
        for (let i = 0; i < 8; i++) {
            this.mineralFields.push({
                id: `mineral_${i}`,
                x: Math.floor(Math.random() * (mapSize.width - 10)) + 5,
                y: Math.floor(Math.random() * (mapSize.height - 10)) + 5,
                minerals: 1500,
                workers: []
            });
        }
        
        console.log(`Generated ${this.mineralFields.length} mineral fields`);
        return this.mineralFields;
    }

    addPlayerResources(playerId, initialResources = { minerals: 50, vespene: 0 }) {
        this.resources.set(playerId, { ...initialResources });
        console.log(`Added resources for player ${playerId}:`, initialResources);
    }

    getResources(playerId) {
        return this.resources.get(playerId) || { minerals: 0, vespene: 0 };
    }

    addResources(playerId, type, amount) {
        const playerResources = this.getResources(playerId);
        if (playerResources[type] !== undefined) {
            playerResources[type] += amount;
            this.resources.set(playerId, playerResources);
            
            // Trigger event
            this.gameEngine.triggerEvent('resources:changed', {
                playerId,
                type,
                amount,
                total: playerResources[type]
            });
            
            return true;
        }
        return false;
    }

    deductResources(playerId, costs) {
        const playerResources = this.getResources(playerId);
        
        // Check if player has enough resources
        for (const [type, amount] of Object.entries(costs)) {
            if ((playerResources[type] || 0) < amount) {
                return false;
            }
        }
        
        // Deduct resources
        for (const [type, amount] of Object.entries(costs)) {
            playerResources[type] -= amount;
        }
        
        this.resources.set(playerId, playerResources);
        
        // Trigger event
        this.gameEngine.triggerEvent('resources:deducted', {
            playerId,
            costs,
            remaining: playerResources
        });
        
        return true;
    }

    onEvent(eventName, data) {
        switch (eventName) {
            case 'player:added':
                // Initialize resources for new player
                this.addPlayerResources(data.id, { minerals: 50, vespene: 0 });
                break;
                
            case 'unit:gather':
                // Handle resource gathering
                if (data.playerId && data.type && data.amount) {
                    this.addResources(data.playerId, data.type, data.amount);
                }
                break;
        }
    }
}