
// AI System - Version 1.0.0
class AISystem {
    constructor(gameEngine) {
        this.game = gameEngine;
        
        // AI Players
        this.aiPlayers = new Map();
        
        // Behavior states
        this.behaviorStates = {
            IDLE: 'idle',
            EXPANDING: 'expanding',
            ATTACKING: 'attacking',
            DEFENDING: 'defending',
            GATHERING: 'gathering'
        };
        
        // Decision making
        this.decisionInterval = 2000; // Make decisions every 2 seconds
        this.lastDecisionTime = 0;
        
        // AI difficulty
        this.difficulty = 'medium'; // easy, medium, hard
        
        console.log('AISystem initialized');
    }

    init() {
        console.log('AISystem ready');
    }

    onEnemyCreated(playerId) {
        const player = this.game.players.get(playerId);
        if (!player) return;
        
        this.aiPlayers.set(playerId, {
            id: playerId,
            state: this.behaviorStates.EXPANDING,
            lastActionTime: Date.now(),
            targetPosition: null,
            aggression: 0.5,
            expansionCounter: 0,
            unitProductionGoal: 10,
            buildingGoal: 3,
            resourceTargets: new Set(),
            attackTargets: new Set()
        });
        
        console.log(`AI player created: ${playerId}`);
    }

    update() {
        const now = Date.now();
        
        // Only make decisions at intervals
        if (now - this.lastDecisionTime < this.decisionInterval) {
            return;
        }
        
        this.lastDecisionTime = now;
        
        // Process each AI player
        for (const [playerId, aiData] of this.aiPlayers) {
            this.processAI(playerId, aiData);
        }
    }

    processAI(playerId, aiData) {
        const player = this.game.players.get(playerId);
        if (!player) return;
        
        // Get current state
        const units = Array.from(player.units).map(id => this.game.units.get(id)).filter(Boolean);
        const buildings = Array.from(player.buildings).map(id => this.game.buildings.get(id)).filter(Boolean);
        
        // Count units by type
        const unitCounts = {
            worker: units.filter(u => u.type === 'worker').length,
            infantry: units.filter(u => u.type === 'infantry').length,
            vehicle: units.filter(u => u.type === 'vehicle').length
        };
        
        // Make decisions based on state
        switch(aiData.state) {
            case this.behaviorStates.EXPANDING:
                this.handleExpansion(playerId, aiData, units, buildings, unitCounts);
                break;
            case this.behaviorStates.ATTACKING:
                this.handleAttack(playerId, aiData, units, buildings, unitCounts);
                break;
            case this.behaviorStates.DEFENDING:
                this.handleDefense(playerId, aiData, units, buildings, unitCounts);
                break;
            case this.behaviorStates.GATHERING:
                this.handleGathering(playerId, aiData, units, buildings, unitCounts);
                break;
            default:
                this.handleIdle(playerId, aiData, units, buildings, unitCounts);
        }
        
        // Update resource gathering
        this.assignResourceGatherers(playerId, units);
        
        // Auto-attack nearby enemies
        this.autoAttackEnemies(playerId, units);
    }

    handleExpansion(playerId, aiData, units, buildings, unitCounts) {
        const player = this.game.players.get(playerId);
        
        // Check if we need more workers
        if (unitCounts.worker < 5 && buildings.length > 0) {
            this.trainWorker(playerId, buildings);
        }
        
        // Check if we need more military units
        if (unitCounts.infantry < aiData.unitProductionGoal && buildings.length > 0) {
            this.trainMilitary(playerId, buildings, 'infantry');
        }
        
        // Check if we can expand (build more buildings)
        if (buildings.length < aiData.buildingGoal && unitCounts.worker > 0) {
            this.buildExpansion(playerId, units);
        }
        
        // Check conditions to change state
        if (unitCounts.infantry >= aiData.unitProductionGoal) {
            aiData.state = this.behaviorStates.ATTACKING;
            console.log(`AI ${playerId} switching to ATTACKING state`);
        }
    }

