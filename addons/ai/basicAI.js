import AddonRegistry from '/sc/addons/addon-registry.js';


class AISystem {
    constructor() {
        this.aiPlayers = new Map();
        this.aiDifficulty = 'medium'; // easy, medium, hard
        this.updateInterval = 2000; // ms between AI updates
        this.updateTimer = null;
    }

    addAIPlayer(playerId, difficulty = 'medium') {
        this.aiPlayers.set(playerId, {
            id: playerId,
            difficulty: difficulty,
            state: 'idle', // idle, gathering, attacking, defending
            targetPlayer: null,
            lastAction: Date.now(),
            resources: {
                gold: 500,
                wood: 300
            },
            units: [],
            buildings: []
        });
        
        console.log(`🤖 AI Player ${playerId} added (difficulty: ${difficulty})`);
        return this.aiPlayers.get(playerId);
    }

    update(gameEntities, deltaTime) {
        // Process each AI player
        for (const [playerId, ai] of this.aiPlayers) {
            const now = Date.now();
            
            // Only update periodically
            if (now - ai.lastAction > this.updateInterval) {
                ai.lastAction = now;
                this.makeDecision(ai, gameEntities);
            }
        }
    }

    makeDecision(ai, gameEntities) {
        const decision = Math.random();
        
        switch (ai.state) {
            case 'idle':
                if (decision < 0.3) {
                    ai.state = 'gathering';
                    console.log(`🤖 ${ai.id} decided to gather resources`);
                } else if (decision < 0.6) {
                    ai.state = 'attacking';
                    console.log(`🤖 ${ai.id} decided to attack`);
                } else {
                    ai.state = 'defending';
                    console.log(`🤖 ${ai.id} decided to defend`);
                }
                break;
                
            case 'gathering':
                // Simulate resource gathering
                ai.resources.gold += 10;
                ai.resources.wood += 5;
                ai.state = 'idle';
                break;
                
            case 'attacking':
                // Find enemy units to attack
                const enemyUnits = gameEntities.filter(e => e.owner !== ai.id);
                if (enemyUnits.length > 0) {
                    const target = enemyUnits[0];
                    console.log(`🤖 ${ai.id} attacking enemy unit at (${target.x}, ${target.y})`);
                    
                    // In a real implementation, this would trigger combat
                    if (window.game && window.game.gameEngine && window.game.gameEngine.combat) {
                        // Use combat system if available
                        const aiUnits = gameEntities.filter(e => e.owner === ai.id);
                        if (aiUnits.length > 0) {
                            window.game.gameEngine.combat.attackEntities(aiUnits[0], target);
                        }
                    }
                }
                ai.state = 'idle';
                break;
        }
    }

    getAIState(playerId) {
        return this.aiPlayers.get(playerId) || null;
    }

    setDifficulty(playerId, difficulty) {
        const ai = this.aiPlayers.get(playerId);
        if (ai) {
            ai.difficulty = difficulty;
            
            // Adjust update interval based on difficulty
            if (difficulty === 'easy') this.updateInterval = 3000;
            else if (difficulty === 'medium') this.updateInterval = 2000;
            else if (difficulty === 'hard') this.updateInterval = 1000;
            
            console.log(`🎯 ${playerId} difficulty set to ${difficulty}`);
            return true;
        }
        return false;
    }

    stopAllAI() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        console.log('🛑 All AI stopped');
    }
}

// Register this addon with the system
AddonRegistry.register('AISystem', 
    (gameEngine) => {
        console.log('🤖 Initializing AISystem addon');
        const aiSystem = new AISystem();
        
        // Attach to game engine
        gameEngine.ai = aiSystem;
        
        // Store instance in registry
        const addonData = AddonRegistry.getAddon('AISystem');
        if (addonData) {
            addonData.instance = aiSystem;
        }
        
        // Add default AI player
        aiSystem.addAIPlayer('enemy', 'medium');
        
        console.log('✅ AISystem ready');
        return aiSystem;
    },
    {
        version: '1.0.0',
        author: 'Game Dev',
        difficultyLevels: ['easy', 'medium', 'hard'],
        defaultDifficulty: 'medium'
    }
);

export default AISystem;