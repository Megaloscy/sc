export default class BasicAI {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.name = 'basicAI';
        this.aiPlayers = new Map();
        this.dependencies = ['resource', 'combat'];
        this.lastUpdateTime = 0;
    }

    async init() {
        console.log('Initializing BasicAI...');
        return this;
    }

    addAIPlayer(playerId, difficulty = 'medium') {
        const aiPlayer = {
            id: playerId,
            difficulty: difficulty,
            strategy: this.getStrategy(difficulty),
            lastAction: Date.now(),
            actionQueue: [],
            state: 'idle',
            resources: { minerals: 50, vespene: 0 },
            units: [],
            buildings: []
        };
        
        this.aiPlayers.set(playerId, aiPlayer);
        console.log(`Added AI player ${playerId} with difficulty ${difficulty}`);
        
        return aiPlayer;
    }

    getStrategy(difficulty) {
        const strategies = {
            easy: { 
                aggression: 0.3, 
                expansionRate: 0.1, 
                techFocus: 0.2,
                actionDelay: 3000 // 3 seconds between actions
            },
            medium: { 
                aggression: 0.5, 
                expansionRate: 0.3, 
                techFocus: 0.4,
                actionDelay: 2000 // 2 seconds between actions
            },
            hard: { 
                aggression: 0.8, 
                expansionRate: 0.5, 
                techFocus: 0.6,
                actionDelay: 1000 // 1 second between actions
            }
        };
        
        return strategies[difficulty] || strategies.medium;
    }

    updateAI(playerId) {
        const aiPlayer = this.aiPlayers.get(playerId);
        if (!aiPlayer) return;
        
        const now = Date.now();
        const strategy = aiPlayer.strategy;
        
        // Don't act too frequently
        if (now - aiPlayer.lastAction < strategy.actionDelay) {
            return;
        }
        
        aiPlayer.lastAction = now;
        
        // Simple AI logic
        const action = this.decideAction(aiPlayer);
        if (action) {
            this.executeAction(playerId, action, aiPlayer);
        }
    }

    decideAction(aiPlayer) {
        const rand = Math.random();
        const strategy = aiPlayer.strategy;
        
        // Prioritize gathering if low on resources
        if (aiPlayer.resources.minerals < 100) {
            return { type: 'gather', priority: 1 };
        }
        
        if (rand < strategy.aggression) {
            return { type: 'attack', priority: 1 };
        } else if (rand < strategy.aggression + strategy.expansionRate) {
            return { type: 'expand', priority: 2 };
        } else if (rand < strategy.aggression + strategy.expansionRate + strategy.techFocus) {
            return { type: 'build', priority: 3 };
        } else {
            return { type: 'gather', priority: 4 };
        }
    }

    executeAction(playerId, action, aiPlayer) {
        switch (action.type) {
            case 'attack':
                this.performAttack(playerId, aiPlayer);
                break;
            case 'expand':
                this.expandBase(playerId, aiPlayer);
                break;
            case 'build':
                this.buildStructure(playerId, aiPlayer);
                break;
            case 'gather':
                this.gatherResources(playerId, aiPlayer);
                break;
            default:
                console.warn(`Unknown AI action: ${action.type}`);
        }
        
        // Trigger event
        this.gameEngine.triggerEvent('ai:action', {
            playerId,
            action: action.type
        });
    }

    performAttack(playerId, aiPlayer) {
        console.log(`🤖 AI player ${playerId} is attacking`);
        
        // Get combat system if available
        const combatSystem = this.gameEngine.getAddon ? this.gameEngine.getAddon('combat') : null;
        
        if (combatSystem && aiPlayer.units.length > 0) {
            // Find enemy players (excluding self)
            const enemyPlayers = Array.from(this.aiPlayers.keys())
                .filter(id => id !== playerId)
                .concat(Array.from(this.gameEngine.players ? this.gameEngine.players.keys() : []).filter(id => id !== playerId));
            
            if (enemyPlayers.length > 0) {
                // Pick a random enemy
                const targetPlayerId = enemyPlayers[Math.floor(Math.random() * enemyPlayers.length)];
                
                // Attack with a random unit
                const unit = aiPlayer.units[Math.floor(Math.random() * aiPlayer.units.length)];
                if (unit && combatSystem.attack) {
                    console.log(`   Attacking with unit ${unit.id}`);
                }
            }
        }
        
        // Simulate attack by creating a combat event
        this.gameEngine.triggerEvent('combat:attack', {
            attackerId: playerId,
            targetId: 'player_base',
            damage: 10
        });
    }

    expandBase(playerId, aiPlayer) {
        console.log(`🤖 AI player ${playerId} is expanding`);
        
        // Simulate expansion by adding a building
        const newBuilding = {
            id: `building_${Date.now()}`,
            type: 'base',
            x: Math.floor(Math.random() * 500) + 100,
            y: Math.floor(Math.random() * 500) + 100,
            playerId: playerId
        };
        
        aiPlayer.buildings.push(newBuilding);
        
        // Deduct resources for building
        aiPlayer.resources.minerals -= 400;
        
        this.gameEngine.triggerEvent('building:created', newBuilding);
    }

    buildStructure(playerId, aiPlayer) {
        console.log(`🤖 AI player ${playerId} is building`);
        
        // Check if we have enough resources
        if (aiPlayer.resources.minerals < 150) {
            // Not enough resources, gather instead
            this.gatherResources(playerId, aiPlayer);
            return;
        }
        
        const structures = ['barracks', 'factory', 'starport'];
        const structureType = structures[Math.floor(Math.random() * structures.length)];
        
        const newBuilding = {
            id: `building_${Date.now()}`,
            type: structureType,
            x: Math.floor(Math.random() * 200) + 50,
            y: Math.floor(Math.random() * 200) + 50,
            playerId: playerId
        };
        
        aiPlayer.buildings.push(newBuilding);
        aiPlayer.resources.minerals -= 150;
        
        this.gameEngine.triggerEvent('building:created', newBuilding);
    }

    gatherResources(playerId, aiPlayer) {
        console.log(`🤖 AI player ${playerId} is gathering resources`);
        
        // Simulate resource gathering
        const mineralsGathered = Math.floor(Math.random() * 50) + 25;
        aiPlayer.resources.minerals += mineralsGathered;
        
        this.gameEngine.triggerEvent('resource:gathered', {
            playerId: playerId,
            type: 'minerals',
            amount: mineralsGathered,
            total: aiPlayer.resources.minerals
        });
        
        // Also update via resource system if available
        const resourceSystem = this.gameEngine.getAddon ? this.gameEngine.getAddon('resource') : null;
        if (resourceSystem && resourceSystem.addResources) {
            resourceSystem.addResources(playerId, 'minerals', mineralsGathered);
        }
    }

    // This method was called but not implemented in the original
    researchTech(playerId) {
        console.log(`🤖 AI player ${playerId} is researching tech`);
        // Tech research implementation
        // This would depend on your tech tree system
        this.gameEngine.triggerEvent('tech:research', {
            playerId: playerId,
            techId: 'upgrade_' + Math.floor(Math.random() * 3)
        });
    }

    addUnitToAI(playerId, unit) {
        const aiPlayer = this.aiPlayers.get(playerId);
        if (aiPlayer) {
            aiPlayer.units.push(unit);
        }
    }

    addResourcesToAI(playerId, type, amount) {
        const aiPlayer = this.aiPlayers.get(playerId);
        if (aiPlayer && aiPlayer.resources[type] !== undefined) {
            aiPlayer.resources[type] += amount;
        }
    }

    onEvent(eventName, data) {
        switch (eventName) {
            case 'update':
                // Update all AI players
                const currentTime = data.currentTime || Date.now();
                
                // Throttle updates to 30 FPS
                if (currentTime - this.lastUpdateTime > 33) {
                    for (const [playerId] of this.aiPlayers) {
                        this.updateAI(playerId);
                    }
                    this.lastUpdateTime = currentTime;
                }
                break;
                
            case 'player:added':
                if (data.isAI) {
                    this.addAIPlayer(data.id, data.difficulty || 'medium');
                }
                break;
                
            case 'unit:created':
                // Track AI player units
                if (data.playerId && this.aiPlayers.has(data.playerId)) {
                    this.addUnitToAI(data.playerId, data);
                }
                break;
                
            case 'resource:gathered':
            case 'resources:changed':
                // Update AI player resources
                if (data.playerId && this.aiPlayers.has(data.playerId)) {
                    this.addResourcesToAI(data.playerId, data.type || 'minerals', data.amount || 0);
                }
                break;
        }
    }

    destroy() {
        console.log('AI system destroyed');
        this.aiPlayers.clear();
    }
}