    handleAttack(playerId, aiData, units, buildings, unitCounts) {
        // Find enemy to attack
        const enemy = this.findEnemyTarget(playerId);
        
        if (enemy) {
            // Send units to attack
            this.sendAttack(playerId, units, enemy);
            
            // Continue training military
            if (unitCounts.infantry < aiData.unitProductionGoal * 2) {
                this.trainMilitary(playerId, buildings, 'infantry');
            }
        } else {
            // No enemies found, go back to expanding
            aiData.state = this.behaviorStates.EXPANDING;
            aiData.unitProductionGoal += 5; // Increase goal for next time
        }
    }

    handleDefense(playerId, aiData, units, buildings, unitCounts) {
        // Check if base is under attack
        const isUnderAttack = this.checkUnderAttack(playerId, buildings);
        
        if (isUnderAttack) {
            // Gather units for defense
            this.gatherForDefense(playerId, units, isUnderAttack.position);
        } else {
            // Not under attack, go back to previous state
            aiData.state = this.behaviorStates.EXPANDING;
        }
    }

    handleGathering(playerId, aiData, units, buildings, unitCounts) {
        // Ensure we have enough workers
        if (unitCounts.worker < 8) {
            this.trainWorker(playerId, buildings);
        }
        
        // Assign workers to resources
        this.assignResourceGatherers(playerId, units);
        
        // Check if we have enough resources to switch state
        if (player.resources.metal > 1000 && player.resources.gas > 500) {
            aiData.state = this.behaviorStates.EXPANDING;
        }
    }

    handleIdle(playerId, aiData, units, buildings, unitCounts) {
        // Start with gathering resources
        aiData.state = this.behaviorStates.GATHERING;
    }

    trainWorker(playerId, buildings) {
        // Find a building that can produce workers (Command Center, Hatchery, Nexus, etc.)
        const productionBuilding = buildings.find(b => 
            b.name === 'Command Center' || 
            b.name === 'Hatchery' || 
            b.name === 'Nexus'
        );
        
        if (productionBuilding && !productionBuilding.isConstructing) {
            const unitData = {
                name: productionBuilding.race.worker,
                type: 'worker',
                buildTime: 30,
                cost: { metal: 50 }
            };
            
            productionBuilding.startProduction(unitData);
            console.log(`AI ${playerId} training worker`);
        }
    }

    trainMilitary(playerId, buildings, type) {
        // Find appropriate building for unit type
        let buildingType;
        let unitName;
        
        if (type === 'infantry') {
            buildingType = 'Barracks';
            unitName = 'Marine';
        } else if (type === 'vehicle') {
            buildingType = 'Factory';
            unitName = 'Siege Tank';
        }
        
        const militaryBuilding = buildings.find(b => b.name === buildingType);
        
        if (militaryBuilding && !militaryBuilding.isConstructing) {
            const unitData = {
                name: unitName,
                type: type,
                buildTime: 45,
                cost: type === 'infantry' ? { metal: 100, gas: 25 } : { metal: 200, gas: 100 }
            };
            
            militaryBuilding.startProduction(unitData);
            console.log(`AI ${playerId} training ${type}`);
        }
    }

    buildExpansion(playerId, units) {
        // Find a worker
        const worker = units.find(u => u.type === 'worker' && u.state !== 'building');
        
        if (worker) {
            // Find a location near resources
            const resources = Array.from(this.game.resources.values());
            if (resources.length > 0) {
                const targetResource = resources[Math.floor(Math.random() * resources.length)];
                
                // Build near resource (but not too close)
                const buildPosition = {
                    x: targetResource.position.x + (Math.random() - 0.5) * 200,
                    y: targetResource.position.y + (Math.random() - 0.5) * 200
                };
                
                // Ensure position is valid
                const validPos = this.game.collisionSystem.findClosestPosition(
                    buildPosition, 
                    60
                );
                
                // Create building data
                const buildingData = {
                    name: 'Command Center',
                    buildTime: 90,
                    size: { width: 80, height: 60 },
                    cost: { metal: 400 }
                };
                
                worker.startBuilding(buildingData, validPos);
                console.log(`AI ${playerId} building expansion`);
            }
        }
    }

