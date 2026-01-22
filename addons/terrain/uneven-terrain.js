// Make sure you're using export default with a class
import AddonRegistry from '/sc/addons/addon-registry.js';


class TerrainSystem {
    constructor() {
        this.grid = [];
        this.gridSize = 10;
        this.terrainTypes = {
            grass: { color: '#2d6a4f', moveCost: 1 },
            forest: { color: '#1b4332', moveCost: 2 },
            mountain: { color: '#6c757d', moveCost: 3 },
            water: { color: '#03045e', moveCost: 999 }
        };
    }

    generateTerrain(width = 1600, height = 1400) {
        console.log(`🌄 Generating terrain ${width}x${height}`);
        
        for (let x = 0; x < width; x += this.gridSize) {
            this.grid[x] = this.grid[x] || [];
            for (let y = 0; y < height; y += this.gridSize) {
                // Simple terrain generation
                const noise = Math.random();
                let terrainType;
                
                if (noise < 0.6) terrainType = 'grass';
                else if (noise < 0.8) terrainType = 'forest';
                else if (noise < 0.95) terrainType = 'mountain';
                else terrainType = 'water';
                
                this.grid[x][y] = {
                    type: terrainType,
                    x: x,
                    y: y,
                    ...this.terrainTypes[terrainType]
                };
            }
        }
        
        console.log(`✅ Terrain generated with ${Math.floor(width/this.gridSize) * Math.floor(height/this.gridSize)} tiles`);
        return this.grid;
    }

    getTerrainAt(x, y) {
        const gridX = Math.floor(x / this.gridSize) * this.gridSize;
        const gridY = Math.floor(y / this.gridSize) * this.gridSize;
        
        if (this.grid[gridX] && this.grid[gridX][gridY]) {
            return this.grid[gridX][gridY];
        }
        return this.terrainTypes.grass; // Default
    }

    render(ctx, camera) {
        if (!this.grid.length) {
            this.generateTerrain(1000, 1000);
        }
        
        // Draw terrain tiles
        for (const x in this.grid) {
            for (const y in this.grid[x]) {
                const tile = this.grid[x][y];
                ctx.fillStyle = tile.color;
                ctx.fillRect(
                    tile.x - camera.x,
                    tile.y - camera.y,
                    this.gridSize,
                    this.gridSize
                );
            }
        }
    }
}

// Register this addon with the system
AddonRegistry.register('TerrainSystem', 
    (gameEngine) => {
        console.log('🌄 Initializing TerrainSystem addon');
        const terrainSystem = new TerrainSystem();
        
        // Attach to game engine
        gameEngine.terrain = terrainSystem;
        
        // Store instance in registry
        const addonData = AddonRegistry.getAddon('TerrainSystem');
        if (addonData) {
            addonData.instance = terrainSystem;
        }
        
        // Generate initial terrain
        terrainSystem.generateTerrain();
        
        console.log('✅ TerrainSystem ready');
        return terrainSystem;
    },
    {
        version: '1.0.0',
        author: 'Game Dev',
        gridSize: 50,
        generation: {
            grassRatio: 0.6,
            forestRatio: 0.2,
            mountainRatio: 0.15,
            waterRatio: 0.05
        }
    }
);

export default TerrainSystem;