
import { GAME_SETTINGS, DEBUG_SETTINGS } from '../core/GameConstants.js';

// Collision System - Version 1.0.0
class CollisionSystem {
    constructor(gameEngine) {
        this.game = gameEngine;
        
        // Spatial partitioning
        this.grid = new Map();
        this.gridSize = GAME_SETTINGS.GRID_SIZE * 2; // 64px grid cells
        
        // Collision groups
        this.collisionGroups = {
            UNITS: 'units',
            BUILDINGS: 'buildings',
            PROJECTILES: 'projectiles',
            RESOURCES: 'resources'
        };
        
        // Performance tracking
        this.collisionChecks = 0;
        this.lastUpdateTime = 0;
        this.updateInterval = 100; // Update spatial grid every 100ms
        
        console.log('CollisionSystem initialized');
    }

    init() {
        this.initializeSpatialGrid();
        console.log('CollisionSystem ready');
    }

    initializeSpatialGrid() {
        const gridWidth = Math.ceil(this.game.worldSize.width / this.gridSize);
        const gridHeight = Math.ceil(this.game.worldSize.height / this.gridSize);
        
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const key = `${x},${y}`;
                this.grid.set(key, {
                    units: new Set(),
                    buildings: new Set(),
                    resources: new Set()
                });
            }
        }
        
        console.log(`Spatial grid initialized: ${gridWidth}x${gridHeight} cells`);
    }

    update() {
        const now = Date.now();
        
        // Update spatial grid periodically
        if (now - this.lastUpdateTime > this.updateInterval) {
            this.updateSpatialGrid();
            this.lastUpdateTime = now;
        }
        
        // Check collisions
        this.checkUnitCollisions();
        this.checkProjectileCollisions();
        this.checkBuildingPlacementCollisions();
        
        // Reset collision checks counter
        this.collisionChecks = 0;
    }

    updateSpatialGrid() {
        // Clear grid
        for (const cell of this.grid.values()) {
            cell.units.clear();
            cell.buildings.clear();
            cell.resources.clear();
        }
        
        // Add units to grid
        for (const [id, unit] of this.game.units) {
            const cellKey = this.getGridCellKey(unit.position);
            const cell = this.grid.get(cellKey);
            if (cell) {
                cell.units.add(id);
            }
        }
        
        // Add buildings to grid
        for (const [id, building] of this.game.buildings) {
            const cellKey = this.getGridCellKey(building.position);
            const cell = this.grid.get(cellKey);
            if (cell) {
                cell.buildings.add(id);
            }
        }
        
        // Add resources to grid
        for (const [id, resource] of this.game.resources) {
            const cellKey = this.getGridCellKey(resource.position);
            const cell = this.grid.get(cellKey);
            if (cell) {
                cell.resources.add(id);
            }
        }
    }

    getGridCellKey(position) {
        const x = Math.floor(position.x / this.gridSize);
        const y = Math.floor(position.y / this.gridSize);
        return `${x},${y}`;
    }

    getNearbyCells(position, radius) {
        const centerX = Math.floor(position.x / this.gridSize);
        const centerY = Math.floor(position.y / this.gridSize);
        const radiusCells = Math.ceil(radius / this.gridSize) + 1;
        
        const cells = [];
        for (let dx = -radiusCells; dx <= radiusCells; dx++) {
            for (let dy = -radiusCells; dy <= radiusCells; dy++) {
                const key = `${centerX + dx},${centerY + dy}`;
                if (this.grid.has(key)) {
                    cells.push(this.grid.get(key));
                }
            }
        }
        return cells;
    }

    checkUnitCollisions() {
        // Check unit-unit collisions with spatial optimization
        const processedPairs = new Set();
        
        for (const [id1, unit1] of this.game.units) {
            // Get nearby cells
            const nearbyCells = this.getNearbyCells(unit1.position, unit1.radius * 3);
            
            for (const cell of nearbyCells) {
                for (const id2 of cell.units) {
                    if (id1 === id2) continue;
                    
                    // Avoid duplicate checks
                    const pairKey = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
                    if (processedPairs.has(pairKey)) continue;
                    processedPairs.add(pairKey);
                    
                    const unit2 = this.game.units.get(id2);
                    if (!unit2) continue;
                    
                    this.collisionChecks++;
                    
                    // Check if units are too close
                    const distance = this.game.distance(unit1.position, unit2.position);
                    const minDistance = unit1.radius + unit2.radius;
                    
                    if (distance < minDistance * 0.8) { // 20% overlap allowed
                        // Push units apart
                        this.resolveUnitCollision(unit1, unit2, distance, minDistance);
                    }
                }
            }
        }
    }

    resolveUnitCollision(unit1, unit2, distance, minDistance) {
        if (distance === 0) distance = 0.001; // Avoid division by zero
        
        const overlap = minDistance * 0.8 - distance;
        const directionX = (unit2.position.x - unit1.position.x) / distance;
        const directionY = (unit2.position.y - unit1.position.y) / distance;
        
        // Move units apart
        const pushForce = overlap * 0.5;
        
        // Only push if units are moving toward each other or stationary
        const relativeVelocityX = unit2.velocity.x - unit1.velocity.x;
        const relativeVelocityY = unit2.velocity.y - unit1.velocity.y;
        const velocityTowards = relativeVelocityX * directionX + relativeVelocityY * directionY;
        
        if (velocityTowards < 0) {
            // Units are moving toward each other
            unit1.position.x -= directionX * pushForce;
            unit1.position.y -= directionY * pushForce;
            unit2.position.x += directionX * pushForce;
            unit2.position.y += directionY * pushForce;
            
            // Adjust velocities
            const bounce = 0.3;
            unit1.velocity.x -= directionX * bounce;
            unit1.velocity.y -= directionY * bounce;
            unit2.velocity.x += directionX * bounce;
            unit2.velocity.y += directionY * bounce;
        }
    }

    checkProjectileCollisions() {
        // Check projectile collisions with spatial optimization
        for (const [projId, projectile] of this.game.projectiles) {
            if (!projectile.target || projectile.hasHit) continue;
            
            // Get target's current cell
            const target = projectile.target;
            const targetPos = target.position || target;
            const nearbyCells = this.getNearbyCells(targetPos, 50);
            
            let hit = false;
            
            // Check collision with target
            for (const cell of nearbyCells) {
                // Check if target is in this cell
                if (target.id && cell.units.has(target.id) || cell.buildings.has(target.id)) {
                    const distance = this.game.distance(projectile.position, targetPos);
                    
                    // Determine hit radius based on target type
                    let hitRadius = 10; // Default
                    if (target.radius) hitRadius = target.radius;
                    else if (target.size) {
                        hitRadius = Math.max(target.size.width, target.size.height) / 2;
                    }
                    
                    if (distance < hitRadius) {
                        hit = true;
                        break;
                    }
                }
            }
            
            if (hit) {
                projectile.hitTarget();
            }
        }
    }

    checkBuildingPlacementCollisions() {
        // This is called when placing buildings to ensure no overlap
        // The actual placement check happens in findClosestPosition
    }

    findClosestPosition(targetPos, radius, maxAttempts = 20) {
        // Try to find a non-overlapping position for building/unit placement
        // Buildings have NO overlap allowed, units can have up to 20% overlap
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Spiral search pattern
            const angle = attempt * 0.6180339887 * Math.PI * 2; // Golden angle
            const distance = radius * 2 * Math.sqrt(attempt + 1);
            
            const testPos = {
                x: targetPos.x + Math.cos(angle) * distance,
                y: targetPos.y + Math.sin(angle) * distance
            };
            
            // Check world bounds
            if (testPos.x < radius || testPos.x > this.game.worldSize.width - radius ||
                testPos.y < radius || testPos.y > this.game.worldSize.height - radius) {
                continue;
            }
            
            // Check building collisions (NO overlap allowed)
            let buildingCollision = false;
            for (const building of this.game.buildings.values()) {
                const buildingRadius = Math.max(building.size.width, building.size.height) / 2;
                const dist = this.game.distance(testPos, building.position);
                
                if (dist < radius + buildingRadius) {
                    buildingCollision = true;
                    break;
                }
            }
            
            if (buildingCollision) continue;
            
            // Check unit collisions (max 20% overlap)
            if (radius > 0) { // Only check for units with collision radius
                let overlappingUnits = 0;
                let nearbyUnits = 0;
                
                const nearbyCells = this.getNearbyCells(testPos, radius * 3);
                for (const cell of nearbyCells) {
                    for (const unitId of cell.units) {
                        const unit = this.game.units.get(unitId);
                        if (!unit) continue;
                        
                        nearbyUnits++;
                        const dist = this.game.distance(testPos, unit.position);
                        
                        if (dist < radius + unit.radius * 0.8) { // 20% overlap threshold
                            overlappingUnits++;
                        }
                    }
                }
                
                // Check if overlap exceeds 20%
                if (nearbyUnits > 0 && overlappingUnits / nearbyUnits > 0.2) {
                    continue;
                }
            }
            
            // Valid position found
            return testPos;
        }
        
        // If no valid position found, return original with warning
        console.warn(`Could not find valid position after ${maxAttempts} attempts`);
        return targetPos;
    }

    isPositionValid(position, radius, ignoreUnitId = null) {
        // Check world bounds
        if (position.x < radius || position.x > this.game.worldSize.width - radius ||
            position.y < radius || position.y > this.game.worldSize.height - radius) {
            return false;
        }
        
        // Check building collisions
        for (const building of this.game.buildings.values()) {
            const buildingRadius = Math.max(building.size.width, building.size.height) / 2;
            const dist = this.game.distance(position, building.position);
            
            if (dist < radius + buildingRadius) {
                return false;
            }
        }
        
        // Check unit collisions (for unit placement)
        if (radius > 0 && ignoreUnitId) {
            let overlappingUnits = 0;
            let nearbyUnits = 0;
            
            const nearbyCells = this.getNearbyCells(position, radius * 3);
            for (const cell of nearbyCells) {
                for (const unitId of cell.units) {
                    if (unitId === ignoreUnitId) continue;
                    
                    const unit = this.game.units.get(unitId);
                    if (!unit) continue;
                    
                    nearbyUnits++;
                    const dist = this.game.distance(position, unit.position);
                    
                    if (dist < radius + unit.radius * 0.8) {
                        overlappingUnits++;
                    }
                }
            }
            
            // Check if overlap exceeds 20%
            if (nearbyUnits > 0 && overlappingUnits / nearbyUnits > 0.2) {
                return false;
            }
        }
        
        return true;
    }

    getUnitsInRadius(position, radius, filter = null) {
        const unitsInRadius = [];
        
        const nearbyCells = this.getNearbyCells(position, radius);
        for (const cell of nearbyCells) {
            for (const unitId of cell.units) {
                const unit = this.game.units.get(unitId);
                if (!unit) continue;
                
                // Apply filter if provided
                if (filter && !filter(unit)) continue;
                
                const distance = this.game.distance(position, unit.position);
                if (distance <= radius) {
                    unitsInRadius.push({
                        unit,
                        distance,
                        direction: {
                            x: (unit.position.x - position.x) / distance,
                            y: (unit.position.y - position.y) / distance
                        }
                    });
                }
            }
        }
        
        // Sort by distance
        unitsInRadius.sort((a, b) => a.distance - b.distance);
        
        return unitsInRadius;
    }

    getBuildingsInRadius(position, radius, filter = null) {
        const buildingsInRadius = [];
        
        const nearbyCells = this.getNearbyCells(position, radius);
        for (const cell of nearbyCells) {
            for (const buildingId of cell.buildings) {
                const building = this.game.buildings.get(buildingId);
                if (!building) continue;
                
                // Apply filter if provided
                if (filter && !filter(building)) continue;
                
                const distance = this.game.distance(position, building.position);
                const buildingRadius = Math.max(building.size.width, building.size.height) / 2;
                
                if (distance <= radius + buildingRadius) {
                    buildingsInRadius.push({
                        building,
                        distance: Math.max(0, distance - buildingRadius),
                        direction: {
                            x: (building.position.x - position.x) / distance,
                            y: (building.position.y - position.y) / distance
                        }
                    });
                }
            }
        }
        
        // Sort by distance
        buildingsInRadius.sort((a, b) => a.distance - b.distance);
        
        return buildingsInRadius;
    }

    getResourcesInRadius(position, radius, filter = null) {
        const resourcesInRadius = [];
        
        const nearbyCells = this.getNearbyCells(position, radius);
        for (const cell of nearbyCells) {
            for (const resourceId of cell.resources) {
                const resource = this.game.resources.get(resourceId);
                if (!resource) continue;
                
                // Apply filter if provided
                if (filter && !filter(resource)) continue;
                
                const distance = this.game.distance(position, resource.position);
                
                if (distance <= radius + resource.radius) {
                    resourcesInRadius.push({
                        resource,
                        distance: Math.max(0, distance - resource.radius),
                        direction: {
                            x: (resource.position.x - position.x) / distance,
                            y: (resource.position.y - position.y) / distance
                        }
                    });
                }
            }
        }
        
        // Sort by distance
        resourcesInRadius.sort((a, b) => a.distance - b.distance);
        
        return resourcesInRadius;
    }

    // Line of sight checking
    hasLineOfSight(startPos, endPos, ignoreIds = new Set()) {
        // Simple line of sight check using Bresenham's line algorithm
        const dx = Math.abs(endPos.x - startPos.x);
        const dy = Math.abs(endPos.y - startPos.y);
        const sx = startPos.x < endPos.x ? 1 : -1;
        const sy = startPos.y < endPos.y ? 1 : -1;
        let err = dx - dy;
        
        let x = startPos.x;
        let y = startPos.y;
        
        const maxSteps = Math.max(dx, dy);
        
        for (let i = 0; i < maxSteps; i++) {
            // Check for collisions at this point
            const checkPos = { x, y };
            
            // Check buildings
            for (const building of this.game.buildings.values()) {
                if (this.isPointInBuilding(checkPos, building)) {
                    return false;
                }
            }
            
            // Bresenham's algorithm
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
        
        return true;
    }

    isPointInBuilding(point, building) {
        const bbox = building.getBoundingBox();
        return point.x >= bbox.x && 
               point.x <= bbox.x + bbox.width && 
               point.y >= bbox.y && 
               point.y <= bbox.y + bbox.height;
    }

    // Performance monitoring
    getPerformanceStats() {
        return {
            collisionChecks: this.collisionChecks,
            gridCells: this.grid.size,
            lastUpdate: this.lastUpdateTime
        };
    }

    // Debug visualization
    drawDebugGrid(ctx) {
        if (!DEBUG_SETTINGS.SHOW_COLLISION_BOXES) return;
        
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
        ctx.lineWidth = 1;
        
        // Draw grid lines
        for (let x = 0; x <= this.game.worldSize.width; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.game.worldSize.height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= this.game.worldSize.height; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.game.worldSize.width, y);
            ctx.stroke();
        }
        
        // Draw cell occupancy
        for (const [key, cell] of this.grid) {
            if (cell.units.size > 0 || cell.buildings.size > 0) {
                const [x, y] = key.split(',').map(Number);
                const screenX = x * this.gridSize;
                const screenY = y * this.gridSize;
                
                // Draw cell with alpha based on occupancy
                const occupancy = Math.min(1, (cell.units.size + cell.buildings.size) / 10);
                ctx.fillStyle = `rgba(255, 255, 0, ${occupancy * 0.3})`;
                ctx.fillRect(screenX, screenY, this.gridSize, this.gridSize);
            }
        }
        
        ctx.restore();
    }

    drawCollisionBoxes(ctx) {
        if (!DEBUG_SETTINGS.SHOW_COLLISION_BOXES) return;
        
        ctx.save();
        
        // Draw unit collision circles
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 1;
        for (const unit of this.game.units.values()) {
            ctx.beginPath();
            ctx.arc(unit.position.x, unit.position.y, unit.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw building collision boxes
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        for (const building of this.game.buildings.values()) {
            const bbox = building.getBoundingBox();
            ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
        }
        
        // Draw resource collision circles
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
        for (const resource of this.game.resources.values()) {
            ctx.beginPath();
            ctx.arc(resource.position.x, resource.position.y, resource.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

export { CollisionSystem };