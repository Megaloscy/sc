import AddonRegistry from '../../addon-registry.js';




export default class Pathfinding {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.grid = null;
        this.terrain = null;
        this.dependencies = ['terrain'];
    }

    async init() {
        this.initializeGrid();
    }

    initializeGrid() {
        const mapSize = this.gameEngine.terrain.getMapSize();
        this.grid = Array(mapSize.height).fill().map(() => 
            Array(mapSize.width).fill(1)
        );
        
        // Mark impassable terrain
        for (let y = 0; y < mapSize.height; y++) {
            for (let x = 0; x < mapSize.width; x++) {
                if (!this.gameEngine.terrain.isPassable(x, y)) {
                    this.grid[y][x] = 0; // Blocked
                }
            }
        }
    }

    findPath(start, end, entitySize = 1) {
        const openSet = new PriorityQueue();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const startKey = this.key(start.x, start.y);
        const endKey = this.key(end.x, end.y);
        
        openSet.enqueue(start, this.heuristic(start, end));
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(start, end));
        
        while (!openSet.isEmpty()) {
            const current = openSet.dequeue();
            const currentKey = this.key(current.x, current.y);
            
            if (currentKey === endKey) {
                return this.reconstructPath(cameFrom, current);
            }
            
            for (const neighbor of this.getNeighbors(current, entitySize)) {
                const neighborKey = this.key(neighbor.x, neighbor.y);
                const tentativeGScore = (gScore.get(currentKey) || Infinity) + 
                    this.getCost(current, neighbor);
                
                if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, end));
                    
                    if (!openSet.contains(neighbor)) {
                        openSet.enqueue(neighbor, fScore.get(neighborKey));
                    }
                }
            }
        }
        
        return null; // No path found
    }

    getNeighbors(node, entitySize) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 }, { x: 1, y: 0 },
            { x: 0, y: 1 }, { x: -1, y: 0 },
            { x: 1, y: -1 }, { x: 1, y: 1 },
            { x: -1, y: 1 }, { x: -1, y: -1 }
        ];
        
        for (const dir of directions) {
            const nx = node.x + dir.x;
            const ny = node.y + dir.y;
            
            if (this.isWalkable(nx, ny, entitySize)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        
        return neighbors;
    }

    isWalkable(x, y, size) {
        // Check all tiles in the entity's footprint
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const tx = x + dx;
                const ty = y + dy;
                
                if (tx < 0 || tx >= this.grid[0].length || 
                    ty < 0 || ty >= this.grid.length || 
                    this.grid[ty][tx] === 0) {
                    return false;
                }
            }
        }
        return true;
    }

    heuristic(a, b) {
        // Manhattan distance for grid
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    key(x, y) {
        return `${x},${y}`;
    }
}

class PriorityQueue {
    constructor() {
        this.elements = [];
    }
    
    enqueue(item, priority) {
        this.elements.push({ item, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }
    
    dequeue() {
        return this.elements.shift().item;
    }
    
    isEmpty() {
        return this.elements.length === 0;
    }
    
    contains(item) {
        return this.elements.some(e => e.item.x === item.x && e.item.y === item.y);
    }

}