    findEnemyTarget(playerId) {
        // Find enemy player
        let enemyPlayer = null;
        for (const [id, player] of this.game.players) {
            if (id !== playerId) {
                enemyPlayer = player;
                break;
            }
        }
        
        if (!enemyPlayer) return null;
        
        // Find enemy units
        const enemyUnits = Array.from(enemyPlayer.units)
            .map(id => this.game.units.get(id))
            .filter(Boolean);
        
        // Find enemy buildings
        const enemyBuildings = Array.from(enemyPlayer.buildings)
            .map(id => this.game.buildings.get(id))
            .filter(Boolean);
        
        // Prioritize buildings over units
        if (enemyBuildings.length > 0) {
            return enemyBuildings[Math.floor(Math.random() * enemyBuildings.length)];
        } else if (enemyUnits.length > 0) {
            return enemyUnits[Math.floor(Math.random() * enemyUnits.length)];
        }
        
        return null;
    }

    sendAttack(playerId, units, target) {
        // Get military units
        const militaryUnits = units.filter(u => u.type === 'infantry' || u.type === 'vehicle');
        
        if (militaryUnits.length === 0) return;
        
        // Send half of military units to attack
        const attackers = militaryUnits.slice(0, Math.ceil(militaryUnits.length / 2));
        
        attackers.forEach(unit => {
            unit.attack(target);
        });
        
        console.log(`AI ${playerId} sending ${attackers.length} units to attack`);
    }

    checkUnderAttack(playerId, buildings) {
        // Check if any building is taking damage
        for (const building of buildings) {
            if (building.health < building.maxHealth && !building.isConstructing) {
                return {
                    building: building,
                    position: building.position
                };
            }
        }
        return null;
    }

    gatherForDefense(playerId, units, defensePosition) {
        // Get military units
        const militaryUnits = units.filter(u => u.type === 'infantry' || u.type === 'vehicle');
        
        militaryUnits.forEach(unit => {
            unit.moveTo(defensePosition);
        });
    }

    assignResourceGatherers(playerId, units) {
        const workers = units.filter(u => u.type === 'worker' && u.state !== 'building');
        const resources = Array.from(this.game.resources.values());
        
        if (workers.length === 0 || resources.length === 0) return;
        
        // Assign workers to resources
        workers.forEach((worker, index) => {
            if (worker.state === 'idle') {
                const resource = resources[index % resources.length];
                worker.gather(resource);
            }
        });
    }

    autoAttackEnemies(playerId, units) {
        // Military units auto-attack nearby enemies
        const militaryUnits = units.filter(u => 
            (u.type === 'infantry' || u.type === 'vehicle') && 
            u.state === 'idle'
        );
        
        militaryUnits.forEach(unit => {
            // Check for nearby enemies
            const nearbyEnemies = this.game.collisionSystem.getUnitsInRadius(
                unit.position,
                unit.attackRange * 2,
                (otherUnit) => otherUnit.playerId !== playerId
            );
            
            if (nearbyEnemies.length > 0) {
                unit.attack(nearbyEnemies[0].unit);
            }
        });
    }

    // Utility methods
    getRandomPositionNear(position, radius) {
        return {
            x: position.x + (Math.random() - 0.5) * radius * 2,
            y: position.y + (Math.random() - 0.5) * radius * 2
        };
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        
        // Adjust AI behavior based on difficulty
        switch(difficulty) {
            case 'easy':
                this.decisionInterval = 3000;
                break;
            case 'medium':
                this.decisionInterval = 2000;
                break;
            case 'hard':
                this.decisionInterval = 1000;
                break;
        }
        
        console.log(`AI difficulty set to: ${difficulty}`);
    }

    // Debug methods
    getAIStats() {
        const stats = [];
        
        for (const [playerId, aiData] of this.aiPlayers) {
            stats.push({
                playerId,
                state: aiData.state,
                aggression: aiData.aggression,
                lastActionTime: aiData.lastActionTime
            });
        }
        
        return stats;
    }
}

export { AISystem };