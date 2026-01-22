import AddonRegistry from '../../addon-registry.js';




export default class VespeneGas {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.name = 'vespene';
        this.dependencies = ['terrain', 'resource']; // Declare dependencies
        this.geysers = [];
        this.initialized = false;
    }

    async init() {
        console.log('Initializing VespeneGas system...');
        
        // Wait for dependencies
        await this.waitForDependencies();
        
        this.setupVespeneFields();
        this.registerGasGatherers();
        
        this.initialized = true;
        console.log('✅ VespeneGas system initialized');
        return this;
    }

    async waitForDependencies() {
        // Wait for terrain to be available
        let attempts = 0;
        while (!this.gameEngine.terrain && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.gameEngine.terrain) {
            throw new Error('Terrain system not available for VespeneGas');
        }
    }

    setupVespeneFields() {
        // Get terrain safely
        const terrain = this.gameEngine.terrain;
        if (!terrain || !terrain.getMapSize) {
            console.warn('Terrain not available, using default map size');
            const mapSize = { width: 128, height: 128 };
            this.generateGeysers(mapSize);
            return;
        }
        
        const mapSize = terrain.getMapSize();
        this.generateGeysers(mapSize);
    }

    generateGeysers(mapSize) {
        this.geysers = [];
        
        // Create 4-8 vespene geysers
        const geyserCount = Math.floor(Math.random() * 5) + 4;
        
        for (let i = 0; i < geyserCount; i++) {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 100) {
                const x = Math.floor(Math.random() * (mapSize.width - 4)) + 2;
                const y = Math.floor(Math.random() * (mapSize.height - 4)) + 2;
                
                // Check if position is buildable
                if (this.isPositionValid(x, y)) {
                    this.geysers.push({
                        id: `geyser_${i}`,
                        x: x,
                        y: y,
                        gas: 5000,
                        maxGas: 5000,
                        extractors: [],
                        playerId: null // Which player controls it
                    });
                    placed = true;
                }
                attempts++;
            }
        }
        
        console.log(`Generated ${this.geysers.length} vespene geysers`);
        
        // Trigger event
        this.gameEngine.triggerEvent('vespene:geysers_generated', this.geysers);
    }

    isPositionValid(x, y) {
        // Check if position is not too close to other geysers
        for (const geyser of this.geysers) {
            const distance = Math.sqrt(
                Math.pow(geyser.x - x, 2) + Math.pow(geyser.y - y, 2)
            );
            if (distance < 10) { // Minimum distance between geysers
                return false;
            }
        }
        
        // Check if terrain is buildable if terrain system is available
        if (this.gameEngine.terrain && this.gameEngine.terrain.isBuildable) {
            return this.gameEngine.terrain.isBuildable(x, y);
        }
        
        return true; // Default to true if terrain not available
    }

    registerGasGatherers() {
        const gatherers = {
            'Terran': {
                building: 'refinery',
                worker: 'scv',
                rate: 4
            },
            'Protoss': {
                building: 'assimilator',
                worker: 'probe',
                rate: 4
            },
            'Zerg': {
                building: 'extractor',
                worker: 'drone',
                rate: 4
            }
        };
        
        this.gatherers = gatherers;
        this.gameEngine.triggerEvent('vespene:gatherers_registered', gatherers);
    }

    // API Methods
    getGeysers() {
        return [...this.geysers];
    }

    getGeyserAt(x, y, radius = 2) {
        for (const geyser of this.geysers) {
            const distance = Math.sqrt(
                Math.pow(geyser.x - x, 2) + Math.pow(geyser.y - y, 2)
            );
            if (distance <= radius) {
                return geyser;
            }
        }
        return null;
    }

    claimGeyser(geyserId, playerId) {
        const geyser = this.geysers.find(g => g.id === geyserId);
        if (geyser && !geyser.playerId) {
            geyser.playerId = playerId;
            this.gameEngine.triggerEvent('vespene:geyser_claimed', {
                geyserId,
                playerId
            });
            return true;
        }
        return false;
    }

    extractGas(geyserId, amount = 4) {
        const geyser = this.geysers.find(g => g.id === geyserId);
        if (!geyser || geyser.gas <= 0) {
            return 0;
        }
        
        const extracted = Math.min(amount, geyser.gas);
        geyser.gas -= extracted;
        
        if (geyser.gas <= 0) {
            this.gameEngine.triggerEvent('vespene:geyser_exhausted', geyserId);
        }
        
        return extracted;
    }

    onEvent(eventName, data) {
        switch (eventName) {
            case 'update':
                // Update gas extraction
                break;
                
            case 'building:created':
                // Check if building is a gas extraction building
                if (data.type === 'refinery' || data.type === 'assimilator' || data.type === 'extractor') {
                    // Find nearest geyser and claim it
                    const geyser = this.getGeyserAt(data.x, data.y);
                    if (geyser) {
                        this.claimGeyser(geyser.id, data.playerId);
                    }
                }
                break;
                
            case 'unit:gather':
                if (data.resourceType === 'vespene') {
                    const gasAmount = this.extractGas(data.geyserId, 4);
                    if (gasAmount > 0) {
                        // Add gas to player resources
                        const resourceSystem = this.gameEngine.getAddon ? this.gameEngine.getAddon('resource') : null;
                        if (resourceSystem) {
                            resourceSystem.addResources(data.playerId, 'vespene', gasAmount);
                        }
                    }
                }
                break;
        }
    }

    render(ctx) {
        if (!ctx) return;
        
        // Render vespene geysers
        for (const geyser of this.geysers) {
            // Draw geyser base (green)
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(geyser.x * 32 + 16, geyser.y * 32 + 16, 12, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw gas amount indicator
            const gasPercentage = geyser.gas / geyser.maxGas;
            ctx.fillStyle = `rgba(0, 255, 255, ${0.3 + gasPercentage * 0.7})`;
            ctx.beginPath();
            ctx.arc(geyser.x * 32 + 16, geyser.y * 32 + 16, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw player ownership indicator
            if (geyser.playerId) {
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(geyser.x * 32 + 16, geyser.y * 32 + 16, 14, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    destroy() {
        console.log('VespeneGas system destroyed');
        this.geysers = [];
    }

}
