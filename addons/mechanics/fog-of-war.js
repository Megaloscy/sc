export default class FogOfWar {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.fogMap = new Map();
        this.exploredMap = new Map();
        this.visionRadius = {
            'marine': 7,
            'scv': 5,
            'command_center': 9,
            'observer': 11
        };
    }

    async init() {
        this.initializeFogMaps();
        this.setupVisionUpdates();
    }

    initializeFogMaps() {
        const { width, height } = this.gameEngine.terrain.getMapSize();
        
        for (let playerId of this.gameEngine.getPlayerIds()) {
            const fogGrid = Array(height).fill().map(() => 
                Array(width).fill(2) // 0 = visible, 1 = explored, 2 = hidden
            );
            this.fogMap.set(playerId, fogGrid);
            this.exploredMap.set(playerId, 
                Array(height).fill().map(() => Array(width).fill(false))
            );
        }
    }

    updateVision(playerId) {
        const fogGrid = this.fogMap.get(playerId);
        const exploredGrid = this.exploredMap.get(playerId);
        
        // Reset vision
        for (let y = 0; y < fogGrid.length; y++) {
            for (let x = 0; x < fogGrid[y].length; x++) {
                if (fogGrid[y][x] === 0) fogGrid[y][x] = 1;
            }
        }
        
        // Calculate new vision from units and buildings
        const playerEntities = this.gameEngine.getPlayerEntities(playerId);
        
        for (const entity of playerEntities) {
            const radius = this.visionRadius[entity.type] || 5;
            this.revealArea(playerId, entity.x, entity.y, radius);
        }
    }

    revealArea(playerId, centerX, centerY, radius) {
        const fogGrid = this.fogMap.get(playerId);
        const exploredGrid = this.exploredMap.get(playerId);
        
        const startX = Math.max(0, Math.floor(centerX - radius));
        const endX = Math.min(fogGrid[0].length - 1, Math.ceil(centerX + radius));
        const startY = Math.max(0, Math.floor(centerY - radius));
        const endY = Math.min(fogGrid.length - 1, Math.ceil(centerY + radius));
        
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                
                if (distance <= radius) {
                    fogGrid[y][x] = 0; // Visible
                    exploredGrid[y][x] = true;
                }
            }
        }
    }

    isVisible(playerId, x, y) {
        const fogGrid = this.fogMap.get(playerId);
        if (!fogGrid || !fogGrid[y] || !fogGrid[y][x]) return false;
        return fogGrid[y][x] === 0;
    }
}