// Make sure you're using export default with a class
export default class UnevenTerrain {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.name = 'terrain';
        this.map = null;
        this.tileSize = 32;
        
        // Optional: declare dependencies
        this.dependencies = [];
    }

    async init() {
        console.log('Initializing UnevenTerrain...');
        this.generateMap(128, 128);
        return this;
    }

    generateMap(width, height) {
        this.map = {
            width: width,
            height: height,
            tiles: []
        };
        
        // Generate simple terrain
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                // Simple terrain types
                const noise = Math.random();
                let type = 'grass';
                if (noise < 0.1) type = 'rock';
                if (noise > 0.9) type = 'water';
                
                row.push({
                    type: type,
                    passable: type !== 'water',
                    buildable: type === 'grass',
                    height: Math.random() * 0.5
                });
            }
            this.map.tiles.push(row);
        }
        
        console.log(`Terrain map generated: ${width}x${height}`);
        return this.map;
    }

    getMapSize() {
        return this.map ? { width: this.map.width, height: this.map.height } : { width: 0, height: 0 };
    }

    isPassable(x, y) {
        if (!this.map || x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) {
            return false;
        }
        return this.map.tiles[y][x].passable;
    }

    isBuildable(x, y) {
        if (!this.map || x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) {
            return false;
        }
        return this.map.tiles[y][x].buildable;
    }

    render(ctx) {
        if (!this.map || !ctx) return;
        
        const colors = {
            grass: '#3a7d34',
            rock: '#808080',
            water: '#1e90ff'
        };
        
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                const tile = this.map.tiles[y][x];
                ctx.fillStyle = colors[tile.type] || '#000000';
                ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                
                // Add height variation
                if (tile.height > 0) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${tile.height * 0.3})`;
                    ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                }
            }
        }
    }

    // Event handler for addon system
    onEvent(eventName, data) {
        switch (eventName) {
            case 'update':
                // Handle update events if needed
                break;
            case 'entity:move':
                // Check if movement is valid
                if (data.entity && data.target) {
                    const canMove = this.isPassable(data.target.x, data.target.y);
                    if (!canMove) {
                        // Block movement
                        this.gameEngine.triggerEvent('movement:blocked', {
                            entity: data.entity,
                            reason: 'terrain_impassable'
                        });
                    }
                }
                break;
        }
    }

    // Optional: cleanup method
    destroy() {
        console.log('Terrain addon destroyed');
        this.map = null;
    }
}