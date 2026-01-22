import AddonRegistry from '../../addon-registry.js';
export default class StrategicAI {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.name = 'strategicAI';
        this.dependencies = ['basicAI', 'combat', 'resource'];
        this.strategies = new Map();
        this.aiPlayers = new Map();
        this.strategyWeights = new Map();
        this.lastStrategyUpdate = 0;
    }

    async init() {
        console.log('Initializing Strategic AI system...');
        
        this.registerStrategies();
        this.setupStrategyWeights();
        
        console.log('✅ Strategic AI system initialized');
        return this;
    }

    registerStrategies() {
        // Define different AI strategies
        this.strategies.set('rush', {
            name: 'Rush Strategy',
            description: 'Focus on early aggression with basic units',
            priority: ['early_units', 'attack', 'aggression'],
            aggression: 0.9,
            defense: 0.2,
            economy: 0.3,
            tech: 0.1,
            buildOrder: this.getRushBuildOrder(),
            preferredUnits: ['zergling', 'zealot', 'marine'],
            expansionDelay: 300, // seconds before expanding
            unitRatio: { basic: 0.8, advanced: 0.2 }
        });

        this.strategies.set('turtle', {
            name: 'Turtle Strategy',
            description: 'Build strong defenses and tech up',
            priority: ['defense', 'tech', 'economy'],
            aggression: 0.2,
            defense: 0.9,
            economy: 0.7,
            tech: 0.8,
            buildOrder: this.getTurtleBuildOrder(),
            preferredUnits: ['siege_tank', 'dragoon', 'hydralisk'],
            expansionDelay: 180,
            unitRatio: { basic: 0.3, advanced: 0.7 }
        });

        this.strategies.set('macro', {
            name: 'Macro Strategy',
            description: 'Focus on economy and expansion',
            priority: ['economy', 'expansion', 'units'],
            aggression: 0.5,
            defense: 0.5,
            economy: 0.9,
            tech: 0.5,
            buildOrder: this.getMacroBuildOrder(),
            preferredUnits: ['marine', 'zealot', 'zergling', 'hydralisk'],
            expansionDelay: 120,
            unitRatio: { basic: 0.6, advanced: 0.4 }
        });

        this.strategies.set('tech_rush', {
            name: 'Tech Rush',
            description: 'Fast technology to advanced units',
            priority: ['tech', 'advanced_units', 'economy'],
            aggression: 0.4,
            defense: 0.3,
            economy: 0.6,
            tech: 0.9,
            buildOrder: this.getTechRushBuildOrder(),
            preferredUnits: ['mutalisk', 'dragoon', 'siege_tank'],
            expansionDelay: 240,
            unitRatio: { basic: 0.2, advanced: 0.8 }
        });

        console.log(`Registered ${this.strategies.size} AI strategies`);
    }

    // Build order methods
    getRushBuildOrder() {
        return [
            { supply: 9, action: 'build', building: 'supply' },
            { supply: 12, action: 'build', building: 'barracks' },
            { supply: 13, action: 'train', unit: 'marine', count: 4 },
            { supply: 16, action: 'build', building: 'barracks' },
            { supply: 17, action: 'train', unit: 'marine', count: 8 },
            { supply: 20, action: 'attack', target: 'enemy_main' },
            { supply: 24, action: 'expand', if: 'resources > 300' }
        ];
    }

    getTurtleBuildOrder() {
        return [
            { supply: 9, action: 'build', building: 'supply' },
            { supply: 12, action: 'build', building: 'barracks' },
            { supply: 13, action: 'build', building: 'engineering_bay' },
            { supply: 15, action: 'train', unit: 'marine', count: 2 },
            { supply: 16, action: 'build', building: 'bunker' },
            { supply: 18, action: 'research', upgrade: 'infantry_weapons' },
            { supply: 20, action: 'build', building: 'factory' },
            { supply: 22, action: 'train', unit: 'siege_tank', count: 2 },
            { supply: 24, action: 'expand', if: 'defense_complete' }
        ];
    }

    getMacroBuildOrder() {
        return [
            { supply: 9, action: 'build', building: 'supply' },
            { supply: 12, action: 'build', building: 'barracks' },
            { supply: 13, action: 'train', unit: 'marine', count: 2 },
            { supply: 15, action: 'build', building: 'command_center' },
            { supply: 16, action: 'train', unit: 'scv', count: 4 },
            { supply: 18, action: 'build', building: 'supply' },
            { supply: 20, action: 'build', building: 'barracks' },
            { supply: 22, action: 'train', unit: 'marine', count: 8 },
            { supply: 24, action: 'expand', if: 'safe' }
        ];
    }

    getTechRushBuildOrder() {
        return [
            { supply: 9, action: 'build', building: 'supply' },
            { supply: 12, action: 'build', building: 'barracks' },
            { supply: 13, action: 'train', unit: 'marine', count: 1 },
            { supply: 14, action: 'build', building: 'factory' },
            { supply: 16, action: 'build', building: 'starport' },
            { supply: 18, action: 'train', unit: 'wraith', count: 2 },
            { supply: 20, action: 'research', upgrade: 'cloak' },
            { supply: 22, action: 'attack', target: 'enemy_workers' }
        ];
    }

    setupStrategyWeights() {
        // Default strategy weights based on opponent and game state
        this.strategyWeights.set('default', {
            rush: 0.25,
            turtle: 0.25,
            macro: 0.30,
            tech_rush: 0.20
        });

        this.strategyWeights.set('vs_rush', {
            rush: 0.15,
            turtle: 0.40,
            macro: 0.25,
            tech_rush: 0.20
        });

        this.strategyWeights.set('vs_turtle', {
            rush: 0.40,
            turtle: 0.10,
            macro: 0.30,
            tech_rush: 0.20
        });

        this.strategyWeights.set('vs_macro', {
            rush: 0.30,
            turtle: 0.20,
            macro: 0.30,
            tech_rush: 0.20
        });
    }

    addStrategicAIPlayer(playerId, difficulty = 'medium') {
        const strategicAI = {
            id: playerId,
            currentStrategy: 'macro', // Default strategy
            strategyHistory: [],
            adaptationRate: this.getAdaptationRate(difficulty),
            lastStrategyChange: Date.now(),
            buildOrderIndex: 0,
            gameState: this.evaluateGameState(playerId),
            personality: this.generatePersonality(difficulty),
            threatAssessment: new Map()
        };
        
        this.aiPlayers.set(playerId, strategicAI);
        console.log(`Added strategic AI player ${playerId} with difficulty ${difficulty}`);
        
        return strategicAI;
    }

    getAdaptationRate(difficulty) {
        const rates = {
            easy: 0.1,    // Slow to adapt
            medium: 0.3,  // Moderate adaptation
            hard: 0.6,    // Quick adaptation
            insane: 0.9   // Very quick adaptation
        };
        return rates[difficulty] || rates.medium;
    }

    generatePersonality(difficulty) {
        const personalities = {
            easy: { aggression: 0.3, caution: 0.8, greed: 0.4, adaptability: 0.2 },
            medium: { aggression: 0.5, caution: 0.5, greed: 0.5, adaptability: 0.5 },
            hard: { aggression: 0.7, caution: 0.3, greed: 0.7, adaptability: 0.8 },
            insane: { aggression: 0.9, caution: 0.1, greed: 0.9, adaptability: 0.9 }
        };
        return personalities[difficulty] || personalities.medium;
    }

    evaluateGameState(playerId) {
        // Get basic AI player info
        const basicAI = this.gameEngine.getAddon ? this.gameEngine.getAddon('basicAI') : null;
        const aiPlayer = basicAI ? basicAI.aiPlayers.get(playerId) : null;
        
        if (!aiPlayer) {
            return {
                economy: 0.5,
                military: 0.5,
                tech: 0.5,
                expansion: 0.5,
                threat: 0.5
            };
        }
        
        // Simplified game state evaluation
        const resources = aiPlayer.resources || { minerals: 0, vespene: 0 };
        const mineralRatio = Math.min(resources.minerals / 1000, 1);
        const unitCount = aiPlayer.units ? aiPlayer.units.length : 0;
        const unitRatio = Math.min(unitCount / 30, 1);
        const buildingCount = aiPlayer.buildings ? aiPlayer.buildings.length : 0;
        const buildingRatio = Math.min(buildingCount / 10, 1);
        
        return {
            economy: mineralRatio * 0.7 + buildingRatio * 0.3,
            military: unitRatio,
            tech: buildingCount > 3 ? 0.7 : 0.3,
            expansion: buildingCount > 1 ? 0.6 : 0.2,
            threat: this.assessThreatLevel(playerId)
        };
    }

    assessThreatLevel(playerId) {
        // Simplified threat assessment
        // In a full implementation, this would analyze enemy units and positions
        const basicAI = this.gameEngine.getAddon ? this.gameEngine.getAddon('basicAI') : null;
        if (!basicAI) return 0.5;
        
        const aiPlayer = basicAI.aiPlayers.get(playerId);
        if (!aiPlayer) return 0.5;
        
        // Count potential enemies
        let enemyCount = 0;
        for (const [id, player] of basicAI.aiPlayers) {
            if (id !== playerId) enemyCount++;
        }
        
        // Also count human players
        const gameEnginePlayers = this.gameEngine.players || new Map();
        enemyCount += Array.from(gameEnginePlayers.values())
            .filter(p => !p.isAI && p.id !== playerId).length;
        
        return Math.min(enemyCount * 0.2, 1.0);
    }

    updateStrategicAI(playerId) {
        const strategicAI = this.aiPlayers.get(playerId);
        if (!strategicAI) return;
        
        const now = Date.now();
        
        // Update game state
        strategicAI.gameState = this.evaluateGameState(playerId);
        
        // Consider strategy change every 30 seconds
        if (now - strategicAI.lastStrategyChange > 30000) {
            this.considerStrategyChange(playerId, strategicAI);
        }
        
        // Execute current strategy
        this.executeStrategy(playerId, strategicAI);
        
        // Update threat assessment
        this.updateThreatAssessment(playerId, strategicAI);
    }

    considerStrategyChange(playerId, strategicAI) {
        const gameState = strategicAI.gameState;
        const personality = strategicAI.personality;
        
        // Calculate strategy scores based on game state and personality
        const strategyScores = new Map();
        
        for (const [strategyId, strategy] of this.strategies) {
            let score = 0;
            
            // Match strategy to game state
            if (gameState.threat > 0.7 && strategy.aggression > 0.7) {
                score += 2.0; // Rush when threatened
            }
            
            if (gameState.economy > 0.7 && strategy.economy > 0.7) {
                score += 1.5; // Macro when economy is good
            }
            
            if (gameState.tech > 0.7 && strategy.tech > 0.7) {
                score += 1.2; // Tech when ahead in tech
            }
            
            // Personality adjustments
            score += strategy.aggression * personality.aggression;
            score += strategy.defense * (1 - personality.aggression);
            score += strategy.economy * personality.greed;
            
            // Random factor for variety
            score += Math.random() * personality.adaptability;
            
            strategyScores.set(strategyId, score);
        }
        
        // Find best strategy
        let bestStrategy = strategicAI.currentStrategy;
        let bestScore = strategyScores.get(bestStrategy) || 0;
        
        for (const [strategyId, score] of strategyScores) {
            if (score > bestScore) {
                bestScore = score;
                bestStrategy = strategyId;
            }
        }
        
        // Change strategy if significantly better
        if (bestStrategy !== strategicAI.currentStrategy && 
            bestScore > (strategyScores.get(strategicAI.currentStrategy) || 0) + 0.5) {
            
            strategicAI.currentStrategy = bestStrategy;
            strategicAI.lastStrategyChange = now;
            strategicAI.buildOrderIndex = 0;
            strategicAI.strategyHistory.push({
                strategy: bestStrategy,
                time: now,
                reason: 'adaptive_change'
            });
            
            console.log(`Strategic AI ${playerId} changed strategy to ${bestStrategy}`);
            
            this.gameEngine.triggerEvent('ai:strategy_changed', {
                playerId,
                newStrategy: bestStrategy,
                oldStrategy: strategicAI.currentStrategy
            });
        }
    }

    executeStrategy(playerId, strategicAI) {
        const strategy = this.strategies.get(strategicAI.currentStrategy);
        if (!strategy) return;
        
        const gameState = strategicAI.gameState;
        const basicAI = this.gameEngine.getAddon ? this.gameEngine.getAddon('basicAI') : null;
        
        if (!basicAI) return;
        
        // Execute build order steps
        if (strategy.buildOrder && strategicAI.buildOrderIndex < strategy.buildOrder.length) {
            const step = strategy.buildOrder[strategicAI.buildOrderIndex];
            
            // Check if step condition is met
            if (this.checkBuildOrderCondition(step, playerId, gameState)) {
                this.executeBuildOrderStep(step, playerId, basicAI);
                strategicAI.buildOrderIndex++;
            }
        }
        
        // Strategic decisions based on strategy
        this.makeStrategicDecisions(playerId, strategicAI, strategy, basicAI);
    }

    checkBuildOrderCondition(step, playerId, gameState) {
        if (!step.if) return true;
        
        const conditions = step.if.split(' ');
        for (const condition of conditions) {
            if (condition === 'resources>300') {
                const basicAI = this.gameEngine.getAddon ? this.gameEngine.getAddon('basicAI') : null;
                const aiPlayer = basicAI ? basicAI.aiPlayers.get(playerId) : null;
                if (aiPlayer && aiPlayer.resources) {
                    return aiPlayer.resources.minerals > 300;
                }
                return false;
            }
            if (condition === 'safe') {
                return gameState.threat < 0.3;
            }
            if (condition === 'defense_complete') {
                return gameState.military > 0.4;
            }
        }
        
        return true;
    }

    executeBuildOrderStep(step, playerId, basicAI) {
        switch (step.action) {
            case 'build':
                basicAI.buildStructure(playerId, basicAI);
                break;
            case 'train':
                // Train multiple units
                for (let i = 0; i < (step.count || 1); i++) {
                    // In a real implementation, this would queue unit training
                    console.log(`Strategic AI ${playerId} would train ${step.unit}`);
                }
                break;
            case 'attack':
                basicAI.performAttack(playerId, basicAI.aiPlayers.get(playerId));
                break;
            case 'expand':
                basicAI.expandBase(playerId, basicAI.aiPlayers.get(playerId));
                break;
            case 'research':
                // Trigger research event
                this.gameEngine.triggerEvent('research:requested', {
                    playerId,
                    upgrade: step.upgrade
                });
                break;
        }
    }

    makeStrategicDecisions(playerId, strategicAI, strategy, basicAI) {
        const aiPlayer = basicAI.aiPlayers.get(playerId);
        if (!aiPlayer) return;
        
        const now = Date.now();
        const gameState = strategicAI.gameState;
        
        // Aggression decisions
        if (strategy.aggression > 0.7 && gameState.military > 0.5) {
            // Aggressive strategy - attack frequently
            if (now - aiPlayer.lastAction > 10000) { // Every 10 seconds
                basicAI.performAttack(playerId, aiPlayer);
            }
        } else if (strategy.defense > 0.7 && gameState.threat > 0.5) {
            // Defensive strategy - build defenses
            if (now - aiPlayer.lastAction > 15000) { // Every 15 seconds
                basicAI.buildStructure(playerId, aiPlayer);
            }
        }
        
        // Economic decisions
        if (strategy.economy > 0.7 && gameState.economy < 0.8) {
            // Focus on economy
            if (Math.random() < 0.3) { // 30% chance each update
                basicAI.gatherResources(playerId, aiPlayer);
            }
        }
        
        // Expansion decisions
        if (gameState.expansion < 0.5 && aiPlayer.resources && aiPlayer.resources.minerals > 400) {
            // Expand if we have enough resources
            basicAI.expandBase(playerId, aiPlayer);
        }
    }

    updateThreatAssessment(playerId, strategicAI) {
        // Update threat levels for known enemies
        // This would track enemy unit compositions and positions
        const now = Date.now();
        
        if (!strategicAI.threatAssessment.has('lastUpdate') || 
            now - strategicAI.threatAssessment.get('lastUpdate') > 30000) {
            
            strategicAI.threatAssessment.set('lastUpdate', now);
            strategicAI.threatAssessment.set('overallThreat', strategicAI.gameState.threat);
            
            // Simulate detecting enemy strength
            const detectedStrength = Math.random() * strategicAI.gameState.threat;
            strategicAI.threatAssessment.set('detectedStrength', detectedStrength);
        }
    }

    getStrategyAnalysis(playerId) {
        const strategicAI = this.aiPlayers.get(playerId);
        if (!strategicAI) return null;
        
        const strategy = this.strategies.get(strategicAI.currentStrategy);
        if (!strategy) return null;
        
        return {
            playerId,
            currentStrategy: strategicAI.currentStrategy,
            strategyName: strategy.name,
            strategyDescription: strategy.description,
            gameState: strategicAI.gameState,
            adaptationRate: strategicAI.adaptationRate,
            personality: strategicAI.personality,
            historyLength: strategicAI.strategyHistory.length,
            timeOnStrategy: Date.now() - strategicAI.lastStrategyChange
        };
    }

    onEvent(eventName, data) {
        switch (eventName) {
            case 'update':
                // Update all strategic AI players
                const currentTime = data.currentTime || Date.now();
                
                // Update at a slower rate (every 2 seconds)
                if (currentTime - this.lastStrategyUpdate > 2000) {
                    for (const [playerId] of this.aiPlayers) {
                        this.updateStrategicAI(playerId);
                    }
                    this.lastStrategyUpdate = currentTime;
                }
                break;
                
            case 'player:added':
                if (data.isAI) {
                    // Add strategic layer to AI player
                    this.addStrategicAIPlayer(data.id, data.difficulty || 'medium');
                }
                break;
                
            case 'combat:attack':
                // Update threat assessment when combat occurs
                if (data.attackerId && this.aiPlayers.has(data.attackerId)) {
                    const strategicAI = this.aiPlayers.get(data.attackerId);
                    if (strategicAI) {
                        // Increase aggression temporarily
                        strategicAI.personality.aggression = 
                            Math.min(strategicAI.personality.aggression + 0.1, 1.0);
                    }
                }
                break;
                
            case 'ai:action':
                // Log AI actions for strategy analysis
                if (data.playerId && this.aiPlayers.has(data.playerId)) {
                    const strategicAI = this.aiPlayers.get(data.playerId);
                    if (strategicAI) {
                        // Could log actions for pattern analysis
                    }
                }
                break;
        }
    }

    destroy() {
        console.log('Strategic AI system destroyed');
        this.aiPlayers.clear();
        this.strategies.clear();
    }
}